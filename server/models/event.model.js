const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  // Core info
  title: { type: String, required: true, maxlength: 100 },
  organization: { type: String, required: true, default: 'Unknown', maxlength: 60 },
  category: {
    type: String,
    enum: ['hackathon', 'internship', 'workshop', 'competition', 'seminar'],
    default: 'hackathon'
  },
  description: { type: String, maxlength: 300 },
  detailedDescription: { type: String },

  // Dates
  eventDate: { type: Date },
  deadline: { type: Date },

  // Location / Mode
  location: { type: String, maxlength: 60 },
  mode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'online', maxlength: 15 },

  // Participation
  skillLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },
  difficulty: { type: String }, // alias for skillLevel used by frontend
  duration: { type: String, maxlength: 25 },
  teamSize: { type: String, maxlength: 20 }, // 'individual' | 'team'
  teamOrIndividual: { type: String },
  eligibility: { type: String, maxlength: 150 },

  // Enrichment
  tags: { type: [String], validate: arr => arr.length <= 5 },
  skills: { type: [String], validate: arr => arr.length <= 6 },
  applyLink: { type: String },
  link: { type: String },
  image: { type: String },

  // Extra metadata
  stipendPerks: { type: String },
  workload: { type: String },
  organizerReputation: { type: String },
  learningOpportunities: { type: String },
  mentorship: { type: String },
  futureScope: { type: String },
  networking: { type: String },
  applicants: { type: String },
  pastReviews: { type: String },

  // Source tracking
  source: { type: String, default: 'manual' }, // unstop | devfolio | internshala | hackerearth | manual
  sourceUrl: { type: String },
  sourceId: { type: String }, // original ID from source site

  // Status flags
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  featured: { type: Boolean, default: false }, // alias used by frontend
  isExpired: { type: Boolean, default: false },

  // Legacy fields (kept for backward compatibility)
  type: { type: String }, // frontend uses 'type', DB stores 'category'
  organizer: { type: String },
  organizerName: { type: String },
  participants: { type: Number },
  isBookmarked: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'published' },
  notificationWindow: { type: String, enum: ['2_days', 'custom'], default: '2_days' },
  usersToNotify: [String],
  notificationSent: { type: Boolean, default: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Stats
  bookmarkCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  notifyCount: { type: Number, default: 0 },
}, {
  timestamps: true // adds createdAt + updatedAt automatically
});

// Indexes for performance
eventSchema.index({ deadline: 1 });
eventSchema.index({ isActive: 1 });
eventSchema.index({ isExpired: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ createdAt: -1 });
eventSchema.index({ title: 1, organization: 1 }); // for duplicate check

eventSchema.pre('save', function(next) {
  this.wasNew = this.isNew;
  next();
});

eventSchema.post('save', async function(doc) {
  if (doc.wasNew) {
    const User = mongoose.model('User');
    const Notification = mongoose.model('Notification');
    
    try {
      const users = await User.find().select('_id').lean();
      const notifications = users.map(u => ({
        userId: u._id,
        type: 'opportunity',
        title: 'New Event Added!',
        message: `A new opportunity "${doc.title}" has been added to the platform.`,
        isRead: false
      }));
      
      if (notifications.length > 0) {
        await Notification.insertMany(notifications, { ordered: false });
      }
    } catch (err) {
      console.error('Failed to send new event notification:', err);
    }
  }
});

eventSchema.post('insertMany', async function(docs) {
  if (!docs || docs.length === 0) return;
  const User = mongoose.model('User');
  const Notification = mongoose.model('Notification');
  
  try {
    const users = await User.find().select('_id').lean();
    let notifications = [];
    
    for (const doc of docs) {
      users.forEach(u => {
        notifications.push({
          userId: u._id,
          type: 'opportunity',
          title: 'New Event Added!',
          message: `A new opportunity "${doc.title}" has been added to the platform.`,
          isRead: false
        });
      });
    }
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications, { ordered: false });
    }
  } catch (err) {
    console.error('Failed to send bulk new event notifications:', err);
  }
});

module.exports = mongoose.model('Event', eventSchema);
