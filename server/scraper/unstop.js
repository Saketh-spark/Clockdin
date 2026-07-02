const puppeteer = require('puppeteer');
const { saveEvent } = require('./utils');

async function scrapeUnstop() {
  const results = { added: 0, skipped: 0, errors: [] };
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

    // Load hackathons page
    await page.goto('https://unstop.com/hackathons?page=1&per_page=20', {
      waitUntil: 'networkidle2',
      timeout: 45000,
    }).catch(() => console.log('[Unstop] Navigation timeout, continuing'));

    // Wait for dynamic content
    await new Promise(r => setTimeout(r, 4000));
    await page.evaluate(() => window.scrollBy(0, 2000));
    await new Promise(r => setTimeout(r, 2000));

    const rawEvents = await page.evaluate(() => {
      const extracted = [];

      // Broad card selector — Unstop changes class names often
      const cardCandidates = document.querySelectorAll(
        '[class*="card"], [class*="opportunity"], [class*="listing"], article'
      );

      cardCandidates.forEach(card => {
        try {
          // --- Title ---
          // Walk through candidates, pick the first one that is a real name
          const titleCandidates = card.querySelectorAll('h2, h3, h4, [class*="title"], [class*="name"]');
          let title = '';
          for (const el of titleCandidates) {
            const t = (el.innerText || '').trim();
            // Skip very short, or clearly a category/tab label
            if (t.length >= 5 && !/^(hackathon|internship|competition|event|challenge)s?$/i.test(t)) {
              title = t;
              break;
            }
          }
          if (!title) return;

          // --- Organization ---
          const orgEl = card.querySelector(
            '[class*="org"], [class*="company"], [class*="host"], [class*="brand"], [class*="sponsor"]'
          );
          const org = (orgEl?.innerText || '').trim();

          // --- Link — must go to a specific event page ---
          const linkEl =
            card.querySelector('a[href*="/p/"]') ||
            card.querySelector('a[href*="/hackathon/"]') ||
            card.querySelector('a[href*="/competition/"]') ||
            card.querySelector('a[href*="/internship/"]') ||
            card.querySelector('a[href]');
          let link = linkEl?.href || '';
          if (link && !link.startsWith('http')) link = 'https://unstop.com' + link;

          // Reject links that are just the homepage / listing
          if (!link || link === 'https://unstop.com' ||
              link === 'https://unstop.com/hackathons' ||
              link === 'https://unstop.com/') return;

          // --- Deadline text ---
          const deadlineEl = card.querySelector(
            '[class*="deadline"], [class*="reg-ends"], [class*="ends"], [class*="registration"]'
          );
          const deadlineText = (deadlineEl?.innerText || '').trim();

          // --- Location ---
          const locEl = card.querySelector('[class*="location"], [class*="venue"], [class*="city"]');
          const location = (locEl?.innerText || '').trim() || 'India';

          // --- Raw text for mode detection ---
          const rawText = (card.innerText || '').substring(0, 600);

          extracted.push({ title, organization: org, deadlineText, location, applyLink: link, rawText });
        } catch { /* skip broken card */ }
      });

      return extracted;
    });

    console.log(`[Unstop] Extracted ${rawEvents.length} raw candidates`);

    for (const raw of rawEvents) {
      try {
        // Parse deadline — skip if none found
        let deadline = parseDeadlineText(raw.deadlineText);

        if (!deadline) {
          console.log(`[Unstop] Skip (no deadline): ${raw.title}`);
          results.skipped++;
          continue;
        }

        const rawLower = (raw.rawText || '').toLowerCase();
        const isOnline = rawLower.includes('online') || rawLower.includes('virtual') || rawLower.includes('remote');
        const isHybrid = rawLower.includes('hybrid');

        const result = await saveEvent({
          title:        raw.title,
          organization: raw.organization || 'Unstop',
          category:     'hackathon',
          type:         'hackathon',
          description:  `${raw.title} — a hackathon listed on Unstop. Visit the apply link for full details, prizes, and registration.`,
          deadline,
          location:     raw.location || 'India',
          mode:         isOnline ? 'online' : isHybrid ? 'hybrid' : 'offline',
          applyLink:    raw.applyLink,
          link:         raw.applyLink,
          source:       'unstop',
          sourceUrl:    raw.applyLink,
          tags:         ['hackathon', 'unstop'],
          skills:       ['programming', 'problem solving'],
          isFeatured:   false,
          difficulty:   'intermediate',
          skillLevel:   'intermediate',
        });

        if (result.saved) { results.added++;   console.log(`[Unstop] Saved: ${raw.title}`); }
        else               { results.skipped++; }

      } catch (err) {
        console.error('[Unstop] Error processing:', err.message);
        results.errors.push(err.message);
      }
    }

  } catch (err) {
    console.error('[Unstop] Scraper failed:', err.message);
    results.errors.push(err.message);
  } finally {
    if (browser) await browser.close().catch(() => {});
  }

  console.log(`[Unstop] Done — Added: ${results.added}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);
  return results;
}

// ── Shared date parser ──────────────────────────────────────
function parseDeadlineText(text) {
  if (!text || !text.trim()) return null;
  const t = text.trim();

  // Standard JS parse first
  const direct = new Date(t);
  if (!isNaN(direct.getTime()) && direct > new Date()) return direct;

  // "15 Jan 2025" / "15 January 2025"
  const m1 = t.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m1) {
    const d = new Date(`${m1[2]} ${m1[1]} ${m1[3]}`);
    if (!isNaN(d.getTime()) && d > new Date()) return d;
  }

  // "Jan 15, 2025" / "January 15 2025"
  const m2 = t.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (m2) {
    const d = new Date(`${m2[1]} ${m2[2]} ${m2[3]}`);
    if (!isNaN(d.getTime()) && d > new Date()) return d;
  }

  // "2025-01-15"
  const m3 = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m3) {
    const d = new Date(`${m3[1]}-${m3[2]}-${m3[3]}`);
    if (!isNaN(d.getTime()) && d > new Date()) return d;
  }

  return null;
}

module.exports = { scrapeUnstop };
