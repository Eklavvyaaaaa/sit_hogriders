import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { LogIn, Clock, Calendar, ChevronRight } from 'lucide-react';

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

    return (
        <div className="min-h-screen bg-[#f0f7ff] flex flex-col font-inter">
            <Navbar />
            <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
                <div className="grid md:grid-cols-5 gap-8">

                    {/* Left: Join Box */}
                    <div className="md:col-span-3 space-y-6">
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Join an Exam</h2>
                            <p className="text-slate-500 text-sm mb-8">Enter the exam code provided by your instructor.</p>

                            {error && (
                                <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-lg mb-6 text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleJoin} className="space-y-8">
                                <div className="flex justify-between gap-2 sm:gap-4">
                                    {code.map((char, i) => (
                                        <input
                                            key={i}
                                            id={`code-${i}`}
                                            type="text"
                                            maxLength={1}
                                            className="w-full aspect-square text-center text-2xl font-bold bg-slate-50 border-2 border-slate-200 rounded-lg focus:border-blue-600 focus:bg-white focus:ring-0 outline-none transition-all text-slate-900"
                                            value={char}
                                            onChange={(e) => handleInput(e, i)}
                                            onKeyDown={(e) => handleKeyDown(e, i)}
                                        />
                                    ))}
                                </div>

                                <button
                                    type="submit"
                                    disabled={code.join('').length !== 6 || loading}
                                    className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-lg shadow-lg shadow-blue-200 transition-all active:scale-[0.98]"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <span>Join Exam</span>
                                            <ChevronRight size={18} />
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Right: Upcoming */}
                    <div className="md:col-span-2 space-y-6">
                        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider pl-1">My Upcoming Exams</h3>

                        <div className="space-y-4">
                            {upcomingExams.map(exam => (
                                <div key={exam.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:border-blue-200 transition-colors group cursor-pointer">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">{exam.subject}</p>
                                    <h4 className="text-slate-900 font-bold mb-3">{exam.title}</h4>

                                    <div className="flex items-center text-xs text-slate-400 space-x-4">
                                        <div className="flex items-center">
                                            <Calendar size={12} className="mr-1" />
                                            {exam.date}
                                        </div>
                                        <div className="flex items-center">
                                            <Clock size={12} className="mr-1" />
                                            {exam.duration}
                                        </div>
                                    </div>

                                    <button className="mt-4 w-full py-2 text-xs font-bold text-slate-600 bg-slate-50 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all capitalize">
                                        View Details
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default JoinClassroom;
