const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  eventDate: Date,
  deadline: Date,
  type: String,
  tags: [String],
  organizer: String,
  organizerName: String,
  location: String,
  applyLink: String,
  participants: Number,
  isBookmarked: { type: Boolean, default: false },
  category: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  usersToNotify: [String], // List of user email addresses to notify
  notificationSent: { type: Boolean, default: false }, // Flag to track if notification has been sent
});

module.exports = mongoose.model('Event', eventSchema);
