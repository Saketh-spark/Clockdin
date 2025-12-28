export const getNotificationStorageKeys = () => {
  try {
    const rawUser = localStorage.getItem('clockdin_user');
    let suffix = '';
    if (rawUser) {
      const user = JSON.parse(rawUser);
      const userId = user?.id || user?._id;
      if (userId) suffix = `_${userId}`;
    }
    return {
      idsKey: `notify_event_ids${suffix}`,
      itemsKey: `notify_event_items${suffix}`,
    };
  } catch (err) {
    return {
      idsKey: 'notify_event_ids',
      itemsKey: 'notify_event_items',
    };
  }
};