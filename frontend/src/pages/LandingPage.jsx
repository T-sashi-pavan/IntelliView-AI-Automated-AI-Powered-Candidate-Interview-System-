import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useAuthStore from '../store/authStore';
import {
  Brain, Zap, FileSearch, BarChart3, Mic, ChevronRight, Plus,
  Star, Shield, Clock, Users, ArrowRight, Menu, X,
  CheckCircle, TrendingUp, Award, MessageSquare
} from 'lucide-react';


const features = [
  { icon: Brain, title: 'Adaptive AI Interviews', desc: 'AI dynamically adjusts questions based on candidate responses for smarter evaluation.', color: '#6366f1' },
  { icon: FileSearch, title: 'Resume-Based Questions', desc: 'AI analyzes the job description and generates highly relevant, skill-specific questions.', color: '#3b82f6' },
  { icon: Zap, title: 'Real-Time Feedback', desc: 'Instant AI evaluation with detailed scoring and constructive feedback on every answer.', color: '#22d3ee' },
  { icon: BarChart3, title: 'Recruiter Analytics', desc: 'Comprehensive dashboards showing candidate performance, trends, and hiring insights.', color: '#10b981' },
];

const steps = [
  { n: '01', title: 'Create Interview', desc: 'Recruiters define the job role, skills, and let AI generate perfectly tailored interview questions.' },
  { n: '02', title: 'Candidate Attends', desc: 'Candidates join via a unique link, answer questions via voice or text in an adaptive AI session.' },
  { n: '03', title: 'Get Insights', desc: 'Both parties receive detailed reports: scores, feedback, strengths, weaknesses, and AI recommendations.' },
];

const testimonials = [
  { name: 'Sarah Johnson', role: 'Head of Talent, TechCorp', text: 'InterviewAI has reduced our time-to-hire by 60%. The AI feedback is incredibly accurate and saves our team hours of review time.', rating: 5, initial: 'S' },
  { name: 'Marcus Chen', role: 'Senior Engineer, StartupXYZ', text: 'I used InterviewAI to prep for FAANG interviews. The adaptive questions and detailed feedback helped me land my dream job!', rating: 5, initial: 'M' },
  { name: 'Priya Patel', role: 'HR Director, GlobalFinance', text: 'The analytics dashboard gives us actionable insights. We can now make data-driven hiring decisions with confidence.', rating: 5, initial: 'P' },
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

        <div className="navbar-links" style={{ display: mobileMenuOpen ? 'none' : undefined }}>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it Works</a>
          <a href="#testimonials">Testimonials</a>
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
            <a href="#testimonials" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
            {!isAuthenticated && <Link to="/signin" className="btn btn-secondary">Login</Link>}
            {!isAuthenticated && <Link to="/signup" className="btn btn-primary">Get Started</Link>}
          </div>
        </div>
      )}

      {/* HERO */}
      <section className="hero-section">
        <div className="hero-bg" />
        <div className="hero-grid" />
        <div className="hero-content animate-fade">
          <div className="hero-badge">
            <Zap size={14} />
            Powered by Groq + Gemini AI
          </div>
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

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
            <button className="btn btn-outline" onClick={handleCreateInterview}>
              <Plus size={16} /> Create Interview
            </button>
            <button className="btn btn-outline" onClick={handleAttendInterview}>
              <Mic size={16} /> Attend Interview
            </button>
          </div>

          <div className="hero-stats">
            {[
              { n: '10K+', l: 'Interviews Conducted' },
              { n: '95%', l: 'Accuracy Rate' },
              { n: '500+', l: 'Companies Trust Us' },
              { n: '< 2s', l: 'AI Response Time' },
            ].map(({ n, l }) => (
              <div className="hero-stat" key={l}>
                <span className="hero-stat-number">{n}</span>
                <span className="hero-stat-label">{l}</span>
              </div>
            ))}
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

      {/* TESTIMONIALS */}
      <section className="testimonials-section" id="testimonials">
        <div className="container">
          <div className="section-header">
            <div className="section-tag"><Star size={12} /> Testimonials</div>
            <h2>Loved by <span className="gradient-text">Teams Worldwide</span></h2>
          </div>
          <div className="testimonials-grid">
            {testimonials.map(({ name, role, text, rating, initial }) => (
              <div className="testimonial-card" key={name}>
                <div className="testimonial-stars">
                  {Array.from({ length: rating }).map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                </div>
                <p className="testimonial-text">"{text}"</p>
                <div className="testimonial-author">
                  <div className="avatar" style={{ background: 'var(--gradient-primary)' }}>{initial}</div>
                  <div>
                    <div className="testimonial-name">{name}</div>
                    <div className="testimonial-role">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section style={{ padding: 'var(--space-3xl) 0', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ marginBottom: 16 }}>Ready to Transform Your <span className="gradient-text">Interview Process?</span></h2>
          <p style={{ marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
            Join thousands of companies using InterviewAI to hire smarter and faster.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-primary btn-lg">
              Start Free Today <ArrowRight size={18} />
            </Link>
            <Link to="/signin" className="btn btn-secondary btn-lg">
              Login to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="navbar-logo" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="logo-icon" style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  <img src="/AI_and_human_connection_symbol-removebg-preview.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.2)' }} />
                </div>
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-display)' }}>Interview<span style={{ color: 'var(--accent-blue-light)' }}>AI</span></span>
              </div>
              <p>The intelligent interview platform built for the future of hiring.</p>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#how-it-works">How it Works</a></li>
                <li><Link to="/signup">Get Started</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Account</h4>
              <ul>
                <li><Link to="/signin">Sign In</Link></li>
                <li><Link to="/signup">Sign Up</Link></li>
                <li><Link to="/forgot-password">Reset Password</Link></li>
              </ul>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <ul>
                <li><a href="#">Privacy Policy</a></li>
                <li><a href="#">Terms of Service</a></li>
                <li><a href="#">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2026 InterviewAI. All rights reserved.</p>
            <p>Built with ❤️ using Groq + Gemini AI</p>
          </div>
        </div>
      </footer>
    </div>
  );
}


