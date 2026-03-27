import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';
import dotenv from 'dotenv';
dotenv.config();

export const configurePassport = (passport) => {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:8000/api/auth/google/callback',
    passReqToCallback: false,
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error('No email from Google profile'), null);

      // Check if user exists by googleId first
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        // Check if account exists with same email (link accounts)
        user = await User.findOne({ email });
        if (user) {
          user.googleId = profile.id;
          if (!user.avatar && profile.photos?.[0]?.value) {
            user.avatar = profile.photos[0].value;
          }
          await user.save({ validateBeforeSave: false });
        } else {
          // Create new user
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email,
            avatar: profile.photos?.[0]?.value || '',
            isVerified: true,
            role: 'candidate',
          });
        }
      }

      return done(null, user);
    } catch (err) {
      console.error('Passport Google Strategy error:', err);
      return done(err, null);
    }
  }));

  // Minimal serialize/deserialize (not actually used since session:false, but kept for safety)
  passport.serializeUser((user, done) => done(null, user._id.toString()));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id).select('-password');
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });
};

