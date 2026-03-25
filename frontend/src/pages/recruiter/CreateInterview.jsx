import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  Briefcase, FileText, Tag, Clock, Hash, Zap, Copy, Check, Link
} from 'lucide-react';

const experienceLevels = ['entry', 'mid', 'senior', 'lead'];
const durations = [{label: '30 Seconds', val: 30}, {label: '1 Min', val: 60}, {label: '2 Minutes', val: 120}];
const questionCounts = [5, 8, 10, 12, 15, 20];

export default function CreateInterview() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', jobDescription: '', requiredSkills: '',
    experienceLevel: 'mid', duration: 60, numberOfQuestions: 10,
  });
  const [creating, setCreating] = useState(false);
  const [interviewLink, setInterviewLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [interviewId, setInterviewId] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.jobDescription) {
      toast.error('Please fill in required fields'); return;
    }
    setCreating(true);
    try {
      const res = await api.post('/interviews', form);
      const newId = res.data.interview._id;
      setInterviewId(newId);
      const fullLink = `${window.location.origin}/candidate/attend?link=${res.data.interview.interviewLink}`;
      setInterviewLink(fullLink);
      toast.success('Interview created! Candidates can now join via the active registry or direct link.');
    } catch { toast.error('Failed to create interview'); }
    setCreating(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(interviewLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <DashboardLayout role="recruiter" title="Create Interview" subtitle="Set up a new AI-powered interview">
      <div className="dashboard-page" style={{ maxWidth: 760 }}>
        <form onSubmit={handleCreate}>
          <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
              <Briefcase size={22} color="var(--accent-blue-light)" /> Job Details
            </h3>

            <div className="form-group">
              <label>Job Title *</label>
              <div className="input-wrapper has-icon">
                <span className="input-icon"><Briefcase size={16} /></span>
                <input type="text" placeholder="e.g. Senior Frontend Engineer"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label>Job Description *</label>
              <textarea placeholder="Describe the role, responsibilities, and what you're looking for in a candidate..."
                value={form.jobDescription} rows={5}
                onChange={e => setForm({ ...form, jobDescription: e.target.value })} required />
            </div>

            <div className="form-group">
              <label>Required Skills</label>
              <div className="input-wrapper has-icon">
                <span className="input-icon"><Tag size={16} /></span>
                <input type="text" placeholder="React, TypeScript, Node.js (comma-separated)"
                  value={form.requiredSkills} onChange={e => setForm({ ...form, requiredSkills: e.target.value })} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Experience Level</label>
                <select value={form.experienceLevel} onChange={e => setForm({ ...form, experienceLevel: e.target.value })}>
                  {experienceLevels.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Time per Question</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={{ position: 'absolute', left: 14, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', pointerEvents: 'none', zIndex: 1 }}>
                    <Clock size={16} />
                  </span>
                  <select value={form.duration} onChange={e => setForm({ ...form, duration: Number(e.target.value) })} style={{ paddingLeft: 40, width: '100%' }}>
                    {durations.map(d => <option key={d.val} value={d.val}>{d.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Number of Questions</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {questionCounts.map(n => (
                  <button key={n} type="button"
                    className={`btn btn-sm ${form.numberOfQuestions === n ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm({ ...form, numberOfQuestions: n })}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="submit" className={`btn btn-primary${creating ? ' btn-loading' : ''}`} disabled={creating || !!interviewId}>
              {creating ? <span className="spinner spinner-sm" /> : 'Create Interview'}
            </button>
          </div>
        </form>

        {/* Interview Link and Details */}
        {interviewLink && (
          <div className="glass-card animate-fade" style={{ padding: 'var(--space-xl)', marginTop: 'var(--space-xl)', borderColor: 'rgba(16,185,129,0.3)' }}>
            <h3 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-green)' }}>
              <Zap size={20} /> Interview Specification Created!
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
              <div>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>POSITION ROLE</p>
                  <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{form.title}</p>
                </div>
                <div style={{ marginBottom: 16 }}>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>INTERVIEW ID / ROOM CODE</p>
                  <p style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-blue)', letterSpacing: '0.05em' }}>
                    {interviewLink.split('link=')[1]}
                  </p>
                </div>
                <div>
                  <p style={{ marginBottom: 12, fontSize: '0.9rem' }}>Direct Candidate Link:</p>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input value={interviewLink} readOnly
                      style={{ flex: 1, background: 'rgba(255,255,255,0.04)', fontSize: '0.8rem', padding: '8px 12px' }} />
                    <button type="button" className="btn btn-secondary btn-sm" onClick={handleCopy}>
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.1)', padding: 20, borderRadius: 12 }}>
                <h4 style={{ margin: '0 0 16px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>CONFIGURATION</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Experience Level:</span> <span style={{ textTransform: 'capitalize' }}>{form.experienceLevel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Questions:</span> <span>{form.numberOfQuestions}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                    <span>Time per Question:</span> <span>{durations.find(d => d.val === form.duration)?.label}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Excel Upload Block */}
            <div style={{ padding: '16px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', marginBottom: 24 }}>
              <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '1rem' }}>
                <FileText size={18} /> Invite Candidates via Excel
              </h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                Upload an Excel sheet (.xlsx, .csv) with a column named "Email" to automatically send the Interview ID and Link to candidates.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <input type="file" accept=".xlsx,.csv" id="excelUpload" style={{ display: 'none' }} onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('file', file);
                  const uploadToast = toast.loading('Sending invites...');
                  try {
                    const res = await api.post(`/interviews/${interviewId}/invite`, formData);
                    toast.success(res.data.message, { id: uploadToast });
                  } catch (err) {
                    toast.error('Failed to parse Excel and send invites', { id: uploadToast });
                  }
                  e.target.value = '';
                }} />
                <label htmlFor="excelUpload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                  Choose Excel File & Send Invites
                </label>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/recruiter')}>View Dashboard</button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate('/recruiter/candidates')}>View Candidates</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
