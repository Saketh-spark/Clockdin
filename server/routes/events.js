const express = require('express');
const Event = require('../models/event.model');
const router = express.Router();

// GET /api/events - get all events
router.get('/', async (req, res) => {
	try {
		const events = await Event.find();
		res.json(events);
	} catch (err) {
		res.status(500).json({ msg: 'Server error' });
	}
});

module.exports = router;

// POST /api/events/replace - replace all global events
router.post('/replace', async (req, res) => {
	try {
		const { events } = req.body;
		if (!Array.isArray(events)) {
			return res.status(400).json({ msg: 'Events array required' });
		}
		await Event.deleteMany({});
		const inserted = await Event.insertMany(events);
		res.json({ replaced: inserted.length });
	} catch (err) {
		res.status(500).json({ msg: 'Server error', error: err.message });
	}
});
