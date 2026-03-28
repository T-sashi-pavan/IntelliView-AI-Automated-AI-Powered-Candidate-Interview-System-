/**
 * RealInterviewRoom — Real recruiter-driven interview using the same Django
 * adaptive AI engine as MockRoom. Identical proctoring, TTS, ASR pipeline.
 * The only difference: shows a "Thank You" screen at the end instead of
 * the full performance report (scores are stored for recruiter leaderboard).
 */
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Mic, MicOff, Brain, Clock, CheckCircle,
  AlertCircle, Loader2, ChevronsRight, TrendingUp, TrendingDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProctoringEngine } from '../../services/proctoring';

export default function RealInterviewRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // ── Identical state to MockRoom ──────────────────────────────────────────
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalReport, setFinalReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [malpractice, setMalpractice] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  const [isManualMode, setIsManualMode] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [asrStatus, setAsrStatus] = useState('');
  const [interimText, setInterimText] = useState('');
  const [finalizedText, setFinalizedText] = useState('');
  const [autoSubmitText, setAutoSubmitText] = useState('');
  const [proctorStatus, setProctorStatus] = useState('Camera Offline');
  const [proctorReady, setProctorReady] = useState(false);
  const [abortionReason, setAbortionReason] = useState('Terminated due to multiple security violations.');
  const [countdown, setCountdown] = useState(null);
  const [volLevel, setVolLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const videoRef = useRef(null);
  const proctorRef = useRef(null);

  const DJANGO_URL = import.meta.env.VITE_DJANGO_URL || 'http://localhost:8001';

  // ── Abort threshold (10 strikes) ────────────────────────────────────────
  useEffect(() => {
    if (warningCount >= 10 && !completed && !malpractice) {
      setMalpractice(true);
      setCompleted(true);
      if (proctorRef.current) proctorRef.current.stop();
      if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      document.body.classList.remove('fullscreen-interview');
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      fetchFinalReport(Math.floor(warningCount));
      toast.error('INTERVIEW ABORTED: Security violations exceeded limit.', { duration: 10000 });
    }
  }, [warningCount, completed, malpractice]);

  // ── Camera cleanup on completion ─────────────────────────────────────────
  useEffect(() => {
    if (completed && videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
  }, [completed]);

  // ── Auto-submit via state (avoids stale closure) ─────────────────────────
  useEffect(() => {
    if (autoSubmitText) {
      submitAnswer(autoSubmitText);
      setAutoSubmitText('');
    }
  }, [autoSubmitText]);

  // ── Volume polling ────────────────────────────────────────────────────────
  useEffect(() => {
    let animId;
    if (isRecording) {
      const poll = () => {
        if (proctorRef.current) setVolLevel(proctorRef.current.getCurrentVolume());
        animId = requestAnimationFrame(poll);
      };
      poll();
    } else setVolLevel(0);
    return () => cancelAnimationFrame(animId);
  }, [isRecording]);

  // ── Countdown 3-2-1 before mic opens ─────────────────────────────────────
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    } else {
      startRecording();
      setCountdown(null);
    }
  }, [countdown]);

  // ── Socket.io (same as MockRoom) ──────────────────────────────────────────
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8000';
    socketRef.current = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('partial_transcript', (data) => {
      if (data.isFinal) {
        setFinalizedText(prev => (prev + ' ' + data.text).trim());
        setInterimText('');
      } else {
        setInterimText(data.text);
      }
    });

    socketRef.current.on('final_transcript', (data) => {
      setFinalizedText(data.text);
      setInterimText('');
      setAsrStatus('High-accuracy correction applied.');
      setTimeout(() => {
        if (data.text.trim()) setAutoSubmitText(data.text);
      }, 1500);
    });

    socketRef.current.on('asr_status', (data) => setAsrStatus(data.message));
    socketRef.current.on('asr_error', (data) => toast.error(data.message));

    return () => {
      document.body.classList.remove('fullscreen-interview');
      socketRef.current?.disconnect();
      if (proctorRef.current) proctorRef.current.stop();
      if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Camera + Proctoring init ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: { channelCount: 1, sampleRate: 16000 },
        });
        if (!mounted) return;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        if (!proctorRef.current) {
          proctorRef.current = new ProctoringEngine(videoRef.current, (event) => {
            const isHigh = event.riskLevel === 'High';
            toast.error(`${isHigh ? 'SECURITY' : 'Warning'}: ${event.message}`, { duration: 5000 });
            setAbortionReason(`Terminated due to: ${event.message}`);
            setWarningCount(prev => prev + (isHigh ? 1 : 0.5));
          }, setProctorStatus);
          await proctorRef.current.initialize();
          if (mounted) setProctorReady(true);
        }
      } catch {
        toast.error('Camera permissions are required! Please allow access and refresh.', { duration: 10000 });
      }
    };
    init();
    return () => {
      mounted = false;
      if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Tab-switch detection ──────────────────────────────────────────────────
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && !completed && !malpractice) {
        setAbortionReason('Terminated due to continuously navigating away from the interview tab.');
        setWarningCount(prev => {
          const next = prev + 1;
          if (next >= 10) {
            setMalpractice(true);
            setCompleted(true);
            fetchFinalReport(next);
            toast.error('INTERVIEW ABORTED: Security violation (Multiple tab switches).', { duration: 10000 });
            return next;
          }
          toast.error(`WARNING (${next}/10): Tab switching leads to negative marks & abortion!`, { duration: 5000, icon: '⚠️' });
          return next;
        });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [completed, malpractice]);

  // ── Load session from Django ──────────────────────────────────────────────
  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const res = await window.fetch(`${DJANGO_URL}/api/mock/session/${sessionId}/`);
      if (!res.ok) throw new Error('Session not found');
      const data = await res.json();
      setSessionData(data);
      const unanswered = data.questions.find(q => !q.isAnswered);
      if (unanswered) {
        setCurrentQuestion(unanswered);
        setAnswerText('');
        setAsrStatus('');
      } else {
        setCompleted(true);
        fetchFinalReport(warningCount);
      }
    } catch {
      toast.error('Failed to load interview session');
    } finally {
      setLoading(false);
    }
  };

  const fetchFinalReport = async (warnings = 0) => {
    setLoadingReport(true);
    try {
      const res = await window.fetch(`${DJANGO_URL}/api/mock/session/${sessionId}/feedback/?warnings=${warnings}`);
      const data = await res.json();
      setFinalReport(data);
    } catch (e) {
      console.error('Report error:', e);
    } finally {
      setLoadingReport(false);
    }
  };

  // ── Auto-speak each new question (same as MockRoom) ───────────────────────
  useEffect(() => {
    if (currentQuestion && sessionStarted && document.fullscreenElement && !completed && !malpractice) {
      setIsSpeaking(true);
      const timer = setTimeout(() => speakText(currentQuestion.text), 500);
      setTimeLeft(sessionData?.timeLimit || 180);
      return () => { clearTimeout(timer); synthRef.current.cancel(); setIsSpeaking(false); };
    }
  }, [currentQuestion, sessionStarted, completed, malpractice]);

  // ── Timer countdown ───────────────────────────────────────────────────────
  useEffect(() => {
    let timer;
    if (sessionStarted && timeLeft > 0 && !completed && !malpractice && !submitting && countdown === null && !isSpeaking) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && sessionStarted && !completed && !submitting) {
      if (isRecording) stopRecordingAndSubmit();
      else submitAnswer(answerText || finalizedText);
    }
    return () => clearInterval(timer);
  }, [sessionStarted, isRecording, timeLeft, completed, malpractice, submitting, countdown, isSpeaking]);

  // ── TTS (identical to MockRoom) ───────────────────────────────────────────
  const speakText = async (text) => {
    synthRef.current.cancel();
    const clean = text
      .replace(/\bMERN\b/g, 'Mearn')
      .replace(/\bAI\b/g, 'A.I.')
      .replace(/\bIO\b/gi, 'I.O.')
      .replace(/SOCKET IO/gi, 'Socket I.O.')
      .replace(/\bAPI\b/g, 'A.P.I.')
      .replace(/\bSQL\b/g, 'sequel')
      .replace(/\bCSS\b/g, 'C.S.S.')
      .replace(/\bHTML\b/g, 'H.T.M.L.');

    const utterance = new SpeechSynthesisUtterance(clean);
    const voices = synthRef.current.getVoices();
    const sweetVoice =
      voices.find(v => v.lang.includes('en-IN') && v.name.includes('Female')) ||
      voices.find(v => v.name.includes('Heera')) ||
      voices.find(v => v.name.includes('Veena')) ||
      voices.find(v => v.lang.includes('en-IN')) ||
      voices.find(v => v.name.includes('Google UK English Female')) ||
      voices.find(v => (v.name.includes('Aria') || v.name.includes('Samantha')) && v.lang.includes('en'));
    if (sweetVoice) utterance.voice = sweetVoice;
    utterance.volume = 0.8;
    utterance.rate = 1.15;
    utterance.pitch = 1.05;
    utterance.onend = () => {
      setIsSpeaking(false);
      if (!malpractice && !completed && !isManualMode && sessionStarted) {
        handleStartRecordingClick();
      }
    };
    setIsSpeaking(true);
    synthRef.current.speak(utterance);
  };

  const handleStartRecordingClick = () => {
    if (malpractice) return;
    synthRef.current.cancel();
    setIsSpeaking(false);
    setCountdown(3);
    setAsrStatus('Preparing Microphones...');
  };

  // ── Enter fullscreen & start proctoring ──────────────────────────────────
  const handleStartSession = async () => {
    if (!proctorReady) {
      toast.error('Please wait for AI Models to finish loading.');
      return;
    }
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(e => console.warn(e));
      }
      document.body.classList.add('fullscreen-interview');
      proctorRef.current.start();
      setSessionStarted(true);
    } catch {
      toast.error('Fullscreen permissions are required for proctoring.');
    }
  };

  // ── Recording (identical to MockRoom) ─────────────────────────────────────
  const startRecording = async () => {
    if (malpractice) return;
    setFinalizedText('');
    setInterimText('');
    setAsrStatus('Initializing ASR...');
    synthRef.current.cancel();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 } });
      socketRef.current.emit('start_asr', { sessionId });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0 && socketRef.current.connected) socketRef.current.emit('audio_chunk', e.data);
      };
      mediaRecorderRef.current.start(250);
      setIsRecording(true);
      setSessionStarted(true);
      setAsrStatus('Listening - ASR Active');
    } catch {
      toast.error('Could not access microphone');
    }
  };

  const stopRecordingAndSubmit = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      socketRef.current.emit('stop_asr');
      setIsRecording(false);
      setAsrStatus('Processing final pass...');
      setSubmitting(true);
    }
  };

  // ── Submit to Django (same endpoint as MockRoom) ──────────────────────────
  const submitAnswer = async (answer) => {
    if (malpractice || !answer || !answer.trim()) return;
    setSubmitting(true);
    try {
      const res = await window.fetch(`${DJANGO_URL}/api/mock/session/${sessionId}/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answerText: answer.trim(),
          warnings: warningCount,
        }),
      });
      const data = await res.json();

      setAnswerText('');
      setFinalizedText('');
      setInterimText('');

      if (data.completed) {
        setCompleted(true);
        if (proctorRef.current) proctorRef.current.stop();
        document.body.classList.remove('fullscreen-interview');
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        fetchFinalReport(Math.floor(warningCount));
      }

      // Fetch updated session to get next question
      fetchSession();
    } catch {
      toast.error('Submission failed. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 56, height: 56, margin: '0 auto 16px' }} />
        <p>Loading interview session...</p>
      </div>
    </div>
  );

  // ── Completion screen (Real Interview specific: no score shown) ───────────
  if (completed && sessionData) {
    if (malpractice) {
      return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 520, textAlign: 'center' }}>
            <div style={{ fontSize: 72, marginBottom: 20 }}>🚫</div>
            <h2 style={{ color: '#ef4444', marginBottom: 12 }}>Interview Terminated</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.7 }}>
              Your session was terminated due to repeated security violations.
            </p>
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 14, padding: '16px 20px', marginBottom: 28, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Reason: {abortionReason}
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32, fontSize: '0.9rem' }}>
              The recruiter has been notified. Your responses so far have been recorded.
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/candidate/explore')}>
              Back to Explore Interviews
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #0d1117 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>🎉</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 12, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Thank You!
          </h1>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: 20, fontSize: '1.15rem' }}>
            You have successfully completed your interview for
            <span style={{ color: 'var(--accent-blue-light)', fontWeight: 700 }}> {sessionData.jobRole}</span>
          </h3>

          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 32, fontSize: '0.95rem' }}>
            Your responses have been recorded and will be evaluated by the recruiter.
            You will be contacted shortly regarding the next steps in the hiring process.
          </p>

          {/* Summary stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 36 }}>
            {[
              { label: 'Questions Answered', value: sessionData.questions.filter(q => q.isAnswered).length },
              { label: 'Total Questions', value: sessionData.totalQuestions },
              { label: 'Status', value: '✓ Submitted', color: 'var(--accent-green)' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '16px 12px' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color: color || 'var(--accent-blue-light)' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* AI report summary (strengths/improvements — no score) */}
          {loadingReport && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <div className="spinner" style={{ width: 18, height: 18 }} /> Generating your session summary...
            </div>
          )}
          {finalReport && !loadingReport && (
            <div className="glass-card" style={{ padding: 28, marginBottom: 28, textAlign: 'left' }}>
              <h4 style={{ marginBottom: 16, fontSize: '1rem' }}>📋 Personal Session Summary</h4>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>
                {finalReport.overallSummary}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <h5 style={{ fontSize: '0.8rem', color: 'var(--accent-green)', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingUp size={14} /> Strengths
                  </h5>
                  <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                    {(finalReport.strengths || []).slice(0, 3).map((s, i) => (
                      <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>• {s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h5 style={{ fontSize: '0.8rem', color: '#fbbf24', textTransform: 'uppercase', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrendingDown size={14} /> Improvements
                  </h5>
                  <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>
                    {(finalReport.improvements || []).slice(0, 3).map((s, i) => (
                      <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>• {s}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-ghost" style={{ flex: 1, maxWidth: 200 }} onClick={() => navigate('/candidate/explore')}>
              Explore More
            </button>
            <button className="btn btn-primary" style={{ flex: 1, maxWidth: 200 }} onClick={() => navigate('/candidate')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active interview UI (identical to MockRoom layout) ───────────────────
  return (
    <div style={{ background: 'var(--bg-dark)', minHeight: '100vh', width: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 20 }}>
      <div style={{ maxWidth: 800, width: '100%' }}>

        {/* Floating camera (proctoring) */}
        <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 1000, background: 'rgba(0,0,0,0.8)', padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: 220, height: 140, borderRadius: 8, transform: 'scaleX(-1)', objectFit: 'cover', background: '#000' }} />
          <div style={{ fontSize: '0.75rem', color: proctorStatus.includes('Ready') ? 'var(--accent-green)' : 'var(--accent-blue)', marginTop: 8, textAlign: 'center', fontWeight: 'bold' }}>
            {proctorStatus}
          </div>
        </div>

        {/* Timer bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, gap: 20 }}>
          <div className="glass-card" style={{ padding: '16px 24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Clock size={20} color={timeLeft <= 30 ? '#ef4444' : 'var(--text-muted)'} style={{ marginRight: 12 }} />
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: timeLeft <= 30 ? '#ef4444' : 'white' }}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Warning counter */}
              <span style={{ fontSize: '0.75rem', color: warningCount > 5 ? '#ef4444' : '#fbbf24', fontWeight: 600 }}>
                ⚠ {warningCount.toFixed(0)}/10 warnings
              </span>
              {isRecording && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 8, textTransform: 'uppercase' }}>Volume</span>
                  {[...Array(5)].map((_, i) => {
                    const isActive = volLevel > (i * 10);
                    return <div key={i} style={{ width: 4, height: isActive ? 16 + (Math.random() * 8) : 4, background: isActive ? '#3b82f6' : 'rgba(255,255,255,0.2)', borderRadius: 2, transition: 'height 0.1s ease' }} />;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Question & Answer card */}
        {currentQuestion && (
          <div className="glass-card animate-fade" style={{ padding: 40, marginBottom: 30 }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              <Brain size={24} color="var(--accent-blue-light)" />
              <h2 style={{ fontSize: '1.4rem', lineHeight: 1.4, margin: 0 }}>{currentQuestion.text}</h2>
            </div>
            {asrStatus && (
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue-light)', marginBottom: 16 }}>
                ✦ {asrStatus}
              </div>
            )}

            {sessionStarted ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setIsManualMode(!isManualMode); if (isRecording) stopRecordingAndSubmit(); }}>
                    {isManualMode ? 'Voice Mode' : 'Manual Mode'}
                  </button>
                </div>

                <div style={{ minHeight: 180, background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
                  {isManualMode ? (
                    <textarea
                      style={{ width: '100%', minHeight: 130, background: 'transparent', border: 'none', color: 'white', outline: 'none', resize: 'vertical', fontSize: '1rem' }}
                      value={answerText}
                      onChange={e => setAnswerText(e.target.value)}
                      placeholder="Type your answer..."
                    />
                  ) : countdown !== null ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <h2 style={{ color: 'var(--accent-blue)', fontSize: '3rem', animation: 'pulse 1s infinite', margin: '0 0 16px 0' }}>
                        {countdown === 0 ? 'RECORDING!' : countdown}
                      </h2>
                      <p style={{ color: 'var(--text-muted)' }}>Get ready to speak...</p>
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: 'white', fontSize: '1.1rem' }}>
                      {finalizedText}{' '}
                      {interimText && <span style={{ opacity: 0.5 }}>{interimText}...</span>}
                      {!finalizedText && !interimText && 'Awaiting speech...'}
                    </p>
                  )}
                </div>

                {isSpeaking && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <button className="btn btn-outline btn-sm" onClick={handleStartRecordingClick}>
                      <ChevronsRight size={14} style={{ marginRight: 6 }} /> Skip AI Voice
                    </button>
                  </div>
                )}
                {!isSpeaking && countdown === null && !isRecording && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                    <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}
                      onClick={() => submitAnswer('Candidate chose to skip this question.')}>
                      Skip Question
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <h3 style={{ marginBottom: 24, fontSize: '1.2rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                  Initialize Interview
                </h3>
                <button
                  className={`btn ${proctorReady ? 'btn-primary' : 'btn-secondary'} btn-lg`}
                  onClick={handleStartSession}
                  disabled={!proctorReady}
                >
                  {proctorReady ? 'Enter Fullscreen & Start Session' : 'Loading Proctoring AI Models...'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submit controls */}
        {sessionStarted && (
          submitting ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, color: 'var(--accent-blue-light)' }}>
              <Loader2 className="spin" size={24} />
              <span style={{ fontWeight: 600 }}>Analyzing response and generating intelligent follow-up...</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              {isManualMode ? (
                <button className="btn btn-primary" onClick={() => submitAnswer(answerText)} disabled={!answerText.trim()}>
                  Submit Typed Answer
                </button>
              ) : !isRecording ? (
                countdown === null && !isSpeaking && (
                  <button className="btn btn-primary" onClick={handleStartRecordingClick}>
                    <Mic size={20} style={{ marginRight: 8 }} /> Force Start Recording
                  </button>
                )
              ) : (
                <button className="btn btn-danger" onClick={stopRecordingAndSubmit}>
                  <MicOff size={20} style={{ marginRight: 8 }} /> Finish & Submit
                </button>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
