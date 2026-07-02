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
    const subs = await NotificationSubscription
      .find({ user: userId, subscribed: true })
      .populate('event')
      .lean();

    for (const sub of subs) {
      const event = sub.event;
      if (!event || !event.deadline) continue;

      const deadline = new Date(event.deadline);
      const daysLeft = Math.ceil((deadline - now) / 86_400_000);

      let title, message;
      if (daysLeft < 0) {
        title   = `${event.title} deadline has passed`;
        message = `The deadline was ${deadline.toLocaleDateString('en-IN')}. Check for future opportunities.`;
      } else if (daysLeft === 0) {
        title   = `${event.title} closes TODAY`;
        message = "Don't miss it — deadline is today. Apply now!";
      } else if (daysLeft === 1) {
        title   = `${event.title} closes TOMORROW`;
        message = 'Last chance — deadline is tomorrow.';
      } else if (daysLeft <= 3) {
        title   = `${event.title} — only ${daysLeft} days left`;
        message = `Application deadline: ${deadline.toLocaleDateString('en-IN')}`;
      } else {
        title   = `${event.title} deadline in ${daysLeft} days`;
        message = `Application deadline: ${deadline.toLocaleDateString('en-IN')}`;
      }

      // Dedup: only one deadline notification per event per user
      const exists = await Notification.findOne({ userId, eventId: event._id, type: 'deadline' });
      if (exists) continue;

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

    // ── 3. REMINDER notifications from personal events ─────────
    const myEvents = user.myEvents || [];
    const reminderOffsets = {
      'On time':           0,
      '5 minutes before':  5,
      '10 minutes before': 10,
      '1 hour before':     60,
      '1 day before':      1440,
    };
    const timeLabels = {
      'On time':           'right now',
      '5 minutes before':  'in 5 minutes',
      '10 minutes before': 'in 10 minutes',
      '1 hour before':     'in 1 hour',
      '1 day before':      'tomorrow',
    };

    for (const ev of myEvents) {
      if (!ev.reminder || ev.reminder === 'No reminder') continue;

      let eventDT;
      try {
        const datePart = ev.date
          ? (typeof ev.date === 'string'
              ? ev.date.split('T')[0]
              : new Date(ev.date).toISOString().split('T')[0])
          : null;
        if (!datePart) continue;
        eventDT = new Date(`${datePart}T${ev.time || '00:00'}`);
        if (isNaN(eventDT.getTime())) continue;
      } catch { continue; }

      const minutesBefore = reminderOffsets[ev.reminder];
      if (minutesBefore === undefined) continue;

      const reminderTime = new Date(eventDT.getTime() - minutesBefore * 60_000);
      // Only create if reminder fires in the future or within last 24h
      if (reminderTime < new Date(now - 24 * 3_600_000)) continue;

      // Dedup by event title
      const exists = await Notification.findOne({
        userId,
        type:  'reminder',
        title: { $regex: `^${ev.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, $options: 'i' },
      });
      if (exists) continue;

      await Notification.create({
        userId,
        type:    'reminder',
        title:   `${ev.title} — ${timeLabels[ev.reminder] || 'soon'}`,
        message: ev.location
          ? `${ev.time || ''} • ${ev.location}`
          : ev.time || 'Check your personal events',
        isRead: false,
      });
      created++;
    }

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
