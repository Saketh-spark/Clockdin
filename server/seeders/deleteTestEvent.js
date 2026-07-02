/**
 * deleteTestEvent.js
 * Removes the test event and its NotifyMe subscription.
 * Run: node ./seeders/deleteTestEvent.js
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('✅  Connected to MongoDB');

  const Event   = require('../models/event.model');
  const NotifyMe = require('../models/notifyMe.model');

  const testEvent = await Event.findOne({ title: '[TEST] Clockdin Notify Me Verification' });
  if (!testEvent) {
    console.log('ℹ️   No test event found — nothing to delete.');
    process.exit(0);
  }

  // Remove all NotifyMe subscriptions for this event
  const notifyResult = await NotifyMe.deleteMany({ eventId: testEvent._id });
  console.log(`✅  Removed ${notifyResult.deletedCount} NotifyMe subscription(s)`);

  // Delete the event
  await Event.deleteOne({ _id: testEvent._id });
  console.log(`✅  Deleted test event: ${testEvent.title}`);
  console.log('\n🧹  Cleanup complete!\n');
  process.exit(0);
}

run().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
