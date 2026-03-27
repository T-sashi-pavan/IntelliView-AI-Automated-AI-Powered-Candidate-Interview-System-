import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { Download, ArrowLeft, Brain, Trophy, TrendingUp, TrendingDown, CheckCircle, XCircle } from 'lucide-react';

export default function Results() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/candidates/session/${sessionId}`).then(r => {
      setSession(r.data.session);
      setLoading(false);
    }).catch(() => { navigate('/candidate'); });
  }, [sessionId]);

  if (loading) return (
    <div className="loading-overlay">
      <div className="spinner" style={{ width: 48, height: 48 }} />
    </div>
  );

  if (!session) return null;

  const score = session.overallScore || 0;
  const scorePct = `${score}%`;
  const getGrade = (s) => s >= 90 ? { label: 'Excellent', color: '#10b981' } : s >= 75 ? { label: 'Good', color: '#3b82f6' } : s >= 60 ? { label: 'Average', color: '#f59e0b' } : s >= 40 ? { label: 'Poor', color: '#f97316' } : { label: 'Needs Work', color: '#ef4444' };
  const grade = getGrade(score);

  const skillScores = session.skillScores ? Object.fromEntries(session.skillScores) : {};

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: 'var(--space-xl)' }}>
      <div className="results-page">
        {/* Back */}
        <button className="btn btn-ghost" onClick={() => navigate('/candidate')} style={{ marginBottom: 24 }}>
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        {/* Score Hero */}
        <div className="glass-card" style={{ padding: 'var(--space-2xl)', textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              <Brain size={12} style={{ display: 'inline', marginRight: 6 }} />
              AI Final Score
            </div>
            <h2 style={{ marginTop: 8 }}>{session.interview?.title}</h2>
          </div>

          <div className="score-circle" style={{ '--score-pct': `${score * 3.6}deg` }}>
            <div className="score-inner">
              <span className="score-number" style={{ color: grade.color }}>{score}</span>
              <span className="score-label">out of 100</span>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <span className="badge" style={{ background: `${grade.color}20`, color: grade.color, border: `1px solid ${grade.color}40`, fontSize: '1rem', padding: '8px 20px' }}>
              {grade.label}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 32, marginTop: 24 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{session.answers?.length || 0}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Questions Answered</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{session.strengths?.length || 0}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Strengths</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{session.weaknesses?.length || 0}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Areas to Improve</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
          {/* Strengths */}
          <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, color: 'var(--accent-green)' }}>
              <CheckCircle size={20} /> Strengths
            </h4>
            {session.strengths?.length ? session.strengths.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-green)', flexShrink: 0, marginTop: 8 }} />
                <p style={{ fontSize: '0.875rem' }}>{s}</p>
              </div>
            )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data yet.</p>}
          </div>

          {/* Weaknesses */}
          <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, color: 'var(--accent-orange)' }}>
              <TrendingUp size={20} /> Areas to Improve
            </h4>
            {session.weaknesses?.length ? session.weaknesses.map((w, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-orange)', flexShrink: 0, marginTop: 8 }} />
                <p style={{ fontSize: '0.875rem' }}>{w}</p>
              </div>
            )) : <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No data yet.</p>}
          </div>
        </div>

        {/* Skill Breakdown */}
        {Object.keys(skillScores).length > 0 && (
          <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            <h4 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Trophy size={20} color="var(--accent-orange)" /> Skill-wise Breakdown
            </h4>
            <div className="skill-bars">
              {Object.entries(skillScores).map(([skill, val]) => (
                <div className="skill-bar-item" key={skill}>
                  <div className="skill-bar-label">
                    <span>{skill}</span>
                    <span style={{ fontWeight: 700, color: val >= 70 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>{val}%</span>
                  </div>
                  <div className="skill-bar">
                    <div className="skill-bar-fill" style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Feedback */}
        {session.aiFeedback && (
          <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)', borderColor: 'rgba(99,102,241,0.3)' }}>
            <h4 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-purple-light)' }}>
              <Brain size={20} /> AI Comprehensive Feedback
            </h4>
            <p style={{ lineHeight: 1.8, fontSize: '0.9rem' }}>{session.aiFeedback}</p>
          </div>
        )}

        {/* Q&A Breakdown */}
        <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
          <h4 style={{ marginBottom: 20 }}>Answer-by-Answer Breakdown</h4>
          {session.answers?.map((a, i) => (
            <div key={i} style={{ padding: '20px 0', borderBottom: i < session.answers.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Q{i+1}: {a.question}</p>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{a.answer || <em style={{ color: 'var(--text-muted)' }}>Skipped</em>}</p>
                </div>
                <div style={{ textAlign: 'center', marginLeft: 16, flexShrink: 0 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: a.score >= 70 ? 'var(--accent-green)' : a.score >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)' }}>
                    {a.score}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/100</div>
                </div>
              </div>
              {a.feedback && (
                <div style={{ background: 'rgba(99,102,241,0.05)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: 'var(--text-secondary)', border: '1px solid rgba(99,102,241,0.15)' }}>
                  <Brain size={12} style={{ display: 'inline', marginRight: 6 }} /> {a.feedback}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/candidate')}>
            <ArrowLeft size={16} /> Dashboard
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/candidate/attend')}>
            Start Another Interview
          </button>
          <button className="btn btn-outline" onClick={() => window.print()}>
            <Download size={16} /> Download Report
          </button>
        </div>
      </div>
    </div>
  );
}
