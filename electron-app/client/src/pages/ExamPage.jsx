import React, { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Timer from '../components/Timer';
import QuestionCard from '../components/QuestionCard';
import MonitoringCamera from '../components/MonitoringCamera';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle2, ShieldCheck, PlayCircle, LogIn, ChevronLeft, ChevronRight, Info } from 'lucide-react';

const ExamPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const examData = location.state?.examData;
    const classroomCode = location.state?.classroomCode;

    const [answers, setAnswers] = useState({});
    const [textAnswers, setTextAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);
    const [violationCount, setViolationCount] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const removeFocusListenerRef = useRef(null);
    const streamRef = useRef(null);
    const ignoreNextBlur = useRef(false);

    useEffect(() => {
        if (!examData) {
            navigate('/join');
            return;
        }

        // Camera pre-fetch from remote logic
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(stream => {
                streamRef.current = stream;
            })
            .catch(err => {
                console.error("Camera pre-fetch failed:", err);
            });
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

            removeFocusListenerRef.current = window.electronAPI.onFocusLost(() => {
                if (ignoreNextBlur.current) {
                    ignoreNextBlur.current = false;
                    return;
                }
                logViolation('Window Focus Lost');
            });

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
            if (q.type !== 'subjective' && answers[index] === q.correctOption) {
                score += 1;
            }
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

            // Build combined answers object with both MCQ choices and text answers
            const combinedAnswers = {};
            examData.questions.forEach((q, index) => {
                if (q.type === 'subjective') {
                    combinedAnswers[index] = { type: 'subjective', text: textAnswers[index] || '' };
                } else {
                    combinedAnswers[index] = { type: 'mcq', selected: answers[index] };
                }
            });

            await api.post('/exam/submit', {
                examId: examData.examId,
                answers: combinedAnswers,
                score
            });
            setIsSubmitted(true);
            if (window.electronAPI) window.electronAPI.deactivateLock();
            if (removeFocusListenerRef.current) removeFocusListenerRef.current();
        } catch (err) {
            alert('Failed to submit exam');
            setIsSubmitting(false);
        }
    };

    if (!examData) return null;

    if (isSubmitted) {
        return (
            <div className="min-h-screen bg-[#f0f7ff] flex items-center justify-center p-4 font-inter">
                <div className="bg-white p-12 rounded-2xl text-center shadow-xl border border-slate-100 max-w-lg w-full">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle2 size={40} className="text-green-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-4">Assessment Complete</h2>
                    <p className="text-slate-500 mb-10 leading-relaxed font-medium">Your responses have been successfully recorded. Results will be released by your instructor.</p>
                    <button
                        onClick={() => window.electronAPI ? window.close() : navigate('/')}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-slate-200"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    if (!hasStarted) {
        return (
            <div className="min-h-screen bg-[#f0f7ff] flex items-center justify-center p-4 font-inter">
                <div className="bg-white p-12 rounded-2xl text-center shadow-xl border border-slate-100 max-w-lg w-full">
                    <div className="bg-blue-600 p-4 rounded-2xl text-white w-fit mx-auto mb-8 shadow-lg shadow-blue-200">
                        <ShieldCheck size={36} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{examData.title}</h2>
                    <p className="text-slate-500 mb-10 font-medium">Ready to begin your secure assessment?</p>

                    <div className="text-left bg-slate-50 p-6 rounded-xl mb-10 border border-slate-100">
                        <h4 className="text-slate-900 font-bold mb-4 flex items-center text-sm uppercase tracking-wider">
                            <Info size={16} className="mr-2 text-blue-600" />
                            Security Protocol
                        </h4>
                        <ul className="text-slate-500 text-sm space-y-3 font-medium">
                            <li className="flex items-start"><ChevronRight size={14} className="mr-2 mt-1 text-blue-600 shrink-0" /> Fullscreen mode will be activated</li>
                            <li className="flex items-start"><ChevronRight size={14} className="mr-2 mt-1 text-blue-600 shrink-0" /> Background applications will be hindered</li>
                            <li className="flex items-start"><ChevronRight size={14} className="mr-2 mt-1 text-blue-600 shrink-0" /> Copy/paste and system shortcuts disabled</li>
                        </ul>
                    </div>

                    <button
                        onClick={handleStartExam}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-5 rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center space-x-3 active:scale-[0.98]"
                    >
                        <PlayCircle size={22} />
                        <span>Start Assessment</span>
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-[#f0f7ff] font-inter">
            {/* Top Bar */}
            <div className="bg-white px-8 py-4 flex justify-between items-center shadow-sm border-b border-slate-100 shrink-0">
                <div className="flex items-center space-x-4">
                    <h1 className="text-lg font-bold text-slate-800">{examData.title}</h1>
                    <span className="text-xs bg-slate-100 px-3 py-1 rounded-full text-slate-500 font-bold uppercase tracking-wider">Assessment In Progress</span>
                </div>

                <div className="flex items-center space-x-8">
                    <div className="flex items-center space-x-3 text-slate-800 font-black text-2xl">
                        <Timer durationMinutes={examData.duration} onTimeUp={handleSubmit} />
                    </div>
                    <div className="flex items-center px-4 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest mr-2">Answered</span>
                        <span className="font-black text-blue-700">{getAnsweredCount()} / {examData.questions.length}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Content (Stepper UI) */}
                <div className="flex-1 overflow-y-auto p-12 flex flex-col items-center">
                    <div className="max-w-3xl w-full pb-32">
                        <QuestionCard
                            question={examData.questions[currentIndex]}
                            index={currentIndex}
                            selectedOption={answers[currentIndex]}
                            onSelectOption={handleSelectOption}
                            textAnswer={textAnswers[currentIndex]}
                            onTextAnswer={handleTextAnswer}
                        />

                        <div className="flex justify-between mt-8">
                            <button
                                disabled={currentIndex === 0}
                                onClick={() => setCurrentIndex(prev => prev - 1)}
                                className="flex items-center space-x-2 px-6 py-3 bg-white border border-slate-200 text-slate-500 rounded-xl font-bold hover:bg-slate-50 disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft size={18} />
                                <span>Previous</span>
                            </button>

                            {currentIndex < examData.questions.length - 1 ? (
                                <button
                                    onClick={() => setCurrentIndex(prev => prev + 1)}
                                    className="flex items-center space-x-2 px-10 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-md shadow-blue-100 transition-all"
                                >
                                    <span>Next Question</span>
                                    <ChevronRight size={18} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => { if (window.confirm("Submit your answers? This action is final.")) handleSubmit(); }}
                                    disabled={isSubmitting}
                                    className={`px-10 py-3 rounded-xl font-bold transition-all transform active:scale-95 text-white ${isSubmitting ? 'bg-slate-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 shadow-md shadow-green-100'}`}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Finish Assessment'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Monitoring */}
                <div className="w-80 bg-white border-l border-slate-100 flex flex-col shrink-0 overflow-hidden shadow-[-4px_0_10px_rgba(0,0,0,0.02)]">
                    <div className="p-6 border-b border-slate-50">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center">
                            <span className="w-2 h-2 bg-blue-600 rounded-full mr-3 animate-pulse"></span>
                            Live Monitoring
                        </h2>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-8">
                        <div className="rounded-2xl border-2 border-slate-100 overflow-hidden shadow-sm bg-slate-50">
                            <MonitoringCamera examId={examData.examId} stream={streamRef.current} />
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Security Status</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-xs font-bold text-slate-600">Violations</span>
                                    <span className={`text-xs font-black px-2 py-0.5 rounded-full ${violationCount > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                        {violationCount}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-xs font-bold text-slate-600">Window Focus</span>
                                    <span className="text-[10px] font-black uppercase text-green-600 tracking-tighter">Locked</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl">
                            <h4 className="text-xs font-bold text-blue-900 mb-2 uppercase tracking-tight">Requirement</h4>
                            <p className="text-[11px] text-blue-700 leading-relaxed font-medium">Keep your face within range of the camera. Lighting must be adequate.</p>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-800 text-white shrink-0">
                        <h3 className="text-xs font-bold text-slate-400 mb-2">Instructions</h3>
                        <ul className="text-[10px] space-y-1 opacity-70 list-disc pl-3">
                            <li>Face must be visible</li>
                            <li>Adequate lighting</li>
                            <li>Do not look away</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Warning Bar */}
            <div className="bg-blue-600 text-white px-8 py-2.5 text-center text-xs font-bold tracking-wide italic">
                Notice: Switching tabs, windows, or using shortcuts is strictly prohibited and logged in real-time.
            </div>
        </div>
    );
};

export default ExamPage;
