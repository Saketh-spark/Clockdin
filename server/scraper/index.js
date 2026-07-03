const { scrapeUnstop } = require('./unstop');
const { scrapeDevfolio } = require('./devfolio');
const { scrapeInternshala } = require('./internshala');
const { scrapeHackerEarth } = require('./hackerearth');
const ScraperLog = require('../models/ScraperLog');

async function runAllScrapers() {
  console.log('[Scraper] ─── Starting all scrapers at', new Date().toISOString(), '───');

  const summary = {
    totalAdded: 0,
    totalSkipped: 0,
    totalErrors: 0,
    results: {},
  };

  const run = async (name, fn) => {
    try {
      console.log(`[Scraper] Running ${name}...`);
      const result = await fn();
      summary.results[name] = result;
      summary.totalAdded += result.added || 0;
      summary.totalSkipped += result.skipped || 0;
      summary.totalErrors += (result.errors || []).length;
    } catch (err) {
      console.error(`[Scraper] ${name} failed completely:`, err.message);
      summary.results[name] = { error: err.message };
    }
  };

  // Run scrapers sequentially to avoid overwhelming memory with Puppeteer
  await run('unstop', scrapeUnstop);
  await run('devfolio', scrapeDevfolio);
  await run('internshala', scrapeInternshala);
  await run('hackerearth', scrapeHackerEarth);

  // Log run to DB
  try {
    await ScraperLog.create({
      ranAt: new Date(),
      totalAdded: summary.totalAdded,
      totalSkipped: summary.totalSkipped,
      details: summary.results,
    });
  } catch (err) {
    console.error('[Scraper] Failed to save scraper log:', err.message);
  }

  console.log('[Scraper] ─── All scrapers complete:', {
    added: summary.totalAdded,
    skipped: summary.totalSkipped,
    errors: summary.totalErrors,
  }, '───');

  // Trigger notification if any new events were found
  if (summary.totalAdded > 0) {
    const { distributeNewEventsNotification } = require('../utils/notifyNewEvents');
    distributeNewEventsNotification(summary.totalAdded);
  }

  return summary;
}

module.exports = { runAllScrapers };
