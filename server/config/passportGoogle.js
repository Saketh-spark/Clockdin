const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');

module.exports = (passport) => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: (process.env.SERVER_URL || 'http://localhost:5000') + '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      let user = await User.findOne({ email });
      if (!user) {
        user = await User.create({
          name: profile.displayName || 'Google User',
          email,
          googleId: profile.id,
          avatar: profile.photos?.[0]?.value
        });
      } else if (!user.googleId) {
        user.googleId = profile.id;
        user.avatar = user.avatar || profile.photos?.[0]?.value;
        await user.save();
      }
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  }));
};