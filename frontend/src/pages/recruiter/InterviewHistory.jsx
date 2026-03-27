import { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { 
  Calendar, Briefcase, Eye, EyeOff, Link as LinkIcon, 
  Users, Award, DollarSign, MapPin, Activity, Clock, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InterviewHistory() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      const res = await api.get('/interviews');
      setInterviews(res.data.interviews);
    } catch {
      toast.error('Failed to load interview history');
    }
    setLoading(false);
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'closed' ? 'active' : 'closed';
    try {
      await api.put(`/interviews/${id}`, { status: newStatus });
      toast.success(newStatus === 'closed' ? 'Interview closed' : 'Interview reopened');
      fetchInterviews();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this interview and all associated data?')) return;
    try {
      await api.delete(`/interviews/${id}`);
      toast.success('Interview deleted');
      fetchInterviews();
    } catch {
      toast.error('Failed to delete interview');
    }
  };

  return (
    <DashboardLayout role="recruiter" title="Interview History" subtitle="Monitor performance and manage your active postings">
      <div className="dashboard-page">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
            <div className="spinner" style={{ width: 48, height: 48 }} />
          </div>
        ) : interviews.length === 0 ? (
          <div className="glass-card animate-fade" style={{ padding: 60, textAlign: 'center' }}>
            <Calendar size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 20px' }} />
            <h3 style={{ marginBottom: 12 }}>No History Yet</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>You haven't created any AI-powered interviews yet.</p>
            <button className="btn btn-primary" onClick={() => window.location.href='/recruiter/create'}>Create First Interview</button>
          </div>
        ) : (
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
            {interviews.map((intv) => (
              <div key={intv._id} className="glass-card stat-card animate-fade" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                {/* Header Section */}
                <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.25rem', marginBottom: 6, lineHeight: 1.2 }}>{intv.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <Calendar size={12} /> Created {new Date(intv.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`badge badge-${intv.status === 'closed' ? 'danger' : 'success'}`} style={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 700 }}>
                      {intv.status === 'closed' ? 'Closed' : 'Active'}
                    </span>
                  </div>

                  {/* Quick Stats Grid */}
                  <div className="grid-2" style={{ gap: 12 }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Candidates</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Users size={16} color="var(--accent-blue-light)" /> {intv.totalCandidates || 0}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase' }}>Avg Score</div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Award size={16} color="var(--accent-green)" /> {intv.avgScore || 0}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Metadata Section */}
                <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <Briefcase size={14} color="var(--text-muted)" /> {intv.experienceLevel}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <Clock size={14} color="var(--text-muted)" /> {intv.numberOfQuestions} Qs
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={14} color="var(--text-muted)" /> {intv.workMode || 'Onsite'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <Activity size={14} color="var(--text-muted)" /> {intv.employmentType || 'Full-time'}
                    </div>
                    {intv.stipend && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <DollarSign size={14} color="var(--text-muted)" /> {intv.stipend}
                      </div>
                    )}
                  </div>
                  
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {intv.jobDescription}
                  </p>
                </div>

                {/* Footer Controls */}
                <div style={{ padding: 16, background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: 8 }}>
                  <button 
                    className={`btn btn-sm ${intv.status === 'closed' ? 'btn-secondary' : 'btn-outline'}`}
                    onClick={() => toggleStatus(intv._id, intv.status)}
                    style={{ flex: 1, fontSize: '0.75rem' }}
                    title={intv.status === 'closed' ? 'Reopen to public' : 'Hide from Explore page'}
                  >
                    {intv.status === 'closed' ? <><Eye size={14} /> Reopen</> : <><EyeOff size={14} /> Close</>}
                  </button>
                  <button className="btn btn-secondary btn-sm" style={{ padding: '0 12px' }} onClick={() => {
                    const link = `${window.location.origin}/candidate/attend?link=${intv.interviewLink}`;
                    navigator.clipboard.writeText(link);
                    toast.success('Link copied!');
                  }}>
                    <LinkIcon size={14} />
                  </button>
                  <button className="btn btn-ghost btn-danger btn-sm" style={{ padding: '0 12px' }} onClick={() => handleDelete(intv._id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <style>{`
        .truncate {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .grid-3 {
          display: grid;
          gap: 24px;
        }
      `}</style>
    </DashboardLayout>
  );
}
