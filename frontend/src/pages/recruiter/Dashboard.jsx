import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import {
  BarChart3, Users, Trophy, Activity, Plus, TrendingUp, ArrowRight,
  Calendar, Clock, ChevronRight
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#6366f1', '#22d3ee', '#10b981', '#f59e0b'];

export default function RecruiterDashboard() {
  const { user, updateRole } = useAuthStore();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/recruiter').then(r => {
      setAnalytics(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const stats = analytics?.stats || {};
  const monthlyTrends = analytics?.monthlyTrends || [];
  const scoreDistribution = analytics?.scoreDistribution || [];
  const recentSessions = analytics?.recentSessions || [];

  const statCards = [
    { label: 'Total Interviews', value: stats.totalInterviews ?? 0, icon: Calendar, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    { label: 'Total Candidates', value: stats.totalCandidates ?? 0, icon: Users, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    { label: 'Avg Score', value: `${stats.avgScore ?? 0}%`, icon: Trophy, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { label: 'Active Sessions', value: stats.activeSessions ?? 0, icon: Activity, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: 10, padding: '10px 16px', fontSize: '0.8rem' }}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
          {payload.map(p => (
            <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout
      role="recruiter"
      title={`Welcome back, ${user?.name?.split(' ')[0] || 'Recruiter'} 👋`}
      subtitle="Here's your interview platform overview"
      actions={
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/recruiter/create-interview')}>
          <Plus size={16} /> Create Interview
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

            {/* Charts */}
            <div className="charts-grid">
              {/* Performance Trends */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Interview Performance Trends</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last 6 months</div>
                  </div>
                  <TrendingUp size={18} color="var(--accent-blue-light)" />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="interviews" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} name="Interviews" />
                    <Line type="monotone" dataKey="avgScore" stroke="#6366f1" strokeWidth={2} dot={{ fill: '#6366f1', r: 4 }} name="Avg Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Score Distribution */}
              <div className="chart-card">
                <div className="chart-header">
                  <div>
                    <div className="chart-title">Candidate Score Distribution</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Score ranges</div>
                  </div>
                  <BarChart3 size={18} color="var(--accent-purple-light)" />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="range" stroke="var(--text-muted)" fontSize={12} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                      {scoreDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Sessions */}
            <div className="table-wrapper">
              <div className="table-header">
                <div>
                  <div className="chart-title">Recent Candidates</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Latest interview sessions</div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/recruiter/candidates')}>
                  View All <ChevronRight size={14} />
                </button>
              </div>
              {recentSessions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon"><Users size={36} /></div>
                  <p>No candidates yet. Create an interview to get started.</p>
                  <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/recruiter/create-interview')}>
                    <Plus size={16} /> Create Interview
                  </button>
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Interview</th>
                      <th>Score</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSessions.map((s) => (
                      <tr key={s._id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="avatar">{s.candidate?.name?.[0]}</div>
                            <div>
                              <div style={{ fontWeight: 500 }}>{s.candidate?.name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.candidate?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{s.interview?.title}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: s.overallScore >= 70 ? 'var(--accent-green)' : s.overallScore >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)' }}>
                            {s.overallScore}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${s.status === 'completed' ? 'success' : s.status === 'in-progress' ? 'info' : 'warning'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {new Date(s.createdAt).toLocaleDateString()}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/candidate/results/${s._id}`)}>
                            View <ArrowRight size={14} />
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
