import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { PlusCircle, Eye, Activity, BarChart3, Users, AlertTriangle, Flag, Download, Trophy, CheckCircle2, Loader2, Clock, XCircle, CalendarClock, Copy } from 'lucide-react';

const TeacherDashboard = () => {
    const [exams, setExams] = useState([]);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
                // Preserve existing exams state; show error instead of empty list
                setError('Failed to load exams. Please try again.');
            }
            if (overviewResult.status === 'fulfilled') {
                setOverview(overviewResult.value.data);
            } else {
                console.error('Failed to fetch overview', overviewResult.reason);
                // Preserve existing overview state; don't overwrite with null
                if (!error) setError('Failed to load overview data. Please try again.');
            }
            // Show combined error if both failed
            if (examsResult.status === 'rejected' && overviewResult.status === 'rejected') {
                setError('Failed to load dashboard data. Please try again.');
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

    const handleViewStats = async (examId) => {
        try {
            const res = await api.get(`/exam/${examId}/stats`);
            const s = res.data;
            alert(`Exam Stats:\n\n• Students Joined: ${s.studentsJoined}\n• Submissions: ${s.submissions}\n• Violations: ${s.violations}\n• Flagged: ${s.flaggedStudents}\n• Status: ${s.exam.status}`);
        } catch (err) {
            console.error('Failed to fetch stats', err);
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

    const handleReschedule = async (examId) => {
        const input = prompt('Enter new scheduled time with timezone (e.g. 2026-03-01T10:00-08:00 or 2026-03-01T18:00Z):');
        if (!input) return;

        const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
        if (!iso8601Regex.test(input)) {
            alert('Please enter a valid ISO-8601 date/time with an explicit timezone (e.g., 2026-03-01T10:00-08:00 or 2026-03-01T18:00Z).');
            return;
        }

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
        const colors = {
            scheduled: 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50',
            active: 'bg-green-900/30 text-green-400 border-green-900/50',
            completed: 'bg-slate-700/50 text-slate-400 border-slate-600',
            terminated: 'bg-red-900/30 text-red-400 border-red-900/50'
        };
        return colors[status] || colors.scheduled;
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            <div className="flex-1 max-w-7xl w-full mx-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Teacher Dashboard</h1>
                        <p className="text-slate-400">Manage your exams and monitor live sessions.</p>
                    </div>
                    <div className="flex space-x-4">
                        <button
                            onClick={() => navigate('/create-exam')}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                        >
                            <PlusCircle size={20} />
                            <span>Create Exam</span>
                        </button>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-900/30 border border-red-900/50 rounded-xl p-4 mb-8 flex items-center space-x-3">
                        <AlertTriangle size={20} className="text-red-400 shrink-0" />
                        <p className="text-red-300">{error}</p>
                        <button
                            onClick={() => fetchDashboardData()}
                            className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium underline"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 size={40} className="text-blue-400 animate-spin mb-4" />
                        <p className="text-slate-400 text-lg">Loading dashboard data...</p>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Performance Overview Section */}
                        {overview && (
                            <div className="mb-8">
                                <h2 className="text-lg font-semibold text-slate-300 mb-4 uppercase tracking-wider">Performance Overview</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <BarChart3 size={16} className="text-blue-400" />
                                            <span className="text-slate-400 text-xs uppercase tracking-wider">Total Exams</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">{overview.totalExams}</p>
                                    </div>
                                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Activity size={16} className="text-green-400" />
                                            <span className="text-slate-400 text-xs uppercase tracking-wider">Active Exams</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">{overview.activeExams}</p>
                                    </div>
                                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <CheckCircle2 size={16} className="text-emerald-400" />
                                            <span className="text-slate-400 text-xs uppercase tracking-wider">Completed Exams</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">{overview.completedExams}</p>
                                    </div>
                                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <AlertTriangle size={16} className="text-orange-400" />
                                            <span className="text-slate-400 text-xs uppercase tracking-wider">Total Violations</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">{overview.totalViolations}</p>
                                    </div>
                                    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                                        <div className="flex items-center space-x-2 mb-2">
                                            <Users size={16} className="text-cyan-400" />
                                            <span className="text-slate-400 text-xs uppercase tracking-wider">Total Students Appeared</span>
                                        </div>
                                        <p className="text-2xl font-bold text-white">{overview.totalStudents}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Exam Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {exams.length === 0 ? (
                                <div className="col-span-full text-center py-20 bg-slate-800/50 rounded-2xl border border-slate-700/50 border-dashed">
                                    <p className="text-slate-400 text-lg mb-4">No exams created yet.</p>
                                    <button
                                        onClick={() => navigate('/create-exam')}
                                        className="text-blue-400 hover:text-blue-300 font-semibold flex items-center justify-center w-full max-w-[200px] mx-auto"
                                    >
                                        <PlusCircle size={18} className="mr-2" /> Create your first exam
                                    </button>
                                </div>
                            ) : (
                                exams.map(exam => (
                                    <div key={exam.id} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-slate-600 transition-colors shadow-lg shadow-slate-900/50 flex flex-col">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-xl font-bold text-slate-100">{exam.title}</h3>
                                                <span className={`text-xs px-2 py-1 rounded-lg border font-medium capitalize ${getStatusBadge(exam.status)}`}>
                                                    {exam.status || 'scheduled'}
                                                </span>
                                            </div>
                                            <div className="flex items-center flex-wrap gap-2 text-slate-400 text-sm mb-4">
                                                <span className="bg-slate-900 px-2 py-1 rounded">Duration: {exam.duration} mins</span>
                                                <span className="bg-slate-900 px-2 py-1 rounded">ID: {exam.id}</span>
                                                {exam.exam_code && (
                                                    <button
                                                        type="button"
                                                        aria-label="Copy exam code"
                                                        className="bg-blue-900/30 text-blue-400 border border-blue-900/50 px-2 py-1 rounded font-mono cursor-pointer hover:bg-blue-900/50 transition-colors flex items-center space-x-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(exam.exam_code)
                                                                .then(() => alert('Exam code copied!'))
                                                                .catch(err => console.error('Failed to copy text: ', err));
                                                        }}
                                                        title="Click to copy exam code"
                                                    >
                                                        <Copy size={12} />
                                                        <span>Code: {exam.exam_code}</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-slate-700 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    onClick={() => navigate(`/monitor/${exam.id}`)}
                                                    className="flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    <Activity size={16} />
                                                    <span>Live Monitor</span>
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/monitor/${exam.id}`)}
                                                    className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
                                                >
                                                    <Eye size={16} />
                                                    <span>View Logs</span>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <button
                                                    onClick={() => handleChangeTime(exam.id)}
                                                    className="flex items-center justify-center space-x-1 bg-blue-900/30 hover:bg-blue-900/50 text-blue-400 py-2 rounded-lg text-xs font-medium transition-colors border border-blue-900/50"
                                                >
                                                    <Clock size={14} />
                                                    <span>Change Time</span>
                                                </button>
                                                <button
                                                    onClick={() => handleTerminate(exam.id)}
                                                    className="flex items-center justify-center space-x-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 py-2 rounded-lg text-xs font-medium transition-colors border border-red-900/50"
                                                >
                                                    <XCircle size={14} />
                                                    <span>Terminate</span>
                                                </button>
                                                <button
                                                    onClick={() => handleReschedule(exam.id)}
                                                    className="flex items-center justify-center space-x-1 bg-violet-900/30 hover:bg-violet-900/50 text-violet-400 py-2 rounded-lg text-xs font-medium transition-colors border border-violet-900/50"
                                                >
                                                    <CalendarClock size={14} />
                                                    <span>Reschedule</span>
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-2">
                                                <button
                                                    onClick={() => handleViewStats(exam.id)}
                                                    className="flex items-center justify-center space-x-1 bg-cyan-900/30 hover:bg-cyan-900/50 text-cyan-400 py-2 rounded-lg text-xs font-medium transition-colors border border-cyan-900/50"
                                                >
                                                    <BarChart3 size={14} />
                                                    <span>Stats</span>
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/exam-results/${exam.id}`)}
                                                    className="flex items-center justify-center space-x-1 bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 py-2 rounded-lg text-xs font-medium transition-colors border border-amber-900/50"
                                                >
                                                    <Trophy size={14} />
                                                    <span>Results</span>
                                                </button>
                                                <button
                                                    onClick={() => handleViewFlagged(exam.id)}
                                                    className="flex items-center justify-center space-x-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 py-2 rounded-lg text-xs font-medium transition-colors border border-red-900/50"
                                                >
                                                    <Flag size={14} />
                                                    <span>Flagged</span>
                                                </button>
                                                <button
                                                    onClick={() => handleExportCSV(exam.id)}
                                                    className="flex items-center justify-center space-x-1 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 py-2 rounded-lg text-xs font-medium transition-colors border border-emerald-900/50"
                                                >
                                                    <Download size={14} />
                                                    <span>Export</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div >
        </div >
    );
};

export default TeacherDashboard;
