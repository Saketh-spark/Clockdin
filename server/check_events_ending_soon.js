const mongoose = require('mongoose');
const Event = require('./models/event.model');
require('dotenv').config();

async function checkEventsEndingSoon() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    const today = new Date();
    const twoDaysLater = new Date(today);
    twoDaysLater.setDate(today.getDate() + 2);

    const startOfDay = new Date(twoDaysLater);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(twoDaysLater);
    endOfDay.setUTCHours(23, 59, 59, 999);

    console.log('Looking for events with deadline between:', startOfDay, 'and', endOfDay);

    const eventsEndingSoon = await Event.find({
      deadline: { $gte: startOfDay, $lte: endOfDay },
    });

    if (eventsEndingSoon.length > 0) {
      console.log('Events ending in 2 days:', eventsEndingSoon);
    } else {
      console.log('No events ending in 2 days.');
    }
  } catch (err) {
    console.error('Error checking events:', err);
  } finally {
    mongoose.connection.close();
  }
}

checkEventsEndingSoon();