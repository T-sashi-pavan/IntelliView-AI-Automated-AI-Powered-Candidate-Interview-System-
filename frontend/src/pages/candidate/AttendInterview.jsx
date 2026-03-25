import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { Link, ArrowRight, Briefcase, Clock, Hash, Brain } from 'lucide-react';

export default function AttendInterview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const defaultLink = params.get('link') || '';
  const [link, setLink] = useState(defaultLink);
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);

  const handleFetchInterview = async () => {
    if (!link.trim()) { toast.error('Please enter an interview link'); return; }
    setLoading(true);
    try {
      const linkCode = link.includes('link=') ? link.split('link=')[1] : link.trim();
      const res = await api.get(`/interviews/link/${linkCode}`);
      setInterview(res.data.interview);
    } catch {
      toast.error('Interview not found or has expired.');
    }
    setLoading(false);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      const linkCode = link.includes('link=') ? link.split('link=')[1] : link.trim();
      const res = await api.post('/candidates/start', { interviewLink: linkCode });
      toast.success('Interview starting...');
      navigate(`/candidate/interview/${res.data.session._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start interview');
    }
    setStarting(false);
  };

  return (
    <DashboardLayout role="candidate" title="Attend Interview" subtitle="Enter your interview link to begin">
      <div className="dashboard-page" style={{ maxWidth: 600 }}>
        <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link size={22} color="var(--accent-blue-light)" /> Enter Interview Link
          </h3>
          <div className="form-group">
            <label>Interview Link or Code</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                type="text"
                placeholder="Paste your interview link here..."
                value={link}
                onChange={e => setLink(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleFetchInterview()}
                style={{ flex: 1 }}
              />
              <button className={`btn btn-primary${loading ? ' btn-loading' : ''}`} onClick={handleFetchInterview} disabled={loading}>
                {loading ? <span className="spinner spinner-sm" /> : 'Fetch'}
              </button>
            </div>
          </div>
        </div>

        {interview && (
          <div className="glass-card animate-fade" style={{ padding: 'var(--space-xl)', borderColor: 'rgba(59,130,246,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div className="badge badge-success" style={{ marginBottom: 12 }}>✓ Interview Found</div>
                <h3>{interview.title}</h3>
                <p style={{ marginTop: 8, fontSize: '0.875rem' }}>by {interview.recruiter?.name} {interview.recruiter?.company ? `· ${interview.recruiter.company}` : ''}</p>
              </div>
              <Brain size={36} color="var(--accent-purple-light)" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[
                { icon: Briefcase, label: 'Level', value: interview.experienceLevel },
                { icon: Clock, label: 'Duration', value: `${interview.duration} min` },
                { icon: Hash, label: 'Questions', value: interview.numberOfQuestions },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} style={{ textAlign: 'center', padding: 16, background: 'var(--bg-glass)', borderRadius: 12, border: '1px solid var(--border-primary)' }}>
                  <Icon size={18} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontWeight: 700, textTransform: 'capitalize', marginTop: 4 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
              <p style={{ fontSize: '0.875rem', color: '#fbbf24' }}>
                ⚠️ Once you start, the timer will begin immediately. Make sure you have a stable internet connection and a quiet environment.
              </p>
            </div>

            <button className={`btn btn-primary btn-lg w-full${starting ? ' btn-loading' : ''}`} onClick={handleStart} disabled={starting}>
              {starting ? <><span className="spinner spinner-sm" /> Starting...</> : <>Start Interview <ArrowRight size={18} /></>}
            </button>
          </div>
        )}

        <div className="glass-card" style={{ padding: 'var(--space-xl)', marginTop: 'var(--space-xl)' }}>
          <h4 style={{ marginBottom: 16 }}>Tips for a Great Interview</h4>
          {[
            'Speak clearly when using voice input',
            'Read each question carefully before answering',
            'Use specific examples in your responses',
            'Managing your time — each question has a time limit',
          ].map(tip => (
            <div key={tip} style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-blue)', flexShrink: 0, marginTop: 8 }} />
              <p style={{ fontSize: '0.875rem' }}>{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
