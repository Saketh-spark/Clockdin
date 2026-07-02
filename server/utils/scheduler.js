const nodemailer = require('nodemailer');
const cron = require('node-cron');
const Reminder = require('../models/reminder.model');
const Event = require('../models/event.model');
const NotificationSubscription = require('../models/notificationSubscription.model');
const Notification = require('../models/notification.model');
const axios = require('axios');

const timers = new Map();

function makeTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

const transporter = makeTransporter();

async function sendReminder(reminder) {
  try {
    // Ensure populated event
    const rem = await Reminder.findById(reminder._id).populate('event');
    const to = rem.email;
    const event = rem.event;

    // Skip if event has already passed
    const eventDate = event?.eventDate || event?.deadline;
    if (eventDate && new Date(eventDate) < new Date()) {
      console.log(`Skipping reminder ${rem._id} — event "${event?.title}" has already passed.`);
      rem.sent = true;
      await rem.save();
      return { success: false, skipped: true, reason: 'event already passed' };
    }

    // If event is null, it's a personal event
    if (!event) {
      const remWithUser = await Reminder.findById(reminder._id).populate('user', 'name');
      const reminderTitle = remWithUser.title || 'Personal Event';
      const userName = (remWithUser.user && remWithUser.user.name) ? remWithUser.user.name.split(' ')[0] : 'User';
      const { getPersonalEventTemplate } = require('./emailTemplates');
      const htmlContent = getPersonalEventTemplate(userName, reminderTitle, remWithUser.remindAt);

      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject: `Reminder: ${reminderTitle}`,
        text: `Hi ${userName}! This is your personal reminder for: "${reminderTitle}".`,
        html: htmlContent
      });
      rem.sent = true;
      await rem.save();
      
      // Also create an in-app notification exactly at this time!
      if (remWithUser.user) {
        await Notification.create({
          userId:  remWithUser.user._id,
          type:    'reminder',
          title:   `${reminderTitle} — Reminder`,
          message: `Your scheduled reminder for "${reminderTitle}" is now due.`,
          isRead:    false,
          sentEmail: true, // We already sent the email
        });
      }

      console.log('Scheduled personal reminder sent', { id: rem._id.toString(), messageId: info.messageId });
      if (timers.has(rem._id.toString())) {
        clearTimeout(timers.get(rem._id.toString()));
        timers.delete(rem._id.toString());
      }
      return { success: true, info };
    }

    const remWithUser = await Reminder.findById(reminder._id).populate('user', 'name');
    const userName = (remWithUser.user && remWithUser.user.name) ? remWithUser.user.name.split(' ')[0] : 'User';
    const { getPersonalEventTemplate } = require('./emailTemplates');
    
    const eventTitle = event?.title || 'Event';
    const targetDate = event?.eventDate || event?.deadline;
    const typeLabel = event?.category ? (event.category.charAt(0).toUpperCase() + event.category.slice(1) + ' Event') : 'Scheduled Event';
    
    const htmlContent = getPersonalEventTemplate(userName, eventTitle, targetDate, typeLabel);

    const subject = `Event Reminder: ${eventTitle}`;
    const text = `Hi ${userName}! This is a reminder for the event "${eventTitle}" happening on ${targetDate ? new Date(targetDate).toLocaleDateString() : 'the scheduled date'}.`;
    const info = await transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, text, html: htmlContent });
    rem.sent = true;
    await rem.save();
    console.log('Scheduled reminder sent', { id: rem._id.toString(), messageId: info.messageId });
    // clear timer if present
    if (timers.has(rem._id.toString())) {
      clearTimeout(timers.get(rem._id.toString()));
      timers.delete(rem._id.toString());
    }
    return { success: true, info };
  } catch (err) {
    console.error('Error in sendReminder:', err.message);
    return { success: false, error: err.message };
  }
}

function scheduleReminder(reminder) {
  try {
    const id = reminder._id ? reminder._id.toString() : reminder.id;
    // avoid scheduling already sent reminders
    if (reminder.sent) return;
    const remindAt = new Date(reminder.remindAt);
    const now = new Date();
    const delay = remindAt.getTime() - now.getTime();
    if (delay <= 0) {
      // due now or in past => send immediately
      sendReminder(reminder);
      return;
    }
    // protect against too-large delays
    const MAX_DELAY = 0x7fffffff; // ~24.8 days
    const effectiveDelay = delay > MAX_DELAY ? MAX_DELAY : delay;
    const timer = setTimeout(async () => {
      await sendReminder(reminder);
      // if the original delay exceeded MAX_DELAY, reschedule remaining time
      if (delay > MAX_DELAY) {
        // compute remaining time
        const remaining = remindAt.getTime() - Date.now();
        if (remaining > 0) scheduleReminder({ ...reminder, remindAt });
      }
    }, effectiveDelay);
    timers.set(id, timer);
    console.log('Reminder scheduled', { id, remindAt });
  } catch (err) {
    console.error('Error scheduling reminder:', err.message);
  }
}

async function rescheduleAll() {
  try {
    const now = new Date();
    const ONE_HOUR_AGO = new Date(now.getTime() - 60 * 60 * 1000);

    // Auto-expire stale reminders (overdue by more than 1 hour) instead of firing them
    const expired = await Reminder.updateMany(
      { sent: false, remindAt: { $lt: ONE_HOUR_AGO } },
      { $set: { sent: true } }
    );
    if (expired.modifiedCount > 0) {
      console.log(`rescheduleAll: expired ${expired.modifiedCount} stale reminder(s).`);
    }

    // Only schedule reminders that are still in the future (or due within the last hour)
    const reminders = await Reminder.find({
      sent: false,
      remindAt: { $exists: true, $gte: ONE_HOUR_AGO }
    }).populate('event');

    let scheduled = 0;
    for (const r of reminders) {
      // Also skip if the event itself has already passed
      const eventDate = r.event?.eventDate || r.event?.deadline;
      if (eventDate && new Date(eventDate) < now) {
        r.sent = true;
        await r.save();
        console.log(`rescheduleAll: skipped reminder for past event "${r.event?.title}".`);
        continue;
      }
      scheduleReminder(r);
      scheduled++;
    }
    console.log(`Rescheduled ${scheduled} reminder(s).`);
  } catch (err) {
    console.error('Error rescheduling reminders:', err.message);
  }
}

async function notifyBookmarkedEvents() {
  try {
    const response = await axios.post('http://localhost:3000/api/reminders/bookmark-notifications');
    console.log('Bookmarked events notification job completed:', response.data);
  } catch (err) {
    console.error('Error in notifyBookmarkedEvents:', err.message);
  }
}

function scheduleBookmarkedNotifications() {
  const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  setInterval(notifyBookmarkedEvents, ONE_DAY);
  console.log('Scheduled daily job for bookmarked events notifications');
}

async function sendDeadlineNotifications() {
  const now = new Date();
  try {
    const events = await Event.find({
      deadline: { $exists: true, $gte: now, $lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) },
      status: 'published',
      notificationWindow: '2_days',
    });
    console.log(
      `[${now.toISOString()}] Deadline cron started - found ${events.length} event(s) (now - ${new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString()})`
    );

    for (const event of events) {
      const subs = await NotificationSubscription.find({ event: event._id, sent: false, subscribed: true })
        .populate({ path: 'user', select: 'name email' });
      if (!subs.length) continue;

      const subject = `Reminder: ${event.title} ends in 2 days`;
      const softDeadline = new Date(event.deadline);
      const mode = event.mode || event.type || 'Online';
      const bodyTemplate = user =>
        `Hi ${user.name || 'Participant'},\n\n` +
        `The event "${event.title}" has its deadline on ${softDeadline.toDateString()}.\n` +
        `Mode: ${mode}.\n` +
        `View the event: ${event.applyLink || 'https://clockdin000007.vercel.app'},\n\n` +
        `Best,\nClockdin Team`;

      console.log(`Dispatching deadline notifications for event: ${event.title} to ${subs.length} subscriber(s)`);

      for (const sub of subs) {
        const user = sub.user;
        if (!user || !user.email) continue;
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject,
            text: bodyTemplate(user),
          });
          sub.sent = true;
          sub.notificationSentAt = new Date();
          await sub.save();
          console.log('Notification sent', { event: event.title, user: user.email, subId: sub._id.toString() });
        } catch (err) {
          console.error('Error sending deadline notification', { error: err.message, event: event.title, user: user.email });
        }
      }
    }
  } catch (err) {
    console.error('Error while sending deadline notifications:', err.message);
  }
}

function scheduleDeadlineNotifications() {
  cron.schedule('*/1 * * * *', async () => {
    await sendDeadlineNotifications();
  });
  console.log('Scheduled cron job for deadline-based notifications (every minute)');
}

// Call this function to start the scheduler
scheduleBookmarkedNotifications();
scheduleDeadlineNotifications();

module.exports = {
  sendReminder,
  scheduleReminder,
  rescheduleAll,
  notifyBookmarkedEvents,
  scheduleBookmarkedNotifications,
  sendDeadlineNotifications,
  scheduleDeadlineNotifications,
};
