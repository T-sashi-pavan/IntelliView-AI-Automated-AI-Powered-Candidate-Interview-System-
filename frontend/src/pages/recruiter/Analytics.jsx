import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { BarChart3, TrendingUp, Users, Award, Trophy, ChevronRight, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#6366f1', '#22d3ee', '#10b981', '#f59e0b'];

export default function RecruiterAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grantLoading, setGrantLoading] = useState({});

  const refreshLeaderboard = () => {
    api.get('/analytics/leaderboard').then(l => setLeaderboard(l.data.leaderboard || []));
  };

  useEffect(() => {
    Promise.all([
      api.get('/analytics/recruiter'),
      api.get('/analytics/leaderboard'),
    ]).then(([a, l]) => {
      setAnalytics(a.data);
      setLeaderboard(l.data.leaderboard || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const monthlyTrends = analytics?.monthlyTrends || [];
  const scoreDistribution = analytics?.scoreDistribution || [];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: '10px 16px', fontSize: '0.8rem' }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
          {payload.map(p => <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>)}
        </div>
      );
    }
    return null;
  };

  const getMedalColor = (rank) => {
    if (rank === 1) return '#f59e0b';
    if (rank === 2) return '#94a3b8';
    if (rank === 3) return '#a87c5b';
    return 'rgba(255,255,255,0.08)';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'var(--accent-green)';
    if (score >= 60) return 'var(--accent-blue-light)';
    if (score >= 40) return 'var(--accent-orange)';
    return '#ef4444';
  };

  const handleGrant = async (sessionId) => {
    setGrantLoading(prev => ({ ...prev, [sessionId]: 'granting' }));
    try {
      await api.post('/analytics/grant-result', { sessionId });
      toast.success('Result granted to candidate!');
      // Update local state
      setLeaderboard(prev => prev.map(role => ({
        ...role,
        candidates: role.candidates.map(c =>
          c.sessionId === sessionId ? { ...c, resultGranted: true } : c
        )
      })));
      if (selectedRole) {
        setSelectedRole(prev => ({
          ...prev,
          candidates: prev.candidates.map(c =>
            c.sessionId === sessionId ? { ...c, resultGranted: true } : c
          )
        }));
      }
    } catch (e) {
      toast.error('Failed to grant result.');
    }
    setGrantLoading(prev => ({ ...prev, [sessionId]: null }));
  };

  const handleRevoke = async (sessionId) => {
    setGrantLoading(prev => ({ ...prev, [sessionId]: 'revoking' }));
    try {
      await api.post('/analytics/revoke-result', { sessionId });
      toast.success('Result access revoked.');
      setLeaderboard(prev => prev.map(role => ({
        ...role,
        candidates: role.candidates.map(c =>
          c.sessionId === sessionId ? { ...c, resultGranted: false } : c
        )
      })));
      if (selectedRole) {
        setSelectedRole(prev => ({
          ...prev,
          candidates: prev.candidates.map(c =>
            c.sessionId === sessionId ? { ...c, resultGranted: false } : c
          )
        }));
      }
    } catch (e) {
      toast.error('Failed to revoke result.');
    }
    setGrantLoading(prev => ({ ...prev, [sessionId]: null }));
  };

  return (
    <DashboardLayout role="recruiter" title="Analytics" subtitle="Comprehensive insights into your interview performance">
      <div className="dashboard-page">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div className="spinner" style={{ width: 48, height: 48 }} />
          </div>
        ) : selectedRole ? (
          /* ── Per-Role Leaderboard Detail ─────────────────── */
          <div className="animate-fade">
            <button className="btn btn-ghost btn-sm" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }} onClick={() => setSelectedRole(null)}>
              <ArrowLeft size={16} /> Back to Analytics
            </button>
            <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={22} color="#f59e0b" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 700 }}>{selectedRole.title}</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{selectedRole.totalCandidates} candidate{selectedRole.totalCandidates !== 1 ? 's' : ''} · Avg score: <strong style={{ color: 'var(--accent-blue-light)' }}>{selectedRole.avgScore}%</strong></p>
                </div>
              </div>
            </div>

            {selectedRole.candidates.length === 0 ? (
              <div className="empty-state"><p>No candidates have completed this interview yet.</p></div>
            ) : (
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 90px 100px 120px 160px', gap: 0, padding: '12px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-primary)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                  <div>Rank</div><div>Candidate</div><div>Email</div><div>Score</div><div>Status</div><div>Completed</div><div style={{ textAlign: 'center' }}>Result Access</div>
                </div>
                {selectedRole.candidates.map((c) => (
                  <div key={c.sessionId || c.candidateId} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 90px 100px 120px 160px', gap: 0, padding: '14px 20px', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: getMedalColor(c.rank), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: c.rank <= 3 ? '#000' : 'var(--text-primary)' }}>
                        {c.rank}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar" style={{ width: 34, height: 34, fontSize: '0.85rem', flexShrink: 0 }}>
                        {c.avatar ? <img src={c.avatar} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (c.name?.[0] || '?')}
                      </div>
                      <span style={{ fontWeight: 500 }}>{c.name || 'Unknown'}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{c.email}</div>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: getScoreColor(c.score) }}>{c.score}%</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: 20, background: c.score > 0 ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: c.score > 0 ? '#10b981' : '#f87171', border: `1px solid ${c.score > 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                        {c.score > 0 ? 'Completed' : 'Terminated'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {c.completedAt ? new Date(c.completedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </div>
                    {/* Grant / Revoke */}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      {c.resultGranted ? (
                        <button
                          className="btn btn-sm"
                          disabled={grantLoading[c.sessionId] === 'revoking'}
                          onClick={() => handleRevoke(c.sessionId)}
                          style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', fontSize: '0.75rem', gap: 4, padding: '5px 10px' }}
                        >
                          <XCircle size={13} />
                          {grantLoading[c.sessionId] === 'revoking' ? 'Revoking…' : 'Revoke'}
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm"
                          disabled={grantLoading[c.sessionId] === 'granting'}
                          onClick={() => handleGrant(c.sessionId)}
                          style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontSize: '0.75rem', gap: 4, padding: '5px 10px' }}
                        >
                          <CheckCircle size={13} />
                          {grantLoading[c.sessionId] === 'granting' ? 'Granting…' : 'Grant'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Main Analytics Dashboard ─────────────────────── */
          <>
            <div className="stats-grid" style={{ marginBottom: 24 }}>
              {[
                { label: 'Total Interviews', value: analytics?.stats?.totalInterviews ?? 0, icon: BarChart3, color: '#3b82f6' },
                { label: 'Total Candidates', value: analytics?.stats?.totalCandidates ?? 0, icon: Users, color: '#6366f1' },
                { label: 'Avg Score', value: `${analytics?.stats?.avgScore ?? 0}%`, icon: TrendingUp, color: '#10b981' },
                { label: 'Active Sessions', value: analytics?.stats?.activeSessions ?? 0, icon: Award, color: '#f59e0b' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div className="stat-card" key={label}>
                  <div className="stat-icon-wrapper" style={{ background: `${color}18` }}>
                    <Icon size={22} color={color} />
                  </div>
                  <div className="stat-value" style={{ color }}>{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">Accuracy Trends</div>
                  <TrendingUp size={18} color="var(--accent-blue-light)" />
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="avgScore" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 5 }} name="Avg Score %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-card">
                <div className="chart-header">
                  <div className="chart-title">Candidate Performance</div>
                  <BarChart3 size={18} color="var(--accent-purple-light)" />
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="range" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Candidates" radius={[6, 6, 0, 0]}>
                      {scoreDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leaderboard by Job Role */}
            <div className="chart-card" style={{ marginBottom: 'var(--space-xl)' }}>
              <div className="chart-header">
                <div className="chart-title">🏆 Leaderboard by Job Role</div>
                <Trophy size={18} color="#f59e0b" />
              </div>
              {leaderboard.length === 0 ? (
                <div className="empty-state"><p>No interview data yet. Run some interviews first.</p></div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 4 }}>
                  {leaderboard.map((role) => (
                    <div key={role.interviewId} className="glass-card" style={{ padding: '18px 20px', cursor: 'pointer', border: '1px solid rgba(59,130,246,0.1)', transition: 'all 0.2s' }}
                      onClick={() => setSelectedRole(role)}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.1)'; e.currentTarget.style.transform = 'none'; }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <h4 style={{ fontWeight: 600, fontSize: '0.95rem', lineHeight: 1.3, flex: 1, paddingRight: 8 }}>{role.title}</h4>
                        <ChevronRight size={16} color="var(--text-muted)" />
                      </div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>CANDIDATES</div>
                          <div style={{ fontWeight: 700, color: 'var(--accent-blue-light)' }}>{role.totalCandidates}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>AVG SCORE</div>
                          <div style={{ fontWeight: 700, color: getScoreColor(role.avgScore) }}>{role.avgScore ? `${role.avgScore}%` : '—'}</div>
                        </div>
                        {role.candidates[0] && (
                          <div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>TOP</div>
                            <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                              🥇 {role.candidates[0].name?.split(' ')[0]}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top performers */}
            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">Recent Top Performers</div>
                <Award size={18} color="var(--accent-orange)" />
              </div>
              {analytics?.recentSessions?.slice(0, 5).map((s, i) => (
                <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: getMedalColor(i + 1), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: i < 3 ? '#000' : 'var(--text-primary)' }}>
                    {i + 1}
                  </div>
                  <div className="avatar">{s.candidate?.name?.[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{s.candidate?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.interview?.title}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: getScoreColor(s.overallScore) }}>
                    {s.overallScore}%
                  </div>
                </div>
              ))}
              {!analytics?.recentSessions?.length && (
                <div className="empty-state"><p>No data yet. Run some interviews first.</p></div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
