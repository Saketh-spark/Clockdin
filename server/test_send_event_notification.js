const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Event = require('./models/event.model');
const User = require('./models/user.model'); // Import User model
require('dotenv').config();

// Setup nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendTestNotification() {
  const today = new Date();
  const twoDaysLater = new Date(today);
  twoDaysLater.setDate(today.getDate() + 2);

  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Adjust query to ignore time components
    const startOfDay = new Date(twoDaysLater);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(twoDaysLater);
    endOfDay.setHours(23, 59, 59, 999);

    // Fetch all registered users
    const users = await User.find({}, 'email');
    const userEmails = users.map(user => user.email);

    // Find events ending in 2 days (date-only match)
    const eventsEndingSoon = await Event.find({
      deadline: { $gte: startOfDay, $lte: endOfDay },
    });

    if (eventsEndingSoon.length === 0) {
      console.log('No events ending in 2 days.');
      return;
    }

    for (const event of eventsEndingSoon) {
      const notificationMessage = `The event "${event.title}" is ending on ${event.deadline.toLocaleDateString()}. Register now!\nDetails: ${event.description}`;

      for (const userEmail of userEmails) {
        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: userEmail,
          subject: `Event Ending Soon: ${event.title}`,
          text: notificationMessage,
        });
        console.log(`Notification sent to ${userEmail} for event ${event.title}`);
      }
    }
  } catch (err) {
    console.error('Error sending test notification:', err);
  } finally {
    mongoose.connection.close();
  }
}

sendTestNotification();