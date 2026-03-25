import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { User, Mail, Tag, Save, ChevronRight } from 'lucide-react';

export default function Profile() {
  const { user, updateRole, refreshUser } = useAuthStore();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || '', bio: user?.bio || '',
    skills: user?.skills?.join(', ') || '', jobTitle: user?.jobTitle || '', company: user?.company || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/users/profile', { ...form, skills: form.skills.split(',').map(s => s.trim()).filter(Boolean) });
      await refreshUser();
      toast.success('Profile updated!');
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  const role = user?.role || 'candidate';

  return (
    <DashboardLayout role={role} title="My Profile" subtitle="Manage your account information">
      <div className="dashboard-page" style={{ maxWidth: 600 }}>
        <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
            <div className="avatar avatar-xl" style={{ background: 'var(--gradient-primary)' }}>
              {user?.avatar ? <img src={user.avatar} alt="" /> : user?.name?.[0]}
            </div>
            <div>
              <h3>{user?.name}</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{user?.email}</p>
              <span className={`badge badge-${role === 'recruiter' ? 'info' : 'purple'}`} style={{ marginTop: 8 }}>
                {role}
              </span>
            </div>
          </div>

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-wrapper has-icon">
                <span className="input-icon"><User size={16} /></span>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
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
                <label>Job Title</label>
                <input type="text" placeholder="e.g. Software Engineer" value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input type="text" placeholder="e.g. Google" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Skills</label>
              <div className="input-wrapper has-icon">
                <span className="input-icon"><Tag size={16} /></span>
                <input type="text" placeholder="React, Node.js, Python (comma-separated)" value={form.skills} onChange={e => setForm({ ...form, skills: e.target.value })} />
              </div>
            </div>

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
