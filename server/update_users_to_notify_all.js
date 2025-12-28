const mongoose = require('mongoose');
const Event = require('./models/event.model');
const User = require('./models/user.model');
require('dotenv').config();

const updateUsersToNotifyAll = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Fetch all user emails
    const users = await User.find({}, 'email');
    const allEmails = users.map(user => user.email);

    // Update the event "AI Future Hack 2025"
    const result = await Event.findOneAndUpdate(
      { title: 'AI Future Hack 2025' },
      { $set: { usersToNotify: allEmails } },
      { new: true }
    );

    if (result) {
      console.log('Event updated:', result.title);
      console.log('Updated usersToNotify with all registered users:', result.usersToNotify);
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

updateUsersToNotifyAll();