import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { 
  Search, Briefcase, Clock, FileText, ChevronRight, Lock, Loader2, Send,
  DollarSign, MapPin, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExploreInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [requestingId, setRequestingId] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const navigate = useNavigate();

  const fetchData = async () => {
    try {
      const [intvRes, reqRes] = await Promise.all([
        api.get('/interviews/explore'),
        api.get('/requests/my-requests')
      ]);
      setInterviews(intvRes.data.interviews);
      setRequests(reqRes.data.requests);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestAccess = async (interviewId) => {
    try {
      setRequestingId(interviewId);
      await api.post('/requests/request', { interviewId, message: requestMessage });
      toast.success('Access request submitted!');
      setRequestMessage('');
      setRequestingId(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
      setRequestingId(null);
    }
  };

  const filtered = interviews.filter(i => 
    i.title.toLowerCase().includes(search.toLowerCase()) || 
    (i.recruiter?.company || 'Confidential Company').toLowerCase().includes(search.toLowerCase()) ||
    (i.employmentType || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.workMode || '').toLowerCase().includes(search.toLowerCase()) ||
    i.requiredSkills.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  const getRequestStatus = (id) => {
    const req = requests.find(r => r.interview?._id === id);
    return req ? req.status : null;
  };

  return (
    <DashboardLayout role="candidate" title="Explore Interviews" subtitle="Find and practice interviews created by recruiters">
      <div className="dashboard-page">
        <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
          <div className="input-wrapper has-icon" style={{ flex: 1, maxWidth: 400 }}>
            <span className="input-icon"><Search size={18} /></span>
            <input 
              type="text" 
              placeholder="Search by role, company, mode, or skills..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <span className="spinner" style={{ width: 32, height: 32 }}></span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
            <Briefcase size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ marginBottom: 8 }}>No Interviews Found</h3>
            <p style={{ color: 'var(--text-muted)' }}>Check back later for new opportunities.</p>
          </div>
        ) : (
          <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {filtered.map(interview => {
              const status = getRequestStatus(interview._id);
              const isPending = status === 'pending';
              const isGranted = status === 'granted';
              const isRevoked = status === 'revoked';

              return (
                <div key={interview._id} className="glass-card stat-card" style={{ transition: 'all 0.3s', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>{interview.title}</h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--accent-blue-light)' }}>
                        {interview.recruiter?.company || 'Confidential Company'}
                      </p>
                    </div>
                    {interview.recruiter?.avatar ? (
                      <img src={interview.recruiter.avatar} alt="logo" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Briefcase size={20} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> {interview.duration} mins</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> {interview.numberOfQuestions} Qs</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>{interview.experienceLevel}</div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={14} /> {interview.workMode || 'Onsite'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Activity size={14} /> {interview.employmentType || 'Full-time'}</div>
                    {interview.stipend && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><DollarSign size={14} /> {interview.stipend}</div>}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                    {interview.requiredSkills.slice(0, 3).map((skill, idx) => (
                      <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Posted {new Date(interview.createdAt).toLocaleDateString()}
                    </span>
                    
                    {isGranted ? (
                      <button className="btn btn-primary btn-sm" onClick={() => navigate(`/candidate/attend?link=${interview.interviewLink}`)}>
                        Attend <ChevronRight size={16} />
                      </button>
                    ) : isPending ? (
                      <span className="badge badge-warning" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Loader2 size={12} className="spin" /> Pending
                      </span>
                    ) : isRevoked ? (
                      <span className="badge badge-danger" style={{ fontSize: '0.8rem' }}>Revoked</span>
                    ) : (
                      <button className="btn btn-outline btn-sm" onClick={() => setRequestingId(interview._id)}>
                        <Lock size={14} style={{ marginRight: 6 }} /> Request Access
                      </button>
                    )}
                  </div>

                  {requestingId === interview._id && (
                    <div className="glass-card" style={{ position: 'absolute', inset: 0, zIndex: 10, padding: 16, background: 'rgba(15, 23, 42, 0.98)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <h4>Request Access</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Your resume will be sent to the recruiter.</p>
                      <textarea 
                        placeholder="Add a short message (optional)..."
                        value={requestMessage}
                        onChange={(e) => setRequestMessage(e.target.value)}
                        style={{ flex: 1, minHeight: 80, fontSize: '0.85rem' }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => setRequestingId(null)}>Cancel</button>
                        <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleRequestAccess(interview._id)}>
                          <Send size={14} style={{ marginRight: 6 }} /> Submit
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
