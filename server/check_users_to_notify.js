const mongoose = require('mongoose');
const Event = require('./models/event.model');
require('dotenv').config();

const checkUsersToNotify = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find the event "AI Future Hack 2025"
    const event = await Event.findOne({ title: 'AI Future Hack 2025' });

    if (event) {
      console.log('Event found:', event.title);
      console.log('Users to notify:', event.usersToNotify);
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

checkUsersToNotify();