import User from '../models/user.model.js';
import { generateTokens } from '../middleware/auth.middleware.js';
import { sendVerificationEmail, sendPasswordReset } from '../services/email.service.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ success: false, message: 'Email already registered.' });

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const user = await User.create({ name, email, password, role: role || 'candidate', verificationToken });

    try { await sendVerificationEmail(email, name, verificationToken); } catch (e) { console.warn('Email error:', e.message); }

    const { accessToken, refreshToken } = generateTokens(user._id);
    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });

    return res.status(201).json({ success: true, message: 'Account created. Please verify your email.', user: user.toJSON(), accessToken });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const { accessToken, refreshToken } = generateTokens(user._id);
    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, cookieOptions);

    return res.json({ success: true, user: user.toJSON(), accessToken });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

export const logout = (req, res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.json({ success: true, message: 'Logged out successfully.' });
};

export const getMe = async (req, res) => {
  return res.json({ success: true, user: req.user });
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ verificationToken: token });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid verification token.' });

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save({ validateBeforeSave: false });

    return res.json({ success: true, message: 'Email verified successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.json({ success: true, message: 'If that email exists, you will receive a reset link.' });

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpiry = new Date(Date.now() + 3600000);
    await user.save({ validateBeforeSave: false });

    try { await sendPasswordReset(email, user.name, token); } catch (e) { console.warn('Email error:', e.message); }

    return res.json({ success: true, message: 'Password reset email sent.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpiry: { $gt: new Date() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired token.' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

export const googleCallback = async (req, res) => {
  const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5174').replace(/\/$/, '');
  try {
    if (!req.user) {
      return res.redirect(`${FRONTEND_URL}/signin?error=no_user`);
    }
    const { accessToken, refreshToken } = generateTokens(req.user._id);
    res.cookie('accessToken', accessToken, cookieOptions);
    res.cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 });
    const redirectUrl = `${FRONTEND_URL}/auth/callback?token=${accessToken}&role=${req.user.role}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('googleCallback error:', err);
    return res.redirect(`${FRONTEND_URL}/signin?error=callback_failed`);
  }
};




export const updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['candidate', 'recruiter'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }
    const user = await User.findByIdAndUpdate(req.user._id, { role }, { new: true });
    return res.json({ success: true, user });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};
