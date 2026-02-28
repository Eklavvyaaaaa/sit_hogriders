import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { PlusCircle, Eye, Activity, BarChart3, Users, AlertTriangle, Flag, Download, Trophy, CheckCircle2, Loader2, Clock, XCircle, CalendarClock, Copy, MessageSquare, Trash2, MoreVertical } from 'lucide-react';
import ChatBox from '../components/ChatBox';

const TeacherDashboard = () => {
    const [exams, setExams] = useState([]);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chatExamId, setChatExamId] = useState(null);
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [filter, setFilter] = useState('all');
    const navigate = useNavigate();

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [examsResult, overviewResult] = await Promise.allSettled([
                api.get('/exam/my-exams'),
                api.get('/dashboard/overview')
            ]);
            if (examsResult.status === 'fulfilled') {
                setExams(examsResult.value.data);
            } else {
                console.error('Failed to fetch exams', examsResult.reason);
            }

            if (overviewResult.status === 'fulfilled') {
                setOverview(overviewResult.value.data);
            } else {
                console.error('Failed to fetch overview', overviewResult.reason);
            }

            // Only block dashboard if both requests failed
            if (examsResult.status === 'rejected' && overviewResult.status === 'rejected') {
                setError('Failed to load dashboard data. Please try again.');
            } else {
                setError(null);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        const handleClickOutside = () => setMenuOpenId(null);
        if (menuOpenId !== null) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [menuOpenId]);

    const handleExportCSV = async (examId) => {
        let url;
        try {
            const res = await api.get(`/exam/${examId}/export`, { responseType: 'blob' });
            url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `exam_${examId}_logs.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed', err);
            alert('Export failed: ' + (err.message || 'Unknown error'));
        } finally {
            if (url) window.URL.revokeObjectURL(url);
        }
    };

    const handleViewFlagged = async (examId) => {
        try {
            const res = await api.get(`/exam/${examId}/flagged`);
            const flagged = res.data;
            if (flagged.length === 0) {
                alert('No flagged students for this exam.');
            } else {
                const list = flagged.map(s => `• ${s.name} (${s.email}) — ${s.violation_count} violations`).join('\n');
                alert(`Flagged Students:\n\n${list}`);
            }
        } catch (err) {
            console.error('Failed to fetch flagged', err);
        }
    };

    const handleChangeTime = async (examId) => {
        const input = prompt('Enter new duration in minutes:');
        if (!input) return;
        const duration = Number(input);
        if (isNaN(duration) || duration <= 0) {
            alert('Please enter a valid positive number.');
            return;
        }
        try {
            await api.patch(`/exam/${examId}/time`, { duration });
            alert('Exam duration updated successfully.');
            fetchDashboardData();
        } catch (err) {
            console.error('Failed to update exam time', err);
            alert('Failed to update exam duration.');
        }
    };

    const handleTerminate = async (examId) => {
        if (!window.confirm('Are you sure you want to terminate this exam? This action cannot be undone.')) return;
        try {
            await api.patch(`/exam/${examId}/terminate`, { status: 'terminated' });
            alert('Exam terminated successfully.');
            fetchDashboardData();
        } catch (err) {
            console.error('Failed to terminate exam', err);
            alert('Failed to terminate exam.');
        }
    };

    const handleDelete = async (examId) => {
        if (!window.confirm('Are you sure you want to DELETE this exam? This will permanently remove all submissions, scores, and monitoring data. This action CANNOT be undone.')) return;
        try {
            await api.delete(`/exam/${examId}`);
            alert('Exam deleted successfully.');
            fetchDashboardData();
        } catch (err) {
            console.error('Failed to delete exam', err);
            alert('Failed to delete exam.');
        }
    };

    const handleReschedule = async (examId) => {
        const input = prompt('Enter new scheduled time (e.g. 2026-03-01T10:00+05:30):');
        if (!input) return;

        const parsedDate = new Date(input);
        if (isNaN(parsedDate.getTime())) {
            alert('Invalid date. Please ensure the date/time format is correct.');
            return;
        }

        try {
            await api.patch(`/exam/${examId}/reschedule`, { new_time: parsedDate.toISOString() });
            alert('Exam rescheduled successfully.');
            fetchDashboardData();
        } catch (err) {
            console.error('Failed to reschedule exam', err);
            alert('Failed to reschedule exam.');
        }
    };

    const getStatusBadge = (status) => {
        const config = {
            scheduled: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
            active: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500 animate-pulse' },
            completed: { bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
            terminated: { bg: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' }
        };
        return config[status] || config.scheduled;
    };

    const filteredExams = filter === 'all' ? exams : exams.filter(e => e.status === filter);

    return (
        <div className="min-h-screen flex flex-col font-inter bg-white">
            <Navbar />
            <div className="flex-1 max-w-7xl w-full mx-auto p-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="space-y-1">
                        <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Teacher Portal</p>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Dashboard</h1>
                        <p className="text-slate-500 text-sm font-medium">Manage your exams and monitor live sessions.</p>
                    </div>
                    <button
                        onClick={() => navigate('/create-exam')}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-black shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
                    >
                        <PlusCircle size={20} />
                        <span>Create Exam</span>
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-8 flex items-center space-x-3">
                        <AlertTriangle size={20} className="text-red-500 shrink-0" />
                        <p className="text-red-600 text-sm font-bold flex-1">{error}</p>
                        <button onClick={fetchDashboardData} className="text-[10px] bg-red-100 hover:bg-red-200 text-red-700 font-bold px-2 py-1 rounded uppercase tracking-wider transition-colors">Retry</button>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={40} className="text-blue-400 animate-spin mb-4" />
                        <p className="text-slate-400 text-lg font-medium">Loading dashboard data...</p>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Overview Stats */}
                        {overview && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                                {[
                                    { label: 'Total Exams', value: overview.totalExams, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
                                    { label: 'Active', value: overview.activeExams, icon: Activity, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                    { label: 'Completed', value: overview.completedExams, icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                    { label: 'Violations', value: overview.totalViolations, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
                                    { label: 'Students', value: overview.totalStudents, icon: Users, color: 'text-cyan-600', bg: 'bg-cyan-50' },
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                                        <div className="flex items-center space-x-2 mb-3">
                                            <div className={`w-8 h-8 ${stat.bg} rounded-xl flex items-center justify-center`}>
                                                <stat.icon size={16} className={stat.color} />
                                            </div>
                                            <span className="text-slate-400 text-[10px] uppercase tracking-widest font-black">{stat.label}</span>
                                        </div>
                                        <p className="text-3xl font-black text-slate-900 tracking-tighter">{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Filter Tabs */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex space-x-1 bg-slate-50 rounded-full p-1 border border-slate-100">
                                {['all', 'active', 'scheduled', 'completed', 'terminated'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${filter === f
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                                            }`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                            <span className="text-slate-400 text-sm font-medium">{filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Exam Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredExams.length === 0 ? (
                                <div className="col-span-full text-center py-20 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                                    <p className="text-slate-400 text-lg font-medium mb-4">
                                        {filter === 'all' ? 'No exams created yet.' : `No ${filter} exams.`}
                                    </p>
                                    {filter === 'all' && (
                                        <button
                                            onClick={() => navigate('/create-exam')}
                                            className="text-blue-600 hover:text-blue-700 font-bold flex items-center justify-center mx-auto"
                                        >
                                            <PlusCircle size={18} className="mr-2" /> Create your first exam
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredExams.map(exam => {
                                    const statusBadge = getStatusBadge(exam.status);
                                    return (
                                        <div key={exam.id} className="group bg-white rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] flex flex-col overflow-hidden relative">
                                            {/* Left accent bar on hover */}
                                            <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-blue-400 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                            {/* Card Header */}
                                            <div className="p-5 pb-3">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex-1 min-w-0 mr-3">
                                                        <h3 className="text-lg font-black text-slate-900 truncate tracking-tight group-hover:text-blue-700 transition-colors" title={exam.title}>{exam.title}</h3>
                                                        <div className="flex items-center flex-wrap gap-2 mt-2">
                                                            <span className={`inline-flex items-center space-x-1.5 text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${statusBadge.bg}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}></span>
                                                                <span>{exam.status || 'scheduled'}</span>
                                                            </span>
                                                            {exam.exam_code && (
                                                                <div className="inline-flex items-center bg-blue-50 border border-blue-200 rounded-lg pl-2 pr-1 py-1">
                                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mr-2 leading-none">Class Code:</span>
                                                                    <button
                                                                        type="button"
                                                                        className="text-blue-700 font-mono font-bold text-sm tracking-widest cursor-pointer hover:text-blue-900 transition-colors flex items-center leading-none"
                                                                        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(exam.exam_code).then(() => alert('Class code copied!')) }}
                                                                        title="Click to copy class code"
                                                                    >
                                                                        <span>{exam.exam_code}</span>
                                                                        <Copy size={12} className="ml-1 opacity-70" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* ⋯ Menu */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === exam.id ? null : exam.id); }}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                                        >
                                                            <MoreVertical size={16} />
                                                        </button>
                                                        {menuOpenId === exam.id && (
                                                            <div className="absolute right-0 top-8 bg-white border border-slate-200 rounded-xl shadow-2xl py-1 z-50 min-w-[160px]">
                                                                <button onClick={() => { setMenuOpenId(null); handleChangeTime(exam.id); }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                                                    <Clock size={14} className="text-blue-500" />
                                                                    <span>Change Duration</span>
                                                                </button>
                                                                <button onClick={() => { setMenuOpenId(null); handleReschedule(exam.id); }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                                                    <CalendarClock size={14} className="text-violet-500" />
                                                                    <span>Reschedule</span>
                                                                </button>
                                                                <button onClick={() => { setMenuOpenId(null); handleExportCSV(exam.id); }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                                                    <Download size={14} className="text-emerald-500" />
                                                                    <span>Export CSV</span>
                                                                </button>
                                                                <button onClick={() => { setMenuOpenId(null); handleViewFlagged(exam.id); }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                                                                    <Flag size={14} className="text-orange-500" />
                                                                    <span>Flagged Students</span>
                                                                </button>
                                                                {exam.status === 'active' && (
                                                                    <button onClick={() => { setMenuOpenId(null); handleTerminate(exam.id); }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                                                        <XCircle size={14} />
                                                                        <span>Terminate</span>
                                                                    </button>
                                                                )}
                                                                <div className="border-t border-slate-100 my-1"></div>
                                                                <button onClick={() => { setMenuOpenId(null); handleDelete(exam.id); }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                                                                    <Trash2 size={14} />
                                                                    <span>Delete Exam</span>
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Meta Info */}
                                                <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 font-medium mt-3">
                                                    <span className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-md text-[11px]"><Clock size={11} className="inline mr-1 -mt-px text-slate-400" />{exam.duration} min</span>
                                                    <span className="bg-slate-50 border border-slate-100 px-2 py-1 rounded-md font-mono text-[11px]">ID: {exam.id}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="mt-auto p-5 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => navigate(`/monitor/${exam.id}`, { state: { tab: 'live' } })}
                                                    className="flex-1 min-w-[calc(50%-0.25rem)] flex items-center justify-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
                                                >
                                                    <Activity size={14} />
                                                    <span>Live Monitor</span>
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/monitor/${exam.id}`, { state: { tab: 'logs' } })}
                                                    className="flex-1 min-w-[calc(50%-0.25rem)] flex items-center justify-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-colors shadow-sm"
                                                >
                                                    <Eye size={14} />
                                                    <span>View Logs</span>
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/exam-results/${exam.id}`)}
                                                    className="flex-1 min-w-[calc(50%-0.25rem)] flex items-center justify-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 py-2.5 rounded-xl text-xs font-bold transition-colors border border-indigo-100"
                                                >
                                                    <Trophy size={14} />
                                                    <span>Results</span>
                                                </button>
                                                {exam.status === 'active' && (
                                                    <button
                                                        onClick={() => setChatExamId(chatExamId === exam.id ? null : exam.id)}
                                                        className={`flex-1 min-w-[calc(50%-0.25rem)] flex items-center justify-center space-x-1.5 py-2.5 rounded-xl text-xs font-bold transition-colors border ${chatExamId === exam.id
                                                            ? 'bg-blue-600 text-white border-blue-600'
                                                            : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-100'
                                                            }`}
                                                    >
                                                        <MessageSquare size={14} />
                                                        <span>{chatExamId === exam.id ? 'Close Chat' : 'Chat'}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </>
                )}
            </div>

            {chatExamId && <ChatBox examId={chatExamId} />}
        </div>
    );
};

export default TeacherDashboard;
