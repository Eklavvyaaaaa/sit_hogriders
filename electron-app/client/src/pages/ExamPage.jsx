import React, { useState, useEffect, useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Timer from '../components/Timer';
import QuestionCard from '../components/QuestionCard';
import MonitoringCamera from '../components/MonitoringCamera';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

const ExamPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const examData = location.state?.examData;
    const classroomCode = location.state?.classroomCode;

    const [answers, setAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);

    useEffect(() => {
        if (!examData) {
            navigate('/join');
        }

        // Attempt to enter fullscreen
        if (!window.electronAPI) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn('Could not enter fullscreen', err);
            });
        }
    }, [examData, navigate]);

    if (!examData) return null;

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

            // Exit fullscreen if possible
            if (!window.electronAPI && document.fullscreenElement) {
                document.exitFullscreen();
            }
        } catch (err) {
            alert('Failed to submit exam');
        }
    };

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
                            Answered: <span className="text-white font-bold">{Object.keys(answers).length}</span> / {examData.questions.length}
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
                    <MonitoringCamera examId={examData.examId} />

                    <div className="mt-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <h3 className="text-sm font-semibold text-slate-300 mb-2">Instructions</h3>
                        <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4 marker:text-blue-500">
                            <li>Keep your face visible at all times</li>
                            <li>Ensure adequate lighting</li>
                            <li>Do not look away from the screen for extended periods</li>
                            <li>Do not resize or minimize this window</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamPage;
