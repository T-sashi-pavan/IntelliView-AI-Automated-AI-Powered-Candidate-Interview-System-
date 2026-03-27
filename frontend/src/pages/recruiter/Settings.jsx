import { useState } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { User, Mail, Briefcase, Save, Camera } from 'lucide-react';
import { useRef } from 'react';

export default function RecruiterSettings() {
  const { user, refreshUser } = useAuthStore();
  const [form, setForm] = useState({ name: user?.name || '', company: user?.company || '', jobTitle: user?.jobTitle || '', bio: user?.bio || '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/users/profile', form);
      await refreshUser();
      toast.success('Profile updated!');
    } catch { toast.error('Update failed'); }
    setSaving(false);
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setUploading(true);
    try {
      await api.post('/users/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await refreshUser();
      toast.success('Profile picture updated!');
    } catch {
      toast.error('Failed to update profile picture');
    }
    setUploading(false);
  };

  return (
    <DashboardLayout role="recruiter" title="Settings" subtitle="Manage your account and preferences">
      <div className="dashboard-page" style={{ maxWidth: 600 }}>
        <form onSubmit={handleSave}>
          <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 24 }}>Profile Information</h3>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
              <div 
                className="avatar avatar-xl" 
                style={{ background: 'var(--gradient-primary)', position: 'relative', cursor: 'pointer', overflow: 'hidden' }}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? (
                  <span className="spinner spinner-sm" style={{ color: 'white' }} />
                ) : user?.avatar ? (
                  <img src={user.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  user?.name?.[0]
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
                  <Camera size={14} color="white" />
                </div>
              </div>
              <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleAvatarChange} />
            </div>

            <div className="form-group">
              <label>Full Name</label>
              <div className="input-wrapper has-icon">
                <span className="input-icon"><User size={16} /></span>
                <input type="text" placeholder="Full Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Email (cannot change)</label>
              <div className="input-wrapper has-icon">
                <span className="input-icon"><Mail size={16} /></span>
                <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Company</label>
                <div className="input-wrapper has-icon">
                  <span className="input-icon"><Briefcase size={16} /></span>
                  <input type="text" placeholder="Company name" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Job Title</label>
                <input type="text" placeholder="e.g. HR Manager" value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} />
              </div>
            </div>

            <div className="form-group">
              <label>Bio</label>
              <textarea placeholder="Tell candidates about yourself..." value={form.bio} rows={3} onChange={e => setForm({ ...form, bio: e.target.value })} />
            </div>

            <button type="submit" className={`btn btn-primary${saving ? ' btn-loading' : ''}`} disabled={saving}>
              {saving ? <span className="spinner spinner-sm" /> : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        </form>

        <div className="glass-card" style={{ padding: 'var(--space-xl)' }}>
          <h3 style={{ marginBottom: 16, color: 'var(--accent-red)' }}>Danger Zone</h3>
          <p style={{ marginBottom: 16, fontSize: '0.875rem' }}>Once you delete your account, there is no going back.</p>
          <button className="btn btn-danger btn-sm" onClick={() => toast.error('Please contact support to delete your account.')}>
            Delete Account
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
