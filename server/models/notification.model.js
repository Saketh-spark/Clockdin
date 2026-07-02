const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  type: {
    type: String,
    enum: ['deadline', 'reminder', 'opportunity', 'system'],
    required: true,
  },

  title:   { type: String, required: true },
  message: { type: String, required: true },

  // Related data (optional, depends on type)
  eventId:         { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  personalEventId: { type: mongoose.Schema.Types.ObjectId },

  isRead:      { type: Boolean, default: false },
  isDismissed: { type: Boolean, default: false }, // soft-delete — dismissed items are hidden but kept for dedup
  sentEmail:   { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now },
});

// Indexes for fast queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ userId: 1, isDismissed: 1 }); // fast filter of dismissed

module.exports = mongoose.model('Notification', notificationSchema);

