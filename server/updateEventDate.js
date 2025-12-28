const mongoose = require('mongoose');
const Event = require('./models/event.model');

(async () => {
  const mongoose = require('mongoose');
  const Event = require('./models/event.model');

  // Usage:
  // node updateEventDate.js "Event Title" "YYYY-MM-DD"
  // Example:
  // node updateEventDate.js "Flipkart GRiD 6.0" "2025-11-01"

  async function updateEventDate(title, dateString) {
    if (!title || !dateString) {
      console.error('Usage: node updateEventDate.js "Event Title" "YYYY-MM-DD"');
      const mongoose = require('mongoose');
      const Event = require('./models/event.model');

      // Usage:
      // node updateEventDate.js "Event Title" "YYYY-MM-DD"
      // Example:
      // node updateEventDate.js "Flipkart GRiD 6.0" "2025-11-01"

      async function updateEventDate(title, dateString) {
        if (!title || !dateString) {
          console.error('Usage: node updateEventDate.js "Event Title" "YYYY-MM-DD"');
          process.exitCode = 1;
          return;
        }

        const newDeadline = new Date(dateString);
        const mongoose = require('mongoose');
        const Event = require('./models/event.model');

        // Usage:
        // node updateEventDate.js "Event Title" "YYYY-MM-DD"
        // Example:
        // node updateEventDate.js "Flipkart GRiD 6.0" "2025-11-01"

        async function updateEventDate(title, dateString) {
          if (!title || !dateString) {
            console.error('Usage: node updateEventDate.js "Event Title" "YYYY-MM-DD"');
            process.exitCode = 1;
            return;
          }

          const newDeadline = new Date(dateString);
          if (isNaN(newDeadline)) {
            console.error('Invalid date:', dateString);
            process.exitCode = 1;
            return;
          }

          try {
            // Connect to MongoDB (avoid deprecated options)
            await mongoose.connect(process.env.MONGO_URI);
            console.log('Connected to MongoDB');

            // Update the event by title and reset notificationSent so it can be re-evaluated
            const updatedEvent = await Event.findOneAndUpdate(
              { title },
              { $set: { deadline: newDeadline, notificationSent: false } },
              { new: true }
            );

            if (updatedEvent) {
              console.log(`Updated event: ${updatedEvent.title}`);
              console.log(`New deadline: ${updatedEvent.deadline}`);
            } else {
              console.log(`Event with title "${title}" not found.`);
            }
          } catch (err) {
            console.error('Error updating event:', err);
            process.exitCode = 1;
          } finally {
            try {
              await mongoose.connection.close();
            } catch (e) {
              // ignore
            }
          }
        }

        const [, , titleArg, dateArg] = process.argv;
        updateEventDate(titleArg, dateArg);