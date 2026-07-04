const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Notification = require('../models/notification.model');
const NotificationSubscription = require('../models/notificationSubscription.model');
const User = require('../models/user.model');
const Event = require('../models/event.model');
const router = express.Router();

// ── Auth middleware ────────────────────────────────────────────
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ success: false, msg: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, msg: 'Token invalid' });
  }
};

// ── POST /api/notifications/backfill ──────────────────────────
// Instantly generates notifications from the user's existing data.
// Safe to call many times — dedup checks prevent duplicates.
router.post('/backfill', auth, async (req, res) => {
  try {
    const userId = mongoose.Types.ObjectId.isValid(req.user.id)
      ? new mongoose.Types.ObjectId(req.user.id)
      : null;
    if (!userId) return res.status(401).json({ success: false, msg: 'Invalid user' });

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ success: false, msg: 'User not found' });

    const now = new Date();
    let created = 0;

    // ── 1. DEADLINE notifications from "Notify Me" subscriptions ─
    // Only create at the defined checkpoints: 7, 3, 1, or 0 days left.
    // Days in between (e.g. 5 days left) should NOT create a notification.
    const CHECKPOINTS = [7, 3, 1, 0];

    const subs = await NotificationSubscription
      .find({ user: userId, subscribed: true })
      .populate('event')
      .lean();

    for (const sub of subs) {
      const event = sub.event;
      if (!event) continue;

      // Use deadline if available, otherwise fall back to eventDate
      const targetDate = event.deadline || event.eventDate;
      if (!targetDate) continue;

      const target = new Date(targetDate);
      const daysLeft = Math.ceil((target - now) / 86_400_000);

      // Only fire at valid checkpoints (7, 3, 1, 0)
      if (!CHECKPOINTS.includes(daysLeft) && daysLeft > 0) continue;
      // If already past, skip entirely (don't create "passed" notifications here)
      if (daysLeft < 0) continue;

      const usingEventDate = !event.deadline && !!event.eventDate;
      const dateLabel = usingEventDate ? 'Event Date' : 'Deadline';
      const dateStr = target.toLocaleDateString('en-IN');

      let title;
      if (daysLeft === 0)      title = `${event.title} is TODAY!`;
      else if (daysLeft === 1) title = `${event.title} is TOMORROW`;
      else                     title = `${event.title} in ${daysLeft} days`;

      const message = `${dateLabel}: ${dateStr}`;

      // Dedup: if a notification already exists for this user/event/type with the SAME title, skip.
      // Also skip if one exists for this event at ANY checkpoint that is still valid
      // (prevents re-creating when title format changes but same checkpoint was already sent)
      const exists = await Notification.findOne({ userId, eventId: event._id, type: 'deadline', title });
      if (exists) continue;

      // Also check: if daysLeft is 7, skip if we already have an "in 7 days" notif
      // If daysLeft is 3 or 2, skip if we already have "in 3 days" (same 3d checkpoint window)
      const windowTitle = daysLeft <= 3 && daysLeft >= 2
        ? `${event.title} in 3 days`
        : daysLeft <= 7 && daysLeft >= 4
        ? `${event.title} in 7 days`
        : title; // for 0 or 1, exact match is fine
      const windowExists = windowTitle !== title
        ? await Notification.findOne({ userId, eventId: event._id, type: 'deadline', title: windowTitle })
        : null;
      if (windowExists) continue;

      await Notification.create({
        userId,
        eventId: event._id,
        type:    'deadline',
        title,
        message,
        isRead:  false,
      });
      created++;
    }

    // ── 2. SYSTEM notifications from bookmarks ─────────────────
    const bookmarkIds = user.bookmarks || [];
    for (const eventId of bookmarkIds) {
      // Dedup by eventId + type only (title format may have changed)
      const exists = await Notification.findOne({ userId, eventId, type: 'system' });
      if (exists) continue;

      let eventTitle = 'an event';
      let org = '', cat = '';
      try {
        const ev = await Event.findById(eventId).select('title organization category').lean();
        if (ev) {
          eventTitle = ev.title;
          org = ev.organization || '';
          cat = ev.category    || '';
        }
      } catch { /* ignore */ }

      const msgParts = [org, cat].filter(Boolean);
      await Notification.create({
        userId,
        eventId,
        type:    'system',
        title:   `Saved: ${eventTitle}`,
        message: msgParts.length > 0 ? msgParts.join(' · ') : 'Event bookmarked',
        isRead:  false,
      });
      created++;
    }

    // ── 3. PERSONAL REMINDERS ─────────────────────────────────
    // Personal event reminder notifications are sent ONLY by the cron scheduler
    // (scheduler.js) at the exact reminder time. We do NOT create them here
    // on page load, as that would show reminders immediately when events are created.

    return res.json({ success: true, created });
  } catch (err) {
    console.error('[Notifications backfill]', err.message);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ── GET /api/notifications ─────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const { type, search, isRead, page = 1, limit = 20 } = req.query;
    const userId = mongoose.Types.ObjectId.isValid(req.user.id)
      ? new mongoose.Types.ObjectId(req.user.id)
      : null;
    if (!userId) return res.status(401).json({ success: false, msg: 'Invalid user' });

    // Base filter always excludes dismissed notifications
    const filter = { userId, isDismissed: { $ne: true } };
    if (type && type !== 'all') filter.type = type;
    if (isRead === 'true')  filter.isRead = true;
    if (isRead === 'false') filter.isRead = false;
    if (search && search.trim()) {
      filter.$or = [
        { title:   { $regex: search.trim(), $options: 'i' } },
        { message: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const pageNum  = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip     = (pageNum - 1) * limitNum;

    const [total, notifications] = await Promise.all([
      Notification.countDocuments(filter),
      Notification.find(filter)
        .populate('eventId', 'title organization category applyLink deadline link')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    // Stats — always based on non-dismissed user notifications
    const baseFilter = { userId, isDismissed: { $ne: true } };
    const [totalUnread, reminderUnread, deadlineUnread, totalRead] = await Promise.all([
      Notification.countDocuments({ ...baseFilter, isRead: false }),
      Notification.countDocuments({ ...baseFilter, type: 'reminder',  isRead: false }),
      Notification.countDocuments({ ...baseFilter, type: 'deadline',  isRead: false }),
      Notification.countDocuments({ ...baseFilter, isRead: true }),
    ]);

    // Category counts
    const aggResult = await Notification.aggregate([
      { $match: { userId, isDismissed: { $ne: true } } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]);
    const totalAll = await Notification.countDocuments(baseFilter);
    const counts = { all: totalAll, deadline: 0, reminder: 0, opportunity: 0, system: 0 };
    aggResult.forEach(c => { if (c._id in counts) counts[c._id] = c.count; });

    return res.json({
      success: true,
      data: {
        notifications,
        stats: {
          totalUnread,
          upcoming:       reminderUnread,
          closeDeadlines: deadlineUnread,
          completed:      totalRead,
        },
        categoryCounts: counts,
        pagination: { total, page: pageNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (err) {
    console.error('[Notifications GET]', err.message);
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ── GET /api/notifications/unread-count ───────────────────────
router.get('/unread-count', auth, async (req, res) => {
  try {
    const userId = mongoose.Types.ObjectId.isValid(req.user.id)
      ? new mongoose.Types.ObjectId(req.user.id) : null;
    if (!userId) return res.status(401).json({ success: false, msg: 'Invalid user' });
    const count = await Notification.countDocuments({ userId, isRead: false });
    return res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ── PUT /api/notifications/read-all ───────────────────────────
router.put('/read-all', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    await Notification.updateMany(
      { userId, isRead: false, isDismissed: { $ne: true } },
      { $set: { isRead: true } }
    );
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ── DELETE /api/notifications/clear-all ───────────────────────
// Soft-delete: marks all as dismissed so backfill won't recreate them
// Must be before /:id
router.delete('/clear-all', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    await Notification.updateMany(
      { userId, isDismissed: { $ne: true } },
      { $set: { isDismissed: true } }
    );
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ── PUT /api/notifications/:id/read ───────────────────────────
router.put('/:id/read', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    const notif = await Notification.findOne({ _id: req.params.id, userId });
    if (!notif) return res.status(404).json({ success: false, msg: 'Not found' });
    notif.isRead = true;
    await notif.save();
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

// ── DELETE /api/notifications/:id ─────────────────────────────
// Soft-delete: sets isDismissed=true so backfill never recreates it
router.delete('/:id', auth, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);
    await Notification.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: { isDismissed: true } }
    );
    return res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, msg: 'Server error' });
  }
});

module.exports = router;
