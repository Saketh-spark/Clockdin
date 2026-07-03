const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const Reminder = require('./models/reminder.model');
const { rescheduleAll, checkDueReminders } = require('./utils/scheduler');
const reminders = require('./routes/reminders');

// ── Automated services ────────────────────────────────────────
// Scraper completely disabled
// require('./services/scraperScheduler');
// Event cleanup (marks expired events, deletes old ones)
require('./services/eventCleanup');
// Notification worker (deadline email crons + personal event reminder crons)
require('./services/notificationWorker');
// ─────────────────────────────────────────────────────────────

// ── CORS — allow both production Vercel URL and local dev ─────
const CLIENT_URL         = (process.env.CLIENT_URL         || 'https://clockdin000007.vercel.app').trim();
const FALLBACK_CLIENT_URL = 'https://clockdin000007.vercel.app';
const LOCAL_CLIENT_URL    = 'http://localhost:3000';

const allowedOrigins = new Set([
  CLIENT_URL,
  FALLBACK_CLIENT_URL,
  LOCAL_CLIENT_URL,
]);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (Render health checks, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    // Also allow any *.vercel.app preview deploy
    if (/\.vercel\.app$/.test(origin)) return callback(null, true);
    callback(null, false);
  },
  credentials: true,
};

const app = express();
app.use(cors(corsOptions));
app.use(express.json({ limit: '5mb' }));

// ── Traffic-Driven Cron for Serverless/Sleepy environments ──
// Because Render (free tier) aggressively sleeps the CPU, native timers (like setInterval or node-cron)
// often fail to fire on time. But Render wakes up instantly to serve HTTP requests.
// This middleware guarantees that our reminder check runs every 60 seconds 
// as long as the user is actively using the app.
let lastReminderCheck = 0;
app.use((req, res, next) => {
  const now = Date.now();
  if (now - lastReminderCheck > 60000) {
    lastReminderCheck = now;
    setImmediate(() => {
      if (checkDueReminders) checkDueReminders().catch(err => console.error('[TrafficCron]', err));
    });
  }
  next();
});

// ── MongoDB connection ────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    try {
      await rescheduleAll();
      console.log('[Startup] Reminders rescheduled');
    } catch (schedErr) {
      console.error('[Startup] Error rescheduling reminders:', schedErr.message);
    }
  })
  .catch(err => console.error('[Startup] MongoDB error:', err));

// ── Nodemailer transporter (personal event reminders every minute) ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── Personal event reminder cron — runs every minute ─────────
// Sends emails from the Reminder collection (my events reminders)
cron.schedule('* * * * *', async () => {
  const now = new Date();
  const ONE_HOUR_AGO = new Date(now.getTime() - 60 * 60 * 1000);

  try {
    const dueReminders = await Reminder.find({
      sent: false,
      remindAt: { $lte: now, $gte: ONE_HOUR_AGO },
    }).populate('event').populate('user', 'name');

    if (dueReminders.length === 0) return; // Silent when nothing to do

    console.log(`[ReminderCron] ${dueReminders.length} reminder(s) due`);

    for (const reminder of dueReminders) {
      const event = reminder.event;
      const reminderTitle = event?.title || reminder.title || 'Personal Event';
      const userName = reminder.user?.name ? reminder.user.name.split(' ')[0] : 'there';

      // Skip if event has already passed
      const eventDate = event?.eventDate || event?.deadline;
      if (eventDate && new Date(eventDate) < now) {
        reminder.sent = true;
        await reminder.save();
        continue;
      }

      try {
        const { getPersonalEventTemplate } = require('./utils/emailTemplates');
        const targetDate  = event?.eventDate || event?.deadline || reminder.remindAt;
        const typeLabel   = event?.category
          ? event.category.charAt(0).toUpperCase() + event.category.slice(1) + ' Event'
          : 'Personal Event';
        const htmlContent = getPersonalEventTemplate(userName, reminderTitle, targetDate, typeLabel);

        await transporter.sendMail({
          from: `"Clockdin" <${process.env.EMAIL_USER}>`,
          to: reminder.email,
          subject: `⏰ Reminder: ${reminderTitle}`,
          html: htmlContent,
        });

        reminder.sent = true;
        await reminder.save();
        console.log(`[ReminderCron] Sent to ${reminder.email} for "${reminderTitle}"`);
      } catch (err) {
        console.error(`[ReminderCron] Failed for ${reminder.email}:`, err.message);
      }
    }

    // Auto-expire stale reminders (older than 1 hour, still unsent)
    await Reminder.updateMany(
      { sent: false, remindAt: { $lt: ONE_HOUR_AGO } },
      { $set: { sent: true } }
    );

  } catch (err) {
    console.error('[ReminderCron] Error:', err.message);
  }
});

// ── File-based logging (production-safe) ──────────────────────
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
const logFilePath = path.join(logsDir, 'server.log');
const logStream   = fs.createWriteStream(logFilePath, { flags: 'a' });

function logMessage(message) {
  const timestamp = new Date().toISOString();
  logStream.write(`[${timestamp}] ${message}\n`);
}

app.use((req, res, next) => {
  logMessage(`${req.method} ${req.url}`);
  next();
});

// ── Health check (Render uses this to verify the service is up) ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/', (_req, res) => res.json({ status: 'Clockdin API is live', version: '1.0.0' }));

// ── Error logger ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  logMessage(`Error: ${err.message}`);
  next(err);
});

// ── API Routes ───────────────────────────────────────────────
app.use('/api/users',         require('./routes/users'));
app.use('/api/chatbot',       require('./routes/chatbot'));
app.use('/api/events',        require('./routes/events'));
app.use('/api/reminders',     reminders);
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/notify-me',     require('./routes/notifyMe'));

// ── Start server ─────────────────────────────────────────────
// Use PORT from environment (Render injects this) or default to 5000 for local
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[Server] Clockdin API running on port ${PORT}`));

// ── Google OAuth (only if credentials are configured) ────────
const passport = require('passport');
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  try {
    require('./config/passportGoogle')(passport);
    app.use(passport.initialize());
  } catch (err) {
    console.error('[OAuth] Failed to initialize Google strategy:', err.message);
  }
} else {
  console.log('[OAuth] Google OAuth not configured — skipping');
}
