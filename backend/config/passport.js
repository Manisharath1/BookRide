const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const existingUser = await User.findOne({
      $or: [
        { googleId: profile.id },
        { email: profile.emails[0].value }
      ]
    });

    if (existingUser) {
      return done(null, existingUser);
    }

    // User not found, save profile info temporarily in session
    return done(null, false, {
      message: 'NEW_USER',
      googleData: {
        email: profile.emails[0].value,
        username: profile.displayName,
        googleId: profile.id
      }
    });

  } catch (err) {
    return done(err, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id || false); // false if user doesn't exist
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
