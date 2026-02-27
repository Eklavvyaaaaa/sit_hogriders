import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Clock, Timer, Award, AlertTriangle, ChevronRight, BookOpen } from 'lucide-react';

const StudentHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/history/student');
                setHistory(res.data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch history', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const getScoreBadge = (score) => {
        if (score === null || score === undefined) return 'bg-slate-700 text-slate-400';
        if (score >= 80) return 'bg-green-900/30 text-green-400 border-green-900/50';
        if (score >= 55) return 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50';
        return 'bg-red-900/30 text-red-400 border-red-900/50';
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            <div className="flex-1 max-w-5xl w-full mx-auto p-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Exam History</h1>
                    <p className="text-slate-400">View your past exam results and detailed scores.</p>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-slate-400">Loading...</div>
                ) : error ? (
                    <div className="text-center py-20 text-red-400">Error: {error.message || 'Failed to fetch history'}</div>
                ) : history.length === 0 ? (
                    <div className="text-center py-20 bg-slate-800/50 rounded-2xl border border-slate-700/50 border-dashed">
                        <BookOpen size={48} className="mx-auto text-slate-600 mb-4" />
                        <p className="text-slate-400 text-lg">No exams taken yet.</p>
                        <button
                            onClick={() => navigate('/join')}
                            className="mt-4 text-blue-400 hover:text-blue-300 font-semibold"
                        >
                            Join an exam →
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {history.map((item) => (
                            <div
                                key={item.submission_id}
                                onClick={() => navigate(`/results/${item.submission_id}`)}
                                className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-slate-500 cursor-pointer transition-all shadow-lg hover:shadow-xl group"
                                role="button"
                                tabIndex={0}
                                aria-label={`View results for ${item.exam_title}`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        navigate(`/results/${item.submission_id}`);
                                    }
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="text-xl font-bold text-white">{item.exam_title}</h3>
                                            <span className={`text-xs px-2 py-1 rounded-lg border font-medium capitalize ${item.status === 'submitted' ? 'bg-green-900/30 text-green-400 border-green-900/50' : 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50'
                                                }`}>
                                                {item.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-6 text-sm text-slate-400">
                                            <span className="flex items-center space-x-1">
                                                <Clock size={14} />
                                                <span>{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'Not submitted'}</span>
                                            </span>
                                            <span className="flex items-center space-x-1">
                                                <Timer size={14} />
                                                <span>{item.duration} mins</span>
                                            </span>
                                            {item.violation_count > 0 && (
                                                <span className="flex items-center space-x-1 text-orange-400">
                                                    <AlertTriangle size={14} />
                                                    <span>{item.violation_count} violations</span>
                                                </span>
                                            )}
                                            {item.flagged && (
                                                <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-900/50">Flagged</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        {item.final_score !== null && (
                                            <div className={`text-center px-4 py-2 rounded-xl border ${getScoreBadge(item.final_score)}`}>
                                                <div className="text-2xl font-bold">{Math.round(item.final_score)}</div>
                                                <div className="text-xs opacity-70">Score</div>
                                            </div>
                                        )}
                                        <ChevronRight size={20} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentHistory;
