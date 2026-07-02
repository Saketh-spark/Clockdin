/**
 * One-time cleanup script: removes bad/expired/fake events from the database.
 *
 * Run once:  node seeders/cleanupFakeEvents.js
 *
 * Safe to re-run — it only deletes, never inserts.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const Event = require('../models/event.model');

const GENERIC_TITLES = [
  'Hackathons', 'Hackathon', 'Internships', 'Internship',
  'Competition', 'Competitions', 'Workshop', 'Workshops',
  'Seminar', 'Seminars', 'Event', 'Events',
  'Challenge', 'Challenges', 'Opportunity', 'Opportunities',
  'Contest', 'Contests',
  'undefined', 'null', 'N/A', 'TBD',
];

const GENERIC_LINKS = [
  'https://unstop.com',
  'https://unstop.com/',
  'https://unstop.com/hackathons',
  'https://devfolio.co',
  'https://devfolio.co/',
  'https://devfolio.co/hackathons',
  'https://internshala.com',
  'https://internshala.com/',
  'https://internshala.com/internships',
  'https://hackerearth.com',
  'https://hackerearth.com/',
  'https://www.hackerearth.com',
  'https://www.hackerearth.com/',
  'https://www.hackerearth.com/challenges/',
];

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const now = new Date();
  let totalDeleted = 0;

  // ── 1. Generic / category-name titles ──────────────────────
  const r1 = await Event.deleteMany({ title: { $in: GENERIC_TITLES } });
  console.log(`🗑  Generic titles deleted:     ${r1.deletedCount}`);
  totalDeleted += r1.deletedCount;

  // ── 2. Events where title === category (scraper bug) ────────
  const allEvents = await Event.find({}, { _id: 1, title: 1, category: 1, organization: 1 }).lean();
  const badIds = allEvents
    .filter(e =>
      e.title &&
      e.category &&
      e.title.toLowerCase().trim() === e.category.toLowerCase().trim()
    )
    .map(e => e._id);
  if (badIds.length) {
    const r2 = await Event.deleteMany({ _id: { $in: badIds } });
    console.log(`🗑  Title = category deleted:   ${r2.deletedCount}`);
    totalDeleted += r2.deletedCount;
  }

  // ── 3. Events where title === organization (scraper bug) ────
  const badIds3 = allEvents
    .filter(e =>
      e.title &&
      e.organization &&
      e.title.toLowerCase().trim() === e.organization.toLowerCase().trim()
    )
    .map(e => e._id);
  if (badIds3.length) {
    const r3 = await Event.deleteMany({ _id: { $in: badIds3 } });
    console.log(`🗑  Title = org deleted:        ${r3.deletedCount}`);
    totalDeleted += r3.deletedCount;
  }

  // ── 4. Past events (deadline already passed) ────────────────
  const r4 = await Event.deleteMany({ deadline: { $lt: now, $exists: true } });
  console.log(`🗑  Past-deadline deleted:       ${r4.deletedCount}`);
  totalDeleted += r4.deletedCount;

  // ── 5. Events with no apply link or homepage-only links ─────
  const r5 = await Event.deleteMany({
    $or: [
      { applyLink: { $exists: false } },
      { applyLink: null },
      { applyLink: '' },
      { applyLink: { $in: GENERIC_LINKS } },
    ],
  });
  console.log(`🗑  No/generic link deleted:    ${r5.deletedCount}`);
  totalDeleted += r5.deletedCount;

  // ── 6. Events with deadline more than 2 years out (wrong year) ──
  const twoYearsOut = new Date();
  twoYearsOut.setFullYear(twoYearsOut.getFullYear() + 2);
  const r6 = await Event.deleteMany({
    deadline: { $gt: twoYearsOut },
  });
  console.log(`🗑  Wrong-year deadline deleted: ${r6.deletedCount}`);
  totalDeleted += r6.deletedCount;

  // ── 7. Events with title shorter than 5 chars ───────────────
  const r7 = await Event.deleteMany({
    $expr: { $lt: [{ $strLenCP: { $ifNull: ['$title', ''] } }, 5] },
  });
  console.log(`🗑  Short title deleted:         ${r7.deletedCount}`);
  totalDeleted += r7.deletedCount;

  // ── Summary ─────────────────────────────────────────────────
  const remaining = await Event.countDocuments();
  console.log('');
  console.log(`✅ Total deleted: ${totalDeleted}`);
  console.log(`✅ Events remaining in DB: ${remaining}`);
  console.log('');
  console.log('Cleanup complete!');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Cleanup failed:', err);
  process.exit(1);
});
