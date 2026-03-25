import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Mic, MicOff, Brain, Clock, HelpCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MockRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [sessionData, setSessionData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [timeLeft, setTimeLeft] = useState(60);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const res = await window.fetch(`http://localhost:8001/api/mock/session/${sessionId}/`);
      if (!res.ok) throw new Error('Session not found');
      const data = await res.json();
      setSessionData(data);
      
      const unanswered = data.questions.find(q => !q.isAnswered);
      if (unanswered) {
        setCurrentQuestion(unanswered);
      } else {
        setCompleted(true);
      }
    } catch (err) {
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentQuestion && !completed) {
      speakText(currentQuestion.text);
      setTimeLeft(60);
    }
    return () => { synthRef.current.cancel(); }
  }, [currentQuestion, completed]);

  useEffect(() => {
    let timer;
    if (isRecording && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && isRecording) {
      stopRecordingAndSubmit();
    }
    return () => clearInterval(timer);
  }, [isRecording, timeLeft]);

  const speakText = (text) => {
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    synthRef.current.speak(utterance);
  };

  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      toast.error('Browser does not support speech recognition. Use Chrome.');
      return;
    }
    synthRef.current.cancel(); // Stop AI speaking if user starts
    setTranscript('');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (e) => {
      let currentTranscript = '';
      for (let i = 0; i < e.results.length; i++) {
        currentTranscript += e.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognitionRef.current.onerror = () => {
      setIsRecording(false);
    };

    recognitionRef.current.start();
    setIsRecording(true);
  };

  const stopRecordingAndSubmit = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    await submitAnswer(transcript);
  };

  const submitAnswer = async (answer) => {
    setSubmitting(true);
    let finalAnswer = answer.trim() || 'No answer provided.';
    
    try {
      const res = await window.fetch(`http://localhost:8001/api/mock/session/${sessionId}/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId: currentQuestion.id, answerText: finalAnswer })
      });
      const data = await res.json();
      
      if (data.completed) {
        setCompleted(true);
        fetchSession(); // Re-fetch to see all results
      } else if (data.nextQuestion) {
        setCurrentQuestion({ ...data.nextQuestion, isAnswered: false, order: currentQuestion.order + 1 });
        setTranscript('');
      }
    } catch (err) {
      toast.error('Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '100px' }}><span className="spinner"></span></div>;

  if (completed && sessionData) {
    return (
      <DashboardLayout role="candidate" title="Mock Interview Completed" subtitle="Resume-driven adaptive session review">
        <div className="dashboard-page" style={{ maxWidth: 800 }}>
          <div className="glass-card" style={{ padding: 'var(--space-2xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <CheckCircle size={32} color="var(--accent-green)" />
              <h2>Interview Finished</h2>
            </div>
            
            <p style={{ marginBottom: 32, color: 'var(--text-secondary)' }}>Based on your resume for the {sessionData.jobRole} role, here is the AI feedback sequence.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {sessionData.questions.map((q, idx) => (
                <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, padding: 24 }}>
                  <h4 style={{ marginBottom: 12, color: 'var(--accent-blue-light)' }}>Q{q.order}: {q.text}</h4>
                  <div style={{ padding: 12, background: 'rgba(0,0,0,0.2)', borderRadius: 8, marginBottom: 16 }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Your Answer:</p>
                    <p>{q.answer}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingRight: 24 }}>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 4 }}>AI Feedback:</p>
                      <p style={{ fontSize: '0.95rem' }}>{q.feedback}</p>
                    </div>
                    <div style={{ textAlign: 'center', padding: '8px 16px', background: 'rgba(16,185,129,0.1)', color: 'var(--accent-green)', borderRadius: 8 }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{q.score}</div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Score</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn-primary" style={{ marginTop: 32 }} onClick={() => navigate('/candidate')}>Back to Dashboard</button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="candidate" title="Adaptive Mock Interview" subtitle={`Question ${currentQuestion?.order || 1} of ${sessionData?.totalQuestions}`}>
      <div className="dashboard-page" style={{ maxWidth: 800 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
          <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, flex: 1, marginRight: 16 }}>
            <Brain size={24} color="var(--accent-blue-light)" />
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>AI Interviewer</p>
              <p style={{ fontWeight: 600 }}>Adaptive Engine</p>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Clock size={24} color={timeLeft <= 10 ? 'var(--accent-red)' : 'var(--text-primary)'} />
            <div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Time Remaining</p>
              <p style={{ fontWeight: 600, fontSize: '1.2rem', color: timeLeft <= 10 ? 'var(--accent-red)' : 'var(--text-primary)' }}>
                {timeLeft}s
              </p>
            </div>
          </div>
        </div>

        {currentQuestion && (
          <div className="glass-card" style={{ padding: 'var(--space-2xl)', marginBottom: 24, background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)' }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
              <HelpCircle size={28} color="var(--accent-blue)" style={{ flexShrink: 0 }} />
              <h2 style={{ fontSize: '1.5rem', lineHeight: 1.4, margin: 0 }}>{currentQuestion.text}</h2>
            </div>

            <div style={{ position: 'relative', minHeight: 150, background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: 24, border: `1px solid ${isRecording ? 'var(--accent-blue)' : 'rgba(255,255,255,0.05)'}` }}>
              {isRecording ? (
                <>
                  <div className="recording-wave" style={{ right: 20, top: 20 }}><span></span><span></span><span></span></div>
                  <p style={{ color: 'var(--text-primary)', fontSize: '1.1rem', lineHeight: 1.6 }}>{transcript || "Listening..."}</p>
                </>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  {transcript ? <p style={{ color: 'var(--text-primary)' }}>{transcript}</p> : <p>Click <strong style={{ color: 'white' }}>Start Answering</strong> when ready.</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {submitting ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><span className="spinner"></span></div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16 }}>
            {!isRecording ? (
              <button className="btn btn-primary" style={{ padding: '16px 48px', fontSize: '1.1rem', borderRadius: 30 }} onClick={startRecording}>
                <Mic size={20} /> Start Answering
              </button>
            ) : (
              <button className="btn btn-primary" style={{ padding: '16px 48px', fontSize: '1.1rem', borderRadius: 30, background: 'var(--accent-red)', borderColor: 'var(--accent-red)' }} onClick={stopRecordingAndSubmit}>
                <MicOff size={20} /> Stop & Submit Answer
              </button>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
