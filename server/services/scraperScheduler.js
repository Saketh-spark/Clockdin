const cron = require('node-cron');
const { runAllScrapers } = require('../scraper');

// Run every day at 2:00 AM IST = 20:30 UTC previous day
cron.schedule('30 20 * * *', async () => {
  console.log('[Scraper Cron] Starting daily scrape (2AM IST)...');
  try {
    const result = await runAllScrapers();
    console.log('[Scraper Cron] Complete. Added:', result.totalAdded, '| Skipped:', result.totalSkipped);
  } catch (err) {
    console.error('[Scraper Cron] Failed:', err.message);
  }
});

console.log('[Scraper] Scheduled: daily at 2AM IST');

module.exports = {};
