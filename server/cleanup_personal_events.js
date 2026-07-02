/**
 * cleanup_personal_events.js
 * ──────────────────────────
 * Permanently removes all personal events (created via MyEvents page)
 * from the main public events collection so they no longer appear in
 * the Events feed.
 *
 * Run: node cleanup_personal_events.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI;

// Minimal Event schema — just enough to query and delete
const eventSchema = new mongoose.Schema({}, { strict: false });
const Event = mongoose.model('Event', eventSchema, 'events');

async function cleanup() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected.\n');

  // ── Step 1: Show ALL events currently in DB ──────────────────
  const allEvents = await Event.find({}, { title: 1, organization: 1, source: 1, createdBy: 1, category: 1 }).lean();
  console.log(`Total events in DB: ${allEvents.length}`);
  console.log('\n── All Events ───────────────────────────────────────');
  allEvents.forEach(e => {
    console.log(`  [${e._id}] "${e.title}" | org="${e.organization}" | source="${e.source}" | createdBy=${e.createdBy || 'none'}`);
  });

  // ── Step 2: Find personal events (multiple detection methods) ──
  const personalEvents = allEvents.filter(e => {
    const org = (e.organization || '').toLowerCase();
    const src = (e.source || '').toLowerCase();
    // Created by old MyEvents code: organization='Personal' OR source='personal'
    // Also catch events created by a user (createdBy is set) with no legit source
    const isPersonalOrg = org === 'personal';
    const isPersonalSrc = src === 'personal';
    const hasUserCreator = !!e.createdBy;
    const hasNoLegitSource = !['unstop','devfolio','internshala','hackerearth','manual','scraper'].includes(src);
    return isPersonalOrg || isPersonalSrc || (hasUserCreator && hasNoLegitSource);
  });

  console.log(`\n── Personal Events Found: ${personalEvents.length} ─────────────────`);
  personalEvents.forEach(e => {
    console.log(`  [${e._id}] "${e.title}" | org="${e.organization}" | source="${e.source}"`);
  });

  if (personalEvents.length === 0) {
    console.log('\n✅ No personal events to clean up. Database is already clean.');
    await mongoose.disconnect();
    return;
  }

  // ── Step 3: Delete personal events ────────────────────────────
  const idsToDelete = personalEvents.map(e => e._id);
  const result = await Event.deleteMany({ _id: { $in: idsToDelete } });
  console.log(`\n🗑️  Deleted ${result.deletedCount} personal event(s) from the main events collection.`);

  // ── Step 4: Verify remaining count ───────────────────────────
  const remaining = await Event.countDocuments({});
  console.log(`✅ Remaining events in DB: ${remaining}`);

  await mongoose.disconnect();
  console.log('\nDone. Disconnected from MongoDB.');
}

cleanup().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
