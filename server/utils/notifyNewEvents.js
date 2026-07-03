const User = require('../models/user.model');
const Notification = require('../models/notification.model');

/**
 * Distributes a notification to all users when new events are added to the platform.
 * @param {number} count The number of new events added.
 */
async function distributeNewEventsNotification(count) {
  if (!count || count <= 0) return;

  try {
    const users = await User.find().select('_id').lean();
    const notifications = users.map(u => ({
      userId: u._id,
      type: 'opportunity',
      title: 'New Events Available!',
      message: `${count} new opportunities have been added.`,
      isRead: false
    }));
    
    if (notifications.length > 0) {
      await Notification.insertMany(notifications, { ordered: false });
      console.log(`[Notifications] Distributed ${notifications.length} new event notifications for ${count} new events.`);
    }
  } catch (err) {
    console.error('[Notifications] Failed to distribute new event notifications:', err.message);
  }
}

module.exports = {
  distributeNewEventsNotification
};
