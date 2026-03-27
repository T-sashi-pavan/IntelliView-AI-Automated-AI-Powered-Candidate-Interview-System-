import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { io } from 'socket.io-client';
import { 
  Mic, MicOff, Brain, Clock, HelpCircle, CheckCircle, 
  TrendingUp, TrendingDown, Target, Info, ChevronRight,
  MessageSquare, Sparkles, AlertCircle, Loader2, ChevronsRight, SkipForward
} from 'lucide-react';
import toast from 'react-hot-toast';
import { ProctoringEngine } from '../../services/proctoring';

export default function MockRoom() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  
  // Essential Interview UI States
  const [sessionStarted, setSessionStarted] = useState(false); // Renamed from hasStarted to avoid scope issues
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

  // Proctoring Abortion Threshold
  useEffect(() => {
    if (warningCount >= 10 && !completed && !malpractice) {
      setMalpractice(true);
      setCompleted(true);
      if (proctorRef.current) proctorRef.current.stop();
      if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      document.body.classList.remove('fullscreen-interview');
      if (document.fullscreenElement) document.exitFullscreen().catch(e => console.warn(e));
      
      fetchFinalReport(Math.floor(warningCount)); 
      toast.error("INTERVIEW ABORTED: Security violations exceeded limit.", { duration: 10000 });
    }
  }, [warningCount, completed, malpractice]);

  // Clean camera track natively when finished gracefully
  useEffect(() => {
     if (completed && videoRef.current?.srcObject) {
         videoRef.current.srcObject.getTracks().forEach(t => t.stop());
     }
  }, [completed]);

  // Auto-submit effect
  useEffect(() => {
    if (autoSubmitText) {
      submitAnswer(autoSubmitText);
      setAutoSubmitText('');
    }
  }, [autoSubmitText]);

  // Audio Volume Polling Loop
  useEffect(() => {
    let animId;
    if (isRecording) {
      const pollVolume = () => {
        if (proctorRef.current) setVolLevel(proctorRef.current.getCurrentVolume());
        animId = requestAnimationFrame(pollVolume);
      };
      pollVolume();
    } else {
      setVolLevel(0);
    }
    return () => cancelAnimationFrame(animId);
  }, [isRecording]);

  // Countdown timer for Mic start
  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      startRecording();
      setCountdown(null);
    }
  }, [countdown]);

  // Socket setup
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
      
      // Auto-submit via state to avoid closure issues
      setTimeout(() => {
          if (data.text.trim()) setAutoSubmitText(data.text);
      }, 1500);
    });

    socketRef.current.on('asr_status', (data) => {
      setAsrStatus(data.message);
    });

    socketRef.current.on('asr_error', (data) => {
      toast.error(data.message);
    });

    return () => {
      document.body.classList.remove('fullscreen-interview');
      if (socketRef.current) socketRef.current.disconnect();
      if (proctorRef.current) proctorRef.current.stop();
      if (videoRef.current?.srcObject) {
         videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Auto-Initialize Camera and Proctoring AI on mount
  useEffect(() => {
    let mounted = true;
    const initCameraAndProctor = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { channelCount: 1, sampleRate: 16000 } });
        if (!mounted) return;
        
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
        }

        if (!proctorRef.current) {
            proctorRef.current = new ProctoringEngine(videoRef.current, (event, score) => {
                const isHigh = event.riskLevel === 'High';
                toast.error(`${isHigh ? 'SECURITY' : 'Warning'}: ${event.message}`, { duration: 5000 });
                setAbortionReason(`Terminated due to: ${event.message}`);
                setWarningCount(prev => prev + (isHigh ? 1 : 0.5)); 
            }, setProctorStatus);
            
            await proctorRef.current.initialize();
            if (mounted) setProctorReady(true);
        }
      } catch (err) {
        toast.error('Camera permissions are required for the AI assessment! Please allow access and refresh the page.', { duration: 10000 });
      }
    };

    initCameraAndProctor();
    return () => { 
       mounted = false; 
       if (videoRef.current?.srcObject) {
           videoRef.current.srcObject.getTracks().forEach(t => t.stop());
       }
    };
  }, []);

  const handleStartSession = async () => {
    if (!proctorReady) {
      toast.error('Please wait for the AI Models to finish loading.');
      return;
    }
    
    try {
        // Synchronous fullscreen request tied directly to the user's click
        if (document.documentElement.requestFullscreen) {
            await document.documentElement.requestFullscreen().catch(e => console.warn(e));
        }
        
        // Hide standard Nav/Sidebars natively via CSS
        document.body.classList.add('fullscreen-interview');

        proctorRef.current.start();
        setSessionStarted(true);
    } catch (err) {
      toast.error('Fullscreen permissions are required for proctoring.');
    }
  };

  // Tab Switch Detection (Anti-Malpractice)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && !completed && !malpractice) {
        setAbortionReason('Terminated due to continuously navigating away from the interview tab.');
        setWarningCount(prev => {
          const next = prev + 1;
          if (next >= 10) {
            setMalpractice(true);
            setCompleted(true);
            fetchFinalReport(next); 
            toast.error("INTERVIEW ABORTED: Security violation (Multiple tab switches).", { duration: 10000 });
            return next;
          }
          toast.error(`WARNING (${next}/10): Tab switching leads to negative marks & abortion!`, { duration: 5000, icon: '⚠️' });
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [completed, malpractice]);

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  const fetchSession = async () => {
    try {
      const DJANGO_URL = import.meta.env.VITE_DJANGO_URL || 'http://localhost:8001';
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
    } catch (err) {
      toast.error('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const fetchFinalReport = async (warnings = 0) => {
    setLoadingReport(true);
    try {
      const DJANGO_URL = import.meta.env.VITE_DJANGO_URL || 'http://localhost:8001';
      const res = await window.fetch(`${DJANGO_URL}/api/mock/session/${sessionId}/feedback/?warnings=${warnings}`);
      const data = await res.json();
      setFinalReport(data);
    } catch (err) {
      console.error('Report error:', err);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    if (currentQuestion && sessionStarted && document.fullscreenElement && !completed && !malpractice) {
      setIsSpeaking(true);
      const timer = setTimeout(() => speakText(currentQuestion.text), 500);
      setTimeLeft(sessionData?.timeLimit || 180); 
      return () => { clearTimeout(timer); synthRef.current.cancel(); setIsSpeaking(false); }
    }
  }, [currentQuestion, sessionStarted, completed, malpractice]);

  useEffect(() => {
    let timer;
    if (sessionStarted && timeLeft > 0 && !completed && !malpractice && !submitting && countdown === null && !isSpeaking) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0 && sessionStarted && !completed && !submitting) {
      if (isRecording) {
        stopRecordingAndSubmit();
      } else {
        submitAnswer(answerText || finalizedText);
      }
    }
    return () => clearInterval(timer);
  }, [sessionStarted, isRecording, timeLeft, completed, malpractice, submitting, countdown, isSpeaking]);

  const speakText = async (text) => {
    synthRef.current.cancel();

    let cleanText = text
      .replace(/\bMERN\b/g, 'Mearn')
      .replace(/\bAI\b/g, 'A.I.')
      .replace(/\bIO\b/gi, 'I.O.')
      .replace(/SOCKET IO/gi, 'Socket I.O.');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const voices = synthRef.current.getVoices();
    
    // Priority: Indian Female -> UK Female -> Any Female -> Fallback
    const sweetVoice = voices.find(v => v.lang.includes('en-IN') && v.name.includes('Female')) ||
                       voices.find(v => v.name.includes('Heera')) ||
                       voices.find(v => v.name.includes('Veena')) ||
                       voices.find(v => v.lang.includes('en-IN')) ||
                       voices.find(v => v.name.includes('Google UK English Female')) ||
                       voices.find(v => (v.name.includes('Aria') || v.name.includes('Samantha')) && v.lang.includes('en'));
                       
    if (sweetVoice) utterance.voice = sweetVoice;
    utterance.volume = 0.8; 
    utterance.rate = 1.15; // Increased speed
    utterance.pitch = 1.05; 
    
    // Auto-trigger recording countdown once she finishes speaking
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
      setAsrStatus('Listening - Deepgram Active');
    } catch (err) {
      toast.error('Could not access microphone');
    }
  };

  const stopRecordingAndSubmit = async () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      socketRef.current.emit('stop_asr');
      setIsRecording(false);
      setAsrStatus('Processing final pass...');
      setSubmitting(true);
    }
  };

  const submitAnswer = async (answer) => {
    if (malpractice || !answer || !answer.trim()) return;
    setSubmitting(true);
    try {
      const DJANGO_URL = import.meta.env.VITE_DJANGO_URL || 'http://localhost:8001';
      const res = await window.fetch(`${DJANGO_URL}/api/mock/session/${sessionId}/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          questionId: currentQuestion.id, 
          answerText: answer.trim(),
          warnings: warningCount
        })
      });
      const data = await res.json();
      
      // Clear inputs
      setAnswerText('');
      setFinalizedText('');
      setInterimText('');
      
      if (data.completed) {
        setCompleted(true);
        if (proctorRef.current) proctorRef.current.stop();
        document.body.classList.remove('fullscreen-interview');
        if (document.fullscreenElement) document.exitFullscreen().catch(e => console.warn(e));
        fetchFinalReport(Math.floor(warningCount));
      }
      
      // Always fetch session to update feedback history and queue next question
      fetchSession(); 

    } catch (err) {
      toast.error('Submission failed. Check your connection.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex-center p-100"><div className="spinner"></div></div>;

  if (completed && sessionData) {
    return (
      <DashboardLayout role="candidate" title={malpractice ? "Interview Aborted" : "Performance Report"} subtitle={`Session ID: ${sessionId}`}>
        <div className="dashboard-page animate-fade" style={{ maxWidth: 900 }}>
           {malpractice && (
            <div className="glass-card" style={{ padding: 30, border: '2px solid #ef4444', background: 'rgba(239,68,68,0.1)', marginBottom: 32, textAlign: 'center' }}>
               <AlertCircle size={48} color="#ef4444" style={{ margin: '0 auto 16px' }} />
               <h2 style={{ color: '#ef4444', margin: 0 }}>SECURITY ABORTION</h2>
               <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)' }}>{abortionReason}</p>
            </div>
          )}

          <div className="glass-card" style={{ padding: 40, marginBottom: 32, border: malpractice ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(16,185,129,0.2)' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
              {malpractice ? <AlertCircle size={28} color="#ef4444" /> : <CheckCircle size={28} color="var(--accent-green)" />}
              {malpractice ? "Aborted Summary" : "Session Outcome"}
            </h2>
            {loadingReport ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }}></div></div>
            ) : finalReport && (
              <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center', minWidth: 150, padding: 24, borderRadius: 16, background: 'rgba(0,0,0,0.2)' }}>
                  <div style={{ fontSize: '3.5rem', fontWeight: 800, color: malpractice ? '#ef4444' : 'var(--accent-green)', lineHeight: 1 }}>{finalReport.finalScore}<span style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>/10</span></div>
                  {warningCount > 0 && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 8 }}>-{warningCount} PTS ({abortionReason.replace('Terminated due to: ', '')})</div>}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: 8, color: 'var(--text-primary)', textTransform: 'uppercase' }}>Conclusion</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{finalReport.overallSummary}</p>
                </div>
              </div>
            )}
          </div>

          <div className="grid-2" style={{ marginBottom: 40 }}>
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><TrendingUp size={18} /> Strengths</h3>
              <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>{finalReport?.strengths.map((s, i) => <li key={i} style={{ marginBottom: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>• {s}</li>)}</ul>
            </div>
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '1rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}><TrendingDown size={18} /> Improvements</h3>
              <ul style={{ padding: 0, margin: 0, listStyle: 'none' }}>{finalReport?.improvements.map((s, i) => <li key={i} style={{ marginBottom: 10, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>• {s}</li>)}</ul>
            </div>
          </div>

          <h3 style={{ marginBottom: 24, fontSize: '1.2rem' }}>Response History</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 40 }}>
            {sessionData.questions.filter(q => q.isAnswered).map((q, idx) => (
              <div key={idx} className="glass-card" style={{ padding: 30 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Adaptive Question {q.order}</span>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-blue-light)' }}>{q.score}/10</div>
                </div>
                <h4 style={{ fontSize: '1.1rem', marginBottom: 20 }}>{q.text}</h4>
                <div style={{ padding: 16, background: 'rgba(0,0,0,0.2)', borderRadius: 12, marginBottom: 16 }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>Your Answer:</p>
                  <p style={{ fontSize: '0.95rem' }}>{q.answer}</p>
                </div>
                <div style={{ borderLeft: '2px solid var(--accent-blue)', paddingLeft: 16 }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 4 }}>AI Feedback:</p>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{q.feedback}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', padding: '40px 0' }}><button className="btn btn-primary btn-lg" onClick={() => navigate('/candidate')}>Close Assessment</button></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="candidate" title="AI Assessment" subtitle={`Question ${currentQuestion?.order || 1}`}>
      <div id="mock-room-container" style={{ background: 'var(--bg-dark)', minHeight: '100%', padding: '20px', width: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="dashboard-page" style={{ maxWidth: 800, width: '100%' }}>
        
        {/* Floating Proctoring Video */}
        <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 1000, background: 'rgba(0,0,0,0.8)', padding: 12, borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)' }}>
          <video ref={videoRef} autoPlay muted playsInline style={{ width: 220, height: 140, borderRadius: 8, transform: 'scaleX(-1)', objectFit: 'cover', background: '#000' }} />
          <div style={{ fontSize: '0.75rem', color: proctorStatus.includes('Ready') ? 'var(--accent-green)' : 'var(--accent-blue)', marginTop: 8, textAlign: 'center', fontWeight: 'bold' }}>
            {proctorStatus}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 30, gap: 20 }}>
          
          <div className="glass-card" style={{ padding: '16px 24px', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <div style={{ display: 'flex', alignItems: 'center' }}>
               <Clock size={20} color={timeLeft <= 30 ? '#ef4444' : 'var(--text-muted)'} style={{ marginRight: 12 }} />
               <span style={{ fontSize: '1.1rem', fontWeight: 700, color: timeLeft <= 30 ? '#ef4444' : 'white' }}>{Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</span>
             </div>
             
             {isRecording && (
               <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                 <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 8, textTransform: 'uppercase' }}>Volume</span>
                 {[...Array(5)].map((_, i) => {
                    const isActive = volLevel > (i * 10);
                    return (
                      <div 
                        key={i} 
                        style={{ 
                          width: 4, height: isActive ? 16 + (Math.random() * 8) : 4, 
                          background: isActive ? '#3b82f6' : 'rgba(255,255,255,0.2)', 
                          borderRadius: 2, transition: 'height 0.1s ease' 
                        }} 
                      />
                    );
                 })}
               </div>
             )}
          </div>
        </div>

        {currentQuestion && (
          <div className="glass-card animate-fade" style={{ padding: 40, marginBottom: 30 }}>
            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
              <Brain size={24} color="var(--accent-blue-light)" />
              <h2 style={{ fontSize: '1.4rem', lineHeight: 1.4, margin: 0 }}>{currentQuestion.text}</h2>
            </div>
            {asrStatus && <div style={{ fontSize: '0.8rem', color: 'var(--accent-blue-light)', marginBottom: 16 }}><Sparkles size={14} /> {asrStatus}</div>}

            {sessionStarted ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                   <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setIsManualMode(!isManualMode); if (isRecording) stopRecordingAndSubmit(); }}>
                     {isManualMode ? "Voice Mode" : "Manual Mode"}
                   </button>
                </div>
                <div style={{ minHeight: 180, background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
                  {isManualMode ? (
                    <textarea className="w-full h-130 bg-transparent border-none white" value={answerText} onChange={(e) => setAnswerText(e.target.value)} placeholder="Type your answer..." />
                  ) : countdown !== null ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                         <h2 style={{ color: 'var(--accent-blue)', fontSize: '3rem', animation: 'pulse 1s infinite', margin: '0 0 16px 0' }}>{countdown === 0 ? "RECORDING!" : countdown}</h2>
                         <p style={{ color: 'var(--text-muted)' }}>Get ready to speak...</p>
                    </div>
                  ) : (
                    <p className="white text-1.1" style={{ margin: 0 }}>
                      {finalizedText} {interimText && <span style={{ opacity: 0.5 }}>{interimText}...</span>}
                      {!finalizedText && !interimText && "Awaiting speech..."}
                    </p>
                  )}
                </div>

                {isSpeaking && (
                   <div className="flex-center" style={{ marginBottom: 24 }}>
                      <button className="btn btn-outline btn-sm" onClick={handleStartRecordingClick}>
                         <ChevronsRight size={14} style={{ marginRight: 6 }} /> Skip AI Voice
                      </button>
                   </div>
                )}
                
                {!isSpeaking && countdown === null && !isRecording && (
                   <div className="flex-center" style={{ marginBottom: 24 }}>
                      <button className="btn btn-outline btn-sm" style={{ borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }} onClick={() => submitAnswer("Candidate chose to skip this question.")}>
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
                   {proctorReady ? "Enter Fullscreen & Start Session" : "Loading Proctoring AI Models..."}
                 </button>
               </div>
            )}
          </div>
        )}

        {sessionStarted && (
          submitting ? (
             <div className="flex-center" style={{ gap: 16, color: 'var(--accent-blue-light)' }}>
                <Loader2 className="spin" size={24} /> 
                <span style={{ fontWeight: 600 }}>Analyzing response and generating intelligent follow-up...</span>
             </div>
          ) : (
            <div className="flex-center gap-16">
              {isManualMode ? (
                <button className="btn btn-primary" onClick={() => submitAnswer(answerText)} disabled={!answerText.trim()}>Submit Typed Answer</button>
              ) : (
                !isRecording ? (
                  countdown === null && !isSpeaking && <button className="btn btn-primary" onClick={handleStartRecordingClick}><Mic size={20} /> Force Start Recording</button>
                ) : (
                  <button className="btn btn-danger" onClick={stopRecordingAndSubmit}><MicOff size={20} /> Finish & Submit</button>
                )
              )}
            </div>
          )
        )}
        </div>
      </div>
    </DashboardLayout>
  );
}
