import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Clock, Timer, Award, AlertTriangle, ChevronRight, BookOpen } from 'lucide-react';

const StudentHistory = () => {
    const [history, setHistory] = useState([]);
    const [filteredHistory, setFilteredHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({
        subject: '',
        dateRange: '',
        scoreRange: '',
        integrity: ''
    });
    const [sortBy, setSortBy] = useState('newest');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get('/history/student');
                // map backend data to frontend model
                const mappedHistory = res.data.map(item => ({
                    id: item.submission_id,
                    submission_id: item.submission_id,
                    exam_title: item.exam_title || 'Untitled Exam',
                    subject: 'Computer Science', // Mock subject
                    date: item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'N/A',
                    score: item.final_score ? Math.round(item.final_score) : 0,
                    ati: 100 - (item.violation_count || 0) * 5, // Mock ATI formulation
                    status: item.status
                }));
                setHistory(mappedHistory);
                setFilteredHistory(mappedHistory);
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


    // Handle filtering and sorting
    useEffect(() => {
        let result = [...history];

        if (filters.subject) {
            result = result.filter(item => item.subject === filters.subject);
        }
        if (filters.scoreRange === 'high') {
            result = result.filter(item => item.score >= 90);
        } else if (filters.scoreRange === 'mid') {
            result = result.filter(item => item.score >= 70 && item.score < 90);
        }

        // Sorting
        if (sortBy === 'newest') {
            result.sort((a, b) => new Date(b.date) - new Date(a.date));
        } else if (sortBy === 'score-high') {
            result.sort((a, b) => b.score - a.score);
        } else if (sortBy === 'ati-high') {
            result.sort((a, b) => b.ati - a.ati);
        }

        setFilteredHistory(result);
    }, [filters, sortBy, history]);

    const getAtiBadge = (score) => {
        if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (score >= 60) return 'text-orange-600 bg-orange-50 border-orange-100';
        return 'text-red-600 bg-red-50 border-red-100';
    };

    return (
        <div className="min-h-screen bg-[#f0f7ff] font-inter">
            <Navbar />

            <main className="max-w-7xl mx-auto px-8 py-12">
                <div className="mb-10">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Test History</h1>
                    <p className="text-slate-500 font-medium">Review your past performance and integrity scores.</p>
                </div>

                {/* Filter & Sort Bar */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-white flex flex-wrap items-center justify-between gap-6 mb-8">
                    <div className="flex flex-wrap items-center gap-4">
                        <select
                            className="bg-slate-50 border-none text-slate-600 text-sm font-bold px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100"
                            value={filters.subject}
                            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                        >
                            <option value="">Filter by Subject</option>
                            <option value="Computer Science">Computer Science</option>
                            <option value="Mathematics">Mathematics</option>
                            <option value="Physics">Physics</option>
                        </select>

                        <select
                            className="bg-slate-50 border-none text-slate-600 text-sm font-bold px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100"
                            value={filters.scoreRange}
                            onChange={(e) => setFilters({ ...filters, scoreRange: e.target.value })}
                        >
                            <option value="">Filter by Score</option>
                            <option value="high">High (90%+)</option>
                            <option value="mid">Mid (70-89%)</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Sort by:</span>
                        <select
                            className="bg-slate-50 border-none text-slate-900 text-sm font-bold px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-100"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="newest">Newest First</option>
                            <option value="score-high">Highest Score</option>
                            <option value="ati-high">Highest ATI</option>
                        </select>
                    </div>
                </div>

                {/* History Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-white overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-50 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                <th className="px-8 py-5">Subject</th>
                                <th className="px-8 py-5">Exam Title</th>
                                <th className="px-8 py-5">Completed Date</th>
                                <th className="px-8 py-5 text-center">Score</th>
                                <th className="px-8 py-5 text-center">ATI Score</th>
                                <th className="px-8 py-5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-10 text-center text-slate-400 font-medium">Loading history...</td>
                                </tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-8 py-10 text-center text-slate-400 font-medium">No records found.</td>
                                </tr>
                            ) : filteredHistory.map((item) => (
                                <tr key={item.id} className="hover:bg-blue-50/50 transition-colors group">
                                    <td className="px-8 py-6">
                                        <span className="text-xs font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                                            {item.subject}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 font-bold text-slate-900">{item.exam_title}</td>
                                    <td className="px-8 py-6 text-slate-500 font-medium">{item.date}</td>
                                    <td className="px-8 py-6 text-center">
                                        <span className="text-lg font-black text-slate-900">{item.score}%</span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-xl border text-xs font-bold ${getAtiBadge(item.ati)}`}>
                                            {item.ati}%
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <button
                                            onClick={() => navigate(`/results/${item.submission_id}`)}
                                            className="inline-flex items-center gap-2 text-blue-600 font-black text-sm px-5 py-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-50"
                                        >
                                            View Results
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="text-center text-slate-300 text-[11px] font-bold uppercase tracking-widest mt-12">
                    ATI Secure Smart Assessment Technology
                </p>
            </main>

        </div>
    );
};

export default StudentHistory;
