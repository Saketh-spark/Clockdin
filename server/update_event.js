const mongoose = require('mongoose');
const Event = require('./models/event.model');
require('dotenv').config();

async function updateHackOnEvent() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    const updatedEvent = await Event.findOneAndUpdate(
      { title: 'HackOn 3.0' }, // Match the event by title
      {
        description: "An updated description for HackOn 3.0.",
        deadline: new Date('2025-10-30'), // Update the deadline
        eventDate: new Date('2025-11-01'), // Update the event date
      },
      { new: true } // Return the updated document
    );

    if (updatedEvent) {
      console.log('Event updated:', updatedEvent);
    } else {
      console.log('Event not found');
    }
  } catch (err) {
    console.error('Error updating event:', err);
  } finally {
    mongoose.connection.close();
  }
}

updateHackOnEvent();