
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const User = require('../models/user.model');
const Event = require('../models/event.model');
const Reminder = require('../models/reminder.model');
const NotificationSubscription = require('../models/notificationSubscription.model');
const Notification = require('../models/notification.model');
const scheduler = require(path.join(__dirname, '../utils/scheduler'));
const router = express.Router();
const profileFields = [
  'phone',
  'location',
  'bio',
  'college',
  'major',
  'gradYear',
  'website',
  'github',
  'linkedin',
  'twitter',
  'interests',
  'skills',
];

// Auth middleware
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ msg: 'No token, auth denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ msg: 'Token invalid' });
  }
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ msg: 'All fields required' });
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ msg: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ msg: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get current user — lean() for fastest possible read
// Also triggers a background reminder-recovery sweep so Render sleep gaps don't cause missed reminders
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password').lean();
  res.json(user);

  // Background: process any overdue reminders (survives Render free-tier sleep)
  setImmediate(async () => {
    try {
      const { checkDueReminders } = require('../utils/scheduler');
      await checkDueReminders();
    } catch (_) {}
  });
});

// Bookmarks: add/remove
router.post('/bookmarks', auth, async (req, res) => {
  const { eventId } = req.body;
  if (!eventId) return res.status(400).json({ msg: 'Event ID required' });
  const user = await User.findById(req.user.id);
  const alreadyBookmarked = user.bookmarks.includes(eventId);
  if (!alreadyBookmarked) user.bookmarks.push(eventId);
  await user.save();

  // Create a system notification when user bookmarks an event
  if (!alreadyBookmarked) {
    try {
      const event = await Event.findById(eventId).select('title organization category').lean();
      const eventTitle = event ? event.title : 'an event';
      const org        = event && event.organization ? event.organization : '';
      const cat        = event && event.category    ? event.category    : '';
      const msgParts   = [org, cat].filter(Boolean);
      
      await Notification.create({
        userId:  user._id,
        eventId: eventId,
        type:    'system',
        title:   `Saved: ${eventTitle}`,
        message: msgParts.length > 0 ? msgParts.join(' · ') : 'Event bookmarked',
        isRead:  false,
      });
    } catch (err) {
      console.error('Failed to create bookmark notification:', err.message);
    }
  }
  res.json(user.bookmarks);
});
router.delete('/bookmarks/:eventId', auth, async (req, res) => {
  const { eventId } = req.params;
  const user = await User.findById(req.user.id);
  user.bookmarks = user.bookmarks.filter(id => id.toString() !== eventId);
  await user.save();
  res.json(user.bookmarks);
});

router.delete('/bookmarks', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  user.bookmarks = [];
  await user.save();
  res.json(user.bookmarks);
});

// Notifications subscribe/unsubscribe
router.get('/notifications/subscriptions', auth, async (req, res) => {
  const subs = await NotificationSubscription.find({ user: req.user.id }).select('event sent');
  res.json(subs);
});

router.post('/notifications/subscribe', auth, async (req, res) => {
  const { eventId } = req.body;
  if (!eventId) return res.status(400).json({ msg: 'Event ID required' });
  try {
    await NotificationSubscription.findOneAndUpdate(
      { user: req.user.id, event: eventId },
      {
        $set: { sent: false, subscribed: true },
        $unset: { notificationSentAt: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    res.json({ subscribed: true, eventId });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

router.delete('/notifications/subscribe/:eventId', auth, async (req, res) => {
  const { eventId } = req.params;
  try {
    await NotificationSubscription.deleteOne({ user: req.user.id, event: eventId });
    res.json({ subscribed: false, eventId });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// My Events: add, get, delete
router.post('/myevents', auth, async (req, res) => {
  try {
    const { title, description, date, time, location, category, reminder, eventUtcISO } = req.body;

    // Use the UTC ISO string sent by the client (precise, timezone-correct).
    // Fall back to naive date+time parse only if eventUtcISO is absent.
    let eventDateTime = null;
    if (eventUtcISO) {
      const parsed = new Date(eventUtcISO);
      if (!isNaN(parsed.getTime())) eventDateTime = parsed;
    }
    if (!eventDateTime && date) {
      const normalizedTime = time || '00:00';
      const parsed = new Date(`${date}T${normalizedTime}`);
      if (!isNaN(parsed.getTime())) eventDateTime = parsed;
    }

    // Fetch just the user's myEvents (fast, lean)
    const user = await User.findById(req.user.id).select('myEvents email name').lean();
    if (!user) return res.status(404).json({ msg: 'User not found' });

    // Build the new event object
    const myEvent = { title, description, date, time, location, category, reminder };
    const updatedMyEvents = [...user.myEvents, myEvent];

    // ✅ Respond IMMEDIATELY with optimistic data — don't wait for DB writes
    res.json(updatedMyEvents);

    // --- All heavy DB work happens in background after response is sent ---
    setImmediate(async () => {
      try {
        const parseMap = {
          'On time': 0,
          '5 minutes before': 5 * 60 * 1000,
          '10 minutes before': 10 * 60 * 1000,
          '30 minutes before': 30 * 60 * 1000,
          '1 hour before': 60 * 60 * 1000,
          '1 day before': 24 * 60 * 60 * 1000,
        };

        const needsReminder = reminder && reminder !== 'No reminder';

        // Build update operations
        const pushOp = { $push: { myEvents: myEvent } };
        const notifOp = needsReminder ? {
          $push: {
            myEvents: myEvent,
            notifications: {
              message: `Reminder set for event: ${title} (${reminder})`,
              time: new Date(),
              read: false,
              type: 'reminder',
              title
            }
          }
        } : pushOp;

        // Single atomic user update (no fetch-mutate-save cycle)
        await User.findByIdAndUpdate(user._id, notifOp);

        // Only create a Reminder if a reminder was requested
        // NOTE: We do NOT create an Event document here — personal events must NOT
        // appear in the main public events feed. They are stored in user.myEvents only.
        if (needsReminder && eventDateTime) {
          const offset = parseMap[reminder] || 0;
          const remindAt = new Date(eventDateTime.getTime() - offset);

          // Create a placeholder event ref for the reminder (marked as personal/non-public)
          const createdReminder = await Reminder.create({
            user: user._id,
            event: null, // No public event doc — personal event only
            email: user.email,
            remindAt,
            title,
          });
          console.log('[BG] Created reminder:', { id: createdReminder._id.toString(), remindAt });
          try {
            if (scheduler?.scheduleReminder) scheduler.scheduleReminder(createdReminder);
          } catch (schedErr) {
            console.error('[BG] Failed to schedule reminder:', schedErr.message);
          }
        } else {
          // No reminder: just ensure myEvents is saved (already done above)
        }
      } catch (bgErr) {
        console.error('[BG] Background save error after myevent add:', bgErr.message);
      }
    });

  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

router.get('/myevents', auth, async (req, res) => {
  try {
    // Only select myEvents field — much faster than fetching the full user doc
    const user = await User.findById(req.user.id).select('myEvents').lean();
    res.json(user ? user.myEvents : []);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Update a specific event by index
router.put('/myevents/:idx', auth, async (req, res) => {
  const idx = parseInt(req.params.idx);
  const user = await User.findById(req.user.id).select('myEvents');
  if (user.myEvents[idx]) {
    Object.assign(user.myEvents[idx], req.body);
    await user.save();
    return res.json(user.myEvents);
  } else {
    return res.status(404).json({ msg: 'Event not found' });
  }
});

router.delete('/myevents/:idx', auth, async (req, res) => {
  try {
    const idx = parseInt(req.params.idx);
    // Use lean fetch just to get current myEvents, then atomic update
    const user = await User.findById(req.user.id).select('myEvents').lean();
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const updated = [...user.myEvents];
    if (idx >= 0 && idx < updated.length) updated.splice(idx, 1);
    // Single atomic update — no re-fetch needed
    await User.findByIdAndUpdate(req.user.id, { $set: { myEvents: updated } });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// Notifications: get, create, mark as read
router.get('/notifications', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user.notifications);
});
router.post('/notifications', auth, async (req, res) => {
  const { message, date, type = 'reminder', title = '' } = req.body;
  const user = await User.findById(req.user.id);
  // Use 'time' property for notification date, default to now if not provided
  const notif = { message, time: date ? new Date(date) : new Date(), read: false, type, title };
  user.notifications.push(notif);
  await user.save();
  // Add id field for frontend compatibility
  const notificationsWithId = user.notifications.map(n => ({
    ...n.toObject ? n.toObject() : n,
    id: n._id || n.id
  }));
  res.json(notificationsWithId);
});
router.post('/notifications/read', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  user.notifications.forEach(n => n.read = true);
  await user.save();
  res.json(user.notifications);
});

// Profile: update
router.put('/profile', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (req.body.name)  user.name  = req.body.name;
  if (req.body.email) user.email = req.body.email;
  if (Object.prototype.hasOwnProperty.call(req.body, 'avatar')) {
    user.avatar = req.body.avatar;
  }
  // Notification preferences
  if (req.body.emailNotifications !== undefined) user.emailNotifications = req.body.emailNotifications;
  if (req.body.eventReminders     !== undefined) user.eventReminders     = req.body.eventReminders;
  if (req.body.weeklyDigest       !== undefined) user.weeklyDigest       = req.body.weeklyDigest;

  const profileUpdates = {};
  profileFields.forEach(field => {
    if (req.body[field] !== undefined) {
      profileUpdates[field] = req.body[field];
    }
  });
  user.profile = { ...user.profile, ...profileUpdates };
  await user.save();
  res.json({
    name:               user.name,
    email:              user.email,
    avatar:             user.avatar,
    emailNotifications: user.emailNotifications,
    eventReminders:     user.eventReminders,
    weeklyDigest:       user.weeklyDigest,
    profile:            user.profile,
  });
});

// Fix all notification dates for all users
router.post('/notifications/fix-dates', async (req, res) => {
  try {
    const users = await User.find();
    let fixedCount = 0;
    for (const user of users) {
      let changed = false;
      for (const notif of user.notifications) {
        // If 'time' is missing or invalid, set it to now or try to parse 'date'
        if (!notif.time || isNaN(new Date(notif.time).getTime())) {
          if (notif.date && !isNaN(new Date(notif.date).getTime())) {
            notif.time = new Date(notif.date);
          } else {
            notif.time = new Date();
          }
          changed = true;
        }
      }
      if (changed) {
        await user.save();
        fixedCount++;
      }
    }
    res.json({ fixed: fixedCount });
  } catch (err) {
    res.status(500).json({ msg: 'Error fixing notification dates', error: err.message });
  }
});

module.exports = router;
