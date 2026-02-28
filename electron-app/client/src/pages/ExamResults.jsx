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
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const res = await api.get(`/history/exam/${examId}`);
                setData(res.data);
                setError(null);
            } catch (err) {
                console.error('Failed to fetch results', err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchResults();
    }, [examId]);

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 font-medium">Loading...</div>;
    if (error) return <div className="min-h-screen bg-white flex items-center justify-center text-red-500 font-medium">Error: {error.message || 'Failed to fetch results'}</div>;
    if (!data) return <div className="min-h-screen bg-white flex items-center justify-center text-red-500 font-medium">No results found</div>;

    const { exam, results } = data;

    const getScoreColor = (score) => {
        if (score === null || score === undefined) return 'text-slate-400';
        if (score >= 80) return 'text-emerald-600';
        if (score >= 55) return 'text-amber-600';
        return 'text-red-600';
    };

    const getScoreBg = (score) => {
        if (score === null || score === undefined) return 'bg-slate-50 border-slate-200';
        if (score >= 80) return 'bg-emerald-50 border-emerald-200';
        if (score >= 55) return 'bg-amber-50 border-amber-200';
        return 'bg-red-50 border-red-200';
    };

    const getTrustBand = (trustFactor) => {
        if (trustFactor == null) return { label: '—', style: 'bg-slate-50 text-slate-500 border-slate-200' };
        if (trustFactor >= 0.85) return { label: 'High', style: 'bg-emerald-50 text-emerald-600 border-emerald-200' };
        if (trustFactor >= 0.6) return { label: 'Medium', style: 'bg-amber-50 text-amber-600 border-amber-200' };
        return { label: 'Low', style: 'bg-red-50 text-red-600 border-red-200' };
    };

    const avgScore = results.length > 0
        ? results.reduce((acc, r) => acc + (r.final_score || 0), 0) / results.length
        : 0;

    return (
        <div className="min-h-screen bg-white flex flex-col font-inter">
            <Navbar />
            <div className="flex-1 max-w-5xl w-full mx-auto p-8">
                <button
                    onClick={() => navigate('/teacher')}
                    className="flex items-center space-x-2 text-slate-400 hover:text-slate-700 mb-6 transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    <span>Back to Dashboard</span>
                </button>

                {/* Header */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] mb-6">
                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1">Exam Results</p>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{exam.title}</h1>
                    <p className="text-slate-400 text-sm font-medium">Status: <span className="capitalize text-slate-700 font-semibold">{exam.status}</span> · Duration: {exam.duration} mins</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-center">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <Users size={20} className="text-blue-600" />
                        </div>
                        <p className="text-2xl font-black text-slate-900">{results.length}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Submissions</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-center">
                        <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <Award size={20} className="text-emerald-600" />
                        </div>
                        <p className={`text-2xl font-black ${getScoreColor(avgScore)}`}>{Math.round(avgScore)}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Avg Score</p>
                    </div>
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-center">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                            <Flag size={20} className="text-red-600" />
                        </div>
                        <p className="text-2xl font-black text-slate-900">{results.filter(r => r.flagged).length}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Flagged</p>
                    </div>
                </div>

                {/* Student Results Table */}
                <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-black border-b border-slate-200">
                                <th className="p-4">Student</th>
                                <th className="p-4">MCQ</th>
                                <th className="p-4">Base Score</th>
                                <th className="p-4">Trust</th>
                                <th className="p-4">Trust Band</th>
                                <th className="p-4">Final Score</th>
                                <th className="p-4">Violations</th>
                                <th className="p-4">Status</th>
                                <th className="p-4"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {results.map((r, i) => (
                                <tr
                                    key={r.submission_id}
                                    className={`hover:bg-blue-50/30 transition-colors cursor-pointer ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                                    onClick={() => navigate(`/results/${r.submission_id}`)}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            navigate(`/results/${r.submission_id}`);
                                        }
                                    }}
                                >
                                    <td className="p-4">
                                        <div className="text-slate-900 font-semibold text-sm">{r.student_name}</div>
                                        <div className="text-xs text-slate-400">{r.student_email}</div>
                                    </td>
                                    <td className="p-4 text-slate-600 text-sm font-medium">{r.mcq_score ?? '-'}</td>
                                    <td className="p-4">
                                        <span className={`font-semibold text-sm ${getScoreColor(r.base_score)}`}>
                                            {r.base_score != null ? Math.round(r.base_score) : '-'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600 text-sm font-medium">{r.trust_factor != null ? `${r.trust_factor}x` : '-'}</td>
                                    <td className="p-4">
                                        {(() => {
                                            const band = getTrustBand(r.trust_factor);
                                            return (
                                                <span className={`text-[10px] px-2 py-1 rounded-md border font-black uppercase tracking-widest ${band.style}`}>
                                                    {band.label}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center justify-center min-w-[40px] px-2 py-1 rounded-md border font-black text-sm ${getScoreBg(r.final_score)} ${getScoreColor(r.final_score)}`}>
                                            {r.final_score != null ? Math.round(r.final_score) : '-'}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        {r.violation_count > 0 ? (
                                            <span className="flex items-center space-x-1 text-orange-600 text-sm font-semibold">
                                                <AlertTriangle size={14} />
                                                <span>{r.violation_count}</span>
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-sm">0</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {r.flagged ? (
                                            <span className="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded-md border border-red-200 font-black uppercase tracking-widest">Flagged</span>
                                        ) : (
                                            <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md border border-emerald-200 font-black uppercase tracking-widest">Clean</span>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <ChevronRight size={16} className="text-slate-300" />
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
