import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { PlusCircle, Eye, Activity, BarChart3, Users, AlertTriangle, Flag, Download, Trophy, CheckCircle2, Loader2, Clock, XCircle, CalendarClock, Copy, MessageSquare, Trash2, MoreVertical, StopCircle, TimerReset, UserCheck, Upload, ChevronDown, ChevronUp } from 'lucide-react';
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

    // CSV Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState(null);
    const fileInputRef = React.useRef(null);

    // Question Bank viewer state
    const [questionBank, setQuestionBank] = useState([]);
    const [qbLoading, setQbLoading] = useState(false);
    const [qbOpen, setQbOpen] = useState(false);

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

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        setUploading(true);
        setUploadResult(null);
        try {
            const res = await api.post('/api/questions/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadResult({ success: true, data: res.data });
            addToast(`Successfully inserted ${res.data.inserted} questions.`, 'success');
            if (res.data.failed > 0) {
                addToast(`${res.data.failed} rows failed validation. See summary.`, 'warning');
            }
        } catch (err) {
            console.error('CSV Upload Error:', err);
            const msg = err.response?.data?.message || 'Failed to upload CSV';
            setUploadResult({ success: false, error: msg });
            addToast(msg, 'error');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const fetchQuestionBank = async () => {
        setQbLoading(true);
        try {
            const res = await api.get('/api/questions');
            setQuestionBank(res.data.questions || []);
        } catch (err) {
            console.error('Fetch question bank error:', err);
            addToast('Failed to load question bank.', 'error');
        } finally {
            setQbLoading(false);
        }
    };

    const toggleQuestionBank = () => {
        if (!qbOpen) fetchQuestionBank();
        setQbOpen(!qbOpen);
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
                const email = value;
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) { addToast('Enter a valid student email.', 'error'); return; }
                await api.patch(`/exam/${examId}/grant`, { email });
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
    const handleGrantReattempt = (examId) => openModal('Grant Reattempt', 'Enter Student Email', examId, 'grantReattempt');
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

    const statItems = overview ? [
        { label: 'Total Exams', value: overview.totalExams, icon: BarChart3, color: '#2F5D9F', bg: 'var(--accent-light)' },
        { label: 'Active', value: overview.activeExams, icon: Activity, color: '#2A7F62', bg: 'var(--success-light)' },
        { label: 'Completed', value: overview.completedExams, icon: CheckCircle2, color: '#3B7A78', bg: 'var(--teal-light)' },
        { label: 'Violations', value: overview.totalViolations, icon: AlertTriangle, color: '#D97706', bg: 'var(--warning-light)' },
        { label: 'Students', value: overview.totalStudents, icon: Users, color: '#64748B', bg: 'var(--bg-card-hover)' },
    ] : [];

    const filterTabs = ['all', 'active', 'scheduled', 'completed', 'terminated', 'stopped'];

    return (
        <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} className="min-h-screen flex flex-col font-inter transition-colors duration-200">
            <Navbar />
            <ToastOverlay toasts={toasts} removeToast={removeToast} />

            <div className="flex-1 w-full max-w-7xl mx-auto" style={{ padding: '32px 24px' }}>

                {/* ===== 1. HEADER ===== */}
                <div className="flex justify-between items-end" style={{ marginBottom: '32px' }}>
                    <div>
                        <p style={{ color: 'var(--accent-color)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>Teacher Portal</p>
                        <h1 style={{ color: 'var(--text-primary)', fontSize: '32px', fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', margin: 0 }}>Dashboard</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 500, marginTop: '6px' }}>Manage exams, monitor sessions, and review submissions.</p>
                    </div>
                    <button onClick={() => navigate('/create-exam')}
                        style={{ backgroundColor: 'var(--accent-color)', color: '#FFF', padding: '12px 28px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 2px 8px rgba(47, 93, 159, 0.25)', transition: 'all 0.15s ease' }}
                        className="hover:opacity-90 active:scale-[0.98]">
                        <PlusCircle size={18} strokeWidth={2.5} />
                        <span>Create Exam</span>
                    </button>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ backgroundColor: 'var(--danger-light)', borderColor: 'var(--danger-color)', marginBottom: '24px' }} className="border rounded-xl p-4 flex items-center space-x-3">
                        <AlertTriangle size={18} style={{ color: 'var(--danger-color)' }} className="shrink-0" />
                        <p style={{ color: 'var(--danger-color)' }} className="text-sm font-medium flex-1">{error}</p>
                        <button onClick={fetchDashboardData} className="btn btn-sm btn-ghost">Retry</button>
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div className="flex flex-col items-center justify-center" style={{ paddingTop: '96px', paddingBottom: '96px' }}>
                        <Loader2 size={32} style={{ color: 'var(--accent-color)' }} className="animate-spin" />
                        <p style={{ color: 'var(--text-muted)', marginTop: '16px', fontSize: '14px', fontWeight: 500 }}>Loading dashboard…</p>
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* ===== 2. STATS ROW ===== */}
                        {overview && (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                                {statItems.map((stat) => (
                                    <div key={stat.label} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px 20px', boxShadow: 'var(--stat-shadow)', transition: 'all 0.15s ease' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                            <div style={{ backgroundColor: stat.bg, width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <stat.icon size={15} style={{ color: stat.color }} />
                                            </div>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</span>
                                        </div>
                                        <p style={{ color: 'var(--text-primary)', fontSize: '28px', fontWeight: 700, lineHeight: 1, letterSpacing: '-0.02em', margin: 0 }}>{stat.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Bulk Upload CSV */}
                        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--card-shadow)' }} className="rounded-xl p-6 border mb-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h3 style={{ color: 'var(--text-primary)' }} className="text-lg font-bold tracking-tight mb-1">Question Bank Upload</h3>
                                    <p style={{ color: 'var(--text-secondary)' }} className="text-sm font-medium">Bulk upload MCQ and Subjective questions via a unified CSV format.</p>
                                </div>
                                <div className="flex items-center">
                                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                                    <button onClick={() => fileInputRef.current?.click()} className="btn btn-secondary flex items-center space-x-2" disabled={uploading}>
                                        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                                        <span>{uploading ? 'Processing CSV...' : 'Upload CSV Bank'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Upload Results Summary */}
                            {uploadResult && uploadResult.success && uploadResult.data && (
                                <div className={`mt-4 p-4 rounded-lg border text-sm font-medium ${uploadResult.data.failed > 0 ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className={`font-bold ${uploadResult.data.failed > 0 ? 'text-amber-800' : 'text-emerald-800'}`}>
                                                Upload complete: {uploadResult.data.inserted} inserted, {uploadResult.data.failed} failed.
                                            </p>
                                            {uploadResult.data.failed > 0 && uploadResult.data.errors && (
                                                <ul className="mt-2 space-y-1 text-amber-900 text-xs">
                                                    {uploadResult.data.errors.slice(0, 5).map((err, i) => (
                                                        <li key={i}>• Row {err.row}: {err.reason}</li>
                                                    ))}
                                                    {uploadResult.data.errors.length > 5 && (
                                                        <li>• ... and {uploadResult.data.errors.length - 5} more errors.</li>
                                                    )}
                                                </ul>
                                            )}
                                        </div>
                                        <button onClick={() => setUploadResult(null)} className="opacity-60 hover:opacity-100 p-1">
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                            {uploadResult && !uploadResult.success && (
                                <div className="mt-4 p-4 rounded-lg border bg-red-50 border-red-200 text-red-800 text-sm font-medium flex items-center justify-between">
                                    <span>Error: {uploadResult.error}</span>
                                    <button onClick={() => setUploadResult(null)} className="opacity-60 hover:opacity-100 p-1">
                                        <XCircle size={16} />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* View Question Bank — Collapsible */}
                        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', boxShadow: 'var(--card-shadow)' }} className="rounded-xl border mb-8 overflow-hidden">
                            <button onClick={toggleQuestionBank} className="w-full flex items-center justify-between p-5 hover:opacity-80 transition-opacity">
                                <h3 style={{ color: 'var(--text-primary)' }} className="text-base font-bold tracking-tight">📚 View Question Bank</h3>
                                {qbOpen ? <ChevronUp size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} />}
                            </button>
                            {qbOpen && (
                                <div className="px-5 pb-5">
                                    {qbLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 size={24} style={{ color: 'var(--accent-color)' }} className="animate-spin" />
                                        </div>
                                    ) : questionBank.length === 0 ? (
                                        <p style={{ color: 'var(--text-muted)' }} className="text-center py-8 text-sm font-medium">No questions uploaded yet. Use the CSV upload above to get started.</p>
                                    ) : (
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                                            {questionBank.map((q, i) => (
                                                <div key={q.id} style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--border-color)' }} className="rounded-lg border p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 mb-1.5">
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${q.type === 'MCQ'
                                                                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                                                                    : 'bg-purple-50 text-purple-600 border-purple-200'
                                                                    }`}>{q.type}</span>
                                                                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{q.subject}</span>
                                                                <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md ${q.difficulty === 'Easy' ? 'bg-green-50 text-green-600'
                                                                    : q.difficulty === 'Hard' ? 'bg-red-50 text-red-600'
                                                                        : 'bg-yellow-50 text-yellow-600'
                                                                    }`}>{q.difficulty}</span>
                                                            </div>
                                                            <p style={{ color: 'var(--text-primary)' }} className="text-sm font-semibold">{q.question}</p>
                                                            {q.type === 'MCQ' && q.options && (
                                                                <div className="mt-2 grid grid-cols-2 gap-1.5">
                                                                    {['A', 'B', 'C', 'D'].map(letter => (
                                                                        <span key={letter} className={`text-xs px-2 py-1 rounded-md font-medium ${q.correct_answer === letter
                                                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                                                            : 'bg-slate-50 text-slate-600 border border-slate-100'
                                                                            }`}>
                                                                            <strong>{letter}.</strong> {q.options[letter]}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {q.type === 'SUBJECTIVE' && (
                                                                <p className="text-xs text-slate-400 mt-1 font-medium">Max Marks: {q.max_marks}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div style={{ borderColor: 'var(--border-color)' }} className="border-t mb-6"></div>

                        {/* ===== 3. FILTER TABS ===== */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {filterTabs.map(f => {
                                    const isActive = filter === f;
                                    return (
                                        <button key={f} onClick={() => setFilter(f)}
                                            style={{
                                                padding: '6px 16px',
                                                fontSize: '12px',
                                                fontWeight: isActive ? 700 : 500,
                                                color: isActive ? 'var(--accent-color)' : 'var(--text-muted)',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                borderBottom: isActive ? '2px solid var(--accent-color)' : '2px solid transparent',
                                                cursor: 'pointer',
                                                textTransform: 'capitalize',
                                                transition: 'all 0.15s ease',
                                                borderRadius: 0,
                                            }}>
                                            {f}
                                        </button>
                                    );
                                })}
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500 }}>{filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}</span>
                        </div>

                        {/* ===== 4. EXAM CARDS ===== */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                            {filteredExams.length === 0 ? (
                                <div style={{ gridColumn: '1 / -1', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border-color)', borderRadius: '12px', textAlign: 'center', padding: '80px 24px' }}>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: 500, marginBottom: '16px' }}>
                                        {filter === 'all' ? 'No exams created yet.' : `No ${filter} exams.`}
                                    </p>
                                    {filter === 'all' && (
                                        <button onClick={() => navigate('/create-exam')} className="btn btn-secondary btn-sm">
                                            <PlusCircle size={14} /> Create your first exam
                                        </button>
                                    )}
                                </div>
                            ) : (
                                filteredExams.map(exam => {
                                    const statusBadge = getStatusBadge(exam.status);
                                    return (
                                        <div key={exam.id}
                                            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', boxShadow: 'var(--card-shadow)', transition: 'box-shadow 0.2s ease, transform 0.15s ease', display: 'flex', flexDirection: 'column', position: 'relative' }}
                                            className="group hover:shadow-lg">

                                            {/* Accent stripe */}
                                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '3px', backgroundColor: 'var(--accent-color)', borderRadius: '14px 0 0 14px', opacity: 0, transition: 'opacity 0.2s ease' }} className="group-hover:opacity-100"></div>

                                            {/* Card Header */}
                                            <div style={{ padding: '20px 20px 12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                                                    <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                                                        {/* Title — 16px, weight 600 */}
                                                        <h3 style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }} title={exam.title}>{exam.title}</h3>
                                                        {/* Status badge */}
                                                        <div style={{ marginTop: '8px' }}>
                                                            <span className={`inline-flex items-center space-x-1.5 text-[9px] px-2.5 py-1 rounded-full border font-semibold uppercase tracking-widest ${statusBadge.bg}`}>
                                                                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`}></span>
                                                                <span>{exam.status || 'scheduled'}</span>
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Menu */}
                                                    <div className="relative">
                                                        <button
                                                            onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === exam.id ? null : exam.id); }}
                                                            aria-label={`Open actions menu for ${exam.title}`}
                                                            aria-haspopup="menu"
                                                            aria-expanded={menuOpenId === exam.id}
                                                            style={{ color: 'var(--text-muted)', padding: '6px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' }}
                                                            className="hover:opacity-60">
                                                            <MoreVertical size={16} />
                                                        </button>
                                                        {menuOpenId === exam.id && (
                                                            <div style={{ backgroundColor: 'var(--menu-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', position: 'absolute', right: 0, top: '32px', zIndex: 50, minWidth: '180px', maxHeight: '300px', overflowY: 'auto', padding: '4px 0' }}>
                                                                {[
                                                                    { label: 'Change Duration', icon: Clock, color: 'var(--accent-color)', action: () => handleChangeTime(exam.id) },
                                                                    { label: 'Reschedule', icon: CalendarClock, color: '#3B7A78', action: () => handleReschedule(exam.id) },
                                                                    { label: 'Export CSV', icon: Download, color: 'var(--success-color)', action: () => handleExportCSV(exam.id) },
                                                                    { label: 'Flagged Students', icon: Flag, color: '#D97706', action: () => handleViewFlagged(exam.id) },
                                                                    ...(exam.status === 'active' ? [
                                                                        { label: 'Extend Time', icon: TimerReset, color: 'var(--accent-color)', action: () => handleExtendTime(exam.id) },
                                                                        { sep: true },
                                                                        { label: 'Stop Exam', icon: StopCircle, color: '#EA580C', action: () => handleStopExam(exam.id) },
                                                                        { label: 'Terminate', icon: XCircle, color: 'var(--danger-color)', action: () => handleTerminate(exam.id) },
                                                                    ] : []),
                                                                    { label: 'Grant Reattempt', icon: UserCheck, color: 'var(--success-color)', action: () => handleGrantReattempt(exam.id) },
                                                                    { sep: true },
                                                                    { label: 'Delete Exam', icon: Trash2, color: 'var(--danger-color)', action: () => handleDelete(exam.id) },
                                                                ].map((item, idx) => {
                                                                    if (item.sep) return <div key={`sep-${idx}`} style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }}></div>;
                                                                    return (
                                                                        <button key={item.label} onClick={() => { setMenuOpenId(null); item.action(); }}
                                                                            style={{ color: item.color, width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
                                                                            className="hover:opacity-70">
                                                                            <item.icon size={14} /><span>{item.label}</span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Metadata row — 12px, muted */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        <Clock size={10} style={{ color: 'var(--text-muted)' }} />{exam.duration} min
                                                    </span>
                                                    <span style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>ID: {exam.id}</span>
                                                    {exam.exam_code && (
                                                        <button type="button"
                                                            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-color)', border: '1px solid var(--accent-color)', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, fontFamily: 'monospace', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'opacity 0.15s' }}
                                                            className="hover:opacity-80"
                                                            onClick={() => navigator.clipboard.writeText(exam.exam_code).then(() => addToast('Exam code copied!', 'success')).catch(() => addToast('Copy failed. Code: ' + exam.exam_code, 'error'))}
                                                            title="Click to copy exam code">
                                                            <Copy size={10} />{exam.exam_code}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* ===== 5. ACTION BUTTONS — Two rows ===== */}
                                            <div style={{ borderTop: '1px solid var(--border-color)', padding: '16px', marginTop: 'auto' }}>
                                                {/* Row 1: Primary actions */}
                                                <div style={{ display: 'flex', gap: '8px', marginBottom: exam.status === 'active' ? '8px' : '0' }}>
                                                    <button onClick={() => navigate(`/monitor/${exam.id}`, { state: { tab: 'live' } })}
                                                        style={{ flex: 1, backgroundColor: '#1E2A38', color: '#FFF', padding: '9px 0', borderRadius: '10px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'opacity 0.15s' }}
                                                        className="hover:opacity-90 active:scale-[0.98]">
                                                        <Activity size={13} />Live Monitor
                                                    </button>
                                                    <button onClick={() => navigate(`/monitor/${exam.id}`, { state: { tab: 'logs' } })}
                                                        style={{ flex: 1, backgroundColor: 'var(--accent-color)', color: '#FFF', padding: '9px 0', borderRadius: '10px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'opacity 0.15s' }}
                                                        className="hover:opacity-90 active:scale-[0.98]">
                                                        <Eye size={13} />View Logs
                                                    </button>
                                                </div>
                                                {/* Row 2: Secondary actions */}
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={() => navigate(`/exam-results/${exam.id}`)}
                                                        style={{ flex: 1, backgroundColor: 'transparent', color: 'var(--accent-color)', padding: '8px 0', borderRadius: '10px', fontSize: '12px', fontWeight: 600, border: '1px solid var(--border-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}
                                                        className="hover:opacity-80">
                                                        <Trophy size={13} />Results
                                                    </button>
                                                    {exam.status === 'active' && (
                                                        <button onClick={() => setChatExamId(chatExamId === exam.id ? null : exam.id)}
                                                            style={{
                                                                flex: 1,
                                                                backgroundColor: chatExamId === exam.id ? 'var(--accent-color)' : 'transparent',
                                                                color: chatExamId === exam.id ? '#FFF' : 'var(--text-secondary)',
                                                                padding: '8px 0', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                                                                border: `1px solid ${chatExamId === exam.id ? 'var(--accent-color)' : 'var(--border-color)'}`,
                                                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s'
                                                            }}
                                                            className="hover:opacity-80">
                                                            <MessageSquare size={13} />{chatExamId === exam.id ? 'Close Chat' : 'Chat'}
                                                        </button>
                                                    )}
                                                </div>
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
