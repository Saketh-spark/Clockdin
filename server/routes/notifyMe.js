const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const NotifyMe = require('../models/notifyMe.model');
const Event = require('../models/event.model');

// Auth middleware (matches the pattern used in users.js)
const auth = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token) return res.status(401).json({ success: false, error: 'No token, auth denied' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Token invalid' });
  }
};

// GET /api/notify-me
// Returns list of eventIds current user has Notify Me active for
router.get('/', auth, async (req, res) => {
  try {
    const subscriptions = await NotifyMe.find({ userId: req.user.id }).select('eventId');
    const eventIds = subscriptions.map(s => s.eventId.toString());
    res.json({ success: true, data: { eventIds } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/notify-me
// User clicks Notify Me on an event
router.post('/', auth, async (req, res) => {
  try {
    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, error: 'eventId is required' });
    }

    // Check event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    // Create subscription — handle duplicate (already subscribed) gracefully
    try {
      await NotifyMe.create({
        userId: req.user.id,
        eventId,
        sentAt7Days: false,
        sentAt3Days: false,
        sentAt1Day:  false,
        sentAtDay0:  false
      });
    } catch (duplicateErr) {
      if (duplicateErr.code === 11000) {
        return res.json({ success: true, data: { message: 'Already subscribed' } });
      }
      throw duplicateErr;
    }

    // Increment event notifyCount
    await Event.findByIdAndUpdate(eventId, { $inc: { notifyCount: 1 } });

    res.json({ success: true, data: { message: 'Notify Me activated' } });

  } catch (err) {
    console.error('[NotifyMe POST] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/notify-me/:eventId
// User clicks Unnotify — remove subscription
router.delete('/:eventId', auth, async (req, res) => {
  try {
    const { eventId } = req.params;

    const deleted = await NotifyMe.findOneAndDelete({
      userId: req.user.id,
      eventId
    });

    if (deleted) {
      // Decrement notifyCount on event (don't go below 0)
      await Event.findByIdAndUpdate(eventId, {
        $inc: { notifyCount: -1 }
      });
    }

    res.json({ success: true, data: { message: 'Unsubscribed successfully' } });

  } catch (err) {
    console.error('[NotifyMe DELETE] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
