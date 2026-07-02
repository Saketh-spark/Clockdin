// This script seeds the database with real events for testing.
const axios = require('axios');
const mockEvents = require('./mockEventsData');
require('dotenv').config();

// Use allEvents array for bulk replace
const events = [...mockEvents.allEvents];
const now = new Date();
const twoDaysOut = new Date(now);
twoDaysOut.setDate(now.getDate() + 2);
const fiveDaysOut = new Date(now);
fiveDaysOut.setDate(now.getDate() + 5);
const formatDate = date => date.toISOString().split('T')[0];

events.push({
  id: 9999,
  title: 'AI Hackathon – Notification Test Event',
  description: 'This is a test event created to verify deadline-based notifications.',
  organizer: 'Clockdin Team',
  location: 'Virtual',
  deadline: formatDate(twoDaysOut),
  eventDate: formatDate(fiveDaysOut),
  tags: ['AI', 'Testing', 'Notifications'],
  isBookmarked: false,
  applyLink: 'https://clockdin.net/events/notification-test',
  participants: 100,
  type: 'hackathon',
  category: 'Hackathon',
  level: 'Beginner',
  mode: 'Online',
  duration: '48 hours',
  status: 'Published',
});

// Define a placeholder token for testing purposes
const token = 'test-token'; // Replace with a valid token if required

// Replace all global events
axios.post('http://localhost:5000/api/events/replace', { events })
  .then(res => {
    console.log('Global events replaced:', res.data.replaced);
    // After global events, clear personal events
    return axios.post('http://localhost:5000/api/users/myevents/replace', { events: [] }, {
      headers: { 'x-auth-token': token }
    });
  })
  .then(res => {
    console.log('Personal events cleared:', res.data.length);
  })
  .catch(err => {
    if (err.response) {
      console.error('Error:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err);
    }
  });
