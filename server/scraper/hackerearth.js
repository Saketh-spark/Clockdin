const axios = require('axios');
const cheerio = require('cheerio');
const { saveEvent } = require('./utils');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

function parseDateText(text) {
  if (!text) return null;
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

  return null;
}

async function scrapeHackerEarth() {
  const results = { added: 0, skipped: 0, errors: [] };

  // ── Strategy 1: HackerEarth public API ──────────────────────
  let apiItems = [];
  try {
    const apiRes = await axios.get(
      'https://www.hackerearth.com/api/v2/challenges/?type=hackathon&status=ongoing,upcoming&limit=20',
      { headers: { ...HEADERS, Accept: 'application/json' }, timeout: 15000 }
    );
    if (apiRes.data && Array.isArray(apiRes.data.results)) {
      apiItems = apiRes.data.results;
      console.log(`[HackerEarth] API returned ${apiItems.length} items`);
    }
  } catch (apiErr) {
    console.log('[HackerEarth] API unavailable:', apiErr.message);
  }

  // Process API items
  for (const item of apiItems) {
    try {
      const title = (item.title || item.name || '').trim();
      if (!title || title.length < 5) { results.skipped++; continue; }

      const applyLink = item.url ||
        (item.slug ? `https://www.hackerearth.com/challenges/competitive/${item.slug}/` : '');
      if (!applyLink || applyLink === 'https://www.hackerearth.com') {
        results.skipped++;
        continue;
      }

      const deadline = parseDateText(item.end_tz || item.registration_end_tz) ||
                       parseDateText(item.end_date);
      if (!deadline) { results.skipped++; continue; }

      const eventDate = parseDateText(item.start_tz || item.start_date);

      const prize = item.prize_in_cash || item.prize || '';
      let description = `${title} — a coding challenge on HackerEarth.`;
      if (prize) description += ` Prize pool: ${prize}.`;
      description += ' Compete with developers worldwide and improve your algorithmic skills.';

      const result = await saveEvent({
        title,
        organization: 'HackerEarth',
        category:     'competition',
        type:         'competition',
        description,
        deadline,
        eventDate:    eventDate || null,
        location:     'Online',
        mode:         'online',
        applyLink,
        link:         applyLink,
        source:       'hackerearth',
        sourceUrl:    applyLink,
        tags:         ['competition', 'coding', 'hackerearth', 'algorithms'],
        skills:       ['programming', 'algorithms', 'data structures', 'problem solving'],
        stipendPerks: prize || '',
        isFeatured:   false,
        difficulty:   'intermediate',
        skillLevel:   'intermediate',
      });

      if (result.saved) { results.added++;   console.log(`[HackerEarth] Saved (API): ${title}`); }
      else               { results.skipped++; }

    } catch (err) {
      console.error('[HackerEarth] API item error:', err.message);
      results.errors.push(err.message);
    }
  }

  // ── Strategy 2: HTML scrape (fallback / supplement) ─────────
  const scrapeUrls = [
    'https://www.hackerearth.com/challenges/',
    'https://www.hackerearth.com/hackathon/explore/',
  ];

  for (const url of scrapeUrls) {
    try {
      const response = await axios.get(url, { headers: HEADERS, timeout: 20000 });
      const $ = cheerio.load(response.data);

      const items = [];

      // HackerEarth renders a mix of challenge cards
      $('[class*="challenge-card"], [class*="hackathon-card"], .challenge-list .card-content, .hackathon-thumb').each((_, el) => {
        try {
          const title = $(el).find('h2, h3, h4, [class*="title"], [class*="name"]').first().text().trim();
          if (!title || title.length < 5) return;

          const rawHref = $(el).find('a').first().attr('href') || '';
          const fullLink = rawHref.startsWith('http') ? rawHref : `https://www.hackerearth.com${rawHref}`;

          // Must be a specific challenge page
          if (!fullLink || fullLink === 'https://www.hackerearth.com' || fullLink === url) return;

          const dateText = $(el).find('[class*="date"], [class*="time"], time, [class*="end-date"]').first().text().trim();
          const prize    = $(el).find('[class*="prize"], [class*="reward"]').first().text().trim();
          const typeText = $(el).find('[class*="type"], [class*="tag"]').first().text().trim().toLowerCase();

          items.push({ title, link: fullLink, dateText, prize, typeText });
        } catch { /* skip */ }
      });

      console.log(`[HackerEarth] Scraped ${items.length} candidates from ${url}`);

      for (const raw of items) {
        try {
          const deadline = parseDateText(raw.dateText);
          if (!deadline) {
            console.log(`[HackerEarth] Skip (no deadline): ${raw.title}`);
            results.skipped++;
            continue;
          }

          const category = raw.typeText.includes('hackathon') ? 'hackathon' : 'competition';

          let desc = `${raw.title} — a ${category} on HackerEarth.`;
          if (raw.prize) desc += ` Prize: ${raw.prize}.`;
          desc += ' Solve algorithmic problems and compete with developers worldwide.';

          const result = await saveEvent({
            title:        raw.title,
            organization: 'HackerEarth',
            category,
            type:         category,
            description:  desc,
            deadline,
            location:     'Online',
            mode:         'online',
            applyLink:    raw.link,
            link:         raw.link,
            source:       'hackerearth',
            sourceUrl:    url,
            tags:         [category, 'coding', 'hackerearth', 'algorithms'],
            skills:       ['programming', 'algorithms', 'data structures', 'problem solving'],
            stipendPerks: raw.prize || '',
            isFeatured:   false,
            difficulty:   'intermediate',
            skillLevel:   'intermediate',
          });

          if (result.saved) { results.added++;   console.log(`[HackerEarth] Saved (scrape): ${raw.title}`); }
          else               { results.skipped++; }

        } catch (err) {
          console.error('[HackerEarth] Scrape item error:', err.message);
          results.errors.push(err.message);
        }
      }

    } catch (err) {
      console.error(`[HackerEarth] Failed to scrape ${url}:`, err.message);
      results.errors.push(err.message);
    }
  }

  console.log(`[HackerEarth] Done — Added: ${results.added}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);
  return results;
}

module.exports = { scrapeHackerEarth };
