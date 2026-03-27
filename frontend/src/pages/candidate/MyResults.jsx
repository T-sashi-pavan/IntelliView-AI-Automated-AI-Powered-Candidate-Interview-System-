import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { FileText, ArrowRight, Brain } from 'lucide-react';

export default function MyResults() {
  const [mockSessions, setMockSessions] = useState([]);
  const [realSessions, setRealSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const DJANGO_URL = import.meta.env.VITE_DJANGO_URL || 'http://localhost:8001';
    Promise.all([
      api.get('/candidates/my-sessions').catch(() => ({ data: { sessions: [] } })),
      window.fetch(`${DJANGO_URL}/api/mock/history/`).then(r => r.json()).catch(() => ({ sessions: [] }))
    ]).then(([realRes, mockRes]) => {
      setRealSessions(realRes.data.sessions?.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)) || []);
      setMockSessions(mockRes.sessions || []);
      setLoading(false);
    });
  }, []);

  const getScoreColor = (s) => s >= 70 ? 'var(--accent-green)' : s >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)';

  return (
    <DashboardLayout role="candidate" title="My Results" subtitle="Review all your interview sessions and performance">
      <div className="dashboard-page">
        <div className="table-wrapper">
          <div className="table-header">
            <div>
              <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><FileText size={20} /> Formal Interviews</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Conducted by Recruiters via Email Invite</div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>
          ) : realSessions.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p>No formal interviews attended yet.</p>
            </div>
          ) : (
            <table style={{ marginBottom: 40 }}>
              <thead>
                <tr>
                  <th>Interview</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Questions</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {realSessions.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.interview?.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.interview?.jobDescription?.slice(0, 60)}...</div>
                    </td>
                    <td><span style={{ fontWeight: 700, fontSize: '1.1rem', color: getScoreColor(s.overallScore) }}>{s.overallScore}%</span></td>
                    <td><span className={`badge badge-${s.status === 'completed' ? 'success' : 'info'}`}>{s.status}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.answers?.length || 0} answers</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => navigate(`/candidate/results/${s._id}`)}>View <ArrowRight size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="table-header">
            <div>
              <div className="chart-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-purple-light)' }}><Brain size={20} /> Adaptive Mock Interviews</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Self-practice generative sessions</div>
            </div>
          </div>

          {loading ? null : mockSessions.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p>No mock interviews practiced yet.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/candidate/mock-interview')}>Start Mock Sandbox</button>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Mock Role</th>
                  <th>Score</th>
                  <th>Status</th>
                  <th>Questions</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mockSessions.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.interview?.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.interview?.jobDescription}</div>
                    </td>
                    <td><span style={{ fontWeight: 700, fontSize: '1.1rem', color: getScoreColor(s.overallScore) }}>{s.overallScore}%</span></td>
                    <td><span className={`badge badge-${s.status === 'completed' ? 'success' : 'info'}`}>{s.status}</span></td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.answers?.length} answers</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                    <td><button className="btn btn-outline btn-sm" onClick={() => navigate(`/candidate/mock-room/${s._id}`)}>View <ArrowRight size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
