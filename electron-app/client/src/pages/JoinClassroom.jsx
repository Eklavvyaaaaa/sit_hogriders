import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { LogIn } from 'lucide-react';

const JoinClassroom = () => {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleJoin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await api.post('/classroom/join', { code: code.toUpperCase() });
            const examData = res.data;
            navigate('/exam', { state: { examData, classroomCode: code.toUpperCase() } });
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid code or server error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            <div className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden">

                <div className="absolute top-1/4 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full point-events-none"></div>

                <div className="bg-slate-800/80 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-slate-700/50 max-w-md w-full relative z-10">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Join Classroom</h1>
                        <p className="text-slate-400">Enter the 6-character code provided by your teacher to start the exam.</p>
                    </div>

                    {error && <div className="bg-red-900/50 border border-red-500/50 text-red-200 p-3 rounded-xl mb-6 text-center text-sm">{error}</div>}

                    <form onSubmit={handleJoin} className="space-y-6 text-center">
                        <div>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                className="w-full text-center text-5xl tracking-[0.2em] font-mono p-4 bg-slate-900 border-2 border-slate-700 rounded-2xl focus:border-blue-500 focus:ring-0 active:outline-none transition-colors text-white uppercase placeholder-slate-700 font-bold"
                                placeholder="XXXXXX"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={code.length !== 6 || loading}
                            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-xl shadow-lg shadow-blue-500/25 transition-all transform active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <span>Enter Exam</span>
                                    <LogIn size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl text-yellow-200/80 text-xs text-left leading-relaxed">
                        <p className="font-semibold text-yellow-500 mb-1">Security Warning</p>
                        Once you join, your webcam will turn on for face detection and AI monitoring. The application will track window focus and attempt to hinder background operations. Stay in full screen.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JoinClassroom;
