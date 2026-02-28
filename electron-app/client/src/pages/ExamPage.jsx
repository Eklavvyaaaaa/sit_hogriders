import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Timer from '../components/Timer';
import QuestionCard from '../components/QuestionCard';
import MonitoringCamera from '../components/MonitoringCamera';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle2, ShieldCheck, PlayCircle, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import ChatBox from '../components/ChatBox';

import { useWebRTC } from '../context/WebRTCContext';
import { useToast } from '../hooks/useToast';
import ToastOverlay from '../components/ToastOverlay';

const ExamPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const { registerLocalStream, unregisterLocalStream } = useWebRTC();

    const examData = location.state?.examData;
    const classroomCode = location.state?.classroomCode;

    const [answers, setAnswers] = useState({});
    const [textAnswers, setTextAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submissionId, setSubmissionId] = useState(null);
    const [hasStarted, setHasStarted] = useState(false);
    const [violationCount, setViolationCount] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const removeFocusListenerRef = useRef(null);
    const streamRef = useRef(null);
    const ignoreNextBlur = useRef(false);
    const { toasts, addToast, removeToast } = useToast();

    // Confirm modal state
    const [confirmModal, setConfirmModal] = useState(null);

    useEffect(() => {
        if (!examData) {
            navigate('/join');
            return;
        }

        // Camera pre-fetch and register to global WebRTC Context
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then(stream => {
                streamRef.current = stream;
                registerLocalStream(stream);
            })
            .catch(err => {
                console.error("Camera pre-fetch failed:", err);
            });

        return () => {
            if (removeFocusListenerRef.current) removeFocusListenerRef.current();
            if (window.electronAPI) window.electronAPI.deactivateLock();

            unregisterLocalStream();
        };
    }, [examData, navigate, registerLocalStream, unregisterLocalStream]);


    const handleStartExam = () => {
        ignoreNextBlur.current = true;
        setHasStarted(true);
        if (window.electronAPI) {
            window.electronAPI.activateLock();
            removeFocusListenerRef.current = window.electronAPI.onFocusLost(() => {
                if (ignoreNextBlur.current) { ignoreNextBlur.current = false; return; }
                logViolation('Window Focus Lost');
            });
            setTimeout(() => { ignoreNextBlur.current = false; }, 2000);
        }
    };

    const logViolation = async (type) => {
        try {
            setViolationCount(prev => prev + 1);
            await api.post('/monitor/log', {
                examId: examData.examId,
                eventType: type,
                severity: 'medium',
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error('Failed to log violation', err);
        }
    };

    const handleSelectOption = (qIndex, oIndex) => {
        setAnswers(prev => ({ ...prev, [qIndex]: oIndex }));
    };

    const handleTextAnswer = (qIndex, text) => {
        setTextAnswers(prev => ({ ...prev, [qIndex]: text }));
    };

    const calculateScore = () => {
        let score = 0;
        examData.questions.forEach((q, index) => {
            if (q.type !== 'subjective' && answers[index] === q.correctOption) score += 1;
        });
        return score;
    };

    const getAnsweredCount = () => {
        let count = 0;
        examData.questions.forEach((q, index) => {
            if (q.type === 'subjective') {
                if (textAnswers[index] && textAnswers[index].trim()) count++;
            } else {
                if (answers[index] !== undefined) count++;
            }
        });
        return count;
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            const score = calculateScore();
            const combinedAnswers = {};
            examData.questions.forEach((q, index) => {
                if (q.type === 'subjective') {
                    combinedAnswers[index] = { type: 'subjective', text: textAnswers[index] || '' };
                } else {
                    combinedAnswers[index] = { type: 'mcq', selected: answers[index] };
                }
            });
            const res = await api.post('/exam/submit', { examId: examData.examId, answers: combinedAnswers, score });
            setSubmissionId(res.data?.submissionId || null);
            setIsSubmitted(true);
            if (streamRef.current) { streamRef.current.getTracks().forEach(t => { t.stop(); }); streamRef.current = null; }
            if (window.electronAPI) window.electronAPI.deactivateLock();
            if (removeFocusListenerRef.current) removeFocusListenerRef.current();
        } catch (err) {
            addToast('Failed to submit exam', 'error');
            setIsSubmitting(false);
        }
    };



    if (!examData) return null;

    if (isSubmitted) {
        return (
            <div style={{ backgroundColor: 'var(--bg-primary)' }} className="min-h-screen flex items-center justify-center p-4 font-inter">
                <ToastOverlay toasts={toasts} removeToast={removeToast} />
                <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="p-12 rounded-xl text-center shadow-sm border max-w-lg w-full">
                    <div style={{ backgroundColor: 'var(--success-light)' }} className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 size={40} style={{ color: 'var(--success-color)' }} />
                    </div>
                    <h2 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold mb-4">Assessment Complete</h2>
                    <p style={{ color: 'var(--text-secondary)' }} className="mb-10 leading-relaxed font-medium text-sm">Your responses have been successfully recorded and graded.</p>
                    <button onClick={() => submissionId ? navigate(`/results/${submissionId}`) : navigate('/history')} className="btn btn-primary w-full py-3">
                        View Results
                    </button>
                    <button onClick={() => navigate('/join')} style={{ color: 'var(--text-secondary)' }} className="mt-3 w-full py-2 text-sm font-medium hover:opacity-80 transition-opacity">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!hasStarted) {
        return (
            <div style={{ backgroundColor: 'var(--bg-primary)' }} className="min-h-screen flex items-center justify-center p-4 font-inter">
                <ToastOverlay toasts={toasts} removeToast={removeToast} />
                <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="p-12 rounded-xl text-center shadow-sm border max-w-lg w-full">
                    <div style={{ backgroundColor: 'var(--accent-color)' }} className="p-4 rounded-xl text-white w-fit mx-auto mb-8 shadow-sm">
                        <ShieldCheck size={36} />
                    </div>
                    <h2 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold mb-2">{examData.title}</h2>
                    <p style={{ color: 'var(--text-secondary)' }} className="mb-10 font-medium text-sm">Ready to begin your secure assessment?</p>

                    <div style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }} className="text-left p-6 rounded-xl mb-10 border">
                        <h4 style={{ color: 'var(--text-primary)' }} className="font-semibold mb-4 flex items-center text-sm uppercase tracking-wider">
                            <Info size={16} className="mr-2" style={{ color: 'var(--accent-color)' }} />
                            Security Protocol
                        </h4>
                        <ul style={{ color: 'var(--text-secondary)' }} className="text-sm space-y-3 font-medium">
                            <li className="flex items-start"><ChevronRight size={14} className="mr-2 mt-1 shrink-0" style={{ color: 'var(--accent-color)' }} /> Fullscreen mode will be activated</li>
                            <li className="flex items-start"><ChevronRight size={14} className="mr-2 mt-1 shrink-0" style={{ color: 'var(--accent-color)' }} /> Background applications will be hindered</li>
                            <li className="flex items-start"><ChevronRight size={14} className="mr-2 mt-1 shrink-0" style={{ color: 'var(--accent-color)' }} /> Copy/paste and system shortcuts disabled</li>
                        </ul>
                    </div>

                    <button onClick={handleStartExam} className="btn btn-primary w-full py-4 text-base">
                        <PlayCircle size={22} />
                        <span>Start Assessment</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} className="flex flex-col h-screen font-inter">
            <ToastOverlay toasts={toasts} removeToast={removeToast} />

            {/* Top Bar */}
            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="px-8 py-4 flex justify-between items-center shadow-sm border-b shrink-0">
                <div className="flex items-center space-x-4">
                    <h1 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold">{examData.title}</h1>
                    <span style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)' }} className="text-xs px-3 py-1 rounded-full font-semibold uppercase tracking-wider">Assessment In Progress</span>
                </div>
                <div className="flex items-center space-x-8">
                    <div style={{ color: 'var(--text-primary)' }} className="flex items-center space-x-3 font-bold text-2xl">
                        <Timer durationMinutes={examData.duration} onTimeUp={handleSubmit} />
                    </div>
                    <div style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent-color)' }} className="flex items-center px-4 py-2 border rounded-lg">
                        <span style={{ color: 'var(--accent-color)' }} className="text-xs font-semibold uppercase tracking-widest mr-2">Answered</span>
                        <span style={{ color: 'var(--accent-color)' }} className="font-bold">{getAnsweredCount()} / {examData.questions.length}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center">
                    <div className="max-w-3xl w-full pb-32">
                        {examData?.questions && examData.questions.length > 0 && currentIndex >= 0 && currentIndex < examData.questions.length ? (
                            <QuestionCard
                                question={examData.questions[currentIndex]}
                                index={currentIndex}
                                selectedOption={answers[currentIndex]}
                                onSelectOption={handleSelectOption}
                                textAnswer={textAnswers[currentIndex]}
                                onTextAnswer={handleTextAnswer}
                            />
                        ) : (
                            <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>No question available.</div>
                        )}

                        <div className="flex justify-between mt-8">
                            <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(prev => prev - 1)} className="btn btn-ghost">
                                <ChevronLeft size={18} /><span>Previous</span>
                            </button>

                            {currentIndex < examData.questions.length - 1 ? (
                                <button onClick={() => setCurrentIndex(prev => prev + 1)} className="btn btn-primary">
                                    <span>Next Question</span><ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setConfirmModal({
                                        title: 'Submit Assessment',
                                        message: 'Submit your answers? This action is final.',
                                        onConfirm: () => { setConfirmModal(null); handleSubmit(); }
                                    })}
                                    disabled={isSubmitting}
                                    className={`btn ${isSubmitting ? 'btn-ghost' : 'btn-primary'}`}
                                    style={!isSubmitting ? { backgroundColor: 'var(--success-color)' } : {}}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Finish Assessment'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Monitoring */}
                <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="w-80 border-l flex flex-col shrink-0 overflow-hidden shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                    <div style={{ borderColor: 'var(--border-color)' }} className="p-6 border-b">
                        <h2 style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold uppercase tracking-widest flex items-center">
                            <span style={{ backgroundColor: 'var(--accent-color)' }} className="w-2 h-2 rounded-full mr-3 animate-pulse"></span>
                            Live Monitoring
                        </h2>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-8">
                        <div style={{ borderColor: 'var(--border-color)' }} className="rounded-xl border-2 overflow-hidden shadow-sm">
                            <MonitoringCamera examId={examData.examId} stream={streamRef.current} />
                        </div>

                        <div className="space-y-4">
                            <h3 style={{ color: 'var(--text-muted)' }} className="text-xs font-semibold uppercase tracking-widest">Security Status</h3>
                            <div className="space-y-3">
                                <div style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }} className="flex justify-between items-center p-3 rounded-lg border">
                                    <span style={{ color: 'var(--text-secondary)' }} className="text-xs font-semibold">Violations</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${violationCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {violationCount}
                                    </span>
                                </div>
                                <div style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }} className="flex justify-between items-center p-3 rounded-lg border">
                                    <span style={{ color: 'var(--text-secondary)' }} className="text-xs font-semibold">Window Focus</span>
                                    <span style={{ color: 'var(--success-color)' }} className="text-[10px] font-bold uppercase tracking-tighter">Locked</span>
                                </div>
                            </div>
                        </div>

                        <div style={{ backgroundColor: 'var(--accent-light)', borderColor: 'var(--accent-color)' }} className="p-5 border rounded-xl">
                            <h4 style={{ color: 'var(--text-primary)' }} className="text-xs font-semibold mb-2 uppercase tracking-tight">Requirement</h4>
                            <p style={{ color: 'var(--text-secondary)' }} className="text-[11px] leading-relaxed font-medium">Keep your face within range of the camera. Lighting must be adequate.</p>
                        </div>
                    </div>

                    <div style={{ backgroundColor: 'var(--nav-bg)' }} className="p-4 text-white shrink-0">
                        <h3 style={{ color: 'var(--nav-text-muted)' }} className="text-xs font-semibold mb-2">Instructions</h3>
                        <ul className="text-[10px] space-y-1 opacity-70 list-disc pl-3">
                            <li>Face must be visible</li>
                            <li>Adequate lighting</li>
                            <li>Do not look away</li>
                        </ul>
                    </div>
                </div>
            </div>

            <ChatBox examId={examData.examId} />

            {/* Warning Bar */}
            <div style={{ backgroundColor: 'var(--accent-color)' }} className="text-white px-8 py-2.5 text-center text-xs font-semibold tracking-wide italic">
                Notice: Switching tabs, windows, or using shortcuts is strictly prohibited and logged in real-time.
            </div>



            {/* Confirm Modal */}
            {confirmModal && (
                <div style={{ backgroundColor: 'var(--modal-overlay)' }} className="fixed inset-0 flex items-center justify-center z-[100]" onClick={() => setConfirmModal(null)}>
                    <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl p-6 shadow-2xl w-full max-w-sm mx-4 border" onClick={e => e.stopPropagation()}>
                        <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-2">{confirmModal.title}</h3>
                        <p style={{ color: 'var(--text-secondary)' }} className="text-sm mb-6">{confirmModal.message}</p>
                        <div className="flex space-x-3">
                            <button onClick={() => setConfirmModal(null)} className="btn btn-ghost flex-1">Cancel</button>
                            <button onClick={confirmModal.onConfirm} className="btn btn-primary flex-1">Confirm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExamPage;
