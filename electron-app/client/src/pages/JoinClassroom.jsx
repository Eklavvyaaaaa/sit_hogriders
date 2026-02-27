import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Shield, ChevronRight, Calendar, BookOpen, Clock } from 'lucide-react';

const pastExams = [
    { id: 1, subject: 'Computer Science', title: 'Algorithms Quiz', date: 'Feb 10, 2026', score: 92 },
    { id: 2, subject: 'Mathematics', title: 'Linear Algebra Test', date: 'Feb 03, 2026', score: 78 },
    { id: 3, subject: 'Physics', title: 'Optics Midterm', date: 'Jan 22, 2026', score: 85 },
];

const JoinClassroom = () => {
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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
        if (fullCode.length !== 6) return;

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

    const upcomingExams = [
        { id: 1, subject: 'Computer Science', title: 'Data Structures Midterm', date: 'Feb 28, 2026', duration: '60 min' },
        { id: 2, subject: 'Mathematics', title: 'Calculus Final', date: 'Mar 02, 2026', duration: '90 min' }
    ];

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

                        <div className="space-y-3">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Past Exam Results</p>
                            <div className="space-y-3">
                                {pastExams.map(exam => {
                                    const scoreColor = exam.score >= 90
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                        : exam.score >= 75
                                            ? 'bg-blue-50 text-blue-600 border-blue-100'
                                            : 'bg-amber-50 text-amber-600 border-amber-100';
                                    return (
                                        <div key={exam.id} className="flex items-center justify-between bg-[#f0f7ff] rounded-xl px-5 py-4 border border-blue-50 hover:border-blue-200 transition-colors">
                                            <div>
                                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">{exam.subject}</p>
                                                <p className="text-slate-800 font-bold text-sm">{exam.title}</p>
                                                <span className="flex items-center gap-1 mt-1 text-xs text-slate-400">
                                                    <Calendar size={10} /> {exam.date}
                                                </span>
                                            </div>
                                            <div className={`min-w-[52px] text-center px-3 py-1.5 rounded-xl border text-lg font-black ${scoreColor}`}>
                                                {exam.score}%
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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

                        {/* Upcoming exams in the right panel (mobile visible) */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider pl-1">Upcoming Exams</h3>
                            <div className="grid gap-4">
                                {upcomingExams.map(exam => (
                                    <div key={exam.id} className="bg-white p-5 rounded-xl border border-white/50 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all cursor-pointer">
                                        <div>
                                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-0.5">{exam.subject}</p>
                                            <p className="text-slate-800 font-bold text-sm tracking-tight">{exam.title}</p>
                                            <div className="flex items-center space-x-4 mt-1 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                                                <span className="flex items-center gap-1"><Calendar size={10} /> {exam.date}</span>
                                                <span className="flex items-center gap-1"><Clock size={10} /> {exam.duration}</span>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                            <ChevronRight size={16} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <p className="text-center text-slate-400 text-[11px] font-semibold">
                            Protected by ATI Smart Monitoring Technology
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JoinClassroom;
