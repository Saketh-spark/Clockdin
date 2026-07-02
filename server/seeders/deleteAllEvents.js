require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../models/event.model');
const Reminder = require('../models/reminder.model');

async function deleteAllEvents() {
  try {
    await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Deleting all scraped events...');
    
    // Delete all events
    const eventResult = await Event.deleteMany({});
    console.log(`Deleted ${eventResult.deletedCount} events.`);
    
    // Also delete any reminders linked to events (optional, but keeps DB clean)
    // Actually, we'll just delete the events as requested. 
    
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

deleteAllEvents();
