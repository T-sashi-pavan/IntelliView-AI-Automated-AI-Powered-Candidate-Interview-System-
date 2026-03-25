import express from 'express';
import passport from 'passport';
import {
  register, login, logout, getMe, verifyEmail,
  forgotPassword, resetPassword, googleCallback, updateRole
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.get('/verify-email', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.put('/update-role', protect, updateRole);

// Google OAuth — initiate
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
}));

// Google OAuth — callback using custom callback for full error control
router.get('/google/callback', (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    if (err) {
      console.error('Google OAuth error:', err);
      return res.redirect(`${process.env.FRONTEND_URL}/signin?error=oauth_error`);
    }
    if (!user) {
      console.warn('Google OAuth no user:', info);
      return res.redirect(`${process.env.FRONTEND_URL}/signin?error=oauth_failed`);
    }
    req.user = user;
    return googleCallback(req, res, next);
  })(req, res, next);
});

export default router;

