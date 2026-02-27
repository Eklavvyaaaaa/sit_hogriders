import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { ArrowLeft, Award, Users, AlertTriangle, Flag, ChevronRight } from 'lucide-react';

const ExamResults = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await api.get(`/history/exam/${examId}`);
                setData(res.data);
            } catch (err) {
                console.error('Failed to fetch results', err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [examId]);

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
    if (!data) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400">No results found</div>;

    const { exam, results } = data;

    const getScoreColor = (score) => {
        if (score === null || score === undefined) return 'text-slate-400';
        if (score >= 80) return 'text-green-400';
        if (score >= 55) return 'text-yellow-400';
        return 'text-red-400';
    };

    const avgScore = results.length > 0
        ? results.reduce((acc, r) => acc + (r.final_score || 0), 0) / results.length
        : 0;

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            <div className="flex-1 max-w-5xl w-full mx-auto p-8">
                <button
                    onClick={() => navigate('/teacher')}
                    className="flex items-center space-x-2 text-slate-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span>Back to Dashboard</span>
                </button>

                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
                    <h1 className="text-2xl font-bold text-white mb-1">{exam.title} — Results</h1>
                    <p className="text-slate-400 text-sm">Status: <span className="capitalize text-white">{exam.status}</span> | Duration: {exam.duration} mins</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-center">
                        <Users size={24} className="mx-auto text-blue-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{results.length}</p>
                        <p className="text-xs text-slate-400">Submissions</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-center">
                        <Award size={24} className="mx-auto text-green-400 mb-2" />
                        <p className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>{Math.round(avgScore)}</p>
                        <p className="text-xs text-slate-400">Avg Score</p>
                    </div>
                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-center">
                        <Flag size={24} className="mx-auto text-red-400 mb-2" />
                        <p className="text-2xl font-bold text-white">{results.filter(r => r.flagged).length}</p>
                        <p className="text-xs text-slate-400">Flagged</p>
                    </div>
                </div>

                {/* Student Results Table */}
                <div className="bg-slate-800 rounded-2xl overflow-hidden border border-slate-700">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-900/50 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-700">
                                <th className="p-5 font-semibold">Student</th>
                                <th className="p-5 font-semibold">MCQ</th>
                                <th className="p-5 font-semibold">Base Score</th>
                                <th className="p-5 font-semibold">Trust</th>
                                <th className="p-5 font-semibold">Final Score</th>
                                <th className="p-5 font-semibold">Violations</th>
                                <th className="p-5 font-semibold">Status</th>
                                <th className="p-5 font-semibold"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {results.map((r) => (
                                <tr key={r.submission_id} className="hover:bg-slate-800/80 transition-colors cursor-pointer" onClick={() => navigate(`/results/${r.submission_id}`)}>
                                    <td className="p-5">
                                        <div className="text-white font-medium">{r.student_name}</div>
                                        <div className="text-xs text-slate-400">{r.student_email}</div>
                                    </td>
                                    <td className="p-5 text-slate-300">{r.mcq_score ?? '-'}</td>
                                    <td className="p-5">
                                        <span className={getScoreColor(r.base_score)}>
                                            {r.base_score != null ? Math.round(r.base_score) : '-'}
                                        </span>
                                    </td>
                                    <td className="p-5 text-slate-300">{r.trust_factor != null ? `${r.trust_factor}x` : '-'}</td>
                                    <td className="p-5">
                                        <span className={`font-bold text-lg ${getScoreColor(r.final_score)}`}>
                                            {r.final_score != null ? Math.round(r.final_score) : '-'}
                                        </span>
                                    </td>
                                    <td className="p-5">
                                        {r.violation_count > 0 ? (
                                            <span className="flex items-center space-x-1 text-orange-400">
                                                <AlertTriangle size={14} />
                                                <span>{r.violation_count}</span>
                                            </span>
                                        ) : (
                                            <span className="text-slate-500">0</span>
                                        )}
                                    </td>
                                    <td className="p-5">
                                        {r.flagged ? (
                                            <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded border border-red-900/50">Flagged</span>
                                        ) : (
                                            <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded border border-green-900/50">Clean</span>
                                        )}
                                    </td>
                                    <td className="p-5">
                                        <ChevronRight size={16} className="text-slate-600" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExamResults;
