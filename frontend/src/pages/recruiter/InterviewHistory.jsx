import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  FileText, Users, Calendar, Clock, ChevronRight, 
  Search, Filter, MoreVertical, Archive, EyeOff, Eye
} from 'lucide-react';

export default function RecruiterHistory() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchHistory = async () => {
    try {
      const res = await api.get('/interviews');
      setInterviews(res.data.interviews);
    } catch {
      toast.error('Failed to load interview history');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'closed' : 'active';
    try {
      await api.put(`/interviews/${id}`, { status: newStatus });
      toast.success(newStatus === 'closed' ? 'Vacancies marked as filled' : 'Interview re-activated');
      fetchHistory();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const filtered = interviews.filter(i => 
    i.title.toLowerCase().includes(search.toLowerCase()) || 
    i.jobDescription.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout role="recruiter" title="Interview History" subtitle="Manage and track your past interview sessions">
      <div className="dashboard-page">
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <div className="input-wrapper has-icon" style={{ flex: 1 }}>
            <span className="input-icon"><Search size={16} /></span>
            <input 
              type="text" 
              placeholder="Search by title or description..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>
          <button className="btn btn-secondary">
            <Filter size={16} /> Filter
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <span className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📁</div>
            <h3>No interviews found</h3>
            <p>You haven't created any interviews yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {filtered.map(i => (
              <div key={i._id} className="glass-card interview-card animate-fade" style={{ opacity: i.status === 'closed' ? 0.7 : 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span className={`badge badge-${i.status === 'active' ? 'success' : 'secondary'}`}>
                    {i.status === 'active' ? 'Accepting Apps' : 'Vacancies Over'}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-icon btn-sm" title="Toggle Visibility" onClick={() => toggleStatus(i._id, i.status)}>
                      {i.status === 'active' ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <h3 style={{ marginBottom: 8 }}>{i.title}</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: 20, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {i.jobDescription}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Users size={14} /> {i.totalCandidates || 0} Candidates
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Calendar size={14} /> {new Date(i.createdAt).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <Clock size={14} /> {i.duration}s / Question
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm w-full" onClick={() => navigate(`/recruiter/candidates?id=${i._id}`)}>
                    View Candidates
                  </button>
                  <button className="btn btn-primary btn-sm w-full" onClick={() => toggleStatus(i._id, i.status)}>
                    {i.status === 'active' ? 'Vacancies Over' : 'Mark Active'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
