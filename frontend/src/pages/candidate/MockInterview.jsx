import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Upload, Briefcase, Zap, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const experienceLevels = ['entry', 'mid', 'senior', 'lead'];

export default function MockInterview() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    jobRole: '', experience: 'entry', questions: 5, timeLimit: 1
  });
  const [file, setFile] = useState(null);
  const [starting, setStarting] = useState(false);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!form.jobRole || !file) {
      toast.error('Please upload resume and specify job role');
      return;
    }
    setStarting(true);
    // Submit form to the new Django AI service endpoint, get back a mock session link
    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobRole', form.jobRole);
      formData.append('experience', form.experience);
      formData.append('questions', form.questions);
      formData.append('timeLimit', form.timeLimit);

      // We will proxy through node.js or go direct to django on port 8001
      // Assuming Node proxies /api/mock/start
      // For now, redirecting to a specific screen
      
      const toastId = toast.loading('Reading resume & generating interview...');
      // Wait for Django backend to process this part, to be implemented
      const res = await window.fetch('http://localhost:8001/api/mock/start/', {
        method: 'POST',
        body: formData,
        // include auth if needed
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed processing');

      toast.success('Ready!', { id: toastId });
      // Redirect to a specific mock interview room (adaptive)
      navigate(`/candidate/mock-room/${data.sessionId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to start mock interview');
      setStarting(false);
    }
  };

  return (
    <DashboardLayout role="candidate" title="AI Mock Interview" subtitle="Upload your resume for adaptive, AI-generated questions">
      <div className="dashboard-page" style={{ maxWidth: 700 }}>
        <form onSubmit={handleStart} className="glass-card" style={{ padding: 'var(--space-xl)' }}>
          <h3 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-blue-light)' }}>
            <Zap size={22} /> Setup Adaptive Interview
          </h3>
          
          <div className="form-group">
            <label>Upload Resume (PDF/DOCX) *</label>
            <label 
              style={{
                display: 'block', padding: '32px', textAlign: 'center', border: '2px dashed rgba(255,255,255,0.1)', 
                borderRadius: 12, cursor: 'pointer', background: 'rgba(255,255,255,0.02)'
              }}
            >
              <input type="file" style={{ display: 'none' }} accept=".pdf,.docx" onChange={(e) => setFile(e.target.files[0])} />
              <Upload size={32} color={file ? '#10b981' : 'rgba(255,255,255,0.5)'} style={{ marginBottom: 12 }} />
              <div style={{ color: file ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {file ? file.name : "Click to browse or drag your resume here"}
              </div>
            </label>
          </div>

          <div className="form-group">
            <label>Target Job Role *</label>
            <div className="input-wrapper has-icon">
              <span className="input-icon"><Briefcase size={16} /></span>
              <input type="text" required placeholder="e.g. Fullstack Developer" 
                value={form.jobRole} onChange={e => setForm({...form, jobRole: e.target.value})} />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label>Experience Level</label>
              <select value={form.experience} onChange={e => setForm({...form, experience: e.target.value})}>
                {experienceLevels.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Number of Questions</label>
              <select value={form.questions} onChange={e => setForm({...form, questions: Number(e.target.value)})}>
                {[3, 5, 10, 15].map(n => <option key={n} value={n}>{n} Questions</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Time per Question</label>
            <select disabled value={form.timeLimit}>
              <option value={1}>1 Minute (Strict limit)</option>
            </select>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Each mock question requires an answer within 60 seconds to simulate real pressure.
            </p>
          </div>

          <button type="submit" className={`btn btn-primary w-full ${starting ? 'btn-loading' : ''}`} disabled={starting}>
            {starting ? <span className="spinner spinner-sm" /> : 'Start Mock Interview'}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
