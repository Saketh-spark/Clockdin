const mongoose = require('mongoose');
const Event = require('./models/event.model');
require('dotenv').config();

async function updateEventDates() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    const updatedEvent = await Event.findOneAndUpdate(
      { _id: '68f8a524d23aafd76e1912d5' }, // Use the unique MongoDB _id
      {
        deadline: new Date('2025-10-26'), // Update the deadline
        eventDate: new Date('2025-10-28'), // Update the event date
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

updateEventDates();