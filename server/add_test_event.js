const mongoose = require('mongoose');
const Event = require('./models/event.model');
require('dotenv').config();

async function addTestEvent() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Create a test event
    const testEvent = new Event({
      title: 'Test Event',
      description: 'This is a test event ending in 2 days.',
      eventDate: new Date('2025-10-25'),
      deadline: new Date('2025-10-25'),
      usersToNotify: ['2410080030@klh.edu.in'], // Updated email for test notification
    });

    await testEvent.save();
    console.log('Test event added successfully');
  } catch (err) {
    console.error('Error adding test event:', err);
  } finally {
    mongoose.connection.close();
  }
}

addTestEvent();