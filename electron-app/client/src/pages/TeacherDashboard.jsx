import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { PlusCircle, Eye, Activity, BarChart3, Users, AlertTriangle, Flag, Download, Trophy } from 'lucide-react';

const TeacherDashboard = () => {
    const [exams, setExams] = useState([]);
    const [stats, setStats] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const res = await api.get('/exam');
                setExams(res.data);
            } catch (err) {
                console.error('Failed to fetch exams', err);
            }
        };
        const fetchStats = async () => {
            try {
                const res = await api.get('/dashboard/stats');
                setStats(res.data);
            } catch (err) {
                console.error('Failed to fetch stats', err);
            }
        };
        fetchExams();
        fetchStats();
    }, []);

    const handleExportCSV = async (examId) => {
        try {
            const res = await api.get(`/exam/${examId}/export`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `exam_${examId}_logs.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error('Export failed', err);
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

    const getStatusBadge = (status) => {
        const colors = {
            scheduled: 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50',
            active: 'bg-green-900/30 text-green-400 border-green-900/50',
            completed: 'bg-slate-700/50 text-slate-400 border-slate-600'
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
                    <button
                        onClick={() => navigate('/create-exam')}
                        className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                    >
                        <PlusCircle size={20} />
                        <span>Create Exam</span>
                    </button>
                </div>

                {/* Dashboard Stats Cards */}
                {stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center space-x-2 mb-2">
                                <BarChart3 size={16} className="text-blue-400" />
                                <span className="text-slate-400 text-xs uppercase tracking-wider">Total Exams</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{stats.totalExams}</p>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center space-x-2 mb-2">
                                <Activity size={16} className="text-green-400" />
                                <span className="text-slate-400 text-xs uppercase tracking-wider">Active</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{stats.activeExams}</p>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center space-x-2 mb-2">
                                <Users size={16} className="text-cyan-400" />
                                <span className="text-slate-400 text-xs uppercase tracking-wider">Students</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{stats.totalStudents}</p>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center space-x-2 mb-2">
                                <AlertTriangle size={16} className="text-orange-400" />
                                <span className="text-slate-400 text-xs uppercase tracking-wider">Violations</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{stats.totalViolations}</p>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center space-x-2 mb-2">
                                <Flag size={16} className="text-red-400" />
                                <span className="text-slate-400 text-xs uppercase tracking-wider">Flagged</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{stats.flaggedStudents}</p>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                            <div className="flex items-center space-x-2 mb-2">
                                <BarChart3 size={16} className="text-purple-400" />
                                <span className="text-slate-400 text-xs uppercase tracking-wider">Avg Time</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{stats.avgCompletionMinutes}<span className="text-sm text-slate-400 ml-1">min</span></p>
                        </div>
                    </div>
                )}

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
                                    <div className="flex items-center space-x-2 text-slate-400 text-sm mb-4">
                                        <span className="bg-slate-900 px-2 py-1 rounded">Duration: {exam.duration} mins</span>
                                        <span className="bg-slate-900 px-2 py-1 rounded">ID: {exam.id}</span>
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
            </div >
        </div >
    );
};

export default TeacherDashboard;
