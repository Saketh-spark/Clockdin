require('dotenv').config();
const mongoose = require('mongoose');
const Reminder = require('./models/reminder.model');
const scheduler = require('./utils/scheduler');

const REMINDER_ID = process.argv[2] || '68f892c3be9ec61dcef9fdf5'; // default to test reminder

(async ()=>{
  try{
    await mongoose.connect(process.env.MONGO_URI);
    const r = await Reminder.findById(REMINDER_ID);
    if(!r){ console.error('Reminder not found', REMINDER_ID); process.exit(2); }
    console.log('Invoking sendReminder for', REMINDER_ID);
    const res = await scheduler.sendReminder(r);
    console.log('sendReminder result:', res);
    const updated = await Reminder.findById(REMINDER_ID);
    console.log('DB reminder sent flag now:', updated.sent);
    process.exit(0);
  }catch(err){ console.error(err); process.exit(1); }
})();
