import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { User, Mail, Tag, Save, ChevronRight, Upload, Brain, AlertCircle } from 'lucide-react';

export default function Profile() {
  const { user, updateRole, refreshUser } = useAuthStore();
  const navigate = useNavigate();
  const role = user?.role || 'candidate';
  
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: role === 'recruiter' ? (user?.recruiterBio || user?.bio || '') : (user?.candidateBio || user?.bio || ''),
    skills: user?.skills?.join(', ') || '',
    jobTitle: role === 'recruiter' ? (user?.recruiterJobTitle || user?.jobTitle || '') : (user?.candidateJobTitle || user?.jobTitle || ''),
    company: user?.company || '',
  });

  const [resumeFile, setResumeFile] = useState(null);
  const [resumeName, setResumeName] = useState(() => localStorage.getItem('profileResume') || '');
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState(null);

  useEffect(() => {
    setForm({
      name: user?.name || '',
      bio: role === 'recruiter' ? (user?.recruiterBio || user?.bio || '') : (user?.candidateBio || user?.bio || ''),
      skills: user?.skills?.join(', ') || '',
      jobTitle: role === 'recruiter' ? (user?.recruiterJobTitle || user?.jobTitle || '') : (user?.candidateJobTitle || user?.jobTitle || ''),
      company: user?.company || '',
    });
  }, [user, role]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user?.resumeUrl && !resumeFile && role === 'candidate') {
      toast.error('Resume upload is mandatory for candidates!');
      return;
    }
    setSaving(true);
    try {
      const payload = { 
        name: form.name,
        [role === 'recruiter' ? 'recruiterBio' : 'candidateBio']: form.bio,
        [role === 'recruiter' ? 'recruiterJobTitle' : 'candidateJobTitle']: form.jobTitle,
        skills: typeof form.skills === 'string' ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : form.skills,
        company: form.company
      };
      await api.put('/users/profile', payload);
      await refreshUser();
      if (user?.resumeUrl) localStorage.removeItem('profileResume');
      toast.success(`${role === 'recruiter' ? 'Recruiter' : 'Candidate'} profile updated!`);
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('resume', file);
    
    setUploadingResume(true);
    toast.loading('Uploading and parsing resume...', { id: 'resume' });
    
    try {
        const res = await api.post('/users/profile/resume', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        setResumeFile(file);
        setResumeName(file.name);
        localStorage.setItem('profileResume', file.name);
        
        // Store the AI suggestion for auto-fill
        if (res.data.suggestion) {
            setAiSuggestion(res.data.suggestion);
            toast.success('Resume processed! You can now use AI Auto-Fill.', { id: 'resume' });
        } else {
            toast.success('Resume uploaded successfully.', { id: 'resume' });
        }
        
        await refreshUser();
    } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to process resume.', { id: 'resume' });
    } finally {
        setUploadingResume(false);
    }
  };

  const handleAIFill = () => {
    if (!aiSuggestion) {
      toast.error("No suggestions available. Please re-upload your resume.");
      return;
    }
    
    setAiLoading(true);
    // Simulate a brief filling animation/delay
    setTimeout(() => {
        setForm(f => ({
            ...f,
            name: aiSuggestion.name || f.name,
            jobTitle: aiSuggestion.jobTitle || f.jobTitle,
            skills: aiSuggestion.skills || f.skills,
            bio: aiSuggestion.bio || f.bio
        }));
        toast.success("Profile fields filled from resume!");
        setAiLoading(false);
    }, 800);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    const toastId = toast.loading('Uploading profile picture...');
    try {
      await api.post('/users/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshUser();
      toast.success('Profile picture updated!', { id: toastId });
    } catch {
      toast.error('Failed to upload picture.', { id: toastId });
    }
  };

  return (
    <DashboardLayout role={role} title="My Profile" subtitle="Manage your account information">
      <div className="dashboard-page" style={{ maxWidth: 800 }}>
        {role === 'candidate' && (!user?.resumeUrl && !resumeFile) && (
            <div className="alert alert-warning" style={{ marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
                <AlertCircle size={24} />
                <div>
                    <strong>Action Required:</strong> You must complete your profile by uploading a resume and filling mandatory fields to explore interviews.
                </div>
            </div>
        )}

        <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
            <div style={{ position: 'relative', cursor: 'pointer' }}>
               <input type="file" id="avatarUpload" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
               <label htmlFor="avatarUpload" style={{ cursor: 'pointer', display: 'block' }}>
                 <div className="avatar avatar-xl" style={{ background: 'var(--gradient-primary)', position: 'relative', overflow: 'hidden' }}>
                   {(role === 'recruiter' ? (user?.recruiterAvatar || user?.avatar) : (user?.candidateAvatar || user?.avatar)) ? <img src={role === 'recruiter' ? (user?.recruiterAvatar || user?.avatar) : (user?.candidateAvatar || user?.avatar)} alt="" /> : user?.name?.[0]}
                   <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', ':hover': { opacity: 1 } }} onMouseEnter={(e) => e.currentTarget.style.opacity = 1} onMouseLeave={(e) => e.currentTarget.style.opacity = 0}>
                     <Upload size={20} color="white" />
                   </div>
                 </div>
               </label>
            </div>
            
            <div style={{ flex: 1 }}>
              <h3>{user?.name}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{user?.email}</p>
              <span className={`badge badge-${role === 'recruiter' ? 'info' : 'purple'}`} style={{ marginTop: 8 }}>
                {role}
              </span>
            </div>
            {role === 'candidate' && (
                <button type="button" onClick={handleAIFill} className={`btn btn-secondary ${aiLoading ? 'btn-loading' : ''}`} disabled={aiLoading || (!resumeFile && !user?.resumeUrl)}>
                    {aiLoading ? <span className="spinner spinner-sm" /> : <><Brain size={16} /> AI Auto-Fill Profile</>}
                </button>
            )}
          </div>

          <form onSubmit={handleSave}>
            {role === 'candidate' && (
                <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                    <label>Resume (PDF Required) <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <input type="file" id="resumeUpload" accept=".pdf" style={{ display: 'none' }} onChange={handleResumeUpload} />
                        <label htmlFor="resumeUpload" className="btn btn-outline" style={{ cursor: 'pointer' }}>
                            <Upload size={16} /> {user?.resumeUrl ? 'Upload Updated New Resume' : 'Choose File'}
                        </label>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            {resumeName ? resumeName : (user?.resumeUrl ? 'Resume already uploaded' : 'No file chosen')}
                        </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
                        Once uploaded, you can use the AI Auto-Fill button to extract your details.
                    </p>
                </div>
            )}

            <div className="form-group">
              <label>Full Name <span style={{ color: 'red' }}>*</span></label>
              <div className="input-wrapper has-icon">
                <span className="input-icon"><User size={16} /></span>
                <input type="text" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Email (read-only)</label>
              <div className="input-wrapper has-icon">
                <span className="input-icon"><Mail size={16} /></span>
                <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Job Title <span style={{ color: 'red' }}>*</span></label>
                <input type="text" required placeholder="e.g. Software Engineer" value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} />
              </div>
              {role === 'recruiter' && (
                  <div className="form-group">
                    <label>Company</label>
                    <input type="text" placeholder="e.g. Google" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                  </div>
              )}
            </div>

            {role === 'candidate' && (
                <div className="form-group">
                  <label>Skills <span style={{ color: 'red' }}>*</span></label>
                  <div className="input-wrapper has-icon">
                    <span className="input-icon"><Tag size={16} /></span>
                    <input type="text" required placeholder="React, Node.js, Python (comma-separated)" value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} />
                  </div>
                </div>
            )}

            <div className="form-group">
              <label>Bio</label>
              <textarea placeholder="Tell us about yourself..." value={form.bio} rows={3} onChange={e => setForm({ ...form, bio: e.target.value })} />
            </div>

            <button type="submit" className={`btn btn-primary${saving ? ' btn-loading' : ''}`} disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : <><Save size={16} /> Save Changes</>}
            </button>
          </form>
        </div>

        <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
          <h4 style={{ marginBottom: 16 }}>Switch Role</h4>
          <p style={{ fontSize: '0.875rem', marginBottom: 16 }}>
            Currently using the platform as a <strong>{role}</strong>.
          </p>
          <button className="btn btn-secondary" onClick={() => {
            const next = role === 'recruiter' ? 'candidate' : 'recruiter';
            updateRole(next).then(() => navigate(next === 'recruiter' ? '/recruiter' : '/candidate'));
          }}>
            Switch to {role === 'recruiter' ? 'Candidate' : 'Recruiter'} <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
