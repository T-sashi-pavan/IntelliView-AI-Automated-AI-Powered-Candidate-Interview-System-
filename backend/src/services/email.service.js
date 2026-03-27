import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (email, name, token) => {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: process.env.SENDER_EMAIL || 'InterviewAI <noreply@interviewai.com>',
    to: email,
    subject: 'Verify Your InterviewAI Account',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <h1 style="color: #60a5fa; margin-bottom: 8px;">Welcome to InterviewAI, ${name}!</h1>
        <p>Please verify your email address to get started.</p>
        <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
          Verify Email
        </a>
        <p style="color: #94a3b8; font-size: 12px;">This link expires in 24 hours.</p>
      </div>
    `,
  });
};

export const sendInterviewLink = async (email, name, interviewTitle, link) => {
  await transporter.sendMail({
    from: process.env.SENDER_EMAIL || 'InterviewAI <noreply@interviewai.com>',
    to: email,
    subject: `Interview Invitation: ${interviewTitle}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <h1 style="color: #60a5fa;">You've been invited to an interview!</h1>
        <p>Hi ${name || 'Candidate'},</p>
        <p>You have been invited to attend an AI-powered interview for: <strong>${interviewTitle}</strong></p>
        <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
          Start Interview
        </a>
        <p style="color: #fbbf24; font-size: 14px; font-weight: 500;">⚠️ Important: This link will expire in 24 hours. Please attempt the interview as soon as possible.</p>
        <p style="color: #94a3b8;">Good luck!</p>
      </div>
    `,
  });
};

export const sendPasswordReset = async (email, name, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: process.env.SENDER_EMAIL || 'InterviewAI <noreply@interviewai.com>',
    to: email,
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <h1 style="color: #60a5fa;">Password Reset Request</h1>
        <p>Hi ${name},</p>
        <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444, #f97316); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
          Reset Password
        </a>
        <p style="color: #94a3b8;">This link expires in 1 hour. If you didn't request this, please ignore.</p>
      </div>
    `,
  });
};

export const sendAccessRequestStatus = async (email, name, interviewTitle, status, link) => {
  const isGranted = status === 'granted';
  const color = isGranted ? '#10b981' : '#ef4444';
  const statusUpper = status.charAt(0).toUpperCase() + status.slice(1);

  await transporter.sendMail({
    from: process.env.SENDER_EMAIL || 'InterviewAI <noreply@interviewai.com>',
    to: email,
    subject: `Interview Access Request: ${statusUpper}`,
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #e2e8f0; padding: 40px; border-radius: 16px;">
        <h1 style="color: ${color};">${statusUpper}!</h1>
        <p>Hi ${name},</p>
        <p>Your request to access the interview <strong>${interviewTitle}</strong> has been <strong>${status}</strong>.</p>
        ${isGranted ? `
          <p>You can now start the interview using the link below:</p>
          <a href="${link}" style="display: inline-block; background: linear-gradient(135deg, #10b981, #34d399); color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
            Start Interview
          </a>
        ` : `<p>Unfortunately, your request was not approved at this time.</p>`}
        <p style="color: #94a3b8;">InterviewAI Team</p>
      </div>
    `,
  });
};

