/**
 * scheduler.js
 *
 * CRON-BASED reminder system — survives Render restarts.
 *
 * Every minute, checks the database for Reminder documents
 * where remindAt <= now and sent === false. Sends email + creates
 * in-app notification for each. Works for ALL users automatically.
 *
 * The old setTimeout-based approach is completely removed because
 * Render (free tier) restarts the server periodically, destroying
 * all in-memory timers and causing emails to silently never send.
 */

const nodemailer = require('nodemailer');
const cron       = require('node-cron');
const Reminder   = require('../models/reminder.model');
const Event      = require('../models/event.model');
const Notification = require('../models/notification.model');
const User         = require('../models/user.model');
const NotificationSubscription = require('../models/notificationSubscription.model');

// ── Email transporter ─────────────────────────────────────────
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

// ── sendReminder: send one reminder email + in-app notification ─
async function sendReminder(reminder) {
  try {
    // Always re-fetch from DB so we get the latest sent status
    const rem = await Reminder.findById(reminder._id)
      .populate('event')
      .populate('user', 'name email emailNotifications');

    if (!rem) return { success: false, error: 'Reminder not found' };
    if (rem.sent) return { success: false, skipped: true, reason: 'already sent' };

    const to    = rem.email;
    const event = rem.event;

    // ── Personal event reminder (no linked event doc) ─────────
    if (!event) {
      const reminderTitle = rem.title || 'Personal Event';
      const userName = (rem.user && rem.user.name)
        ? rem.user.name.split(' ')[0]
        : 'User';

      const { getPersonalEventTemplate } = require('./emailTemplates');
      const htmlContent = getPersonalEventTemplate(userName, reminderTitle, rem.remindAt);

      // Respect email preference
      if (rem.user && rem.user.emailNotifications === false) {
        console.log(`[Scheduler] Email skipped (preference off) for ${to}`);
      } else {
        const info = await transporter.sendMail({
          from:    process.env.EMAIL_USER,
          to,
          subject: `Reminder: ${reminderTitle}`,
          text:    `Hi ${userName}! This is your personal reminder for: "${reminderTitle}".`,
          html:    htmlContent
        });
        console.log('[Scheduler] Personal reminder email sent', {
          id: rem._id.toString(), to, messageId: info.messageId
        });
      }

      // Mark sent
      rem.sent = true;
      await rem.save();

      // In-app notification
      if (rem.user) {
        try {
          await Notification.create({
            userId:  rem.user._id,
            type:    'reminder',
            title:   `${reminderTitle} — Reminder`,
            message: `Your scheduled reminder for "${reminderTitle}" is now due.`,
            isRead:  false,
          });
        } catch (notifErr) {
          console.error('[Scheduler] Failed to create in-app notification:', notifErr.message);
        }
      }

      return { success: true };
    }

    // ── Linked-event reminder ─────────────────────────────────
    const remWithUser = await Reminder.findById(rem._id).populate('user', 'name emailNotifications');
    const userName = (remWithUser.user && remWithUser.user.name)
      ? remWithUser.user.name.split(' ')[0]
      : 'User';

    const { getPersonalEventTemplate } = require('./emailTemplates');
    const eventTitle = event.title || 'Event';
    const targetDate = event.eventDate || event.deadline;
    const typeLabel  = event.category
      ? (event.category.charAt(0).toUpperCase() + event.category.slice(1) + ' Event')
      : 'Scheduled Event';

    const htmlContent = getPersonalEventTemplate(userName, eventTitle, targetDate, typeLabel);
    const subject = `Event Reminder: ${eventTitle}`;
    const text    = `Hi ${userName}! Reminder for "${eventTitle}" on ${
      targetDate ? new Date(targetDate).toLocaleDateString() : 'the scheduled date'
    }.`;

    if (remWithUser.user && remWithUser.user.emailNotifications === false) {
      console.log(`[Scheduler] Email skipped (preference off) for ${to}`);
    } else {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER, to, subject, text, html: htmlContent
      });
      console.log('[Scheduler] Event reminder email sent', {
        id: rem._id.toString(), to, messageId: info.messageId
      });
    }

    rem.sent = true;
    await rem.save();

    return { success: true };
  } catch (err) {
    console.error('[Scheduler] Error in sendReminder:', err.message);
    return { success: false, error: err.message };
  }
}

// ── checkDueReminders: cron task, runs every minute ───────────
let isRunning = false;
async function checkDueReminders() {
  if (isRunning) return; // prevent overlap
  isRunning = true;
  try {
    const now = new Date();

    // Find all unsent reminders that are due (remindAt <= now)
    const dueReminders = await Reminder.find({
      sent:     false,
      remindAt: { $lte: now }
    });

    if (dueReminders.length === 0) {
      isRunning = false;
      return;
    }

    console.log(`[Scheduler] ${dueReminders.length} due reminder(s) found — processing...`);

    for (const rem of dueReminders) {
      await sendReminder(rem);
    }

    console.log(`[Scheduler] Done processing ${dueReminders.length} reminder(s).`);
  } catch (err) {
    console.error('[Scheduler] checkDueReminders error:', err.message);
  } finally {
    isRunning = false;
  }
}

// ── rescheduleAll: called on server startup ───────────────────
// No-op now (cron does the work), kept for backward compatibility
async function rescheduleAll() {
  console.log('[Scheduler] rescheduleAll: cron-based polling is active — no timers needed.');
}

// Kept for backward compatibility with routes/users.js
function scheduleReminder(_reminder) {
  // Nothing to do — the cron job will pick it up within 1 minute
  console.log('[Scheduler] scheduleReminder called — cron will deliver within 1 minute.');
}

// ── OLD deadline-based NotificationSubscription system ────────
// Kept for backward compatibility (still used by some routes)
async function sendDeadlineNotifications() {
  const now = new Date();
  try {
    const events = await Event.find({
      deadline: { $exists: true, $gte: now, $lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) },
      status: 'published',
      notificationWindow: '2_days',
    });

    for (const event of events) {
      const subs = await NotificationSubscription.find({ event: event._id, sent: false, subscribed: true })
        .populate({ path: 'user', select: 'name email' });
      if (!subs.length) continue;

      const subject     = `Reminder: ${event.title} ends in 2 days`;
      const softDeadline = new Date(event.deadline);
      const mode        = event.mode || event.type || 'Online';
      const bodyTemplate = u =>
        `Hi ${u.name || 'Participant'},\n\n` +
        `The event "${event.title}" has its deadline on ${softDeadline.toDateString()}.\n` +
        `Mode: ${mode}.\n` +
        `View the event: ${event.applyLink || 'https://clockdin-one.vercel.app'}\n\n` +
        `Best,\nClockdin Team`;

      for (const sub of subs) {
        const user = sub.user;
        if (!user || !user.email) continue;
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to:   user.email,
            subject,
            text: bodyTemplate(user),
          });
          sub.sent = true;
          sub.notificationSentAt = new Date();
          await sub.save();
        } catch (err) {
          console.error('[Scheduler] Error sending deadline notification:', err.message);
        }
      }
    }
  } catch (err) {
    console.error('[Scheduler] sendDeadlineNotifications error:', err.message);
  }
}

function scheduleDeadlineNotifications() {
  cron.schedule('*/1 * * * *', async () => {
    await sendDeadlineNotifications();
  });
  console.log('[Scheduler] Legacy deadline notification cron started (every minute).');
}

function scheduleBookmarkedNotifications() {
  // No-op — bookmarked notifications are handled synchronously in routes/users.js
  console.log('[Scheduler] Bookmarked notifications handled synchronously.');
}

async function notifyBookmarkedEvents() {
  // No-op — kept for backward compatibility
}

// ── START THE CRON JOBS ───────────────────────────────────────
// Every minute: check DB for due reminders and send emails
cron.schedule('* * * * *', async () => {
  await checkDueReminders();
});
console.log('[Scheduler] Personal reminder cron started — polling every minute.');

scheduleDeadlineNotifications();

// ─────────────────────────────────────────────────────────────
module.exports = {
  sendReminder,
  scheduleReminder,
  rescheduleAll,
  checkDueReminders,
  notifyBookmarkedEvents,
  scheduleBookmarkedNotifications,
  sendDeadlineNotifications,
  scheduleDeadlineNotifications,
};
