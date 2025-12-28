const express = require('express');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const Event = require('../models/event.model');
require('dotenv').config();

const router = express.Router();

// Utility: concise event summary
function conciseEvent(event) {
  return `${event.title} (${event.type || ''})\nLocation: ${event.location || 'N/A'}\nDate: ${event.eventDate ? new Date(event.eventDate).toLocaleDateString() : 'N/A'}\nDeadline: ${event.deadline ? new Date(event.deadline).toLocaleDateString() : 'N/A'}\n${event.description ? event.description.slice(0, 100) + (event.description.length > 100 ? '...' : '') : ''}`;
}

// POST /api/chatbot
router.post('/', async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ reply: 'Please enter a question.' });
  }

  // 1. Check for event-related queries
  try {
    // Internships
    if (/internship/i.test(userMessage)) {
      const internships = await Event.find({ type: /internship/i }).sort({ deadline: 1 }).limit(5);
      if (internships.length === 0) return res.json({ reply: 'No internships are currently available.' });
      return res.json({
        reply: 'Available internships:\n' + internships.map(conciseEvent).join('\n\n')
      });
    }

    // Events on a particular date (YYYY-MM-DD or DD/MM/YYYY)
    const dateMatch = userMessage.match(/(\d{4}-\d{2}-\d{2})|(\d{2}\/\d{2}\/\d{4})/);
    if (/event|hackathon|workshop|seminar|competition/i.test(userMessage) && dateMatch) {
      let dateStr = dateMatch[0];
      let dateObj;
      if (dateStr.includes('-')) {
        dateObj = new Date(dateStr);
      } else if (dateStr.includes('/')) {
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const [d, m, y] = dateStr.split('/');
        dateObj = new Date(`${y}-${m}-${d}`);
      }
      // Find events on that date
      const events = await Event.find({
        eventDate: {
          $gte: new Date(dateObj.setHours(0,0,0,0)),
          $lte: new Date(dateObj.setHours(23,59,59,999))
        }
      });
      if (events.length === 0) return res.json({ reply: `No events found on ${dateStr}.` });
      return res.json({
        reply: `Events on ${dateStr}:\n` + events.map(conciseEvent).join('\n\n')
      });
    }

    // Event by name
    const eventNameMatch = userMessage.match(/(?:about|details|info|information)\s+(?:the\s+)?(.+?)\s+(?:event|internship|hackathon|workshop|seminar|competition)/i);
    if (eventNameMatch) {
      const name = eventNameMatch[1].trim();
      const event = await Event.findOne({ title: new RegExp(name, 'i') });
      if (!event) return res.json({ reply: `No event found with the name "${name}".` });
      return res.json({ reply: conciseEvent(event) });
    }

    // Upcoming events
    if (/upcoming|next|future/i.test(userMessage) && /event|hackathon|internship|workshop|seminar|competition/i.test(userMessage)) {
      const now = new Date();
      const events = await Event.find({ eventDate: { $gte: now } }).sort({ eventDate: 1 }).limit(5);
      if (events.length === 0) return res.json({ reply: 'No upcoming events found.' });
      return res.json({
        reply: 'Upcoming events:\n' + events.map(conciseEvent).join('\n\n')
      });
    }

    // List all events (short)
    if (/all events|show events|list events/i.test(userMessage)) {
      const events = await Event.find().sort({ eventDate: 1 }).limit(5);
      if (events.length === 0) return res.json({ reply: 'No events found.' });
      return res.json({
        reply: 'Some events:\n' + events.map(conciseEvent).join('\n\n')
      });
    }

    // If not matched, fallback to Gemini API
  } catch (err) {
    // If DB fails, fallback to Gemini
    console.error('Chatbot DB error:', err);
  }

  // 2. Fallback: Gemini API for general questions
  try {
    const geminiRes = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          { parts: [ { text: userMessage } ] }
        ]
      })
    });
    const data = await geminiRes.json();
    let reply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // If Gemini returns a "no access" or similar message, override it
    if (
      reply.toLowerCase().includes('i do not have access') ||
      reply.toLowerCase().includes('i am unable to assist') ||
      reply.toLowerCase().includes('as an ai language model')
    ) {
      reply = 'Sorry, I can only answer questions about events, internships, and opportunities on this website. Please ask about available events, internships, or details of a specific event.';
    }
    res.json({ reply });
  } catch (err) {
    console.error('Server error in /api/chatbot:', err);
    res.status(500).json({ reply: 'Sorry, I could not process your request at this time.' });
  }
});

module.exports = router;
