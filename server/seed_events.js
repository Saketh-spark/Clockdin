// This script seeds the database with real events for testing.
const axios = require('axios');
const mockEvents = require('./mockEventsData');
require('dotenv').config();

// Use allEvents array for bulk replace
const events = mockEvents.allEvents;

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
