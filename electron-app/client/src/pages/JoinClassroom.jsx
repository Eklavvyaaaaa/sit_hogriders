import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Shield, ChevronRight, Calendar, BookOpen, Clock, Loader2, AlertTriangle } from 'lucide-react';

const JoinClassroom = () => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Exam history state
    const [pastExams, setPastExams] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState(null);

    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setHistoryLoading(true);
                setHistoryError(null);
                const res = await api.get('/history/student');
                // Limit to most recent 5 exams
                setPastExams(res.data.slice(0, 5));
            } catch (err) {
                console.error('Failed to fetch exam history', err);
                setHistoryError('Failed to load past exams.');
            } finally {
                setHistoryLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const handleInput = (e, index) => {
        const value = e.target.value.toUpperCase();
        if (value.length > 1) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        // Auto focus next
        if (value && index < 5) {
            document.getElementById(`code-${index + 1}`).focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            document.getElementById(`code-${index - 1}`).focus();
        }
    };

    const handleJoin = async (e) => {
        e.preventDefault();
        const fullCode = code.join('');
        if (fullCode.length !== 6) {
            setError('Please enter a 6-digit join code');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const res = await api.post('/classroom/join', { code: fullCode });
            const examData = res.data;
            navigate('/exam', { state: { examData, classroomCode: fullCode } });
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid code or server error');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
    };

    const isComplete = code.join('').length === 6;

    return (
        <div className="min-h-screen flex flex-col font-inter overflow-hidden bg-white">
            <Navbar />

            <div className="flex-1 flex overflow-hidden">
                {/* ── LEFT PANEL ── */}
                <div className="hidden lg:flex w-1/2 bg-white flex-col relative p-16 justify-between border-r border-slate-100">
                    <div className="space-y-10">
                        <div className="space-y-3">
                            <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Student Portal</p>
                            <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">Ready to<br />Begin?</h1>
                            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-sm">
                                Enter your exam code and start your secure assessment session.
                            </p>
                        </div>

                        {/* Exam History Section */}
                        <div className="space-y-3">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Past Exam Results</p>

                            {historyLoading ? (
                                <div className="flex flex-col items-center justify-center py-6 bg-slate-50 rounded-xl border border-slate-100">
                                    <Loader2 size={24} className="text-blue-400 animate-spin mb-2" />
                                    <p className="text-slate-400 text-sm font-medium">Loading history...</p>
                                </div>
                            ) : historyError ? (
                                <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center space-x-3">
                                    <AlertTriangle size={18} className="text-red-400 shrink-0" />
                                    <p className="text-red-600 text-sm font-bold flex-1">{historyError}</p>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2 py-1 rounded uppercase tracking-wider transition-colors"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : pastExams.length === 0 ? (
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-center">
                                    <p className="text-slate-500 text-sm font-medium">No past exams found.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pastExams.map((exam, index) => {
                                        const isGraded = exam.final_score != null;
                                        const finalScore = isGraded ? Math.round(exam.final_score) : null;

                                        // Determine visual style based on score or status
                                        let statusConfig = {
                                            bg: 'bg-slate-50',
                                            text: 'text-slate-500',
                                            border: 'border-slate-200',
                                            label: 'Pending'
                                        };

                                        if (isGraded) {
                                            if (finalScore >= 90) {
                                                statusConfig = { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
                                            } else if (finalScore >= 75) {
                                                statusConfig = { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
                                            } else {
                                                statusConfig = { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
                                            }
                                        } else if (exam.status === 'in_progress' || exam.status === 'Evaluating') {
                                            statusConfig = { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', label: exam.status === 'in_progress' ? 'In Progress' : 'Evaluating' };
                                        }

                                        return (
                                            <div
                                                key={exam.submission_id || index}
                                                onClick={() => navigate(`/history/submission/${exam.submission_id}`)}
                                                className="group relative flex items-center justify-between bg-white rounded-2xl p-5 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] hover:border-blue-300 transition-all duration-300 cursor-pointer overflow-hidden"
                                            >
                                                {/* Left structural visual */}
                                                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-blue-400 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                                <div className="flex-1 pr-4 pl-1">
                                                    <div className="flex items-center space-x-2 mb-1.5">
                                                        <span className="px-2 py-0.5 rounded text-[9px] font-black tracking-widest uppercase bg-slate-100 text-slate-500">
                                                            {exam.exam_title ? exam.exam_title.split(' ')[0] : 'Exam'}
                                                        </span>
                                                        <p className={`text-[9px] font-black uppercase tracking-widest ${!isGraded ? 'text-indigo-500' : 'text-slate-400'
                                                            }`}>
                                                            {exam.status ? exam.status.replace('_', ' ') : 'completed'}
                                                        </p>
                                                    </div>

                                                    <p className="text-slate-800 font-bold text-base tracking-tight leading-tight mb-2 group-hover:text-blue-700 transition-colors line-clamp-1">
                                                        {exam.exam_title || 'Untitled Exam'}
                                                    </p>

                                                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                                        <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-2 py-1 rounded-md text-[11px]">
                                                            <Calendar size={12} className="text-slate-400" />
                                                            {formatDate(exam.submitted_at)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Score / Status Badge */}
                                                <div className={`flex flex-col items-center justify-center min-w-[64px] h-[64px] rounded-xl border ${statusConfig.bg} ${statusConfig.border} ${statusConfig.text} transform group-hover:scale-105 transition-transform duration-300 shadow-sm`}>
                                                    {isGraded ? (
                                                        <>
                                                            <span className="text-xl font-black tracking-tighter">{finalScore}</span>
                                                            <span className="text-[9px] font-black tracking-widest opacity-80">%</span>
                                                        </>
                                                    ) : (
                                                        <span className="text-[9px] font-black leading-[1.1] text-center px-1 uppercase tracking-widest">
                                                            {statusConfig.label.split(' ').map((word, i) => <div key={i}>{word}</div>)}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Hover Arrow */}
                                                <div className="absolute right-[-40px] opacity-0 group-hover:opacity-100 group-hover:right-4 bg-white/50 backdrop-blur-sm h-full flex items-center transition-all duration-300">
                                                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                                                        <ChevronRight size={16} />
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <p className="text-slate-300 text-sm font-bold tracking-widest uppercase">Smart Assessment Technology</p>
                </div>

                {/* ── RIGHT PANEL ── */}
                <div className="w-full lg:w-1/2 bg-[#f0f7ff] flex items-center justify-center p-8 relative overflow-y-auto">
                    {/* Background blob */}
                    <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"></div>

                    <div className="w-full max-w-md space-y-8">
                        {/* ── Code entry card ── */}
                        <div className="bg-white rounded-2xl shadow-2xl border border-white/50 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
                            <div className="p-10">
                                {/* Header */}
                                <div className="flex items-center space-x-3 mb-1">
                                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                                        <BookOpen size={18} className="text-blue-600" />
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Join Exam</h2>
                                </div>
                                <p className="text-slate-500 text-sm mb-8 font-medium">
                                    Enter the 6-character code provided by your instructor.
                                </p>

                                {error && (
                                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl mb-6 text-sm font-bold flex items-center animate-shake">
                                        <span className="mr-2 uppercase text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">Error</span>
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleJoin} className="space-y-8">
                                    <div className="flex justify-between gap-3">
                                        {code.map((char, i) => (
                                            <input
                                                key={i}
                                                id={`code-${i}`}
                                                type="text"
                                                maxLength={1}
                                                aria-label={`code digit ${i + 1} of ${code.length}`}
                                                className={`w-full aspect-square text-center text-2xl font-black rounded-xl border-2 focus:ring-0 outline-none transition-all uppercase
                                                    ${char
                                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                        : 'bg-slate-50 border-slate-100 text-slate-900 focus:border-blue-500 focus:bg-white'
                                                    }`}
                                                value={char}
                                                onChange={(e) => handleInput(e, i)}
                                                onKeyDown={(e) => handleKeyDown(e, i)}
                                            />
                                        ))}
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!isComplete || loading}
                                        className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-5 rounded-full shadow-xl shadow-blue-200 transition-all active:scale-[0.98] text-lg"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <span>Start Exam</span>
                                                <ChevronRight size={20} />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        <p className="text-center text-slate-400 text-[11px] font-semibold mt-8">
                            Protected by ATI Smart Monitoring Technology
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JoinClassroom;
