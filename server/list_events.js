const mongoose = require('mongoose');
const Event = require('./models/event.model');
require('dotenv').config();

async function listEvents() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    const events = await Event.find();
    console.log('All Events:', events);
  } catch (err) {
    console.error('Error listing events:', err);
  } finally {
    mongoose.connection.close();
  }
}

listEvents();