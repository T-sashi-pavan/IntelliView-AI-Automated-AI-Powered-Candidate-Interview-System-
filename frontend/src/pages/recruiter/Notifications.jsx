import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Bell, FileText, CheckCircle, XCircle, ChevronDown, 
  ExternalLink, TrendingUp, AlertCircle, Info, User
} from 'lucide-react';

export default function RecruiterNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchNotes = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications);
    } catch {
      toast.error('Failed to load notifications');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch {}
  };

  const handleAction = async (notification, action) => {
    const { sender, data } = notification;
    try {
      if (action === 'grant') {
        const res = await api.post(`/interviews/${data.interviewId}/invite`, {
          // manually invite via list logic or dedicated endpoint
          // For now, let's assume we send the email directly
          manualInvite: true,
          email: sender.email,
          name: sender.name
        });
        toast.success(`Access granted! Email sent to ${sender.name}`);
      } else {
        toast.error(`Application from ${sender.name} declined`);
      }
      handleMarkRead(notification._id);
    } catch {
      toast.error('Failed to take action');
    }
  };

  return (
    <DashboardLayout role="recruiter" title="Notifications" subtitle="Review candidate applications and system alerts">
      <div className="dashboard-page" style={{ maxWidth: 900 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
        ) : notifications.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: 48 }}>
            <Bell size={48} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 16px' }} />
            <h3>All caught up!</h3>
            <p>No new notifications at the moment.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {notifications.map(n => (
              <div key={n._id} className={`glass-card notification-card ${n.isRead ? 'read' : 'unread'}`} style={{ 
                borderLeft: n.isRead ? '4px solid transparent' : '4px solid var(--accent-blue)',
                transition: '0.3s'
              }}>
                <div style={{ padding: 20, cursor: 'pointer' }} onClick={() => { setExpanded(expanded === n._id ? null : n._id); handleMarkRead(n._id); }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <div className="avatar avatar-md" style={{ background: 'rgba(99,102,241,0.1)' }}>
                      {n.sender?.avatar ? <img src={n.sender.avatar} alt="" /> : <User size={20} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 4px', fontSize: '1rem' }}>{n.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{n.message}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleDateString()}</span>
                      <div style={{ marginTop: 4 }}><ChevronDown size={16} className={`arrow-icon ${expanded === n._id ? 'up' : ''}`} /></div>
                    </div>
                  </div>

                  {expanded === n._id && n.type === 'application' && (
                    <div className="notification-details animate-slide-down" style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
                        {/* Analysis Score Card */}
                        <div className="glass-card" style={{ background: 'rgba(255,255,255,0.02)', padding: 16 }}>
                          <h5 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <TrendingUp size={16} color="var(--accent-green)" /> AI Matching Score
                          </h5>
                          <div style={{ textAlign: 'center', margin: '16px 0' }}>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-green)' }}>{n.data?.resumeAnalysis?.score}%</div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>JD Match Confidence</p>
                          </div>
                          <div style={{ marginTop: 16 }}>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{n.data?.resumeAnalysis?.feedback}</p>
                          </div>
                        </div>

                        {/* Pros & Cons */}
                        <div>
                          <div className="grid-2">
                            <div>
                              <h5 style={{ fontSize: '0.85rem', color: 'var(--accent-green)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCircle size={14} /> Strengths
                              </h5>
                              <ul style={{ padding: 0, listStyle: 'none' }}>
                                {n.data?.resumeAnalysis?.pros?.map((p, idx) => (
                                  <li key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>• {p}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 style={{ fontSize: '0.85rem', color: 'var(--accent-red)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <AlertCircle size={14} /> Gaps Found
                              </h5>
                              <ul style={{ padding: 0, listStyle: 'none' }}>
                                {n.data?.resumeAnalysis?.cons?.map((c, idx) => (
                                  <li key={idx} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: 4 }}>• {c}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                            <a href={n.data?.resumeUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                              <ExternalLink size={14} /> View Full Resume
                            </a>
                            <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={() => handleAction(n, 'grant')}>
                              Grant Access
                            </button>
                            <button className="btn btn-danger btn-sm" style={{ flex: 0.5 }} onClick={() => handleAction(n, 'deny')}>
                              <XCircle size={14} /> Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
