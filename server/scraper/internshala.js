const axios = require('axios');
const cheerio = require('cheerio');
const { saveEvent } = require('./utils');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// Internshala uses dates like "15 Sep '25" or "15 Sep 2025" or "20 Jun"
function parseInternshalaDate(text) {
  if (!text) return null;

  let t = text.replace(/apply\s+by/i, '').trim();

  // "15 Jun '25" → "15 Jun 2025"
  t = t.replace(/'(\d{2})\b/g, '20$1');

  const direct = new Date(t);
  if (!isNaN(direct.getTime()) && direct > new Date()) return direct;

  // "15 Jan 2025"
  const m1 = t.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (m1) {
    const d = new Date(`${m1[2]} ${m1[1]} ${m1[3]}`);
    if (!isNaN(d.getTime()) && d > new Date()) return d;
  }

  // "Jan 15, 2025"
  const m2 = t.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (m2) {
    const d = new Date(`${m2[1]} ${m2[2]} ${m2[3]}`);
    if (!isNaN(d.getTime()) && d > new Date()) return d;
  }

  // "15 Jun" (no year) — assume current year first, next year if past
  const m3 = t.match(/(\d{1,2})\s+([A-Za-z]+)$/);
  if (m3) {
    const thisYear = new Date().getFullYear();
    let d = new Date(`${m3[2]} ${m3[1]} ${thisYear}`);
    if (isNaN(d.getTime()) || d <= new Date()) {
      d = new Date(`${m3[2]} ${m3[1]} ${thisYear + 1}`);
    }
    if (!isNaN(d.getTime()) && d > new Date()) return d;
  }

  return null;
}

const INTERNSHIP_URLS = [
  'https://internshala.com/internships/computer-science-engineering-internship',
  'https://internshala.com/internships/web-development-internship',
  'https://internshala.com/internships/machine-learning-internship',
  'https://internshala.com/internships/android-development-internship',
];

async function scrapeInternshala() {
  const results = { added: 0, skipped: 0, errors: [] };

  for (const url of INTERNSHIP_URLS) {
    try {
      const response = await axios.get(url, { headers: HEADERS, timeout: 20000 });
      const $ = cheerio.load(response.data);

      const items = [];

      $('.individual_internship').each((_, el) => {
        try {
          // --- Title (role name) ---
          const title = $(el).find('.profile').first().text().trim() ||
                        $(el).find('[class*="job-internship-name"]').first().text().trim() ||
                        $(el).find('h3').first().text().trim();

          if (!title || title.length < 3) return;

          // --- Company ---
          const company = $(el).find('.company_name').first().text().trim() ||
                          $(el).find('[class*="company"]').first().text().trim();
          if (!company || company.length < 2) return;

          // --- Link — must point to /internship/detail ---
          const rawHref = $(el).find('a[href*="/internship/detail"]').first().attr('href') ||
                          $(el).find('a[href*="/internship/"]').first().attr('href');
          if (!rawHref) return;
          const link = rawHref.startsWith('http') ? rawHref : `https://internshala.com${rawHref}`;

          // --- Location ---
          const location = $(el).find('.location_link').first().text().trim() ||
                           $(el).find('[class*="location"]').first().text().trim() ||
                           'India';

          // --- Duration ---
          function extractDuration(container) {
            const durationPill = container.find(
              '.row-1-item .item_body, [class*="duration_text"]'
            ).filter((i, el) => {
              const text = $(el).text().trim()
              return /^\d+\s*-?\s*\d*\s*(month|months|week|weeks|day|days)/i.test(text)
            }).first()
            
            if (durationPill.length) {
              return durationPill.text().trim().substring(0, 30)
            }
            
            let foundDuration = null
            container.find('span, div').each((i, el) => {
              const text = $(el).text().trim()
              const match = text.match(/^(\d+\s*-?\s*\d*\s*(month|months|week|weeks|day|days))$/i)
              if (match && text.length < 20) {
                foundDuration = match[0]
                return false // break loop
              }
            })
            
            return foundDuration ? foundDuration.substring(0, 30) : null
          }
          const duration = extractDuration($(el))

          // --- Stipend ---
          const stipend = $(el).find('.stipend').first().text().trim() ||
                          $(el).find('[class*="stipend"]').first().text().trim() || '';

          // --- Deadline ---
          const deadlineText = $(el).find('[class*="deadline"]').first().text().trim() ||
                               $(el).find('[class*="apply_by"]').first().text().trim() || '';

          // --- Skills ---
          const skills = [];
          $(el).find('[class*="skill"], .round_tabs').each((_, s) => {
            const sk = $(s).text().trim();
            if (sk && sk.length < 40) skills.push(sk);
          });

          items.push({ title, company, link, location, duration, stipend, deadlineText, skills });
        } catch { /* skip bad listing */ }
      });

      console.log(`[Internshala] ${url.split('/').pop()} → ${items.length} candidates`);

      for (const raw of items) {
        try {
          // Parse deadline — prefer real date; fallback 30 days only for internships (not hackathons)
          let deadline = parseInternshalaDate(raw.deadlineText);
          if (!deadline) {
            // Internships often don't list a deadline explicitly — use 30-day rolling window
            deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          }

          const isRemote = /remote|work from home|wfh/i.test(raw.location);

          function buildCleanDescription(title, company, location, stipend) {
            let desc = `${title} internship at ${company}.`
            if (location) desc += ` Location: ${location}.`
            if (stipend && stipend.length < 40) desc += ` Stipend: ${stipend}.`
            desc += ' Visit the link to apply on Internshala.'
            
            // Hard cap — never exceed 280 characters
            return desc.substring(0, 280)
          }

          const description = buildCleanDescription(
            raw.title, raw.company, raw.location, raw.stipend
          )

          const titleFull = raw.title.toLowerCase().includes('internship')
            ? raw.title
            : `${raw.title} Internship`;

          const result = await saveEvent({
            title:        titleFull,
            organization: raw.company,
            category:     'internship',
            type:         'internship',
            description,
            deadline,
            location:     raw.location,
            duration:     raw.duration || null,
            mode:         isRemote ? 'online' : 'offline',
            applyLink:    raw.link,
            link:         raw.link,
            source:       'internshala',
            sourceUrl:    url,
            tags:         ['internship', 'internshala', 'india'],
            skills:       raw.skills.length ? raw.skills : ['software development', 'programming'],
            stipendPerks: raw.stipend || '',
            isFeatured:   false,
            difficulty:   'beginner',
            skillLevel:   'beginner',
          });

          if (result.saved) {
            results.added++;
            console.log(`[Internshala] Saved: ${titleFull} @ ${raw.company}`);
          } else {
            results.skipped++;
          }
        } catch (err) {
          console.error('[Internshala] Error processing:', err.message);
          results.errors.push(err.message);
        }
      }

    } catch (err) {
      console.error(`[Internshala] Failed to fetch ${url}:`, err.message);
      results.errors.push(err.message);
    }
  }

  console.log(`[Internshala] Done — Added: ${results.added}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`);
  return results;
}

module.exports = { scrapeInternshala };
