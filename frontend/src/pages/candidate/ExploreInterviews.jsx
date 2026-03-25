import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { Search, Briefcase, Clock, FileText, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ExploreInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState(null);
  const [resume, setResume] = useState(null);
  const [applying, setApplying] = useState(false);
  const navigate = useNavigate();

  const handleApplyClick = (interview) => {
    setSelectedInterview(interview);
    setShowApplyModal(true);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    if (!resume) return toast.error('Please upload your resume');
    setApplying(true);
    const formData = new FormData();
    formData.append('resume', resume);
    formData.append('interviewId', selectedInterview._id);

    try {
      const res = await api.post('/candidates/apply', formData);
      toast.success(res.data.message);
      setShowApplyModal(false);
      setResume(null);
    } catch {
      toast.error('Application failed. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        const res = await api.get('/interviews/explore');
        setInterviews(res.data.interviews);
      } catch (err) {
        toast.error('Failed to load interviews');
      } finally {
        setLoading(false);
      }
    };
    fetchInterviews();
  }, []);

  const filtered = interviews.filter(i => 
    i.title.toLowerCase().includes(search.toLowerCase()) || 
    i.recruiter?.company?.toLowerCase().includes(search.toLowerCase()) ||
    i.requiredSkills.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout role="candidate" title="Explore Interviews" subtitle="Find and practice interviews created by recruiters">
      <div className="dashboard-page">
        <div style={{ marginBottom: 24, display: 'flex', gap: 12 }}>
          <div className="input-wrapper has-icon" style={{ flex: 1, maxWidth: 400 }}>
            <span className="input-icon"><Search size={18} /></span>
            <input 
              type="text" 
              placeholder="Search by role, company, or skills..." 
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
            {filtered.map(interview => (
              <div key={interview._id} className="glass-card stat-card" style={{ cursor: 'pointer', transition: 'all 0.3s' }} onClick={() => navigate(`/candidate/attend?link=${interview.interviewLink}`)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
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

                <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Clock size={14} /> {interview.duration} mins</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={14} /> {interview.numberOfQuestions} Qs</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, textTransform: 'capitalize' }}>{interview.experienceLevel}</div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                  {interview.requiredSkills.slice(0, 3).map((skill, idx) => (
                    <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: 20, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {skill}
                    </span>
                  ))}
                  {interview.requiredSkills.length > 3 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                      +{interview.requiredSkills.length - 3}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleApplyClick(interview); }} style={{ color: 'var(--accent-blue-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={16} /> Apply for Job
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/candidate/attend?link=${interview.interviewLink}`); }} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Practice <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Apply Modal */}
        {showApplyModal && (
          <div className="modal-overlay">
            <div className="glass-card modal-content" style={{ maxWidth: 500, width: '90%', padding: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <h3 style={{ margin: 0 }}>Apply Area</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowApplyModal(false)}>Close</button>
              </div>
              <form onSubmit={handleApplySubmit}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', marginBottom: 8, fontSize: '0.9rem' }}>Position</label>
                  <p style={{ margin: 0, fontWeight: 600 }}>{selectedInterview?.title}</p>
                </div>
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', marginBottom: 12, fontSize: '0.9rem' }}>Upload Resume (PDF only)</label>
                  <div className="file-upload-zone" style={{ border: '2px dashed rgba(255,255,255,0.1)', borderRadius: 12, padding: 32, textAlign: 'center' }}>
                    <input type="file" accept=".pdf" onChange={(e) => setResume(e.target.files[0])} style={{ display: 'none' }} id="resumeUpload" />
                    <label htmlFor="resumeUpload" style={{ cursor: 'pointer' }}>
                      <FileText size={32} color="var(--accent-blue)" style={{ marginBottom: 12 }} />
                      <p style={{ margin: 0, fontSize: '0.875rem' }}>{resume ? resume.name : 'Click to select PDF resume'}</p>
                    </label>
                  </div>
                </div>
                <button type="submit" className={`btn btn-primary w-full${applying ? ' btn-loading' : ''}`} disabled={applying}>
                  {applying ? 'Submitting Application...' : 'Submit Application'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
