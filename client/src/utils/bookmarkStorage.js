export const getBookmarkStorageKeys = () => {
  try {
    const rawUser = localStorage.getItem('clockdin_user');
    let suffix = '';
    if (rawUser) {
      const user = JSON.parse(rawUser);
      const userId = user?.id || user?._id;
      if (userId) suffix = `_${userId}`;
    }
    return {
      idsKey: `bookmarkedEvents${suffix}`,
      dataKey: `bookmarkedEventsData${suffix}`,
    };
  } catch (err) {
    return {
      idsKey: 'bookmarkedEvents',
      dataKey: 'bookmarkedEventsData',
    };
  }
};