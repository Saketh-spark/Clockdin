require('dotenv').config();
const nodemailer = require('nodemailer');
const events = require('./eventsData');
const express = require('express');
const router = express.Router();

router.get('/bookmark-notifications', async (req, res) => {
  res.status(200).send('Bookmark notifications route is working');
});

module.exports = router;