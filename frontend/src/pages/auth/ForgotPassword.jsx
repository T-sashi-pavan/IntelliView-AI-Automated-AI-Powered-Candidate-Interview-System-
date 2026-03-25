import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Brain, ArrowLeft, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { toast.error('Please enter your email'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
      toast.success('Reset link sent!');
    } catch { toast.error('Something went wrong'); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg-primary)' }}>
      <div style={{ width: '100%', maxWidth: 420 }} className="animate-fade">
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div className="logo-icon" style={{ width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-primary)', overflow: 'hidden' }}>
            <img src="/AI_and_human_connection_symbol-removebg-preview.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.2)' }} />
          </div>
          <h2>Forgot Password</h2>
          <p style={{ marginTop: 8 }}>{sent ? 'Check your inbox for a reset link.' : 'Enter your email to receive a password reset link.'}</p>
        </div>

        <div className="glass-card" style={{ padding: 32 }}>
          {!sent ? (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-wrapper has-icon">
                  <span className="input-icon"><Mail size={16} /></span>
                  <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <button type="submit" className={`btn btn-primary w-full${loading ? ' btn-loading' : ''}`} disabled={loading}>
                {loading ? <span className="spinner spinner-sm" /> : <><ArrowRight size={16} /> Send Reset Link</>}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📧</div>
              <p>A password reset link has been sent to <strong>{email}</strong>.</p>
              <p style={{ marginTop: 8, fontSize: '0.875rem' }}>Check your spam folder if you don't see it within a few minutes.</p>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Link to="/signin" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            <ArrowLeft size={16} /> Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
