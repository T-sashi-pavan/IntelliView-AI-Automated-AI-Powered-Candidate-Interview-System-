import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Bell, Search, ChevronRight } from 'lucide-react';
import useAuthStore from '../../store/authStore';

export default function Topbar({ title, subtitle, onMenuClick, actions }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const handleNotificationClick = () => {
    if (user?.role === 'recruiter') navigate('/recruiter/requests');
    else navigate('/candidate/explore');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="btn btn-ghost btn-icon hamburger" onClick={onMenuClick} style={{ display: 'flex' }}>
          <Menu size={20} />
        </button>
        <div>
          <h1 className="page-title">{title}</h1>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="topbar-right">
        {actions}
        <div className="flex items-center gap-sm">
          <span className="badge badge-success">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#34d399', display: 'inline-block' }} />
            System Active
          </span>
        </div>
        <button className="btn btn-ghost btn-icon" style={{ position: 'relative' }} onClick={handleNotificationClick} title="Notifications & Requests">
          <Bell size={18} />
          <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)', border: '2px solid var(--bg-primary)' }} />
        </button>
        <div className="avatar" style={{ cursor: 'pointer' }}>
          {(user?.role === 'recruiter' ? (user?.recruiterAvatar || user?.avatar) : (user?.candidateAvatar || user?.avatar)) ? <img src={user?.role === 'recruiter' ? (user?.recruiterAvatar || user?.avatar) : (user?.candidateAvatar || user?.avatar)} alt="" /> : user?.name?.[0]?.toUpperCase()}
        </div>
      </div>
    </header>
  );
}
