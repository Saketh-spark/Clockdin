/**
 * testNotifyFlow.js
 *
 * 1. Adds a test event with deadline = TODAY (so the 0-day checkpoint fires)
 * 2. Subscribes a test user (you) to it via NotifyMe
 * 3. Immediately runs checkDeadlineReminders() to send the email NOW
 *
 * Run: node ./seeders/testNotifyFlow.js <your-email>
 *
 * Example: node ./seeders/testNotifyFlow.js 2410080030@klh.edu.in
 */

require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  const userEmail = process.argv[2];
  if (!userEmail) {
    console.error('\n❌  Usage: node ./seeders/testNotifyFlow.js <your-email>\n');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('✅  Connected to MongoDB');

  const Event   = require('../models/event.model');
  const User    = require('../models/user.model');
  const NotifyMe = require('../models/notifyMe.model');

  // ── 1. Find the user ──────────────────────────────────────────
  const user = await User.findOne({ email: userEmail });
  if (!user) {
    console.error(`\n❌  No user found with email: ${userEmail}`);
    console.log('    Make sure you are registered & logged in once.\n');
    process.exit(1);
  }
  console.log(`✅  Found user: ${user.name} (${user.email})`);

  // ── 2. Create a test event with deadline = today ──────────────
  //    We set deadline to end-of-today so daysLeft = 0 → fires "Closes TODAY"
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 0);

  // Check if test event already exists (avoid duplicates on re-run)
  let testEvent = await Event.findOne({ title: '[TEST] Clockdin Notify Me Verification' });
  if (testEvent) {
    console.log('ℹ️   Test event already exists — reusing it');
    // Reset its deadline to today in case it changed
    testEvent.deadline = todayEnd;
    await testEvent.save();
  } else {
    testEvent = await Event.create({
      title: '[TEST] Clockdin Notify Me Verification',
      organization: 'Clockdin Test Suite',
      category: 'hackathon',
      skillLevel: 'beginner',
      description: 'This is a test event to verify that the Notify Me email system is working correctly. You can delete it after testing.',
      location: 'Online',
      deadline: todayEnd,
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // event is 7 days from now
      duration: '1 day',
      mode: 'online',
      tags: ['Test', 'NotifyMe', 'Debug'],
      link: 'http://localhost:3000',
      isActive: true,
    });
    console.log(`✅  Created test event: ${testEvent.title}`);
  }
  console.log(`    Deadline set to: ${testEvent.deadline.toLocaleString()}`);

  // ── 3. Subscribe the user to this event ──────────────────────
  try {
    await NotifyMe.create({
      userId:      user._id,
      eventId:     testEvent._id,
      sentAt7Days: false,
      sentAt3Days: false,
      sentAt1Day:  false,
      sentAtDay0:  false,   // ← this will fire immediately
    });
    console.log(`✅  Subscribed ${user.email} to test event`);
  } catch (err) {
    if (err.code === 11000) {
      console.log('ℹ️   Already subscribed — resetting flags so the email fires again');
      await NotifyMe.findOneAndUpdate(
        { userId: user._id, eventId: testEvent._id },
        { sentAt7Days: false, sentAt3Days: false, sentAt1Day: false, sentAtDay0: false }
      );
    } else throw err;
  }

  // ── 4. Trigger the deadline check RIGHT NOW ────────────────────
  console.log('\n🚀  Triggering deadline reminder check NOW...\n');
  const { checkDeadlineReminders } = require('../services/notificationWorker');
  await checkDeadlineReminders();

  console.log('\n✅  Done! Check your inbox at:', user.email);
  console.log('    (Also check spam / promotions folder)\n');
  console.log('💡  To clean up the test event later, run:');
  console.log('    node ./seeders/deleteTestEvent.js\n');
  process.exit(0);
}

run().catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
