import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { PlusCircle, Eye, Activity, BarChart3, Users, AlertTriangle, Flag, Download, Trophy, CheckCircle2, Loader2, Clock, XCircle, CalendarClock, Copy, MessageSquare, Trash2, MoreVertical, StopCircle, TimerReset, UserCheck } from 'lucide-react';
import ChatBox from '../components/ChatBox';
import { useToast } from '../hooks/useToast';
import ToastOverlay from '../components/ToastOverlay';

/* ===== Confirm Modal ===== */
const ConfirmModal = ({ title, message, onConfirm, onCancel, danger }) => (
    <div style={{ backgroundColor: 'var(--modal-overlay)' }} className="fixed inset-0 flex items-center justify-center z-[100]" onClick={onCancel}>
        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl p-6 shadow-2xl w-full max-w-sm mx-4 border" onClick={e => e.stopPropagation()}>
            <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-2">{title}</h3>
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm mb-6">{message}</p>
            <div className="flex space-x-3">
                <button onClick={onCancel} className="btn btn-ghost flex-1">Cancel</button>
                <button onClick={onConfirm} className={`btn flex-1 ${danger ? 'btn-danger' : 'btn-primary'}`}>Confirm</button>
            </div>
        </div>
    </div>
);

const TeacherDashboard = () => {
    const [exams, setExams] = useState([]);
    const [overview, setOverview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chatExamId, setChatExamId] = useState(null);
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [filter, setFilter] = useState('all');
    const navigate = useNavigate();
    const { toasts, addToast, removeToast } = useToast();

    // Modal state
    const [modal, setModal] = useState(null);
    const [modalInput, setModalInput] = useState('');
    const [confirm, setConfirm] = useState(null);

    const openModal = (title, placeholder, examId, type) => { setModalInput(''); setModal({ title, placeholder, examId, type }); };
    const closeModal = () => { setModal(null); setModalInput(''); };

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [examsResult, overviewResult] = await Promise.allSettled([
                api.get('/exam'),
                api.get('/dashboard/overview')
            ]);
            if (examsResult.status === 'fulfilled') setExams(examsResult.value.data);
            else console.error('Failed to fetch exams', examsResult.reason);
            if (overviewResult.status === 'fulfilled') setOverview(overviewResult.value.data);
            else console.error('Failed to fetch overview', overviewResult.reason);
            if (examsResult.status === 'rejected' && overviewResult.status === 'rejected') setError('Failed to load dashboard data. Please try again.');
            else setError(null);
        } catch (err) {
            console.error('Failed to fetch dashboard data', err);
            setError('Failed to load dashboard data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboardData(); }, []);

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
            addToast('CSV exported successfully', 'success');
        } catch (err) {
            console.error('Export failed', err);
            addToast('Export failed: ' + (err.message || 'Unknown error'), 'error');
        } finally {
            if (url) window.URL.revokeObjectURL(url);
        }
    };

    const handleViewFlagged = async (examId) => {
        try {
            const res = await api.get(`/exam/${examId}/flagged`);
            const flagged = res.data;
            if (flagged.length === 0) {
                addToast('No flagged students for this exam.', 'info');
            } else {
                const list = flagged.map(s => `${s.name} (${s.email}) — ${s.violation_count} violations`).join(', ');
                addToast(`Flagged: ${list}`, 'info');
            }
        } catch (err) {
            console.error('Failed to fetch flagged', err);
            addToast('Failed to fetch flagged students.', 'error');
        }
    };

    const handleModalSubmit = async () => {
        if (!modal || !modalInput.trim()) return;
        const { examId, type } = modal;
        const value = modalInput.trim();
        try {
            if (type === 'changeDuration') {
                const duration = Number(value);
                if (isNaN(duration) || duration <= 0) { addToast('Enter a valid positive number.', 'error'); return; }
                await api.patch(`/exam/${examId}/time`, { duration });
                addToast('Duration updated successfully.', 'success');
            } else if (type === 'extendTime') {
                const extra_minutes = Number(value);
                if (isNaN(extra_minutes) || extra_minutes <= 0) { addToast('Enter a valid positive number.', 'error'); return; }
                await api.patch(`/exam/${examId}/extend`, { extra_minutes });
                addToast(`Extended by ${extra_minutes} minutes.`, 'success');
            } else if (type === 'reschedule') {
                const parsedDate = new Date(value);
                if (isNaN(parsedDate.getTime())) { addToast('Invalid date format.', 'error'); return; }
                await api.patch(`/exam/${examId}/reschedule`, { new_time: parsedDate.toISOString() });
                addToast('Exam rescheduled.', 'success');
            } else if (type === 'grantReattempt') {
                const id = Number(value);
                if (isNaN(id) || id <= 0) { addToast('Enter a valid Student ID.', 'error'); return; }
                await api.patch(`/exam/${examId}/grant/${id}`);
                addToast('Reattempt granted.', 'success');
            }
            fetchDashboardData();
        } catch (err) {
            console.error(`Failed: ${type}`, err);
            addToast(err.response?.data?.message || 'Action failed.', 'error');
        }
        closeModal();
    };

    const handleChangeTime = (examId) => openModal('Change Duration', 'Enter new duration in minutes', examId, 'changeDuration');
    const handleExtendTime = (examId) => openModal('Extend Time', 'Enter extra minutes to add', examId, 'extendTime');
    const handleGrantReattempt = (examId) => openModal('Grant Reattempt', 'Enter Student ID', examId, 'grantReattempt');
    const handleReschedule = (examId) => openModal('Reschedule Exam', 'e.g. 2026-03-01T10:00+05:30', examId, 'reschedule');

    const handleTerminate = (examId) => {
        setConfirm({
            title: 'Terminate Exam',
            message: 'This action cannot be undone. All active sessions will be terminated immediately.',
            danger: true,
            onConfirm: async () => {
                setConfirm(null);
                try {
                    await api.patch(`/exam/${examId}/terminate`, { status: 'terminated' });
                    addToast('Exam terminated.', 'success');
                    fetchDashboardData();
                } catch (err) {
                    console.error('Failed to terminate exam', err);
                    addToast('Failed to terminate exam.', 'error');
                }
            }
        });
    };

    const handleDelete = (examId) => {
        setConfirm({
            title: 'Delete Exam',
            message: 'This will permanently remove all submissions, scores, and monitoring data. This action CANNOT be undone.',
            danger: true,
            onConfirm: async () => {
                setConfirm(null);
                try {
                    await api.delete(`/exam/${examId}`);
                    addToast('Exam deleted.', 'success');
                    fetchDashboardData();
                } catch (err) {
                    console.error('Failed to delete exam', err);
                    addToast('Failed to delete exam.', 'error');
                }
            }
        });
    };

    const handleStopExam = (examId) => {
        setConfirm({
            title: 'Stop Exam',
            message: 'Are you sure you want to stop this exam?',
            danger: true,
            onConfirm: async () => {
                setConfirm(null);
                try {
                    await api.patch(`/exam/${examId}/stop`);
                    addToast('Exam stopped.', 'success');
                    fetchDashboardData();
                } catch (err) {
                    console.error('Failed to stop exam', err);
                    addToast('Failed to stop exam.', 'error');
                }
            }
        });
    };

    const getStatusBadge = (status) => {
        const config = {
            scheduled: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
            active: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500 animate-pulse' },
            completed: { bg: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
            terminated: { bg: 'bg-red-50 text-red-600 border-red-200', dot: 'bg-red-500' },
            stopped: { bg: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-500' }
        };
        return config[status] || config.scheduled;
    };

    const filteredExams = filter === 'all' ? exams : exams.filter(e => e.status === filter);

    return (
        <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} className="min-h-screen flex flex-col font-inter transition-colors duration-200">
            <Navbar />

            <ToastOverlay toasts={toasts} removeToast={removeToast} />

            <div className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 lg:px-8">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div className="space-y-1">
                        <p style={{ color: 'var(--accent-color)' }} className="text-[11px] font-semibold uppercase tracking-widest">Teacher Portal</p>
                        <h1 style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p style={{ color: 'var(--text-secondary)' }} className="text-sm font-medium">Manage your exams and monitor live sessions.</p>
                    </div>
                    <button onClick={() => navigate('/create-exam')} className="btn btn-primary">
                        <PlusCircle size={18} />
                        <span>Create Exam</span>
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ backgroundColor: 'var(--danger-light)', borderColor: 'var(--danger-color)' }} className="border rounded-xl p-4 mb-8 flex items-center space-x-3">
                        <AlertTriangle size={18} style={{ color: 'var(--danger-color)' }} className="shrink-0" />
                        <p style={{ color: 'var(--danger-color)' }} className="text-sm font-medium flex-1">{error}</p>
                        <button onClick={fetchDashboardData} className="btn btn-sm btn-ghost">Retry</button>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 size={36} style={{ color: 'var(--accent-color)' }} className="animate-spin mb-4" />
                        <p style={{ color: 'var(--text-muted)' }} className="text-base font-medium">Loading dashboard data...</p>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Overview Stats */}
                        {overview && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                                {[
                                    { label: 'Total Exams', value: overview.totalExams, icon: BarChart3, color: '#2F5D9F', bg: 'var(--accent-light)' },
                                    { label: 'Active', value: overview.activeExams, icon: Activity, color: '#2A7F62', bg: 'var(--success-light)' },
                                    { label: 'Completed', value: overview.completedExams, icon: CheckCircle2, color: '#3B7A78', bg: 'var(--teal-light)' },
                                    { label: 'Violations', value: overview.totalViolations, icon: AlertTriangle, color: '#D97706', bg: 'var(--warning-light)' },
                                    { label: 'Students', value: overview.totalStudents, icon: Users, color: '#1E2A38', bg: 'var(--bg-card-hover)' },
                                ].map((stat, i) => (
                                    <div key={i} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--stat-shadow)' }} className="rounded-xl p-5 border transition-colors duration-200">
                                        <div className="flex items-center space-x-2 mb-3">
                                            <div style={{ backgroundColor: stat.bg }} className="w-9 h-9 rounded-lg flex items-center justify-center">
                                                <stat.icon size={16} style={{ color: stat.color }} />
                                            </div>
                                            <span style={{ color: 'var(--text-muted)' }} className="text-[10px] uppercase tracking-widest font-semibold">{stat.label}</span>
                                        </div>
                                        <p style={{ color: 'var(--text-primary)' }} className="text-3xl font-bold tracking-tight">{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ borderColor: 'var(--border-color)' }} className="border-t mb-6"></div>

                        {/* Filter Tabs */}
                        <div className="flex items-center justify-between mb-6">
                            <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="flex space-x-0.5 rounded-lg p-1 border">
                                {['all', 'active', 'scheduled', 'completed', 'terminated', 'stopped'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        style={filter === f ? { backgroundColor: 'var(--accent-color)', color: '#FFF' } : { color: 'var(--text-secondary)' }}
                                        className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${filter !== f ? 'hover:opacity-80' : ''}`}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                            <span style={{ color: 'var(--text-muted)' }} className="text-sm font-medium">{filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* Exam Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredExams.length === 0 ? (
                                <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="col-span-full text-center py-20 rounded-xl border border-dashed">
                                    <p style={{ color: 'var(--text-muted)' }} className="text-base font-medium mb-4">
                                        {filter === 'all' ? 'No exams created yet.' : `No ${filter} exams.`}
                                    </p>
                                    {filter === 'all' && (
                                        <button onClick={() => navigate('/create-exam')} className="btn btn-secondary btn-sm mx-auto">
                                            <PlusCircle size={14} /> Create your first exam
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredExams.map(exam => {
                                    const statusBadge = getStatusBadge(exam.status);
                                    return (
                                        <div key={exam.id} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--card-shadow)' }}
                                            className="group rounded-xl border hover:shadow-md transition-all duration-200 flex flex-col relative">
                                            <div style={{ backgroundColor: 'var(--accent-color)' }} className="absolute left-0 top-0 bottom-0 w-[3px] opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>

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

                                                    {/* Menu */}
                                                    <div className="relative">
                                                        <button onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === exam.id ? null : exam.id); }}
                                                            style={{ color: 'var(--text-muted)' }} className="p-1.5 rounded-lg hover:opacity-70 transition-colors">
                                                            <MoreVertical size={16} />
                                                        </button>
                                                        {menuOpenId === exam.id && (
                                                            <div style={{ backgroundColor: 'var(--menu-bg)', borderColor: 'var(--border-color)' }} className="absolute right-0 top-8 border rounded-xl shadow-xl py-1 z-50 min-w-[170px] max-h-[280px] overflow-y-auto">
                                                                <button onClick={() => { setMenuOpenId(null); handleChangeTime(exam.id); }} style={{ color: 'var(--text-primary)' }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:opacity-80 transition-colors">
                                                                    <Clock size={14} style={{ color: 'var(--accent-color)' }} /><span>Change Duration</span>
                                                                </button>
                                                                <button onClick={() => { setMenuOpenId(null); handleReschedule(exam.id); }} style={{ color: 'var(--text-primary)' }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:opacity-80 transition-colors">
                                                                    <CalendarClock size={14} style={{ color: '#3B7A78' }} /><span>Reschedule</span>
                                                                </button>
                                                                <button onClick={() => { setMenuOpenId(null); handleExportCSV(exam.id); }} style={{ color: 'var(--text-primary)' }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:opacity-80 transition-colors">
                                                                    <Download size={14} style={{ color: 'var(--success-color)' }} /><span>Export CSV</span>
                                                                </button>
                                                                <button onClick={() => { setMenuOpenId(null); handleViewFlagged(exam.id); }} style={{ color: 'var(--text-primary)' }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:opacity-80 transition-colors">
                                                                    <Flag size={14} style={{ color: '#D97706' }} /><span>Flagged Students</span>
                                                                </button>
                                                                {exam.status === 'active' && (
                                                                    <>
                                                                        <button onClick={() => { setMenuOpenId(null); handleTerminate(exam.id); }} style={{ color: 'var(--danger-color)' }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:opacity-80 transition-colors">
                                                                            <XCircle size={14} /><span>Terminate</span>
                                                                        </button>
                                                                        <button onClick={() => { setMenuOpenId(null); handleStopExam(exam.id); }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-orange-500 hover:opacity-80 transition-colors">
                                                                            <StopCircle size={14} /><span>Stop Exam</span>
                                                                        </button>
                                                                        <button onClick={() => { setMenuOpenId(null); handleExtendTime(exam.id); }} style={{ color: 'var(--accent-color)' }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:opacity-80 transition-colors">
                                                                            <TimerReset size={14} /><span>Extend Time</span>
                                                                        </button>
                                                                    </>
                                                                )}
                                                                <button onClick={() => { setMenuOpenId(null); handleGrantReattempt(exam.id); }} style={{ color: 'var(--success-color)' }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:opacity-80 transition-colors">
                                                                    <UserCheck size={14} /><span>Grant Reattempt</span>
                                                                </button>
                                                                <div style={{ borderColor: 'var(--border-color)' }} className="border-t my-1"></div>
                                                                <button onClick={() => { setMenuOpenId(null); handleDelete(exam.id); }} style={{ color: 'var(--danger-color)' }} className="w-full flex items-center space-x-2 px-4 py-2 text-sm hover:opacity-80 transition-colors">
                                                                    <Trash2 size={14} /><span>Delete Exam</span>
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
                                            <div style={{ borderColor: 'var(--border-color)' }} className="mt-auto p-4 pt-3 border-t flex flex-wrap gap-2">
                                                <button onClick={() => navigate(`/monitor/${exam.id}`, { state: { tab: 'live' } })}
                                                    style={{ backgroundColor: '#1E2A38' }}
                                                    className="flex-1 min-w-[calc(50%-0.25rem)] flex items-center justify-center space-x-1.5 text-white py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90">
                                                    <Activity size={13} /><span>Live Monitor</span>
                                                </button>
                                                <button onClick={() => navigate(`/monitor/${exam.id}`, { state: { tab: 'logs' } })}
                                                    style={{ backgroundColor: 'var(--accent-color)' }}
                                                    className="flex-1 min-w-[calc(50%-0.25rem)] flex items-center justify-center space-x-1.5 text-white py-2 rounded-lg text-xs font-semibold transition-colors hover:opacity-90">
                                                    <Eye size={13} /><span>View Logs</span>
                                                </button>
                                                <button onClick={() => navigate(`/exam-results/${exam.id}`)}
                                                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', borderColor: 'var(--accent-color)' }}
                                                    className="flex-1 min-w-[calc(50%-0.25rem)] flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-semibold transition-colors border hover:opacity-80">
                                                    <Trophy size={13} /><span>Results</span>
                                                </button>
                                                {exam.status === 'active' && (
                                                    <button onClick={() => setChatExamId(chatExamId === exam.id ? null : exam.id)}
                                                        style={chatExamId === exam.id
                                                            ? { backgroundColor: 'var(--accent-color)', color: '#FFF', borderColor: 'var(--accent-color)' }
                                                            : { backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', borderColor: 'var(--accent-color)' }
                                                        }
                                                        className="flex-1 min-w-[calc(50%-0.25rem)] flex items-center justify-center space-x-1.5 py-2 rounded-lg text-xs font-semibold transition-colors border">
                                                        <MessageSquare size={13} /><span>{chatExamId === exam.id ? 'Close Chat' : 'Chat'}</span>
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

            {/* Input Modal */}
            {modal && (
                <div style={{ backgroundColor: 'var(--modal-overlay)' }} className="fixed inset-0 flex items-center justify-center z-[100]" onClick={closeModal}>
                    <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl p-6 shadow-2xl w-full max-w-sm mx-4 border" onClick={e => e.stopPropagation()}>
                        <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-semibold mb-4">{modal.title}</h3>
                        <input autoFocus type="text" value={modalInput} onChange={e => setModalInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleModalSubmit(); }}
                            placeholder={modal.placeholder} className="input-field mb-4" />
                        <div className="flex space-x-3">
                            <button onClick={closeModal} className="btn btn-ghost flex-1">Cancel</button>
                            <button onClick={handleModalSubmit} className="btn btn-primary flex-1">Submit</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Modal */}
            {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
        </div>
    );
};

export default TeacherDashboard;
