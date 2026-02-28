import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Clock, Timer, AlertTriangle, ChevronRight, BookOpen, ArrowUpDown, Filter, CalendarClock, Play } from 'lucide-react';

const StudentHistory = () => {
    const [history, setHistory] = useState([]);
    const [upcoming, setUpcoming] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortField, setSortField] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc');
    const [statusFilter, setStatusFilter] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const [historyRes, upcomingRes] = await Promise.all([
                    api.get('/history/student'),
                    api.get('/history/upcoming').catch(() => ({ data: [] }))
                ]);
                if (!isMounted) return;
                setHistory(historyRes.data);
                setUpcoming(upcomingRes.data);
                setError(null);
            } catch (err) {
                if (!isMounted) return;
                console.error('Failed to fetch history', err);
                setError(err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, []);

    const getScoreBadge = (score) => {
        if (score === null || score === undefined) return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' };
        if (score >= 80) return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' };
        if (score >= 55) return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' };
        return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
    };

    const getTrustBandBadge = (band) => {
        const normalized = (band || '').toLowerCase();
        if (normalized === 'high') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
        if (normalized === 'medium') return 'bg-amber-50 text-amber-600 border-amber-200';
        if (normalized === 'low') return 'bg-red-50 text-red-600 border-red-200';
        return 'bg-slate-50 text-slate-500 border-slate-200';
    };

    const filteredAndSorted = useMemo(() => {
        let items = [...history];

        // Filter
        if (statusFilter !== 'all') {
            if (statusFilter === 'completed') {
                items = items.filter(i => i.status === 'submitted');
            } else if (statusFilter === 'pending') {
                items = items.filter(i => i.status !== 'submitted' && i.exam_status !== 'terminated');
            } else if (statusFilter === 'terminated') {
                items = items.filter(i => i.exam_status === 'terminated');
            }
        }

        // Sort
        items.sort((a, b) => {
            let valA, valB;
            if (sortField === 'date') {
                valA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
                valB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
            } else {
                valA = a.final_score ?? -1;
                valB = b.final_score ?? -1;
            }
            return sortOrder === 'asc' ? valA - valB : valB - valA;
        });

        return items;
    }, [history, sortField, sortOrder, statusFilter]);

    return (
        <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} className="min-h-screen flex flex-col font-inter transition-colors duration-200">
            <Navbar />
            <div className="flex-1 max-w-5xl w-full mx-auto p-8">
                <div className="mb-8">
                    <p style={{ color: 'var(--accent-color)' }} className="text-[11px] font-black uppercase tracking-widest mb-1">Student Portal</p>
                    <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-black tracking-tighter mb-1">Exam History</h1>
                    <p style={{ color: 'var(--text-secondary)' }} className="text-sm font-medium">View your past exam results and detailed scores.</p>
                </div>

                {/* Upcoming Exams Section */}
                {upcoming.length > 0 && (
                    <div className="mb-8">
                        <div className="flex items-center space-x-2 mb-4">
                            <CalendarClock size={18} className="text-blue-600" />
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">Upcoming Exams</h2>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {upcoming.map(exam => (
                                <div key={exam.id} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }} className="rounded-xl p-5 border shadow-sm flex flex-col">
                                    <h3 className="font-bold text-sm mb-2">{exam.title}</h3>
                                    <div className="flex items-center space-x-1 text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                        <Clock size={12} style={{ color: 'var(--text-muted)' }} />
                                        <span>{exam.created_at ? new Date(exam.created_at).toLocaleDateString() : '—'}</span>
                                    </div>
                                    <div className="flex items-center space-x-1 text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                                        <Timer size={12} style={{ color: 'var(--text-muted)' }} />
                                        <span>{exam.duration != null ? `${exam.duration} mins` : '—'}</span>
                                    </div>
                                    <div className="mt-auto">
                                        <span className={`text-[10px] px-2 py-1 rounded-md border font-black uppercase tracking-widest capitalize ${exam.status === 'active'
                                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                            : 'bg-amber-50 text-amber-600 border-amber-200'
                                            }`}>
                                            {exam.status || 'scheduled'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => navigate(`/join?examId=${exam.id}`)}
                                        className="btn btn-primary mt-3 w-full"
                                    >
                                        <Play size={12} />
                                        <span>Start Exam</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {loading ? (
                    <div style={{ color: 'var(--text-muted)' }} className="text-center py-20 font-medium">Loading...</div>
                ) : error ? (
                    <div style={{ color: 'var(--danger-color)' }} className="text-center py-20 font-medium">Error: {error.message || 'Failed to fetch history'}</div>
                ) : history.length === 0 ? (
                    <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="text-center py-20 rounded-xl border border-dashed">
                        <BookOpen size={48} style={{ color: 'var(--text-muted)' }} className="mx-auto mb-4 opacity-50" />
                        <p style={{ color: 'var(--text-secondary)' }} className="text-lg font-medium">No exams taken yet.</p>
                        <button
                            onClick={() => navigate('/join')}
                            className="mt-4 text-blue-600 hover:text-blue-700 font-bold"
                        >
                            Join an exam →
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Sort & Filter Controls */}
                        <div className="flex items-center space-x-4 mb-4">
                            <div className="flex items-center space-x-2">
                                <ArrowUpDown size={14} className="text-slate-400" />
                                <select
                                    id="sort-field"
                                    aria-label="Sort by field"
                                    value={sortField}
                                    onChange={e => setSortField(e.target.value)}
                                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    className="text-xs font-semibold rounded-lg px-3 py-1.5 focus:outline-none border border-solid focus:ring-2 focus:ring-[var(--accent-color)]"
                                >
                                    <option value="date">Sort by Date</option>
                                    <option value="score">Sort by Score</option>
                                </select>
                                <select
                                    id="sort-order"
                                    aria-label="Sort order"
                                    value={sortOrder}
                                    onChange={e => setSortOrder(e.target.value)}
                                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    className="text-xs font-semibold border border-solid rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                                >
                                    <option value="desc">Descending</option>
                                    <option value="asc">Ascending</option>
                                </select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Filter size={14} className="text-slate-400" />
                                <select
                                    id="status-filter"
                                    aria-label="Filter by status"
                                    value={statusFilter}
                                    onChange={e => setStatusFilter(e.target.value)}
                                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                    className="text-xs border border-solid font-semibold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="completed">Completed</option>
                                    <option value="pending">Pending</option>
                                    <option value="terminated">Terminated</option>
                                </select>
                            </div>
                        </div>

                        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl overflow-hidden border shadow-sm">
                            <table className="w-full text-left">
                                <thead>
                                    <tr style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }} className="uppercase text-[10px] tracking-widest font-black border-b">
                                        <th className="p-4">Exam</th>
                                        <th className="p-4">Date</th>
                                        <th className="p-4">Duration</th>
                                        <th className="p-4">Violations</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Score</th>
                                        <th className="p-4">Trust</th>
                                        <th className="p-4"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredAndSorted.map((item, i) => {
                                        const scoreBadge = getScoreBadge(item.final_score);
                                        return (
                                            <tr
                                                key={item.submission_id}
                                                onClick={() => navigate(`/results/${item.submission_id}`)}
                                                className={`hover:bg-blue-50/30 cursor-pointer transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        navigate(`/results/${item.submission_id}`);
                                                    }
                                                }}
                                            >
                                                <td className="p-4">
                                                    <span style={{ color: 'var(--text-primary)' }} className="font-semibold text-sm">{item.exam_title}</span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="flex items-center space-x-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                        <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                                                        <span>{item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'Not submitted'}</span>
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="flex items-center space-x-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                        <Timer size={13} style={{ color: 'var(--text-muted)' }} />
                                                        <span>{item.duration != null ? `${item.duration} mins` : '—'}</span>
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {item.violation_count > 0 ? (
                                                        <span style={{ color: 'var(--warning-color, #D97706)' }} className="flex items-center space-x-1 text-sm font-semibold">
                                                            <AlertTriangle size={14} />
                                                            <span>{item.violation_count}</span>
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }} className="text-sm">0</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] px-2 py-1 rounded-md border font-black uppercase tracking-widest ${item.status === 'submitted'
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                        : 'bg-amber-50 text-amber-600 border-amber-200'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {item.final_score != null ? (
                                                        <span className={`inline-flex items-center justify-center min-w-[44px] px-2.5 py-1.5 rounded-lg border font-black text-base ${scoreBadge.bg} ${scoreBadge.border} ${scoreBadge.text}`}>
                                                            {Math.round(item.final_score)}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center min-w-[44px] px-2.5 py-1.5 rounded-lg border font-black text-base bg-slate-50 border-slate-200 text-slate-400">—</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`text-[10px] px-2 py-1 rounded-md border font-black uppercase tracking-widest ${getTrustBandBadge(item.trust_band)}`}>
                                                        {item.trust_band || '—'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <ChevronRight size={16} className="text-slate-300" />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default StudentHistory;
