import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Timer from '../components/Timer';
import QuestionCard from '../components/QuestionCard';
import MonitoringCamera from '../components/MonitoringCamera';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle2, AlertTriangle, ShieldCheck, PlayCircle } from 'lucide-react';

const ExamPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const examData = location.state?.examData;
    const classroomCode = location.state?.classroomCode;

    const [answers, setAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [violationCount, setViolationCount] = useState(0);
    const removeFocusListenerRef = useRef(null);
    const streamRef = useRef(null);
    const ignoreNextBlur = useRef(false);

    useEffect(() => {
        if (!examData) {
            navigate('/join');
            return;
        }

        // Pre-fetch camera stream to prevent reset during lock
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                streamRef.current = stream;
            })
            .catch(err => {
                console.error("Camera pre-fetch failed:", err);
            });

        // Cleanup on unmount
        return () => {
            if (removeFocusListenerRef.current) {
                removeFocusListenerRef.current();
            }
            if (window.electronAPI) {
                window.electronAPI.deactivateLock();
            }
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, [examData, navigate]);

    const handleStartExam = () => {
        ignoreNextBlur.current = true;
        setHasStarted(true);
        if (window.electronAPI) {
            window.electronAPI.activateLock();

            // Start monitoring focus loss
            removeFocusListenerRef.current = window.electronAPI.onFocusLost(() => {
                if (ignoreNextBlur.current) {
                    ignoreNextBlur.current = false;
                    return;
                }
                logViolation('Window Focus Lost');
            });

            // Just in case blur doesn't fire immediately, reset ignore flag after a short delay
            setTimeout(() => {
                ignoreNextBlur.current = false;
            }, 2000);
        }
    };

    const logViolation = async (type) => {
        try {
            setViolationCount(prev => prev + 1);
            await api.post('/monitor/log', {
                examId: examData.examId,
                type: type,
                timestamp: new Date().toISOString()
            });
            console.warn(`Violation Logged: ${type}`);
        } catch (err) {
            console.error('Failed to log violation', err);
        }
    };

    const handleSelectOption = (qIndex, oIndex) => {
        setAnswers(prev => ({ ...prev, [qIndex]: oIndex }));
    };

    const calculateScore = () => {
        let score = 0;
        examData.questions.forEach((q, index) => {
            if (answers[index] === q.correctOption) {
                score += 1;
            }
        });
        return score;
    };

    const handleSubmit = async () => {
        try {
            const score = calculateScore();
            await api.post('/exam/submit', {
                examId: examData.examId,
                answers,
                score
            });
            setIsSubmitted(true);

            if (window.electronAPI) {
                window.electronAPI.deactivateLock();
            }

            if (removeFocusListenerRef.current) {
                removeFocusListenerRef.current();
                removeFocusListenerRef.current = null;
            }
        } catch (err) {
            alert('Failed to submit exam');
        }
    };

    if (!examData) return null;

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 p-10 rounded-3xl text-center shadow-2xl border border-slate-700 max-w-lg w-full">
                    <div className="w-24 h-24 bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 size={50} className="text-green-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">Exam Submitted</h2>
                    <p className="text-slate-400 mb-8">Your exam has successfully been recorded and submitted. You may close the application now.</p>
                    <button
                        onClick={() => {
                            if (window.electronAPI) {
                                window.close();
                            } else {
                                navigate('/');
                            }
                        }}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-xl transition-colors"
                    >
                        Return to Home
                    </button>
                </div>
            </div>
        );
    }

    if (!hasStarted) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <div className="bg-slate-800 p-10 rounded-3xl text-center shadow-2xl border border-slate-700 max-w-lg w-full">
                    <div className="w-24 h-24 bg-blue-900/40 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldCheck size={50} className="text-blue-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2">{examData.title}</h2>
                    <p className="text-slate-400 mb-8">Click the button below to start your exam. This will activate strict monitoring mode.</p>

                    <div className="text-left bg-slate-900/50 p-6 rounded-2xl mb-8 border border-white/5">
                        <h4 className="text-white font-semibold mb-3">Security Rules:</h4>
                        <ul className="text-slate-400 text-sm space-y-2 list-disc pl-5">
                            <li>System will enter Fullscreen mode</li>
                            <li>External tabs and windows are blocked</li>
                            <li>Copy/Paste and DevTools are disabled</li>
                            <li>Losing window focus will be logged as a violation</li>
                        </ul>
                    </div>

                    <button
                        onClick={handleStartExam}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-xl transition-all shadow-lg shadow-blue-600/20 transform active:scale-95 flex items-center justify-center space-x-2"
                    >
                        <PlayCircle size={24} />
                        <span>Start Exam</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-slate-900 overflow-hidden">
            {/* Left Column: Exam Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                <div className="bg-slate-800 shadow-md p-4 border-b border-slate-700 flex justify-between items-center shrink-0 header-glass">
                    <div className="flex items-center space-x-4">
                        <div className="bg-indigo-600/20 p-2 rounded-lg text-indigo-400">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">{examData.title}</h1>
                            <p className="text-sm text-slate-400">Classroom: <span className="font-mono text-blue-400">{classroomCode}</span></p>
                        </div>
                    </div>
                    <Timer durationMinutes={examData.duration} onTimeUp={handleSubmit} />
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <div className="max-w-3xl mx-auto pb-32">
                        {examData.questions.map((q, index) => (
                            <QuestionCard
                                key={index}
                                question={q}
                                index={index}
                                selectedOption={answers[index]}
                                onSelectOption={handleSelectOption}
                            />
                        ))}
                    </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 bg-slate-800/95 backdrop-blur border-t border-slate-700 p-4 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
                    <div className="max-w-3xl mx-auto flex justify-between items-center">
                        <div className="text-slate-400 text-sm">
                            Answered: <span className="text-white font-bold">{Object.keys(answers).length}</span> / {examData.questions.length} | Violations: <span className="text-red-400">{violationCount}</span>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm("Are you sure you want to submit? This action is final.")) {
                                    handleSubmit();
                                }
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all transform active:scale-95"
                        >
                            Submit Exam
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Column: Monitoring Sidebar */}
            <div className="w-80 bg-slate-900 border-l border-slate-800 h-full flex flex-col shrink-0 shadow-2xl relative z-10">
                <div className="p-4 border-b border-slate-800/50 bg-slate-900/50">
                    <h2 className="text-lg font-bold text-slate-200">Security Suite</h2>
                    <p className="text-xs text-slate-500 mt-1 flex items-center"><AlertTriangle size={12} className="mr-1 text-yellow-500" /> Activity is recorded</p>
                </div>

                <div className="p-4 flex-1 overflow-visible">
                    <MonitoringCamera examId={examData.examId} stream={streamRef.current} />

                    <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <h3 className="text-sm font-semibold text-slate-300 mb-2">Instructions</h3>
                        <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4 marker:text-blue-500">
                            <li>Keep your face visible at all times</li>
                            <li>Ensure adequate lighting</li>
                            <li>Do not look away from the screen for extended periods</li>
                            <li>Do not resize or minimize this window</li>
                        </ul>
                    </div>

                    {violationCount > 0 && (
                        <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                            <p className="text-xs text-red-400 font-medium flex items-center italic">
                                <AlertTriangle size={14} className="mr-2" /> {violationCount} Security alerts logged
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExamPage;
