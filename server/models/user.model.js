const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  googleId: { type: String, index: true, unique: false }, // optional
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now },
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  myEvents: [{
    title: String,
    description: String,
    date: Date,
    time: String,
    location: String,
    category: String,
    reminder: String,
    reminderSent: { type: Boolean, default: false }, // set true after notification fires
  }],
  notifications: [{
    message: String,
    date: Date,
    read: { type: Boolean, default: false },
  }],
  // Notification preferences
  emailNotifications: { type: Boolean, default: true  },  // send email for deadline reminders
  eventReminders:     { type: Boolean, default: true  },  // create deadline reminder notifications
  weeklyDigest:       { type: Boolean, default: false },  // weekly digest emails
  profile: {
    phone: String,
    location: String,
    bio: String,
    college: String,
    major: String,
    gradYear: String,
    website: String,
    github: String,
    linkedin: String,
    twitter: String,
    interests: String,
    skills: String,
  },
});

module.exports = mongoose.model('User', userSchema);

