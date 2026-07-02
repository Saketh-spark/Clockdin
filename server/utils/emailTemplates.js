function getPersonalEventTemplate(name, title, eventDate, type = 'Personal Event') {
  // Format the date
  const dateStr = eventDate ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'To be announced';
  const timeStr = eventDate ? new Date(eventDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'Time TBA';

  // Calculate starts in minutes for personal events if applicable, fallback to 'soon'
  let startsIn = 'soon';
  let startsUnit = '';
  if (eventDate) {
    const diffMs = new Date(eventDate) - new Date();
    if (diffMs > 0 && diffMs < 60 * 60 * 1000) {
      startsIn = Math.ceil(diffMs / 60000);
      startsUnit = 'Minutes';
    } else if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
      startsIn = Math.ceil(diffMs / (60000 * 60));
      startsUnit = 'Hours';
    } else if (diffMs > 0) {
      startsIn = Math.ceil(diffMs / (60000 * 60 * 24));
      startsUnit = 'Days';
    }
  }

  // Generate HTML
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body {
    margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f9f9;
  }
  table {
    border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt;
  }
  td {
    vertical-align: top;
  }
  .container {
    max-width: 600px; margin: 0 auto; background-color: #ffffff;
  }
  .header {
    background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
    padding: 30px 40px;
    color: white;
    position: relative;
    border-radius: 8px;
    margin: 0 10px;
  }
  .card {
    border: 1px solid #eaeaea; border-radius: 12px; margin-bottom: 25px; overflow: hidden; background: #fff; width: 100%;
  }
  .btn-primary {
    background-color: #4f46e5; color: #ffffff !important; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; text-align: center; display: block;
  }
  .btn-outline {
    background-color: transparent; color: #4f46e5 !important; padding: 12px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; text-align: center; display: block; border: 1px solid #4f46e5;
  }
  .btn-cal {
    border: 1px solid #eaeaea; background: #fff; padding: 10px; border-radius: 8px; text-decoration: none; font-size: 12px; color: #555 !important; text-align: center; display: block; font-weight: 600;
  }
  .social-icon {
    display: inline-block; width: 24px; height: 24px; background: #eaeaea; color: #777 !important; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; margin-right: 5px; text-decoration: none; font-weight: bold;
  }
  @media only screen and (max-width: 600px) {
    .card-left, .card-right { display: block !important; width: 100% !important; border-right: none !important; border-bottom: 1px solid #eaeaea; }
    .btn-container { display: block !important; width: 100% !important; margin-bottom: 10px !important; }
    .footer-col { display: block !important; width: 100% !important; margin-bottom: 20px !important; text-align: left !important; }
  }
</style>
</head>
<body>
  <div class="container">
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="padding: 15px 20px; font-size: 13px; font-weight: 600; color: #333;">
      <tr>
        <td align="left">Hi ${name} 👋</td>
        <td align="right" style="color: #666; font-weight: normal;">View in browser</td>
      </tr>
    </table>
    
    <div class="header">
      <table width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td valign="middle" width="50">
            <div style="background: white; border-radius: 12px; padding: 8px; display: inline-block;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </div>
          </td>
          <td valign="middle">
            <h1 style="margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 0.5px;">Clockdin</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9; font-weight: 300;">Never Miss An Opportunity</p>
          </td>
          <td valign="middle" align="right" style="font-size: 48px;">
            🔔
          </td>
        </tr>
      </table>
    </div>
    
    <div style="padding: 30px 40px;">
      <h2 style="font-size: 18px; font-weight: bold; color: #1a1a1a; margin: 0 0 5px 0;">This is a reminder for your ${type.toLowerCase()} 🔔</h2>
      <p style="font-size: 14px; color: #666; margin: 0 0 25px 0;">Stay organized. Stay ahead. Make it happen!</p>
      
      <table class="card" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <!-- LEFT COLUMN -->
          <td class="card-left" width="35%" style="background: #fcfcff; padding: 30px 20px; text-align: center; border-right: 1px solid #eaeaea; vertical-align: middle;">
            <center>
              <div style="background: #fff; border: 2px solid #e0e7ff; border-radius: 50%; width: 60px; height: 60px; line-height: 60px; font-size: 24px; color: #4f46e5; margin-bottom: 15px;">
                📅
              </div>
              <div style="background: #e0e7ff; color: #4f46e5; font-size: 11px; font-weight: bold; padding: 4px 12px; border-radius: 20px; display: inline-block; margin-bottom: 15px;">
                Upcoming
              </div>
              ${startsUnit ? `
              <p style="font-size: 12px; color: #555; margin: 0 0 5px 0; font-weight: 500;">Starts in</p>
              <p style="font-size: 42px; font-weight: bold; color: #4f46e5; margin: 0; line-height: 1;">${startsIn}</p>
              <p style="font-size: 14px; font-weight: bold; color: #555; margin: 5px 0 0 0;">${startsUnit}</p>
              ` : `
              <p style="font-size: 12px; color: #555; margin: 0 0 5px 0; font-weight: 500;">Happening</p>
              <p style="font-size: 18px; font-weight: bold; color: #555; margin: 10px 0 0 0;">Soon</p>
              `}
            </center>
          </td>
          
          <!-- RIGHT COLUMN -->
          <td class="card-right" width="65%" style="padding: 25px 30px;">
            <h3 style="font-size: 20px; font-weight: bold; color: #111; margin: 0 0 20px 0;">${title}</h3>
            
            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="30" style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 20px; color: #4f46e5;">📅</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                  <p style="margin: 0; font-size: 12px; font-weight: bold; color: #333;">Date</p>
                  <p style="margin: 2px 0 0 0; font-size: 13px; color: #666;">${dateStr}</p>
                </td>
              </tr>
              <tr>
                <td width="30" style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 20px; color: #4f46e5;">🕒</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                  <p style="margin: 0; font-size: 12px; font-weight: bold; color: #333;">Time</p>
                  <p style="margin: 2px 0 0 0; font-size: 13px; color: #666;">${timeStr}</p>
                </td>
              </tr>
              <tr>
                <td width="30" style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; font-size: 20px; color: #4f46e5;">👤</td>
                <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                  <p style="margin: 0; font-size: 12px; font-weight: bold; color: #333;">Type</p>
                  <p style="margin: 2px 0 0 0; font-size: 13px; color: #666;">${type}</p>
                </td>
              </tr>
              <tr>
                <td width="30" style="padding: 12px 0; font-size: 20px; color: #4f46e5;">🔔</td>
                <td style="padding: 12px 0;">
                  <p style="margin: 0; font-size: 12px; font-weight: bold; color: #333;">Reminder</p>
                  <p style="margin: 2px 0 0 0; font-size: 13px; color: #4f46e5; font-weight: bold;">
                    ${startsUnit ? `Starts in ${startsIn} ${startsUnit.toLowerCase()}` : 'Happening soon'}
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
      
      <!-- BUTTONS -->
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 25px;">
        <tr>
          <td class="btn-container" width="48%">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}/myevents" class="btn-primary">📄 View Event Details</a>
          </td>
          <td width="4%"></td>
          <td class="btn-container" width="48%">
            <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="btn-outline">🕒 Open Clockdin</a>
          </td>
        </tr>
      </table>
      
      <!-- NOTES -->
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px; margin-bottom: 30px;">
        <tr>
          <td width="40" style="padding: 15px 0 15px 20px; font-size: 24px;">📝</td>
          <td style="padding: 15px 20px 15px 10px;">
            <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: bold; color: #333;">Notes</p>
            <p style="margin: 0; font-size: 13px; color: #555; line-height: 1.4;">This event reminder was scheduled from your Clockdin dashboard. Ensure you have everything prepared.</p>
          </td>
        </tr>
      </table>
      
      <p style="text-align: center; font-size: 14px; font-weight: bold; color: #111; margin: 0 0 15px 0;">Add to Calendar</p>
      
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
        <tr>
          <td class="btn-container" width="31%">
            <a href="#" class="btn-cal"><span style="font-size:16px;">🔵</span> Google</a>
          </td>
          <td width="3%"></td>
          <td class="btn-container" width="31%">
            <a href="#" class="btn-cal"><span style="font-size:16px;">🟦</span> Outlook</a>
          </td>
          <td width="3%"></td>
          <td class="btn-container" width="32%">
            <a href="#" class="btn-cal"><span style="font-size:16px;">⚫</span> Apple</a>
          </td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f9fafa; padding: 30px 40px; border-top: 1px solid #eaeaea; margin: 0 10px; border-radius: 8px;">
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-bottom: 1px solid #eaeaea; padding-bottom: 25px; margin-bottom: 25px;">
        <tr>
          <td class="footer-col" width="60%">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td width="55" valign="middle">
                  <div style="background: #e0e7ff; width: 40px; height: 40px; border-radius: 50%; line-height: 40px; text-align: center; color: #4f46e5; font-size: 20px;">✉️</div>
                </td>
                <td valign="middle">
                  <p style="margin: 0 0 2px 0; font-size: 13px; font-weight: bold; color: #333;">Need help?</p>
                  <p style="margin: 0 0 2px 0; font-size: 12px; color: #666;">We're here for you.</p>
                  <a href="mailto:support@clockdin.com" style="margin: 0; font-size: 13px; color: #4f46e5; text-decoration: none; font-weight: 500;">support@clockdin.com</a>
                </td>
              </tr>
            </table>
          </td>
          <td class="footer-col" width="40%" align="right">
            <p style="margin: 0 0 10px 0; font-size: 11px; color: #777; line-height: 1.5;">You're receiving this reminder because you enabled notifications for this event.</p>
            <div>
              <a href="#" class="social-icon">f</a>
              <a href="#" class="social-icon">t</a>
              <a href="#" class="social-icon">ig</a>
              <a href="#" class="social-icon">in</a>
            </div>
          </td>
        </tr>
      </table>
      <p style="text-align: center; font-size: 12px; color: #777; margin: 0; line-height: 1.6;">© 2026 Clockdin. All rights reserved.<br>Made for Students ❤️</p>
    </div>
  </div>
</body>
</html>
  `;
}

// ─────────────────────────────────────────────────────────────
// DEADLINE REMINDER EMAIL TEMPLATE
// ─────────────────────────────────────────────────────────────

function getDeadlineReminderHtml(user, event, daysLeft) {
  // Determine if we're using deadline or eventDate as the reference
  const referenceDate = event.deadline || event.eventDate;
  const usingEventDate = !event.deadline && !!event.eventDate;

  const urgencyMap = {
    0: {
      color: '#dc2626', bgColor: '#fef2f2', borderColor: '#fecaca', emoji: '🔴',
      urgencyText: usingEventDate ? 'Happening TODAY' : 'Closes TODAY',
      subText: usingEventDate ? "This event is happening today — don't miss it!" : "This is your last chance to apply. Don't miss it!"
    },
    1: {
      color: '#ea580c', bgColor: '#fff7ed', borderColor: '#fed7aa', emoji: '🟠',
      urgencyText: usingEventDate ? 'Happening TOMORROW' : 'Closes TOMORROW',
      subText: usingEventDate ? 'The event is tomorrow. Get ready!' : 'You have until tomorrow to submit your application.'
    },
    3: {
      color: '#d97706', bgColor: '#fffbeb', borderColor: '#fde68a', emoji: '⚠️',
      urgencyText: usingEventDate ? 'Event in 3 days' : 'Closes in 3 days',
      subText: usingEventDate ? 'The event starts in 3 days. Start preparing!' : 'Make sure to apply before the deadline closes.'
    }
  };
  
  // Use exact match or dynamically build fallback for 7+ days (or intermediate days like 5)
  let cfg = urgencyMap[daysLeft];
  if (!cfg) {
    cfg = {
      color: '#6366f1', bgColor: '#eef2ff', borderColor: '#c7d2fe', emoji: '⏰',
      urgencyText: usingEventDate ? `Event in ${daysLeft} days` : `Closes in ${daysLeft} days`,
      subText: usingEventDate ? `You have ${daysLeft} days until the event. Time to plan ahead!` : `You have ${daysLeft} days left. Start preparing your application!`
    };
  }

  // Date label and formatted value
  const dateRowLabel = usingEventDate ? '📅 Event Date' : '⏰ Deadline';
  const referenceDateFormatted = referenceDate
    ? new Date(referenceDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Check event page';

  // Show eventDate as a secondary row only when using deadline as primary
  const eventDateFormatted = !usingEventDate && event.eventDate
    ? new Date(event.eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const userName = user.name ? user.name.split(' ')[0] : 'there';
  const applyLink = event.applyLink || event.link || (process.env.CLIENT_URL || 'http://localhost:3000') + '/events';
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

    <!-- HEADER -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#6366f1,#8b5cf6);">
      <tr>
        <td style="padding:28px 32px;">
          <table border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:rgba(255,255,255,0.2);border-radius:10px;padding:10px 12px;font-size:20px;" valign="middle">⏰</td>
              <td style="padding-left:12px;" valign="middle">
                <p style="margin:0;color:#fff;font-size:20px;font-weight:700;">Clockdin</p>
                <p style="margin:2px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Deadline Reminder</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- BODY -->
    <div style="padding:32px;">

      <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
        Hi <strong>${userName}</strong>,
      </p>

      <!-- Urgency Banner -->
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:${cfg.bgColor};border:1px solid ${cfg.borderColor};border-left:4px solid ${cfg.color};border-radius:10px;margin-bottom:24px;">
        <tr>
          <td style="padding:14px 18px;">
            <p style="margin:0;font-weight:700;color:${cfg.color};font-size:16px;">${cfg.emoji} ${cfg.urgencyText}</p>
            <p style="margin:6px 0 0;color:${cfg.color};font-size:13px;opacity:0.85;">${cfg.subText}</p>
          </td>
        </tr>
      </table>

      <!-- Event Card -->
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;margin-bottom:28px;">
        <!-- Card Header -->
        <tr>
          <td style="background:#f9fafb;padding:12px 20px;border-bottom:1px solid #e5e7eb;">
            <span style="background:#eef2ff;color:#6366f1;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;text-transform:uppercase;letter-spacing:0.5px;">${event.category || 'Event'}</span>
            ${event.skillLevel ? `<span style="background:#f3f4f6;color:#6b7280;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;margin-left:6px;text-transform:uppercase;">${event.skillLevel}</span>` : ''}
          </td>
        </tr>
        <!-- Card Body -->
        <tr>
          <td style="padding:20px;">
            <h2 style="margin:0 0 4px;font-size:19px;font-weight:700;color:#111827;">${event.title}</h2>
            <p style="margin:0 0 14px;font-size:14px;color:#6366f1;font-weight:500;">${event.organization || ''}</p>
            ${event.description ? `<p style="margin:0 0 16px;font-size:14px;color:#6b7280;line-height:1.6;">${event.description.substring(0, 200)}${event.description.length > 200 ? '...' : ''}</p>` : ''}

            <table width="100%" border="0" cellpadding="0" cellspacing="0">
              ${event.location ? `
              <tr>
                <td style="padding:5px 0;width:120px;font-size:13px;color:#9ca3af;font-weight:500;" valign="top">📍 Location</td>
                <td style="padding:5px 0;font-size:13px;color:#374151;font-weight:500;" valign="top">${event.location}${event.mode ? ' (' + event.mode + ')' : ''}</td>
              </tr>` : ''}
              ${eventDateFormatted ? `
              <tr>
                <td style="padding:5px 0;font-size:13px;color:#9ca3af;font-weight:500;" valign="top">📅 Event Date</td>
                <td style="padding:5px 0;font-size:13px;color:#374151;font-weight:500;" valign="top">${eventDateFormatted}</td>
              </tr>` : ''}
              <tr>
                <td style="padding:5px 0;font-size:13px;color:${cfg.color};font-weight:600;" valign="top">${dateRowLabel}</td>
                <td style="padding:5px 0;font-size:13px;color:${cfg.color};font-weight:700;" valign="top">${referenceDateFormatted}</td>
              </tr>
              ${event.duration ? `
              <tr>
                <td style="padding:5px 0;font-size:13px;color:#9ca3af;font-weight:500;" valign="top">⏱️ Duration</td>
                <td style="padding:5px 0;font-size:13px;color:#374151;font-weight:500;" valign="top">${event.duration}</td>
              </tr>` : ''}
            </table>
          </td>
        </tr>
      </table>

      <!-- CTA -->
      <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td align="center">
            <a href="${applyLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;text-decoration:none;">Apply Now →</a>
          </td>
        </tr>
      </table>

      <p style="text-align:center;font-size:13px;color:#9ca3af;margin:0;">
        You're receiving this because you clicked <strong>"Notify Me"</strong> on this event in Clockdin.
      </p>
    </div>

    <!-- FOOTER -->
    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-top:1px solid #e5e7eb;">
      <tr>
        <td style="padding:20px 32px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">© 2026 Clockdin · Hyderabad, India</p>
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            <a href="${clientUrl}/events" style="color:#6366f1;text-decoration:none;">View all events</a>
            &nbsp;·&nbsp;
            <a href="${clientUrl}/profile" style="color:#6366f1;text-decoration:none;">Manage notifications</a>
          </p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────
// EMAIL SENDER FOR DEADLINE REMINDERS
// ─────────────────────────────────────────────────────────────

const nodemailer = require('nodemailer');

let _transporter = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return _transporter;
}

async function sendDeadlineReminderEmail(user, event, daysLeft) {
  if (!user || !user.email) {
    console.log('[Email] Skipping deadline reminder — no user email');
    return false;
  }
  if (!event || !event.title) {
    console.log('[Email] Skipping deadline reminder — invalid event');
    return false;
  }

  const urgencyLabels = { 0: 'Closes TODAY', 1: 'Closes TOMORROW', 3: 'Closes in 3 days', 7: 'Closes in 7 days' };
  const emojis = { 0: '🔴', 1: '🟠', 3: '⚠️', 7: '⏰' };
  const label = urgencyLabels[daysLeft] || `Closes in ${daysLeft} days`;
  const emoji = emojis[daysLeft] || '⏰';

  const subject = `${emoji} ${label}: ${event.title}`;
  const html = getDeadlineReminderHtml(user, event, daysLeft);

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"Clockdin" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject,
      html
    });
    console.log(`[Email] Deadline reminder sent to ${user.email} (${daysLeft}d) for: ${event.title}`);
    return true;
  } catch (err) {
    console.error(`[Email] Failed to send deadline reminder to ${user.email}:`, err.message);
    return false;
  }
}

module.exports = {
  getPersonalEventTemplate,
  sendDeadlineReminderEmail
};
