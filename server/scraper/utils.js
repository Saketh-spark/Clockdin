const Event = require('../models/event.model');

// ── Generic words that can never be a real title or org name ──
const GENERIC_WORDS = new Set([
  'hackathon', 'hackathons', 'internship', 'internships',
  'competition', 'competitions', 'workshop', 'workshops',
  'seminar', 'seminars', 'opportunity', 'opportunities',
  'event', 'events', 'undefined', 'null', 'n/a', 'tbd',
  'challenge', 'challenges', 'contest', 'contests',
]);

// ── Domains that are just homepages, not specific event pages ──
const GENERIC_HOMEPAGES = new Set([
  'https://unstop.com',
  'https://devfolio.co',
  'https://internshala.com',
  'https://hackerearth.com',
  'https://www.hackerearth.com',
  'https://unstop.com/',
  'https://devfolio.co/',
  'https://internshala.com/',
  'https://hackerearth.com/',
  'https://www.hackerearth.com/',
  'https://unstop.com/hackathons',
  'https://devfolio.co/hackathons',
  'https://internshala.com/internships',
  'https://www.hackerearth.com/challenges/',
]);

/**
 * Validate an event before saving.
 * Returns { valid: true } or { valid: false, reason: '...' }
 */
function validateEvent(event) {
  const now = new Date();
  const twoYearsOut = new Date(now);
  twoYearsOut.setFullYear(twoYearsOut.getFullYear() + 2);

  // ── 1. Title ──────────────────────────────────────────────
  const title = (event.title || '').trim();
  if (!title || title.length < 5) {
    return { valid: false, reason: `Title too short: "${title}"` };
  }
  if (GENERIC_WORDS.has(title.toLowerCase())) {
    return { valid: false, reason: `Generic title: "${title}"` };
  }

  // ── 2. Organization ───────────────────────────────────────
  const org = (event.organization || '').trim();
  if (!org || org.length < 2) {
    return { valid: false, reason: `Missing org for: "${title}"` };
  }
  if (GENERIC_WORDS.has(org.toLowerCase())) {
    return { valid: false, reason: `Generic org name: "${org}" for "${title}"` };
  }
  // Title must not be identical to category (common scraper bug)
  if (title.toLowerCase() === (event.category || '').toLowerCase()) {
    return { valid: false, reason: `Title equals category: "${title}"` };
  }

  // ── 3. Apply link ─────────────────────────────────────────
  const link = (event.applyLink || '').trim();
  if (!link) {
    return { valid: false, reason: `No apply link for: "${title}"` };
  }
  try {
    const url = new URL(link);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, reason: `Bad link protocol for "${title}": ${link}` };
    }
  } catch {
    return { valid: false, reason: `Invalid URL for "${title}": ${link}` };
  }
  if (GENERIC_HOMEPAGES.has(link.replace(/\/$/, '')) || GENERIC_HOMEPAGES.has(link)) {
    return { valid: false, reason: `Link is homepage for "${title}": ${link}` };
  }

  // ── 4. Deadline ───────────────────────────────────────────
  if (event.deadline) {
    const dl = new Date(event.deadline);
    if (isNaN(dl.getTime())) {
      return { valid: false, reason: `Invalid deadline date for "${title}"` };
    }
    if (dl <= now) {
      return { valid: false, reason: `Deadline passed for "${title}": ${dl.toDateString()}` };
    }
    if (dl > twoYearsOut) {
      return { valid: false, reason: `Deadline too far out (wrong year?) for "${title}": ${dl.toDateString()}` };
    }
  }

  // ── 5. Event date ─────────────────────────────────────────
  if (event.eventDate) {
    const ed = new Date(event.eventDate);
    if (isNaN(ed.getTime())) {
      // Clear it silently rather than rejecting the whole event
      event.eventDate = null;
    } else {
      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
      if (ed < sevenDaysAgo) {
        return { valid: false, reason: `Event already happened for "${title}": ${ed.toDateString()}` };
      }
    }
  }

  return { valid: true };
}

/**
 * Clean "TBD" / empty string values before saving.
 */
function cleanEventData(data) {
  const cleaned = { ...data };
  const tbdRe = /^\s*(tbd|n\/a|unknown|—|–|-+)\s*$/i;

  if (cleaned.duration && tbdRe.test(cleaned.duration))  cleaned.duration  = null;
  if (cleaned.location && tbdRe.test(cleaned.location))  cleaned.location  = null;
  if (cleaned.stipendPerks && tbdRe.test(cleaned.stipendPerks)) cleaned.stipendPerks = null;
  if (cleaned.teamSize && tbdRe.test(cleaned.teamSize))  cleaned.teamSize  = null;

  // Trim whitespace from string fields
  ['title', 'organization', 'description', 'location', 'duration'].forEach(k => {
    if (typeof cleaned[k] === 'string') cleaned[k] = cleaned[k].trim();
  });

  return cleaned;
}

/**
 * Check if an event already exists in the DB by title + organization.
 * Also checks (and updates) dismissed/soft-deleted duplicates.
 */
async function isDuplicate(title, organization) {
  if (!title || !organization) return false;

  const existing = await Event.findOne({
    title:        { $regex: new RegExp('^' + title.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
    organization: { $regex: new RegExp('^' + organization.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') },
  });

  return !!existing;
}

/**
 * Hard backend validation that rejects/truncates any field exceeding reasonable length
 */
function sanitizeEventFields(eventData) {
  const cleaned = { ...eventData }
  
  // FIELD LENGTH LIMITS — enforce strictly
  const LIMITS = {
    title: 100,
    organization: 60,
    duration: 25,        // "3-6 months" max — never a paragraph
    location: 60,
    mode: 15,
    description: 300,
    eligibility: 150,
    teamSize: 20
  }
  
  Object.keys(LIMITS).forEach(field => {
    if (cleaned[field] && typeof cleaned[field] === 'string') {
      cleaned[field] = cleaned[field].trim().substring(0, LIMITS[field])
    }
  })
  
  // SPECIAL RULE: duration must look like a real duration, 
  // not a sentence. If it contains more than 4 words or 
  // doesn't match a duration pattern, discard it entirely.
  if (cleaned.duration) {
    const wordCount = cleaned.duration.split(/\s+/).length
    const looksLikeDuration = /^\d+\s*-?\s*\d*\s*(month|months|week|weeks|day|days|hour|hours)\b/i
      .test(cleaned.duration.trim())
    
    if (wordCount > 4 || !looksLikeDuration) {
      console.log('[Sanitize] Rejected bad duration value:', 
        cleaned.duration.substring(0, 50))
      cleaned.duration = null
    }
  }
  
  // SPECIAL RULE: location must not contain sentence-like content
  if (cleaned.location) {
    const wordCount = cleaned.location.split(/\s+/).length
    if (wordCount > 6) {
      console.log('[Sanitize] Rejected bad location value:', 
        cleaned.location.substring(0, 50))
      cleaned.location = cleaned.location.split(/\s+/).slice(0, 3).join(' ')
    }
  }
  
  // Tags array: cap each tag length and max 5 tags
  if (Array.isArray(cleaned.tags)) {
    cleaned.tags = cleaned.tags
      .map(t => String(t).trim().substring(0, 25))
      .filter(t => t.length > 0)
      .slice(0, 5)
  }
  
  // Skills array: same treatment
  if (Array.isArray(cleaned.skills)) {
    cleaned.skills = cleaned.skills
      .map(s => String(s).trim().substring(0, 25))
      .filter(s => s.length > 0)
      .slice(0, 6)
  }
  
  return cleaned
}

/**
 * Save a validated, cleaned event to the DB.
 * Returns { saved: true } or { saved: false, reason: '...' }
 */
async function saveEvent(eventData) {
  try {
    // Step 0: SANITIZE FIRST — this must run before anything else
    const sanitized = sanitizeEventFields(eventData)

    // Step 1 — Validate
    const validation = validateEvent(sanitized);
    if (!validation.valid) {
      console.log(`[Skip] ${validation.reason}`);
      return { saved: false, reason: 'validation_failed', detail: validation.reason };
    }

    // Step 2 — Deduplicate
    const dup = await isDuplicate(sanitized.title, sanitized.organization);
    if (dup) {
      return { saved: false, reason: 'duplicate' };
    }

    // Step 3 — Clean
    const cleaned = cleanEventData(sanitized);

    // Step 4 — Persist
    const category = cleaned.category || 'hackathon';
    await Event.create({
      ...cleaned,
      type:     category,   // frontend reads 'type'
      category,
      isActive:  true,
      isExpired: false,
    });

    return { saved: true };
  } catch (err) {
    console.error('[saveEvent] Error:', err.message);
    return { saved: false, reason: 'error', error: err.message };
  }
}

module.exports = { validateEvent, saveEvent, isDuplicate, sanitizeEventFields };
