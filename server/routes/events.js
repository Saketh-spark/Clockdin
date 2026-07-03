const express = require('express');
const Event = require('../models/event.model');
// Scraper is completely disabled in production
// const { runAllScrapers } = require('../scraper');
const { deleteExpiredEvents } = require('../services/eventCleanup');
const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/events — List events with filters, search, pagination
// Only returns events whose deadline is in the future (or has no deadline)
// ─────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const {
      category,
      mode,
      skillLevel,
      search,
      page = 1,
      limit = 200,
      sort = 'deadline',
      featured,
    } = req.query;

    const now = new Date();

    // Base filter: active + deadline in future (events with no deadline are shown)
    // Comprehensively exclude ALL personal events created via MyEvents page
    const LEGIT_SOURCES = ['unstop', 'devfolio', 'internshala', 'hackerearth', 'manual', 'scraper'];
    const filter = {
      isActive: { $ne: false },
      isExpired: { $ne: true },
      // Exclude events marked as Personal organization
      organization: { $nin: ['Personal', 'personal'] },
      $or: [
        { deadline: { $gte: now } },
        { deadline: null },
        { deadline: { $exists: false } },
      ],
      // Also exclude events that were created by a user AND have no legitimate source
      $nor: [
        {
          createdBy: { $exists: true, $ne: null },
          source: { $nin: LEGIT_SOURCES }
        }
      ],
    };

    if (category && category !== 'all') {
      filter.category = category.toLowerCase();
    }

    if (mode) filter.mode = mode.toLowerCase();
    if (skillLevel) filter.skillLevel = skillLevel.toLowerCase();
    if (featured === 'true') filter.isFeatured = true;

    // Search
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$and = [
        {
          $or: [
            { title: searchRegex },
            { organization: searchRegex },
            { organizer: searchRegex },
            { description: searchRegex },
            { tags: { $in: [searchRegex] } },
            { skills: { $in: [searchRegex] } },
            { location: searchRegex },
            { category: searchRegex },
          ],
        },
      ];
    }

    const sortOptions = {
      deadline: { deadline: 1 },
      newest: { createdAt: -1 },
      popular: { bookmarkCount: -1 },
      soonest: { deadline: 1 },
      alpha: { title: 1 },
    };
    const sortBy = sortOptions[sort] || sortOptions.deadline;

    const parsedPage = parseInt(page, 10);
    const parsedLimit = Math.min(parseInt(limit, 10), 500);
    const total = await Event.countDocuments(filter);

    const events = await Event.find(filter)
      .sort(sortBy)
      .skip((parsedPage - 1) * parsedLimit)
      .limit(parsedLimit)
      .lean();

    // Map DB fields → frontend-expected fields
    const mapped = events.map(e => ({
      ...e,
      type: e.type || e.category,
      difficulty: e.difficulty || e.skillLevel,
      featured: e.featured || e.isFeatured || false,
    }));

    res.json({
      success: true,
      data: {
        events: mapped,
        total,
        page: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (err) {
    console.error('[GET /api/events] Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/events/featured — Featured events (up to 6)
// ─────────────────────────────────────────────────────────────
router.get('/featured', async (req, res) => {
  try {
    const now = new Date();
    const events = await Event.find({
      isActive: { $ne: false },
      isExpired: { $ne: true },
      $or: [{ isFeatured: true }, { featured: true }],
      deadline: { $gte: now },
    })
      .sort({ deadline: 1 })
      .limit(6)
      .lean();

    const mapped = events.map(e => ({
      ...e,
      type: e.type || e.category,
      difficulty: e.difficulty || e.skillLevel,
      featured: true,
    }));

    res.json({ success: true, data: mapped });
  } catch (err) {
    console.error('[GET /api/events/featured] Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch featured events' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/events/:id — Single event by ID (increments viewCount)
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewCount: 1 } },
      { new: true }
    ).lean();

    if (!event) return res.status(404).json({ success: false, error: 'Event not found' });
    if (event.isExpired) return res.status(404).json({ success: false, error: 'Event has expired' });

    res.json({
      success: true,
      data: {
        ...event,
        type: event.type || event.category,
        difficulty: event.difficulty || event.skillLevel,
        featured: event.featured || event.isFeatured || false,
      },
    });
  } catch (err) {
    console.error('[GET /api/events/:id] Error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch event' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/events/admin/trigger-scrape — Manually trigger scraper
// ─────────────────────────────────────────────────────────────
router.post('/admin/trigger-scrape', async (req, res) => {
  const secret = req.headers['x-cron-secret'] || req.headers['cron-secret'];
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    console.log('[Admin] Manual scrape triggered, but scraper is completely disabled in production.');
    res.json({ success: true, message: 'Scraper is disabled. No events were scraped.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────
// DELETE /api/events/admin/cleanup — Manually trigger cleanup
// ─────────────────────────────────────────────────────────────
router.delete('/admin/cleanup', async (req, res) => {
  const secret = req.headers['x-cron-secret'] || req.headers['cron-secret'];
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const result = await deleteExpiredEvents();
    res.json({ success: true, deleted: result.deleted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const User = require('../models/user.model');
const Notification = require('../models/notification.model');

// ─────────────────────────────────────────────────────────────
// POST /api/events/replace — Legacy: replace all global events
// ─────────────────────────────────────────────────────────────
router.post('/replace', async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ msg: 'Events array required' });
    }
    await Event.deleteMany({});
    const inserted = await Event.insertMany(events);
    
    // Send an opportunities notification to all users asynchronously
    // (Moved to Mongoose post-insertMany hook in event.model.js)

    res.json({ replaced: inserted.length });
  } catch (err) {
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/events/admin/purge-personal — Delete all personal events from DB
// Permanently removes events created via MyEvents that leaked into the public collection
// ─────────────────────────────────────────────────────────────
router.delete('/admin/purge-personal', async (req, res) => {
  try {
    const LEGIT_SOURCES = ['unstop', 'devfolio', 'internshala', 'hackerearth', 'manual', 'scraper'];

    // Find all events that are personal (by multiple criteria)
    const personalFilter = {
      $or: [
        { organization: { $in: ['Personal', 'personal'] } },
        { source: 'personal' },
        {
          // Created by a real user + no legitimate scraper source
          createdBy: { $exists: true, $ne: null },
          source: { $nin: LEGIT_SOURCES }
        }
      ]
    };

    // First log what we're about to delete
    const toDelete = await Event.find(personalFilter, { title: 1, organization: 1, source: 1, createdBy: 1 }).lean();
    console.log(`[purge-personal] Found ${toDelete.length} personal event(s) to delete:`);
    toDelete.forEach(e => console.log(`  - "${e.title}" org="${e.organization}" source="${e.source}" createdBy=${e.createdBy}`));

    const result = await Event.deleteMany(personalFilter);
    console.log(`[purge-personal] Deleted ${result.deletedCount} personal event(s).`);

    res.json({
      success: true,
      deleted: result.deletedCount,
      events: toDelete.map(e => ({ id: e._id, title: e.title, organization: e.organization }))
    });
  } catch (err) {
    console.error('[purge-personal] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/events/admin/purge-personal — Same as DELETE above but accessible from browser URL
// Visit: http://localhost:5000/api/events/admin/purge-personal
// ─────────────────────────────────────────────────────────────
router.get('/admin/purge-personal', async (req, res) => {
  try {
    const LEGIT_SOURCES = ['unstop', 'devfolio', 'internshala', 'hackerearth', 'manual', 'scraper'];

    const personalFilter = {
      $or: [
        { organization: { $in: ['Personal', 'personal'] } },
        { source: 'personal' },
        {
          createdBy: { $exists: true, $ne: null },
          source: { $nin: LEGIT_SOURCES }
        }
      ]
    };

    const toDelete = await Event.find(personalFilter, { title: 1, organization: 1, source: 1, createdBy: 1 }).lean();
    console.log(`[purge-personal GET] Found ${toDelete.length} personal event(s) to delete:`);
    toDelete.forEach(e => console.log(`  - "${e.title}" org="${e.organization}" source="${e.source}" createdBy=${e.createdBy}`));

    const result = await Event.deleteMany(personalFilter);
    console.log(`[purge-personal GET] Deleted ${result.deletedCount} personal event(s).`);

    // Return HTML so it's readable in the browser
    const html = `
      <html><body style="font-family:sans-serif;padding:2rem;max-width:600px">
        <h2>✅ Personal Events Purged</h2>
        <p><strong>Deleted:</strong> ${result.deletedCount} personal event(s)</p>
        <ul>${toDelete.map(e => `<li>"${e.title}" (org: ${e.organization})</li>`).join('')}</ul>
        ${result.deletedCount === 0 ? '<p>🎉 No personal events found — database is already clean!</p>' : ''}
        <p><a href="http://localhost:3000/events">→ Go to Events page</a></p>
      </body></html>
    `;
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('[purge-personal GET] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// ─────────────────────────────────────────────────────────────
// GET /api/events/admin/cleanup-all
// Visit in browser: http://localhost:5000/api/events/admin/cleanup-all
// Removes all fake, expired, or invalid events from the DB.
// Safe to call multiple times.
// ─────────────────────────────────────────────────────────────
router.get('/admin/cleanup-all', async (req, res) => {
  try {
    const now = new Date();
    const twoYearsOut = new Date(now);
    twoYearsOut.setFullYear(twoYearsOut.getFullYear() + 2);

    const GENERIC_TITLES = [
      'Hackathons', 'Hackathon', 'Internships', 'Internship',
      'Competition', 'Competitions', 'Workshop', 'Workshops',
      'Seminar', 'Seminars', 'Event', 'Events',
      'Challenge', 'Challenges', 'Opportunity', 'Opportunities',
      'Contest', 'Contests', 'undefined', 'null', 'N/A', 'TBD',
    ];

    const GENERIC_LINKS = [
      'https://unstop.com', 'https://unstop.com/', 'https://unstop.com/hackathons',
      'https://devfolio.co', 'https://devfolio.co/', 'https://devfolio.co/hackathons',
      'https://internshala.com', 'https://internshala.com/', 'https://internshala.com/internships',
      'https://hackerearth.com', 'https://hackerearth.com/', 'https://www.hackerearth.com',
      'https://www.hackerearth.com/', 'https://www.hackerearth.com/challenges/',
    ];

    const report = [];
    let totalDeleted = 0;

    // 1. Generic/category-name titles
    const r1 = await Event.deleteMany({ title: { $in: GENERIC_TITLES } });
    report.push({ step: 'Generic titles', deleted: r1.deletedCount });
    totalDeleted += r1.deletedCount;

    // 2. Title shorter than 5 characters
    const r2 = await Event.deleteMany({
      $expr: { $lt: [{ $strLenCP: { $ifNull: ['$title', ''] } }, 5] },
    });
    report.push({ step: 'Title < 5 chars', deleted: r2.deletedCount });
    totalDeleted += r2.deletedCount;

    // 3. Title equals category (e.g. title:"hackathon" category:"hackathon")
    const all = await Event.find({}, { _id: 1, title: 1, category: 1, organization: 1, applyLink: 1, deadline: 1 }).lean();

    const titleEqCat = all
      .filter(e => e.title && e.category &&
        e.title.toLowerCase().trim() === e.category.toLowerCase().trim())
      .map(e => e._id);
    if (titleEqCat.length) {
      const r3 = await Event.deleteMany({ _id: { $in: titleEqCat } });
      report.push({ step: 'Title = category', deleted: r3.deletedCount });
      totalDeleted += r3.deletedCount;
    } else {
      report.push({ step: 'Title = category', deleted: 0 });
    }

    // 4. Title equals organization
    const titleEqOrg = all
      .filter(e => e.title && e.organization &&
        e.title.toLowerCase().trim() === e.organization.toLowerCase().trim())
      .map(e => e._id);
    if (titleEqOrg.length) {
      const r4 = await Event.deleteMany({ _id: { $in: titleEqOrg } });
      report.push({ step: 'Title = org', deleted: r4.deletedCount });
      totalDeleted += r4.deletedCount;
    } else {
      report.push({ step: 'Title = org', deleted: 0 });
    }

    // 5. Past deadline
    const r5 = await Event.deleteMany({ deadline: { $lt: now, $exists: true } });
    report.push({ step: 'Deadline already passed', deleted: r5.deletedCount });
    totalDeleted += r5.deletedCount;

    // 6. Deadline more than 2 years out (wrong year scraper bug)
    const r6 = await Event.deleteMany({ deadline: { $gt: twoYearsOut } });
    report.push({ step: 'Deadline > 2 years (wrong year)', deleted: r6.deletedCount });
    totalDeleted += r6.deletedCount;

    // 7. No apply link or homepage-only link
    const r7 = await Event.deleteMany({
      $or: [
        { applyLink: { $exists: false } },
        { applyLink: null },
        { applyLink: '' },
        { applyLink: { $in: GENERIC_LINKS } },
      ],
    });
    report.push({ step: 'No / homepage-only link', deleted: r7.deletedCount });
    totalDeleted += r7.deletedCount;

    // 8. Generic organization names (org = category word)
    const GENERIC_ORGS = [
      'hackathon', 'hackathons', 'internship', 'internships',
      'competition', 'competitions', 'workshop', 'workshops',
      'seminar', 'seminars', 'opportunity', 'opportunities',
      'event', 'events', 'undefined', 'null', 'n/a', 'tbd',
    ];
    const r8 = await Event.deleteMany({
      $expr: {
        $in: [{ $toLower: { $trim: { input: { $ifNull: ['$organization', ''] } } } }, GENERIC_ORGS]
      }
    });
    report.push({ step: 'Generic org name', deleted: r8.deletedCount });
    totalDeleted += r8.deletedCount;

    const remaining = await Event.countDocuments();

    // Build HTML report
    const rowsHtml = report.map(r =>
      `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${r.step}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;font-weight:700;color:${r.deleted > 0 ? '#dc2626' : '#16a34a'}">${r.deleted}</td>
      </tr>`
    ).join('');

    const html = `
      <html>
      <head><title>Clockdin — DB Cleanup</title></head>
      <body style="font-family:system-ui,sans-serif;padding:2rem;max-width:640px;margin:0 auto">
        <h2 style="color:#1e293b">🧹 Event Database Cleanup</h2>
        <p style="color:#64748b">Ran at: ${now.toISOString()}</p>
        <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.08)">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:8px 12px;text-align:left;color:#475569">Check</th>
              <th style="padding:8px 12px;text-align:left;color:#475569">Deleted</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
          <tfoot>
            <tr style="background:#f1f5f9">
              <td style="padding:8px 12px;font-weight:800">Total deleted</td>
              <td style="padding:8px 12px;font-weight:800;color:#dc2626">${totalDeleted}</td>
            </tr>
            <tr style="background:#ecfdf5">
              <td style="padding:8px 12px;font-weight:800;color:#16a34a">Events remaining</td>
              <td style="padding:8px 12px;font-weight:800;color:#16a34a">${remaining}</td>
            </tr>
          </tfoot>
        </table>
        <p style="margin-top:1.5rem">
          <a href="http://localhost:3000/events" style="background:#6366f1;color:#fff;padding:.6rem 1.2rem;border-radius:8px;text-decoration:none;font-weight:600">
            → Go to Events Page
          </a>
          &nbsp;
          <a href="/api/events/admin/cleanup-all" style="color:#6366f1;font-weight:600">
            Run again
          </a>
        </p>
      </body>
      </html>
    `;
    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('[cleanup-all] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

