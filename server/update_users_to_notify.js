const mongoose = require('mongoose');
const Event = require('./models/event.model');
require('dotenv').config();

const updateUsersToNotify = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Update the event "AI Future Hack 2025"
    const result = await Event.findOneAndUpdate(
      { title: 'AI Future Hack 2025' },
      { $set: { usersToNotify: ['user1@example.com', 'user2@example.com'] } },
      { new: true }
    );

    if (result) {
      console.log('Event updated:', result.title);
      console.log('Updated usersToNotify:', result.usersToNotify);
    } else {
      console.log('Event not found');
    }

    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
  } catch (err) {
    console.error('Error:', err);
  }
};

updateUsersToNotify();