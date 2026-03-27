import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Brain, ArrowRight } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function SignIn() {
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    const { success, role } = await login(form.email, form.password);
    if (success) navigate(role === 'recruiter' ? '/recruiter' : '/candidate');
  };

  const handleGoogle = () => {
    window.location.href = `${import.meta.env.VITE_BACKEND_URL}/api/auth/google`;
  };

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div className="hero-bg" />
        <div className="auth-left-content">
          <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
            <div className="logo-icon" style={{ width: 72, height: 72, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gradient-primary)', overflow: 'hidden' }}>
              <img src="/AI_and_human_connection_symbol-removebg-preview.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.2)' }} />
            </div>
          </div>
          <h2>Welcome Back</h2>
          <p>Sign in to continue your AI interview journey. Access your dashboard and manage interviews.</p>
          <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {['Smart AI Evaluation', 'Real-time Feedback', 'Advanced Analytics'].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--text-secondary)' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gradient-primary)', flexShrink: 0 }} />
                {f}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-form-container animate-fade">
          <div className="auth-logo">
            <div className="logo-icon"><img src="/AI_and_human_connection_symbol-removebg-preview.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.2)' }} /></div>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
              Interview<span style={{ color: 'var(--accent-blue-light)' }}>AI</span>
            </span>
          </div>
          <h2 className="auth-title">Sign In</h2>
          <p className="auth-subtitle">Enter your credentials to access your account</p>

          {/* Google Sign In */}
          <button className="google-btn" onClick={handleGoogle} type="button">
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <div className="divider">
            <span className="divider-line" />
            <span>or sign in with email</span>
            <span className="divider-line" />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper has-icon">
                <span className="input-icon"><Mail size={16} /></span>
                <input
                  id="email" type="email" placeholder="you@company.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  className={errors.email ? 'input-error' : ''}
                />
              </div>
              {errors.email && <span className="error-msg">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper has-icon" style={{ position: 'relative' }}>
                <span className="input-icon"><Lock size={16} /></span>
                <input
                  id="password" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className={errors.password ? 'input-error' : ''}
                  style={{ paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="error-msg">{errors.password}</span>}
              <div style={{ textAlign: 'right', marginTop: 4 }}>
                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--accent-blue-light)' }}>Forgot Password?</Link>
              </div>
            </div>

            <button type="submit" className={`btn btn-primary w-full btn-lg${loading ? ' btn-loading' : ''}`} disabled={loading}>
              {loading ? <span className="spinner spinner-sm" /> : <><ArrowRight size={18} /> Login</>}
            </button>
          </form>

          <p className="auth-footer-text">
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: 'var(--accent-blue-light)', fontWeight: 600 }}>Create Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
