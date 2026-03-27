import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { useRecruiterStore } from '../../store/recruiterStore';
import {
  Briefcase, FileText, Tag, Clock, Hash, Copy, Check, Link, Brain, 
  DollarSign, Calendar, MapPin, Activity, PlusCircle, Trash2
} from 'lucide-react';

const experienceLevels = ['entry', 'mid', 'senior', 'lead'];
const employmentTypes = ['full-time', 'part-time', 'internship', 'contract'];
const workModes = ['remote', 'hybrid', 'onsite'];
const timesPerQuestion = [30, 60, 120, 180];
const questionCounts = [5, 8, 10, 12, 15, 20];

export default function CreateInterview() {
  const navigate = useNavigate();
  const { 
    createInterviewForm: form, 
    setForm, 
    interviewLink, 
    interviewId, 
    setInterviewData, 
    clearInterviewData 
  } = useRecruiterStore();

  const [creating, setCreating] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.jobDescription) {
      toast.error('Please fill in required fields'); return;
    }
    setCreating(true);
    try {
      const res = await api.post('/interviews', form);
      const fullLink = `${window.location.origin}/candidate/attend?link=${res.data.interview.interviewLink}`;
      setInterviewData(fullLink, res.data.interview._id);
      toast.success('Interview created successfully!');
    } catch { toast.error('Failed to create interview'); }
    setCreating(false);
  };

  const handleAIAssist = async () => {
    if (!form.title) {
      toast.error('Please enter a Job Title first to get AI suggestions');
      return;
    }
    setGeneratingAI(true);
    const toastId = toast.loading('AI is crafting job details...');
    try {
      const res = await api.post('/interviews/ai-suggest', { title: form.title });
      if (res.data.suggestion) {
        setForm({
          jobDescription: res.data.suggestion.jobDescription || form.jobDescription,
          requiredSkills: res.data.suggestion.requiredSkills || form.requiredSkills,
          // We DO NOT auto-fill stipend, jobDuration, employmentType, workMode as per user request
          experienceLevel: res.data.suggestion.experienceLevel || form.experienceLevel
        });
        toast.success('Job details auto-filled!', { id: toastId });
      }
    } catch {
      toast.error('Failed to generate suggestions. Please enter manually.', { id: toastId });
    }
    setGeneratingAI(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(interviewLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const uploadToast = toast.loading('Sending invites...');
    try {
      const res = await api.post(`/interviews/${interviewId}/invite`, formData);
      toast.success(res.data.message, { id: uploadToast });
      // Logic could be added here to clear the form if the user wants it to disappear after invites
      // But the user said "DISAPPEAR WHEN AFTER MAILS INVITE SENT"
      // So let's clear it
      setTimeout(() => {
        clearInterviewData();
        toast.success('Form cleared for new creation');
      }, 3000);
    } catch (err) {
      toast.error('Failed to parse Excel and send invites', { id: uploadToast });
    }
    e.target.value = '';
  };

  return (
    <DashboardLayout role="recruiter" title="Create Interview" subtitle="Set up a new AI-powered interview">
      <div className="dashboard-page" style={{ maxWidth: 760 }}>
        <form onSubmit={handleCreate} style={{ opacity: !!interviewId ? 0.6 : 1, pointerEvents: !!interviewId ? 'none' : 'auto' }}>
          <div className="glass-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Briefcase size={22} color="var(--accent-blue-light)" /> Job Details {!!interviewId && '(Saved)'}
              </h3>
              {!interviewId && (
                <button 
                  type="button" 
                  onClick={handleAIAssist} 
                  className={`btn btn-secondary ${generatingAI ? 'btn-loading' : ''}`}
                  disabled={generatingAI || !form.title}
                  title="Only Job Title, Description, Skills, and Experience are AI assisted"
                >
                  {generatingAI ? <span className="spinner spinner-sm" /> : <><Brain size={16} /> AI Auto-Fill</>}
                </button>
              )}
            </div>

            <div className="form-group">
              <label>Job Title *</label>
              <div className="input-wrapper has-icon">
                <span className="input-icon"><PlusCircle size={16} /></span>
                <input type="text" placeholder="e.g. Senior Frontend Engineer"
                  value={form.title} onChange={e => setForm({ title: e.target.value })} required />
              </div>
            </div>

            <div className="form-group">
              <label>Job Description *</label>
              <textarea placeholder="Describe the role, responsibilities, and what you're looking for in a candidate..."
                value={form.jobDescription} rows={5}
                onChange={e => setForm({ jobDescription: e.target.value })} required />
            </div>

            <div className="form-group">
              <label>Required Skills</label>
              <div className="input-wrapper has-icon">
                <span className="input-icon"><Tag size={16} /></span>
                <input type="text" placeholder="React, TypeScript, Node.js (comma-separated)"
                  value={form.requiredSkills} onChange={e => setForm({ requiredSkills: e.target.value })} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Experience Level</label>
                <div className="input-wrapper has-icon">
                  <span className="input-icon"><Hash size={16} /></span>
                  <select value={form.experienceLevel} onChange={e => setForm({ experienceLevel: e.target.value })}>
                    {experienceLevels.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                 <label>Employment Type</label>
                 <div className="input-wrapper has-icon">
                   <span className="input-icon"><Activity size={16} /></span>
                   <select value={form.employmentType} onChange={e => setForm({ employmentType: e.target.value })}>
                     {employmentTypes.map(t => <option key={t} value={t}>{t.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('-')}</option>)}
                   </select>
                 </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Salary / Stipend</label>
                <div className="input-wrapper has-icon">
                  <span className="input-icon"><DollarSign size={16} /></span>
                  <input type="text" placeholder="e.g. ₹20,000/mo or $100k/yr"
                    value={form.stipend} onChange={e => setForm({ stipend: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label>Job Duration</label>
                <div className="input-wrapper has-icon">
                  <span className="input-icon"><Calendar size={16} /></span>
                  <input type="text" placeholder="e.g. 6 Months or Permanent"
                    value={form.jobDuration} onChange={e => setForm({ jobDuration: e.target.value })} />
                </div>
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label>Work Mode</label>
                <div className="input-wrapper has-icon">
                  <span className="input-icon"><MapPin size={16} /></span>
                   <select value={form.workMode} onChange={e => setForm({ workMode: e.target.value })}>
                     {workModes.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                   </select>
                </div>
              </div>
              <div className="form-group">
                <label>Time per question</label>
                <div className="input-wrapper has-icon">
                  <span className="input-icon"><Clock size={16} /></span>
                  <select value={form.timePerQuestion} onChange={e => setForm({ timePerQuestion: Number(e.target.value) })}>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={120}>2 minutes</option>
                    <option value={180}>3 minutes</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Number of Questions</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {questionCounts.map(n => (
                  <button key={n} type="button"
                    className={`btn btn-sm ${form.numberOfQuestions === n ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setForm({ numberOfQuestions: n })}>{n}</button>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button type="submit" className={`btn btn-primary${creating ? ' btn-loading' : ''}`} disabled={creating || !!interviewId}>
              {creating ? <span className="spinner spinner-sm" /> : 'Create Interview'}
            </button>
            {!!interviewId && (
              <button type="button" className="btn btn-ghost btn-danger" onClick={clearInterviewData}>
                <Trash2 size={16} /> Reset Form
              </button>
            )}
          </div>
        </form>

        {/* Interview Link Result */}
        {interviewLink && (
          <div className="glass-card animate-fade" style={{ padding: 'var(--space-2xl)', marginTop: 'var(--space-xl)', borderColor: 'rgba(16,185,129,0.3)', background: 'linear-gradient(to bottom, rgba(16,185,129,0.05), transparent)' }}>
            <h3 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-green)' }}>
              <Link size={20} /> Interview Ready!
            </h3>
            
            <div style={{ marginBottom: 24, display: 'flex', gap: 32 }}>
              <div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Interview ID / Code:</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{interviewLink.split('link=')[1]}</p>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Total Questions:</p>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{form.numberOfQuestions}</p>
              </div>
            </div>

            <p style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>Share this direct access link with candidates:</p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 32 }}>
              <input value={interviewLink} readOnly
                style={{ flex: 1, background: 'rgba(0,0,0,0.2)', fontFamily: 'monospace', fontSize: '0.85rem' }} />
              <button type="button" className="btn btn-primary" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            {/* Excel Upload Block */}
            <div style={{ padding: '24px', borderRadius: 12, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 24, boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: '1.1rem' }}>
                <FileText size={20} color="var(--accent-blue-light)" /> Bulk Invite Candidates
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 20 }}>
                Upload an Excel sheet (.xlsx, .csv) with a column named <strong style={{ color: 'var(--text-primary)' }}>"Email"</strong> and optional <strong style={{ color: 'var(--text-primary)' }}>"Name"</strong>. 
                AI and Human connection links will be sent automatically.
              </p>
              
              <input type="file" accept=".xlsx,.csv" id="excelUpload" style={{ display: 'none' }} onChange={handleInvite} />
              <label htmlFor="excelUpload" className="btn btn-primary w-full" style={{ cursor: 'pointer', background: 'var(--accent-blue)', gap: 10 }}>
                <PlusCircle size={18} /> Choose Excel File & Send Invites
              </label>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>
                Accepted formats: .xlsx, .csv, and Google Sheets exported as Excel.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/recruiter')}>Dashboard</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/recruiter/requests')}>View Requests</button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
