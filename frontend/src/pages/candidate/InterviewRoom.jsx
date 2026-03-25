import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import {
  Mic, MicOff, Send, ChevronRight, Clock, Brain,
  Volume2, MessageSquare, SkipForward, AlertTriangle
} from 'lucide-react';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8000';

export default function InterviewRoom() {
  const { sessionId } = useParams();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(120);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiThinking, setAiThinking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  const socketRef = useRef(null);
  const timerRef = useRef(null);
  const recognitionRef = useRef(null);

  const questions = session?.dynamicQuestions || [];
  const currentQ = questions[currentQIndex];
  const totalQ = interview?.numberOfQuestions || 0;

  // Fetch session on mount
  useEffect(() => {
    api.get(`/candidates/session/${sessionId}`).then(r => {
      setSession(r.data.session);
      setInterview(r.data.session.interview);
      setCurrentQIndex(r.data.session.currentQuestionIndex || 0);
      setLoading(false);
    }).catch(() => { toast.error('Session not found'); navigate('/candidate'); });
  }, [sessionId]);

  // Setup socket
  useEffect(() => {
    if (!session) return;
    socketRef.current = io(WS_URL, { withCredentials: true });
    const roomId = session.socketRoomId || `session_${session.interview?._id}_${user._id}`;
    socketRef.current.emit('join_room', roomId);

    socketRef.current.on('answer_evaluated', (data) => {
      setAiThinking(false);
    });

    return () => socketRef.current?.disconnect();
  }, [session]);

  // Timer
  useEffect(() => {
    if (!currentQ || sessionComplete) return;
    setTimeLeft(currentQ.timeLimit || 120);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          handleSkip();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentQIndex, currentQ, sessionComplete]);

  // Speech recognition
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      toast.error('Voice input not supported in this browser. Please use text.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      socketRef.current?.emit('voice_input_started', { roomId: session?.socketRoomId });
    };

    recognitionRef.current.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map(r => r[0].transcript).join('');
      setAnswer(transcript);
    };

    recognitionRef.current.onerror = () => setIsListening(false);
    recognitionRef.current.onend = () => {
      setIsListening(false);
      socketRef.current?.emit('voice_input_stopped', { roomId: session?.socketRoomId });
    };

    recognitionRef.current.start();
  }, [session]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggleMic = () => {
    if (isListening) stopListening();
    else startListening();
  };

  const submitAnswer = async (skip = false) => {
    if (!answer.trim() && !skip) { toast.error('Please provide an answer or skip the question'); return; }
    clearInterval(timerRef.current);
    stopListening();
    setSubmitting(true);
    setAiThinking(true);

    try {
      const res = await api.post('/candidates/answer', {
        sessionId, questionIndex: currentQIndex,
        answer: skip ? '[Skipped]' : answer,
        timeTaken: (currentQ?.timeLimit || 120) - timeLeft,
      });

      setOverallProgress(res.data.overallScore || 0);
      toast.success(`Score: ${res.data.evaluation?.score || 0}/100`, { icon: '🎯' });

      if (currentQIndex + 1 >= totalQ) {
        await completeInterview();
      } else {
        setSession(prev => ({
          ...prev,
          dynamicQuestions: [...(prev.dynamicQuestions || []), res.data.nextQuestion],
          currentQuestionIndex: currentQIndex + 1
        }));
        setCurrentQIndex(i => i + 1);
        setAnswer('');
        setAiThinking(false);
      }
    } catch { toast.error('Failed to submit answer'); setAiThinking(false); }
    setSubmitting(false);
  };

  const handleSkip = () => submitAnswer(true);
  const handleSubmit = () => submitAnswer(false);

  const completeInterview = async () => {
    try {
      await api.post('/candidates/complete', { sessionId });
      setSessionComplete(true);
      toast.success('Interview completed! Generating your report...');
      setTimeout(() => navigate(`/candidate/results/${sessionId}`), 2000);
    } catch { toast.error('Failed to complete session'); }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  const timerClass = timeLeft <= 10 ? 'danger' : timeLeft <= 30 ? 'warning' : '';

  if (loading) return (
    <div className="loading-overlay">
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 56, height: 56, margin: '0 auto 16px' }} />
        <p>Loading your interview...</p>
      </div>
    </div>
  );

  if (sessionComplete) return (
    <div className="loading-overlay">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2>Interview Complete!</h2>
        <p>Analyzing your performance with AI...</p>
        <div className="spinner" style={{ width: 32, height: 32, margin: '16px auto 0' }} />
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: 'var(--space-lg)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="logo-icon" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/AI_and_human_connection_symbol-removebg-preview.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scale(1.2)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{interview?.title}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Question {currentQIndex + 1} of {totalQ}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div className={`timer-display ${timerClass}`}>{formatTime(timeLeft)}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>TIME LEFT</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--accent-green)' }}>{overallProgress}%</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CURRENT SCORE</div>
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div style={{ marginBottom: 24 }}>
        <div className="progress-bar-wrapper">
          <div className="progress-bar-fill" style={{ width: `${(currentQIndex / totalQ) * 100}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Progress: {currentQIndex}/{totalQ} questions</span>
          <span>Avg Score: {overallProgress}%</span>
        </div>
      </div>

      <div className="interview-room">
        {/* Left: Question Panel */}
        <div className="question-panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className={`badge badge-${currentQ?.type === 'technical' ? 'info' : currentQ?.type === 'behavioral' ? 'purple' : 'warning'}`}>
                {currentQ?.type || 'general'}
              </span>
              <span className={`badge badge-${currentQ?.difficulty === 'hard' ? 'danger' : currentQ?.difficulty === 'easy' ? 'success' : 'warning'}`}>
                {currentQ?.difficulty || 'medium'}
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />{currentQ?.timeLimit || 120}s
            </span>
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <Brain size={12} /> AI Question {currentQIndex + 1}
              </span>
              <h3 style={{ lineHeight: 1.5, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {currentQ?.text}
              </h3>
            </div>

            {currentQ?.expectedKeywords?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8 }}>HINT KEYWORDS</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {currentQ.expectedKeywords.slice(0, 4).map(k => (
                    <span key={k} className="badge badge-purple" style={{ fontSize: '0.7rem' }}>{k}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Question Navigation Dots */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {questions.map((_, i) => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: '50%',
                background: i < currentQIndex ? 'var(--accent-green)' : i === currentQIndex ? 'var(--accent-blue)' : 'rgba(255,255,255,0.1)',
                transition: '0.3s',
              }} />
            ))}
          </div>
        </div>

        {/* Right: Answer Panel */}
        <div className="answer-panel">
          {aiThinking && (
            <div className="ai-thinking">
              <Brain size={18} color="var(--accent-purple-light)" />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>AI is evaluating your answer...</span>
              <div className="thinking-dots" style={{ marginLeft: 'auto' }}>
                <span /><span /><span />
              </div>
            </div>
          )}

          {/* Mic Button */}
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <button className={`mic-btn${isListening ? ' listening' : ''}`} onClick={toggleMic}>
              {isListening ? <MicOff size={28} /> : <Mic size={28} />}
            </button>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 12 }}>
              {isListening ? '🔴 Listening... Click to stop' : 'Click mic or type your answer below'}
            </p>
          </div>

          {/* Text Area */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <MessageSquare size={14} /> Your Answer
            </label>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              placeholder="Start speaking or type your answer here..."
              style={{ flex: 1, minHeight: 200, resize: 'vertical' }}
              disabled={aiThinking || submitting}
            />
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              {answer.length} characters
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleSkip} disabled={submitting || aiThinking}
              style={{ color: 'var(--text-muted)', flex: '0 0 auto' }}>
              <SkipForward size={16} /> Skip
            </button>
            <button
              className={`btn btn-primary w-full${submitting ? ' btn-loading' : ''}`}
              onClick={handleSubmit}
              disabled={!answer.trim() || submitting || aiThinking}
            >
              {submitting ? (
                <><span className="spinner spinner-sm" /> Processing...</>
              ) : currentQIndex + 1 >= totalQ ? (
                <>Finish Interview ✓</>
              ) : (
                <>Submit Answer <ChevronRight size={16} /></>
              )}
            </button>
          </div>

          {timeLeft <= 30 && (
            <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, fontSize: '0.8rem', color: '#fbbf24' }}>
              <AlertTriangle size={16} /> Running out of time! Submit your answer soon.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
