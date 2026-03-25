import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { Users, Search, Filter, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

export default function CandidateManagement() {
  const [candidates, setCandidates] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scoreFilter, setScoreFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/candidates/all').then(r => {
      setCandidates(r.data.candidates || []);
      setFiltered(r.data.candidates || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...candidates];
    if (search) result = result.filter(c =>
      c.candidate?.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.candidate?.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.interview?.title?.toLowerCase().includes(search.toLowerCase())
    );
    if (statusFilter !== 'all') result = result.filter(c => c.status === statusFilter);
    if (scoreFilter === 'high') result = result.filter(c => c.overallScore >= 70);
    else if (scoreFilter === 'mid') result = result.filter(c => c.overallScore >= 40 && c.overallScore < 70);
    else if (scoreFilter === 'low') result = result.filter(c => c.overallScore < 40);
    setFiltered(result);
  }, [search, statusFilter, scoreFilter, candidates]);

  const getScoreColor = (s) => s >= 70 ? 'var(--accent-green)' : s >= 40 ? 'var(--accent-orange)' : 'var(--accent-red)';

  return (
    <DashboardLayout role="recruiter" title="Candidate Management" subtitle="Review and evaluate all candidates">
      <div className="dashboard-page">
        <div className="filter-bar">
          <div className="search-input-wrapper">
            <span className="search-icon"><Search size={16} /></span>
            <input type="text" placeholder="Search candidates, emails, or interviews..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ width: 'auto', padding: '10px 16px' }}>
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In Progress</option>
            <option value="scheduled">Scheduled</option>
          </select>
          <select value={scoreFilter} onChange={e => setScoreFilter(e.target.value)}
            style={{ width: 'auto', padding: '10px 16px' }}>
            <option value="all">All Scores</option>
            <option value="high">High (70%+)</option>
            <option value="mid">Medium (40-70%)</option>
            <option value="low">Low ({'<'}40%)</option>
          </select>
        </div>

        <div className="table-wrapper">
          <div className="table-header">
            <div>
              <div className="chart-title">All Candidates</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{filtered.length} results</div>
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <div className="spinner" style={{ width: 40, height: 40 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><Users size={36} /></div>
              <p>No candidates found matching your filters.</p>
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
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="avatar">
                          {s.candidate?.avatar ? <img src={s.candidate.avatar} alt="" /> : s.candidate?.name?.[0]}
                        </div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{s.candidate?.name}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.candidate?.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', maxWidth: 200 }} className="truncate">
                      {s.interview?.title || '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '1.1rem', color: getScoreColor(s.overallScore) }}>
                          {s.overallScore}%
                        </span>
                        {s.overallScore >= 60 ? <TrendingUp size={14} color="var(--accent-green)" /> : <TrendingDown size={14} color="var(--accent-red)" />}
                      </div>
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
                      <button className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/candidate/results/${s._id}`)}>
                        View Details <ArrowRight size={14} />
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
