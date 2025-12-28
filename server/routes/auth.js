const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// start google auth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// google callback
router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login` }),
  (req, res) => {
    const payload = { id: req.user._id, email: req.user.email, name: req.user.name };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
    // redirect back to client with token
    res.redirect(`${CLIENT_URL}/auth/success?token=${token}`);
  }
);

module.exports = router;