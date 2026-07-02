const cron = require('node-cron');
const Event = require('../models/event.model');
const NotificationSubscription = require('../models/notificationSubscription.model');
const NotifyMe = require('../models/notifyMe.model');

/**
 * Delete all events where deadline has passed.
 * Also removes associated NotificationSubscription and NotifyMe records.
 */
async function deleteExpiredEvents() {
  const now = new Date();

  try {
    // Find expired events not yet marked
    const expiredEvents = await Event.find({
      deadline: { $lt: now },
      isExpired: false,
    }).select('_id title');

    console.log(`[Cleanup] Found ${expiredEvents.length} expired events to delete`);

    if (expiredEvents.length === 0) return { deleted: 0, expiredIds: [] };

    const expiredIds = expiredEvents.map(e => e._id);

    // Clean up old-style notification subscriptions
    const notifResult = await NotificationSubscription.deleteMany({ event: { $in: expiredIds } });
    console.log(`[Cleanup] Removed ${notifResult.deletedCount} notification subscriptions`);

    // Clean up new NotifyMe subscriptions
    const notifyMeResult = await NotifyMe.deleteMany({ eventId: { $in: expiredIds } });
    if (notifyMeResult.deletedCount > 0) {
      console.log(`[Cleanup] Removed ${notifyMeResult.deletedCount} NotifyMe subscription(s)`);
    }

    // Delete expired events
    const deleteResult = await Event.deleteMany({ _id: { $in: expiredIds } });
    console.log(`[Cleanup] Deleted ${deleteResult.deletedCount} expired events`);

    return { deleted: deleteResult.deletedCount, expiredIds };
  } catch (err) {
    console.error('[Cleanup] Error deleting expired events:', err.message);
    throw err;
  }
}

/**
 * Mark events expiring within 24 hours as featured (optional boost).
 * And mark events past deadline as isExpired (soft flag, before hard delete).
 */
async function markExpiredEvents() {
  const now = new Date();
  try {
    await Event.updateMany(
      { deadline: { $lt: now }, isExpired: false },
      { $set: { isExpired: true, isActive: false } }
    );
  } catch (err) {
    console.error('[Cleanup] Error marking expired:', err.message);
  }
}

// Schedule: runs every day at 3:00 AM IST = 21:30 UTC previous day
cron.schedule('30 21 * * *', async () => {
  console.log('[Cleanup Cron] Running daily expired event cleanup (3AM IST)...');
  try {
    await markExpiredEvents();
    const result = await deleteExpiredEvents();
    console.log('[Cleanup Cron] Done. Deleted:', result.deleted);
  } catch (err) {
    console.error('[Cleanup Cron] Failed:', err.message);
  }
});

// Also runs every 6 hours to catch missed events
cron.schedule('0 */6 * * *', async () => {
  console.log('[Cleanup Cron] Running 6-hour check...');
  try {
    await markExpiredEvents();
    await deleteExpiredEvents();
  } catch (err) {
    console.error('[Cleanup Cron] 6-hour check failed:', err.message);
  }
});

console.log('[Cleanup] Scheduled: daily at 3AM IST + every 6 hours');

module.exports = { deleteExpiredEvents, markExpiredEvents };
