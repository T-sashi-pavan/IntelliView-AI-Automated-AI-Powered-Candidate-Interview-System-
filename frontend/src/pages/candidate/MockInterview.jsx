import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Upload, Briefcase, Zap, FileText, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const experienceLevels = ['entry', 'mid', 'senior', 'lead'];

export default function MockInterview() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    jobRole: '', 
    experience: 'entry', 
    questions: 5, 
    timeLimit: 60, // default 1 min
    customTime: '',
    voiceId: 'MmiGAbOYCaIFzgNItUWa'
  });
  const [file, setFile] = useState(null);
  const [suggestedRoles, setSuggestedRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setSuggestedRoles([]);
    
    // Suggest roles based on resume
    setLoadingRoles(true);
    const formData = new FormData();
    formData.append('resume', selectedFile);

    try {
      const DJANGO_URL = import.meta.env.VITE_DJANGO_URL || 'http://localhost:8001';
      const res = await window.fetch(`${DJANGO_URL}/api/mock/suggest-role/`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.roles) {
        setSuggestedRoles(data.roles);
        toast.success('Resume analyzed! Suggested roles generated.');
      }
    } catch (err) {
      console.error('Suggest role error:', err);
    } finally {
      setLoadingRoles(false);
    }
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!form.jobRole || !file) {
      toast.error('Please upload resume and specify job role');
      return;
    }
    setStarting(true);
    
    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobRole', form.jobRole);
      formData.append('experience', form.experience);
      formData.append('questions', form.questions);
      formData.append('timeLimit', form.timeLimit === 'custom' ? form.customTime * 60 : form.timeLimit);
      formData.append('voiceId', form.voiceId);
      
      const DJANGO_URL = import.meta.env.VITE_DJANGO_URL || 'http://localhost:8001';
      const toastId = toast.loading('Generating your custom adaptive interview...');
      const res = await window.fetch(`${DJANGO_URL}/api/mock/start/`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Failed processing');

      toast.success('Interview Ready!', { id: toastId });
      navigate(`/candidate/mock-room/${data.sessionId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to start mock interview');
      setStarting(false);
    }
  };

  return (
    <DashboardLayout role="candidate" title="AI Mock Interview" subtitle="Self-adaptive, role-specific practice with real-time feedback">
      <div className="dashboard-page" style={{ maxWidth: 700 }}>
        <form onSubmit={handleStart} className="glass-card animate-fade" style={{ padding: 'var(--space-xl)', border: '1px solid rgba(59,130,246,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-blue-light)', fontSize: '1.5rem' }}>
              <Zap size={24} fill="var(--accent-blue-light)" /> Mock Setup
            </h3>
            <div style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue-light)', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Adaptive Engine v2.0
            </div>
          </div>
          
          <div className="form-group" style={{ marginBottom: 32 }}>
            <label>1. Upload Resume (PDF) *</label>
            <label 
              style={{
                display: 'block', padding: '40px', textAlign: 'center', border: '2px dashed rgba(255,255,255,0.1)', 
                borderRadius: 16, cursor: 'pointer', background: 'rgba(255,255,255,0.02)', transition: 'all 0.3s',
                ...(file ? { borderColor: 'var(--accent-green)', background: 'rgba(16,185,129,0.05)' } : {})
              }}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--accent-blue)'; }}
              onDragLeave={e => { e.preventDefault(); e.currentTarget.style.borderColor = file ? 'var(--accent-green)' : 'rgba(255,255,255,0.1)'; }}
            >
              <input type="file" style={{ display: 'none' }} accept=".pdf" onChange={handleFileChange} />
              <Upload size={40} color={file ? '#10b981' : 'rgba(255,255,255,0.3)'} style={{ marginBottom: 16 }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 500, color: file ? 'var(--text-primary)' : 'var(--text-secondary)', marginBottom: 4 }}>
                {file ? file.name : "Drop resume here or click to browse"}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                PDF format only. Max 5MB.
              </div>
            </label>
          </div>

          <div className="form-group" style={{ marginBottom: 32 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between' }}>
              2. Target Job Role *
              {loadingRoles && <span style={{ fontSize: '0.75rem', color: 'var(--accent-blue-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 size={12} className="spin" /> Analyzing resume...
              </span>}
            </label>
            <div className="input-wrapper has-icon">
              <span className="input-icon"><Briefcase size={16} /></span>
              <input type="text" required placeholder="e.g. Senior Backend Engineer" 
                value={form.jobRole} onChange={e => setForm({...form, jobRole: e.target.value})} />
            </div>
            
            {(suggestedRoles.length > 0 || loadingRoles) && (
              <div style={{ marginTop: 12 }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={14} color="var(--accent-purple-light)" /> Suggested roles based on your profile:
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {suggestedRoles.map(role => (
                    <button 
                      key={role} 
                      type="button" 
                      className="btn btn-sm btn-outline" 
                      style={{ fontSize: '0.75rem', padding: '4px 12px', borderColor: 'rgba(59,130,246,0.3)' }}
                      onClick={() => setForm({...form, jobRole: role})}
                    >
                      {role}
                    </button>
                  ))}
                  {loadingRoles && [1,2].map(i => (
                    <div key={i} style={{ width: 100, height: 28, borderRadius: 14, background: 'rgba(255,255,255,0.05)' }} className="shimmer" />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid-2" style={{ marginBottom: 32 }}>
            <div className="form-group">
              <label>3. Experience Level</label>
              <select value={form.experience} onChange={e => setForm({...form, experience: e.target.value})}>
                {experienceLevels.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
              </select>
            </div>
            
            <div className="form-group">
              <label>4. Question Count</label>
              <select value={form.questions} onChange={e => setForm({...form, questions: Number(e.target.value)})}>
                {[1, 3, 5, 10, 15].map(n => <option key={n} value={n}>{n} Adaptive Questions</option>)}
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 32 }}>
            <div className="form-group">
              <label>5. Time Per Question</label>
              <select value={form.timeLimit} onChange={e => setForm({...form, timeLimit: e.target.value})}>
                <option value="30">30 Seconds</option>
                <option value="60">1 Minute</option>
                <option value="120">2 Minutes</option>
                <option value="180">3 Minutes</option>
                <option value="custom">Custom (Minutes)</option>
              </select>
              {form.timeLimit === 'custom' && (
                <input 
                  type="number" 
                  placeholder="Enter minutes" 
                  style={{ marginTop: 8 }} 
                  value={form.customTime} 
                  onChange={e => setForm({...form, customTime: e.target.value})}
                />
              )}
            </div>

            <div className="form-group">
              <label>6. Interviewer Voice</label>
              <select value={form.voiceId} onChange={e => setForm({...form, voiceId: e.target.value})}>
                <option value="MmiGAbOYCaIFzgNItUWa">Male - Nitish</option>
                <option value="2zRM7PkgwBPiau2jvVXc">Female - Monika Sogam</option>
                <option value="MmiGAbOYCaIFzgNItUWa">Female - Vanishree</option>
              </select>
            </div>
          </div>

          <div style={{ padding: 20, borderRadius: 12, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.1)', marginBottom: 32 }}>
            <h4 style={{ color: '#fbbf24', fontSize: '0.9rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={16} /> Adaptive Mode Enabled
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              The AI will generate questions based on your resume and previous answers. 
              The first question will be a professional self-introduction.
            </p>
          </div>

          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 24, marginBottom: 32, textAlign: 'left' }}>
            <h3 style={{ color: '#ef4444', fontSize: '1rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} /> Strict AI Proctoring Active
            </h3>
            <ul style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', paddingLeft: 24, margin: 0 }}>
              <li style={{ marginBottom: 6 }}>You must remain in <strong>Full Screen Mode</strong>. Do not switch tabs.</li>
              <li style={{ marginBottom: 6 }}><strong>No mobile phones</strong> or external notes allowed. The Object AI will scan your environment.</li>
              <li style={{ marginBottom: 6 }}>Maintain eye contact. <strong>No other people</strong> may enter the frame.</li>
              <li>Your lip movements must match the microphone volume entirely.</li>
            </ul>
          </div>

          <button type="submit" className={`btn btn-primary btn-lg w-full ${starting ? 'btn-loading' : ''}`} disabled={starting}>
            {starting ? <span className="spinner spinner-sm" /> : <>Start Adaptive Session <ChevronRight size={18} /></>}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
