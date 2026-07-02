const mongoose = require('mongoose');

const NotifyMeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  // Track which reminder emails have already been sent
  // so we never send the same reminder twice
  sentAt7Days: { type: Boolean, default: false },
  sentAt3Days: { type: Boolean, default: false },
  sentAt1Day:  { type: Boolean, default: false },
  sentAtDay0:  { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
});

// One user can only subscribe to one event once
NotifyMeSchema.index({ userId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('NotifyMe', NotifyMeSchema);
