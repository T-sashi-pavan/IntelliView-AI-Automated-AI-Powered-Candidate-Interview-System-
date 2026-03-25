import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import useAuthStore from '../../store/authStore';
import {
  LayoutDashboard, Plus, Users, BarChart3, FileText,
  Settings, LogOut, ChevronRight, Brain, UserCircle, X, Compass, Gamepad2
} from 'lucide-react';

const recruiterNav = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/recruiter' },
  { icon: Plus, label: 'Create Interview', to: '/recruiter/create-interview' },
  { icon: FileText, label: 'Interview History', to: '/recruiter/history' },
  { icon: Users, label: 'Candidates', to: '/recruiter/candidates' },
  { icon: BarChart3, label: 'Analytics', to: '/recruiter/analytics' },
  { icon: Bell, label: 'Notifications', to: '/recruiter/notifications' },
  { icon: Settings, label: 'Settings', to: '/recruiter/settings' },
];

const candidateNav = [
  { icon: LayoutDashboard, label: 'Dashboard', to: '/candidate' },
  { icon: Compass, label: 'Explore Interviews', to: '/candidate/explore' },
  { icon: Gamepad2, label: 'Mock Interview', to: '/candidate/mock-interview' },
  { icon: Brain, label: 'Attend Interview', to: '/candidate/attend' },
  { icon: FileText, label: 'My Results', to: '/candidate/my-results' },
  { icon: UserCircle, label: 'Profile', to: '/profile' },
  { icon: Settings, label: 'Settings', to: '/candidate/settings' },
];

export default function Sidebar({ role = 'recruiter', open, onClose }) {
  const { user, logout, updateRole } = useAuthStore();
  const navigate = useNavigate();
  const nav = role === 'recruiter' ? recruiterNav : candidateNav;

  const handleSwitch = () => {
    const next = role === 'recruiter' ? 'candidate' : 'recruiter';
    updateRole(next).then(() => navigate(next === 'recruiter' ? '/recruiter' : '/candidate'));
    onClose?.();
  };

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      {open && <div className="sidebar-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99, backdropFilter: 'blur(4px)' }} />}
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/AI_and_human_connection_symbol-removebg-preview.png" alt="InterviewAI" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.2)' }} />
          </div>
          <span className="logo-text">Interview<span>AI</span></span>
          {open && (
            <button className="btn btn-ghost btn-icon" style={{ marginLeft: 'auto' }} onClick={onClose}>
              <X size={16} />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">
            {role === 'recruiter' ? 'Recruiter Panel' : 'Candidate Panel'}
          </span>
          {nav.map(({ icon: Icon, label, to }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/recruiter' || to === '/candidate'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <span className="nav-icon"><Icon size={18} /></span>
              {label}
            </NavLink>
          ))}

          <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-primary)', marginTop: 'auto' }}>
            <button className="nav-item w-full" onClick={handleSwitch} style={{ cursor: 'pointer', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <span className="nav-icon"><ChevronRight size={18} /></span>
              Switch to {role === 'recruiter' ? 'Candidate' : 'Recruiter'}
            </button>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile-mini" onClick={() => { navigate('/profile'); onClose?.(); }}>
            <div className="avatar">
              {user?.avatar ? <img src={user.avatar} alt={user.name} /> : user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, truncate: true }} className="truncate">{user?.name}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }} className="truncate">{user?.email}</p>
            </div>
          </div>
          <button className="btn btn-ghost w-full" onClick={handleLogout} style={{ marginTop: 8, justifyContent: 'flex-start', gap: '10px', color: 'var(--accent-red)' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
