import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { BarChart3, TrendingUp, Users, Award } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Cell
} from 'recharts';

const COLORS = ['#3b82f6', '#6366f1', '#22d3ee', '#10b981', '#f59e0b'];

export default function RecruiterAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics/recruiter').then(r => {
      setAnalytics(r.data);
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

  return (
    <DashboardLayout role="recruiter" title="Analytics" subtitle="Comprehensive insights into your interview performance">
      <div className="dashboard-page">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div className="spinner" style={{ width: 48, height: 48 }} />
          </div>
        ) : (
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

            {/* Top performers from recent sessions */}
            <div className="chart-card">
              <div className="chart-header">
                <div className="chart-title">Top Performers</div>
                <Award size={18} color="var(--accent-orange)" />
              </div>
              {analytics?.recentSessions?.slice(0, 5).map((s, i) => (
                <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#a87c5b' : 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>
                    {i + 1}
                  </div>
                  <div className="avatar">{s.candidate?.name?.[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500 }}>{s.candidate?.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.interview?.title}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem', color: s.overallScore >= 70 ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                    {s.overallScore}%
                  </div>
                </div>
              ))}
              {(!analytics?.recentSessions?.length) && (
                <div className="empty-state"><p>No data yet. Run some interviews first.</p></div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
