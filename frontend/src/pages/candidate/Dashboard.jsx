import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import { Play, FileText, Trophy, TrendingUp, Target, BarChart3, ArrowRight, Star } from 'lucide-react';

export default function CandidateDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/candidate').then(r => {
      setAnalytics(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = analytics?.stats || {};
  const recentSessions = analytics?.sessions || [];

  const statCards = [
    { label: 'Interviews Attended', value: stats.totalInterviews ?? 0, icon: BarChart3, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { label: 'Avg Score', value: `${stats.avgScore ?? 0}%`, icon: TrendingUp, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Best Score', value: `${stats.bestScore ?? 0}%`, icon: Trophy, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Rank', value: stats.rank || 'N/A', icon: Star, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ];

  return (
    <DashboardLayout
      role="candidate"
      title={`Welcome, ${user?.name?.split(' ')[0] || 'Candidate'} 👋`}
      subtitle="Track your interview progress and performance"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/candidate/attend')}>
          <Play size={16} /> Start Interview
        </button>
      }
    >
      <div className="dashboard-page">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div className="spinner" style={{ width: 48, height: 48 }} />
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="stats-grid">
              {statCards.map(({ label, value, icon: Icon, color, bg }) => (
                <div className="stat-card" key={label}>
                  <div className="stat-icon-wrapper" style={{ background: bg }}>
                    <Icon size={22} color={color} />
                  </div>
                  <div className="stat-value" style={{ color }}>{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
              <div className="glass-card" style={{ padding: 'var(--space-xl)', cursor: 'pointer', textAlign: 'center' }}
                onClick={() => navigate('/candidate/attend')}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--accent-blue-light)' }}>
                  <Play size={26} />
                </div>
                <h4 style={{ marginBottom: 8 }}>Start Interview</h4>
                <p style={{ fontSize: '0.875rem' }}>Enter an interview link to begin an AI-powered session</p>
                <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }}>Start Now <ArrowRight size={14} /></button>
              </div>

              <div className="glass-card" style={{ padding: 'var(--space-xl)', cursor: 'pointer', textAlign: 'center' }}
                onClick={() => navigate('/candidate/my-results')}>
                <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: 'var(--accent-purple-light)' }}>
                  <FileText size={26} />
                </div>
                <h4 style={{ marginBottom: 8 }}>View Results</h4>
                <p style={{ fontSize: '0.875rem' }}>Review your past interview scores and AI feedback</p>
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }}>View All <ArrowRight size={14} /></button>
              </div>
            </div>

            {/* Recent Interviews */}
            <div className="table-wrapper">
              <div className="table-header">
                <div>
                  <div className="chart-title">Recent Interviews</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your latest sessions</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/candidate/my-results')}>
                  View All <ArrowRight size={14} />
                </button>
              </div>
              {recentSessions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Target size={36} /></div>
                  <p>No interviews attended yet. Get started with your first interview!</p>
                  <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/candidate/attend')}>
                    <Play size={16} /> Attend Interview
                  </button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Interview</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSessions.map(s => (
                      <tr key={s._id}>
                        <td style={{ fontWeight: 500 }}>{s.interview?.title || 'Interview'}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: s.overallScore >= 70 ? 'var(--accent-green)' : s.overallScore >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)' }}>
                            {s.overallScore}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${s.status === 'completed' ? 'success' : 'info'}`}>{s.status}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/candidate/results/${s._id}`)}>
                            Details <ArrowRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
