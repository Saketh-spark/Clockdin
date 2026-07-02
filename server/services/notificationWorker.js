/**
 * notificationWorker.js
 *
 * Runs two cron jobs:
 *   1. Every hour  → check deadline reminders for "Notify Me" subscriptions
 *                    Uses NotifyMe model (per-user per-event with idempotent flags)
 *                    Sends styled HTML email at 7d / 3d / 1d / 0d checkpoints
 *   2. Every 5 min → check personal event reminders stored in user.myEvents
 *
 * Import this file once from server.js (after mongoose connects).
 */

const cron = require('node-cron');

// Lazy-load models to avoid circular-require issues at startup
let Notification, NotifyMe, User;
function loadModels() {
  if (!Notification) {
    Notification = require('../models/notification.model');
    NotifyMe     = require('../models/notifyMe.model');
    User         = require('../models/user.model');
  }
}

// ── 1. DEADLINE REMINDERS (NotifyMe-based with email) ────────
async function checkDeadlineReminders() {
  loadModels();
  const { sendDeadlineReminderEmail } = require('../utils/emailTemplates');

  try {
    // Populate both user and event in one query
    const subscriptions = await NotifyMe.find()
      .populate({ path: 'userId', select: 'name email emailNotifications eventReminders' })
      .populate({ path: 'eventId', select: 'title organization category description deadline eventDate location mode duration applyLink link isActive skillLevel' });

    const now = new Date();
    let emailsSent = 0;

    for (const sub of subscriptions) {
      const user  = sub.userId;
      const event = sub.eventId;

      // Clean up orphaned subscriptions
      if (!user || !event) {
        await NotifyMe.findByIdAndDelete(sub._id);
        continue;
      }

      // Clean up if event is no longer active
      if (!event.isActive) {
        await NotifyMe.findByIdAndDelete(sub._id);
        continue;
      }

      // Use deadline if available, otherwise fall back to eventDate
      const targetDate = event.deadline || event.eventDate;
      const usingEventDate = !event.deadline && !!event.eventDate;

      // Skip if neither deadline nor eventDate is set
      if (!targetDate) continue;

      const targetDt = new Date(targetDate);

      // Clean up if target date already passed
      if (targetDt < now) {
        await NotifyMe.findByIdAndDelete(sub._id);
        continue;
      }

      // Days until target date (ceiling)
      const msLeft = targetDt.getTime() - now.getTime();
      const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

      // ── Check each checkpoint ───────────────────────────────
      const checkpoints = [
        { days: 7, flag: 'sentAt7Days' },
        { days: 3, flag: 'sentAt3Days' },
        { days: 1, flag: 'sentAt1Day'  },
        { days: 0, flag: 'sentAtDay0'  },
      ];

      // Find all checkpoints that are due and unsent
      const dueCheckpoints = checkpoints.filter(cp => daysLeft <= cp.days && !sub[cp.flag]);

      if (dueCheckpoints.length > 0) {
        // checkpoints is sorted descending, so the last due checkpoint is the smallest/closest one
        const currentCp = dueCheckpoints[dueCheckpoints.length - 1];
        
        // Pass the actual daysLeft instead of currentCp.days so the text reflects reality (e.g. 'in 5 days')
        const sent = await sendReminderAndNotification(user, event, daysLeft, sendDeadlineReminderEmail, targetDate, usingEventDate);
        if (sent) {
          // Build update object to mark ALL due checkpoints as true so we don't spam retroactive reminders
          const updateFlags = {};
          for (const cp of dueCheckpoints) {
            updateFlags[cp.flag] = true;
          }
          await NotifyMe.findByIdAndUpdate(sub._id, { $set: updateFlags });
          emailsSent++;
        }
      }
    }

    if (emailsSent > 0) {
      console.log(`[NotifWorker] Deadline check complete — ${emailsSent} email(s) sent.`);
    }

  } catch (err) {
    console.error('[NotifWorker] checkDeadlineReminders error:', err.message);
  }
}

async function sendReminderAndNotification(user, event, daysLeft, emailFn, targetDate, usingEventDate) {
  try {
    const dateLabel = usingEventDate ? 'Event Date' : 'Deadline';
    const formattedDate = new Date(targetDate).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
    });

    // ── 1. Create in-app notification (always) ────────────────
    const notifTitle = daysLeft === 0
      ? `${event.title} is TODAY!`
      : daysLeft === 1
      ? `${event.title} is TOMORROW`
      : `${event.title} in ${daysLeft} days`;

    const notifMessage = `${dateLabel}: ${formattedDate}`;

    // Dedup: skip if in-app notification for this title already exists
    const alreadyExists = await Notification.findOne({
      userId: user._id,
      eventId: event._id,
      title: notifTitle
    });

    if (!alreadyExists) {
      await Notification.create({
        userId:  user._id,
        eventId: event._id,
        type:    'deadline',
        title:   notifTitle,
        message: notifMessage,
        isRead:  false,
        sentEmail: false
      });
    }
    // ── 2. Send email (respect user preference) ───────────────
    let emailSent = true;
    if (user.emailNotifications !== false) {
      // Pass a patched event so the email template uses the correct date
      const eventForEmail = usingEventDate
        ? { ...event.toObject ? event.toObject() : event, deadline: null }
        : event;
      emailSent = await emailFn(user, eventForEmail, daysLeft);
    } else {
      console.log(`[NotifWorker] Email skipped (preference off) for ${user.email}`);
    }

    // Only return true (which updates the DB flags to true) if the email successfully sent
    return emailSent;
  } catch (err) {
    console.error(`[NotifWorker] sendReminderAndNotification error for ${user.email}:`, err.message);
    return false;
  }
}
// ── Start cron jobs ───────────────────────────────────────────
// Run deadline check every hour
cron.schedule('0 * * * *', () => {
  console.log('[NotifWorker] Running hourly deadline reminder check...');
  checkDeadlineReminders();
});

console.log('[NotifWorker] Deadline reminder cron started.');

module.exports = { checkDeadlineReminders };
