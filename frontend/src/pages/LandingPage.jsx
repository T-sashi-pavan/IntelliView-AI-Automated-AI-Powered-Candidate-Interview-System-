import { Link, useNavigate } from 'react-router-dom';
import { useState, Suspense } from 'react';
import useAuthStore from '../store/authStore';
import {
  Brain, Zap, FileSearch, BarChart3, Mic, Plus,
  Star, ArrowRight, Menu, X, CheckCircle
} from 'lucide-react';

// Lazy load Beams to avoid SSR issues
import { lazy } from 'react';
const Beams = lazy(() => import('../components/Beams'));

const features = [
  { icon: Brain, title: 'Adaptive AI Interviews', desc: 'AI dynamically adjusts questions based on candidate responses and resume for smarter evaluation.', color: '#6366f1' },
  { icon: FileSearch, title: 'Resume-Based Questions', desc: 'AI analyzes the job description and resume to generate highly relevant, skill-specific questions.', color: '#3b82f6' },
  { icon: Zap, title: 'Real-Time Feedback', desc: 'Instant AI evaluation with detailed scoring and constructive feedback on every answer.', color: '#22d3ee' },
  { icon: BarChart3, title: 'Recruiter Analytics', desc: 'Comprehensive dashboards showing candidate performance, trends, and hiring insights.', color: '#10b981' },
];

const steps = [
  { n: '01', title: 'Create Interview', desc: 'Recruiters define the job role, skills, and let AI generate perfectly tailored interview questions.' },
  { n: '02', title: 'Candidate Attends', desc: 'Candidates join via a unique link, answer questions via voice or text in an adaptive AI session.' },
  { n: '03', title: 'Get Insights', desc: 'Both parties receive detailed reports: scores, feedback, strengths, weaknesses, and AI recommendations.' },
];

export default function LandingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleCreateInterview = () => {
    if (!isAuthenticated) navigate('/signup');
    else navigate('/recruiter/create-interview');
  };

  const handleAttendInterview = () => {
    if (!isAuthenticated) navigate('/signup');
    else navigate('/candidate/attend');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* NAVBAR */}
      <nav className="navbar">
        <Link to="/" className="navbar-logo">
          <div className="logo-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/AI_and_human_connection_symbol-removebg-preview.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.2)' }} />
          </div>
          Interview<span style={{ color: 'var(--accent-blue-light)' }}>AI</span>
        </Link>

        <div className="navbar-links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it Works</a>
        </div>

        <div className="navbar-actions">
          {isAuthenticated ? (
            <button className="btn btn-primary" onClick={() => navigate(user.role === 'recruiter' ? '/recruiter' : '/candidate')}>
              Dashboard <ArrowRight size={16} />
            </button>
          ) : (
            <>
              <Link to="/signin" className="btn btn-ghost">Login</Link>
              <Link to="/signup" className="btn btn-primary">Get Started <ArrowRight size={16} /></Link>
            </>
          )}
          <button className="btn btn-ghost btn-icon hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div style={{ position: 'fixed', top: 64, left: 0, right: 0, zIndex: 999, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-primary)', padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}>How it Works</a>
            {!isAuthenticated && <Link to="/signin" className="btn btn-secondary">Login</Link>}
            {!isAuthenticated && <Link to="/signup" className="btn btn-primary">Get Started</Link>}
          </div>
        </div>
      )}

      {/* HERO with Beams background */}
      <section className="hero-section" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Beams WebGL background */}
        <Suspense fallback={<div style={{ position: 'absolute', inset: 0, background: 'var(--gradient-hero)' }} />}>
          <Beams
            beamWidth={3}
            beamHeight={30}
            beamNumber={15}
            lightColor="#818cf8"
            speed={1.5}
            noiseIntensity={1.5}
            scale={0.2}
            rotation={30}
          />
        </Suspense>

        {/* Dark overlay for readability */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(7,11,20,0.92) 0%, rgba(7,11,20,0.7) 50%, rgba(7,11,20,0.92) 100%)', zIndex: 1 }} />

        <div className="hero-content animate-fade" style={{ position: 'relative', zIndex: 2 }}>
          <h1 className="hero-title">
            AI-Powered<br />
            <span className="gradient-text">Interview Platform</span>
          </h1>
          <p className="hero-sub">
            Conduct smarter interviews with adaptive AI and real-time evaluation.
            Transform your hiring process with intelligent, data-driven insights.
          </p>

          <div className="hero-actions">
            <Link to="/signup" className="btn btn-primary btn-lg">
              Get Started <ArrowRight size={18} />
            </Link>
            <Link to="/signin" className="btn btn-secondary btn-lg">
              Login
            </Link>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16, marginTop: 8 }}>
            <button className="btn btn-outline" onClick={handleCreateInterview}>
              <Plus size={16} /> Create Interview
            </button>
            <button className="btn btn-outline" onClick={handleAttendInterview}>
              <Mic size={16} /> Attend Interview
            </button>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section" id="features">
        <div className="container">
          <div className="section-header">
            <div className="section-tag"><Zap size={12} /> Features</div>
            <h2>Everything You Need for <span className="gradient-text">Smarter Hiring</span></h2>
            <p style={{ maxWidth: 500, margin: '0 auto', marginTop: 12 }}>
              Our platform combines cutting-edge AI with an intuitive interface to streamline your entire interview process.
            </p>
          </div>
          <div className="features-grid">
            {features.map(({ icon: Icon, title, desc, color }) => (
              <div className="feature-card animate-fade" key={title}>
                <div className="feature-icon" style={{ background: `${color}18`, borderColor: `${color}30`, color }}>
                  <Icon size={22} />
                </div>
                <h4 style={{ marginBottom: 8 }}>{title}</h4>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="steps-section" id="how-it-works" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-primary)', borderBottom: '1px solid var(--border-primary)' }}>
        <div className="container">
          <div className="section-header">
            <div className="section-tag"><CheckCircle size={12} /> Process</div>
            <h2>How It <span className="gradient-text">Works</span></h2>
          </div>
          <div className="steps-grid">
            {steps.map(({ n, title, desc }) => (
              <div className="step-card" key={n}>
                <div className="step-number">{n}</div>
                <h4 style={{ marginBottom: 12 }}>{title}</h4>
                <p style={{ fontSize: '0.875rem' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
