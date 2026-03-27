import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import { Bell, Check, X, User, ExternalLink, MessageSquare, Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RequestNotifications() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/requests/recruiter');
      setRequests(res.data.requests);
    } catch (err) {
      toast.error('Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleUpdateStatus = async (requestId, status) => {
    try {
      setProcessingId(requestId);
      await api.put('/requests/update-status', { requestId, status });
      toast.success(`Access ${status === 'granted' ? 'granted' : 'revoked'} successfully!`);
      fetchRequests();
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pastRequests = requests.filter(r => r.status !== 'pending');

  return (
    <DashboardLayout role="recruiter" title="Access Requests" subtitle="Manage candidate requests for your interviews">
      <div className="dashboard-page" style={{ maxWidth: 1000 }}>
        
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Bell size={20} className="text-accent-blue" /> Pending Requests ({pendingRequests.length})
          </h3>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <span className="spinner"></span>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)' }}>No pending requests at the moment.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 16 }}>
              {pendingRequests.map(request => (
                <div key={request._id} className="glass-card" style={{ padding: 24, display: 'flex', gap: 24 }}>
                  <div className="avatar avatar-lg">
                    {request.candidate?.avatar ? <img src={request.candidate.avatar} alt="avatar" /> : <User size={24} />}
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div>
                        <h4 style={{ fontSize: '1.1rem', marginBottom: 4 }}>{request.candidate?.name}</h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{request.candidate?.email}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="badge badge-info" style={{ fontSize: '0.75rem' }}>{request.interview?.title}</span>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>Requested {new Date(request.requestDate).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MessageSquare size={14} /> {request.message || 'No message provided.'}
                      </p>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {request.candidate?.skills?.slice(0, 5).map((skill, idx) => (
                        <span key={idx} className="badge badge-ghost" style={{ fontSize: '0.7rem' }}>{skill}</span>
                      ))}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <a href={request.resumeUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ color: 'var(--accent-blue)' }}>
                        <Download size={14} style={{ marginRight: 6 }} /> View Resume
                      </a>
                      
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          className="btn btn-outline btn-sm" 
                          style={{ color: 'var(--accent-red)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                          disabled={processingId === request._id}
                          onClick={() => handleUpdateStatus(request._id, 'revoked')}
                        >
                          <X size={14} style={{ marginRight: 6 }} /> Revoke
                        </button>
                        <button 
                          className="btn btn-primary btn-sm"
                          disabled={processingId === request._id}
                          onClick={() => handleUpdateStatus(request._id, 'granted')}
                        >
                          {processingId === request._id ? <Loader2 size={14} className="spin" /> : <Check size={14} style={{ marginRight: 6 }} />} Grant Access
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {pastRequests.length > 0 && (
          <div>
            <h3 style={{ marginBottom: 16, color: 'var(--text-muted)' }}>Past Requests</h3>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Interview</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {pastRequests.map(request => (
                    <tr key={request._id}>
                      <td>{request.candidate?.name}</td>
                      <td>{request.interview?.title}</td>
                      <td>
                        <span className={`badge badge-${request.status === 'granted' ? 'success' : 'danger'}`}>
                          {request.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {new Date(request.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
