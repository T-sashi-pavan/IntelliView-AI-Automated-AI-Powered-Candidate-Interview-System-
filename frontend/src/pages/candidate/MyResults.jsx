import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { FileText, ArrowRight, Brain } from 'lucide-react';

export default function MyResults() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/candidates/my-sessions').then(r => {
      setSessions(r.data.sessions || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const getScoreColor = (s) => s >= 70 ? 'var(--accent-green)' : s >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)';

  return (
    <DashboardLayout role="candidate" title="My Results" subtitle="Review all your interview sessions and performance">
      <div className="dashboard-page">
        <div className="table-wrapper">
          <div className="table-header">
            <div>
              <div className="chart-title">All Interview Sessions</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sessions.length} sessions total</div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><FileText size={36} /></div>
              <p>No interviews attended yet.</p>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/candidate/attend')}>
                Attend Your First Interview
              </button>
            </div>
          ) : (
            <table>
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
                {sessions.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{s.interview?.title}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.interview?.jobDescription?.slice(0, 60)}...</div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: getScoreColor(s.overallScore) }}>
                        {s.overallScore}%
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${s.status === 'completed' ? 'success' : 'info'}`}>{s.status}</span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{s.answers?.length || 0} answers</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/candidate/results/${s._id}`)}>
                        View <ArrowRight size={14} />
                      </button>
                    </td>
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
