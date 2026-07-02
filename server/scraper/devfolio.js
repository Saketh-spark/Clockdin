const puppeteer = require('puppeteer');
const { saveEvent } = require('./utils');

function parseDeadlineText(text) {
  if (!text || !text.trim()) return null;
  const t = text.trim();

  const direct = new Date(t);
  if (!isNaN(direct.getTime()) && direct > new Date()) return direct;

  const m1 = t.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m1) {
    const d = new Date(`${m1[2]} ${m1[1]} ${m1[3]}`);
    if (!isNaN(d.getTime()) && d > new Date()) return d;
  }

  const m2 = t.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (m2) {
    const d = new Date(`${m2[1]} ${m2[2]} ${m2[3]}`);
    if (!isNaN(d.getTime()) && d > new Date()) return d;
  }

  // Date range "Jan 15 - Jan 17, 2025" → use the last date as deadline
  const rangeMatch = t.match(/([A-Za-z]+\s+\d{1,2})\s*[-–]\s*([A-Za-z]+\s+\d{1,2}),?\s+(\d{4})/);
  if (rangeMatch) {
    const d = new Date(`${rangeMatch[2]}, ${rangeMatch[3]}`);
    if (!isNaN(d.getTime()) && d > new Date()) return d;
  }

  return null;
}

async function scrapeDevfolio() {
  const results = { added: 0, skipped: 0, errors: [] };
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto('https://devfolio.co/hackathons', {
      waitUntil: 'networkidle2',
      timeout: 45000,
    }).catch(() => console.log('[Devfolio] Navigation timeout, continuing'));

    // Wait + scroll for lazy loaded cards
    await new Promise(r => setTimeout(r, 4000));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await new Promise(r => setTimeout(r, 2000));

    const rawEvents = await page.evaluate(() => {
      const extracted = [];

      // Devfolio uses styled-components — class names are hashed.
      // We target by structure: look for anchors pointing to *.devfolio.co
      const anchors = document.querySelectorAll('a[href]');

      const seen = new Set();
      anchors.forEach(a => {
        try {
          const href = a.href || '';
          // Must be a specific hackathon subdomain, not just devfolio.co
          if (!href.match(/https?:\/\/[^.]+\.devfolio\.co\/?$/)) return;
          if (seen.has(href)) return;
          seen.add(href);

          // Traverse up to find the card container
          const card = a.closest('[class]') || a.parentElement;

          // Title — first heading inside card or link text
          const headings = card?.querySelectorAll('h1, h2, h3, h4, h5') || [];
          let title = '';
          for (const h of headings) {
            const t = (h.innerText || '').trim();
            if (t.length >= 4) { title = t; break; }
          }
          if (!title) title = (a.innerText || '').trim();
          if (!title || title.length < 4) return;

          // Dates
          let dateText = '';
          if (card) {
            const dateEls = card.querySelectorAll('time, [class*="date"], [class*="Date"], [class*="period"]');
            dateEls.forEach(el => { dateText += ' ' + (el.innerText || '').trim(); });
          }

          // Location
          const locEl = card?.querySelector('[class*="location"], [class*="Location"], [class*="venue"]');
          const location = (locEl?.innerText || '').trim();

          // Prize
          const prizeEl = card?.querySelector('[class*="prize"], [class*="Prize"]');
          const prize = (prizeEl?.innerText || '').trim();

          extracted.push({
            title,
            applyLink: href,
            dateText:  dateText.trim(),
            location,
            prize,
          });
        } catch { /* skip */ }
      });

      return extracted;
    });

    console.log(`[Devfolio] Extracted ${rawEvents.length} raw candidates`);

    for (const raw of rawEvents) {
      try {
        // Require a parseable future deadline
        const deadline = parseDeadlineText(raw.dateText);
        if (!deadline) {
          console.log(`[Devfolio] Skip (no deadline): ${raw.title}`);
          results.skipped++;
          continue;
        }

        const isOnline = !raw.location || raw.location.toLowerCase().includes('online') ||
                         raw.location.toLowerCase().includes('virtual');

        let desc = `${raw.title} — a hackathon on Devfolio.`;
        if (raw.prize) desc += ` Prize: ${raw.prize}.`;
        desc += ' Apply and collaborate with developers to build amazing projects.';

        const result = await saveEvent({
          title:        raw.title,
          organization: 'Devfolio',
          category:     'hackathon',
          type:         'hackathon',
          description:  desc,
          deadline,
          location:     raw.location || 'Online',
          mode:         isOnline ? 'online' : 'offline',
          applyLink:    raw.applyLink,
          link:         raw.applyLink,
          source:       'devfolio',
          sourceUrl:    raw.applyLink,
          tags:         ['hackathon', 'devfolio', 'coding'],
          skills:       ['programming', 'web development', 'blockchain'],
          stipendPerks: raw.prize ? `Prize: ${raw.prize}` : '',
          isFeatured:   false,
          difficulty:   'intermediate',
          skillLevel:   'intermediate',
        });

        if (result.saved) { results.added++;   console.log(`[Devfolio] Saved: ${raw.title}`); }
        else               { results.skipped++; }

      } catch (err) {
        console.error('[Devfolio] Error:', err.message);
        results.errors.push(err.message);
      }
    }

  } catch (err) {
    console.error('[Devfolio] Scraper failed:', err.message);
    results.errors.push(err.message);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  console.log(`[Devfolio] Done — Added: ${results.added}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);
  return results;
}

module.exports = { scrapeDevfolio };
