import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Plus, Trash2, Save, Users, ToggleLeft, ToggleRight, Loader2, ImagePlus, X, Zap } from 'lucide-react';

const CreateExam = () => {
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(60);
    const [isSaving, setIsSaving] = useState(false);
    const [questions, setQuestions] = useState([
        { text: '', type: 'mcq', options: ['', '', '', ''], correctOption: 0, model_answer: '', key_points: [''], image_url: '' }
    ]);
    const [classroomCode, setClassroomCode] = useState(null);
    const [toast, setToast] = useState(null);
    const toastTimerRef = useRef(null);
    const navigate = useNavigate();

    const showToast = (message, type = 'error') => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ message, type });
        toastTimerRef.current = setTimeout(() => { setToast(null); toastTimerRef.current = null; }, 3500);
    };

    const addQuestion = (type = 'mcq') => {
        setQuestions(prev => {
            if (type === 'subjective') {
                return [...prev, { text: '', type: 'subjective', model_answer: '', key_points: [''], image_url: '' }];
            } else {
                return [...prev, { text: '', type: 'mcq', options: ['', '', '', ''], correctOption: 0, model_answer: '', key_points: [''], image_url: '' }];
            }
        });
    };

    const toggleQuestionType = (index) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== index) return q;
            if (q.type === 'mcq') {
                return { ...q, type: 'subjective', model_answer: q.model_answer || '', key_points: q.key_points || [''] };
            } else {
                const { model_answer, key_points, ...rest } = q;
                return { ...rest, type: 'mcq', options: q.options || ['', '', '', ''], correctOption: q.correctOption !== undefined ? q.correctOption : 0 };
            }
        }));
    };

    const updateQuestion = (index, field, value) => {
        setQuestions(prev => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
    };

    const updateQuestionOption = (qIndex, oIndex, value) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIndex) return q;
            const newOptions = [...q.options];
            newOptions[oIndex] = value;
            return { ...q, options: newOptions };
        }));
    };

    const updateKeyPoint = (qIndex, kpIndex, value) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIndex) return q;
            const newKeyPoints = [...q.key_points];
            newKeyPoints[kpIndex] = value;
            return { ...q, key_points: newKeyPoints };
        }));
    };

    const addKeyPoint = (qIndex) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIndex) return q;
            return { ...q, key_points: [...q.key_points, ''] };
        }));
    };

    const removeKeyPoint = (qIndex, kpIndex) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIndex) return q;
            return { ...q, key_points: q.key_points.filter((_, k) => k !== kpIndex) };
        }));
    };

    const removeQuestion = (index) => {
        setQuestions(prev => prev.filter((_, i) => i !== index));
    };

    const handleImageUpload = (qIndex, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Only image files are allowed.', 'error');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            showToast('Image must be under 2MB.', 'error');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            updateQuestion(qIndex, 'image_url', reader.result);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = (qIndex) => {
        updateQuestion(qIndex, 'image_url', '');
    };

    const isFormValid = () => {
        if (!title) return false;
        if (!Number.isInteger(duration) || duration < 1) return false;
        return questions.every(q => {
            if (!q.text) return false;
            if (q.type === 'mcq') return q.options && q.options.every(o => o.trim() !== '');
            else return q.model_answer && q.model_answer.trim() !== '';
        });
    };

    const handleSave = async () => {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const examRes = await api.post('/exam/create', { title, duration, questions });
            const examId = examRes.data.examId;
            const classRes = await api.post('/classroom/generate', { examId });
            setClassroomCode(classRes.data.code);
        } catch (err) {
            console.error(err);
            showToast('Failed to create exam', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDurationChange = (e) => {
        const raw = e.target.value;
        if (raw === '') { setDuration(''); return; }
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed >= 1) setDuration(parsed);
    };

    const handleAutoFillExam = () => {
        setTitle('Physics 101 - Core Concepts');
        setDuration(45);
        setQuestions([
            { type: 'mcq', text: 'What is the SI unit of force?', options: ['Joule', 'Newton', 'Watt', 'Pascal'], correctOption: 1, model_answer: '', key_points: [''], image_url: '' },
            { type: 'mcq', text: 'Which of the following is a scalar quantity?', options: ['Velocity', 'Acceleration', 'Force', 'Speed'], correctOption: 3, model_answer: '', key_points: [''], image_url: '' },
            { type: 'subjective', text: "Identify and describe Newton's First Law of Motion.", model_answer: "Newton's First Law states that an object will remain at rest or in uniform motion unless acted upon by an external force.", key_points: ['inertia', 'external force', 'uniform motion'], image_url: '' }
        ]);
        showToast('Sample exam auto-filled successfully!', 'success');
    };

    // Quick Create from Question Bank
    const [quickTitle, setQuickTitle] = useState('');
    const [quickDuration, setQuickDuration] = useState(30);
    const [quickMcq, setQuickMcq] = useState(5);
    const [quickSubj, setQuickSubj] = useState(2);
    const [quickSubject, setQuickSubject] = useState('');
    const [quickLoading, setQuickLoading] = useState(false);

    const handleQuickCreate = async () => {
        if (!quickTitle.trim()) { showToast('Please enter an exam title.', 'error'); return; }
        if (quickMcq + quickSubj === 0) { showToast('Select at least 1 question.', 'error'); return; }
        setQuickLoading(true);
        try {
            const res = await api.post('/api/questions/generate-exam', {
                title: quickTitle,
                duration: quickDuration,
                mcqCount: quickMcq,
                subjectiveCount: quickSubj,
                subject: quickSubject || undefined
            });
            setClassroomCode(res.data.classroomCode);
            showToast(`Exam created with ${res.data.questionsUsed} random questions!`, 'success');
        } catch (err) {
            console.error('Quick create error:', err);
            showToast(err.response?.data?.message || 'Failed to generate exam from bank.', 'error');
        } finally {
            setQuickLoading(false);
        }
    };

    return (
        <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }} className="min-h-screen flex flex-col font-inter transition-colors duration-200">
            <Navbar />

            {/* Toast */}
            {toast && (
                <div className="toast-container">
                    <div className={`toast toast-${toast.type} flex items-center justify-between`}>
                        <span>{toast.message}</span>
                        <button onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100"><X size={14} /></button>
                    </div>
                </div>
            )}

            <div className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 lg:px-8">
                {classroomCode ? (
                    <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="p-10 rounded-xl text-center shadow-sm border relative overflow-hidden">
                        <div style={{ backgroundColor: 'var(--accent-color)' }} className="absolute inset-x-0 top-0 h-1"></div>
                        <div style={{ backgroundColor: 'var(--accent-light)' }} className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6">
                            <Users size={32} style={{ color: 'var(--accent-color)' }} />
                        </div>
                        <h2 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold tracking-tight mb-2">Classroom Generated!</h2>
                        <p style={{ color: 'var(--text-secondary)' }} className="mb-8 font-medium text-sm">Share this code with your students to let them join the exam.</p>
                        <div style={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)' }} className="inline-block px-10 py-5 rounded-xl border mb-8">
                            <span style={{ color: 'var(--accent-color)' }} className="text-5xl font-mono tracking-[0.5em] font-bold">{classroomCode}</span>
                        </div>
                        <div>
                            <button onClick={() => navigate('/teacher')} className="btn btn-primary">Back to Dashboard</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-8 flex justify-between items-start">
                            <div>
                                <p style={{ color: 'var(--accent-color)' }} className="text-[11px] font-semibold uppercase tracking-widest mb-1">Teacher Portal</p>
                                <h1 style={{ color: 'var(--text-primary)' }} className="text-2xl font-bold tracking-tight mb-1">Create New Exam</h1>
                                <p style={{ color: 'var(--text-secondary)' }} className="text-sm font-medium">Configure exam details and add questions. Supports MCQ, subjective, and image-based questions.</p>
                            </div>
                            <button onClick={handleAutoFillExam} className="btn btn-ghost border border-dashed border-gray-300 opacity-60 hover:opacity-100 text-sm">
                                🧪 Auto-Generate Sample Exam
                            </button>
                        </div>

                        {/* Quick Create from Question Bank */}
                        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl p-6 border shadow-sm mb-6 relative overflow-hidden">
                            <div style={{ backgroundColor: '#8B5CF6' }} className="absolute inset-x-0 top-0 h-1"></div>
                            <div className="flex items-center space-x-2 mb-4">
                                <Zap size={18} style={{ color: '#8B5CF6' }} />
                                <h3 style={{ color: 'var(--text-primary)' }} className="text-base font-bold">Quick Create from Question Bank</h3>
                            </div>
                            <p style={{ color: 'var(--text-secondary)' }} className="text-xs font-medium mb-4">Auto-generate an exam with randomly selected questions from your uploaded CSV bank.</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                                <div className="col-span-2 md:col-span-3">
                                    <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold uppercase tracking-widest mb-1">Exam Title</label>
                                    <input type="text" className="input-field" placeholder="E.g. Physics Mid-Term" value={quickTitle} onChange={e => setQuickTitle(e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold uppercase tracking-widest mb-1">Duration (min)</label>
                                    <input type="number" min="1" className="input-field" value={quickDuration} onChange={e => setQuickDuration(parseInt(e.target.value) || 1)} />
                                </div>
                                <div>
                                    <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold uppercase tracking-widest mb-1"># MCQs</label>
                                    <input type="number" min="0" className="input-field" value={quickMcq} onChange={e => setQuickMcq(parseInt(e.target.value) || 0)} />
                                </div>
                                <div>
                                    <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold uppercase tracking-widest mb-1"># Subjective</label>
                                    <input type="number" min="0" className="input-field" value={quickSubj} onChange={e => setQuickSubj(parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="col-span-2 md:col-span-3">
                                    <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold uppercase tracking-widest mb-1">Subject Filter (optional)</label>
                                    <input type="text" className="input-field" placeholder="Leave empty for all subjects" value={quickSubject} onChange={e => setQuickSubject(e.target.value)} />
                                </div>
                            </div>
                            <button onClick={handleQuickCreate} disabled={quickLoading} className="btn btn-primary w-full py-3">
                                {quickLoading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                                <span>{quickLoading ? 'Generating Exam...' : 'Generate Random Exam'}</span>
                            </button>
                        </div>

                        <div style={{ borderColor: 'var(--border-color)' }} className="border-t mb-6"></div>
                        <p style={{ color: 'var(--text-muted)' }} className="text-center text-xs font-medium mb-6 uppercase tracking-widest">— or create manually —</p>

                        {/* Exam Details */}
                        <div style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl p-6 border shadow-sm mb-6 space-y-5">
                            <div>
                                <label style={{ color: 'var(--text-muted)' }} className="block text-[11px] font-semibold uppercase tracking-widest mb-2">Exam Title</label>
                                <input type="text" className="input-field" placeholder="E.g. Final Computer Science Midterm" value={title} onChange={e => setTitle(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ color: 'var(--text-muted)' }} className="block text-[11px] font-semibold uppercase tracking-widest mb-2">Duration (minutes)</label>
                                <input type="number" min="1" step="1" className="input-field" value={duration} onChange={handleDurationChange} />
                            </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-5">
                            {questions.map((q, qIndex) => (
                                <div key={qIndex} style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }} className="rounded-xl p-6 border shadow-sm relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center space-x-3">
                                            <h3 style={{ color: 'var(--text-primary)' }} className="text-base font-semibold">Question {qIndex + 1}</h3>
                                            <button onClick={() => toggleQuestionType(qIndex)}
                                                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-[10px] font-semibold uppercase tracking-widest transition-colors border ${q.type === 'subjective' ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                                {q.type === 'subjective' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                                <span>{q.type === 'subjective' ? 'Subjective' : 'MCQ'}</span>
                                            </button>
                                        </div>
                                        {questions.length > 1 && (
                                            <button onClick={() => removeQuestion(qIndex)} style={{ color: 'var(--danger-color)' }}
                                                className="p-1.5 rounded-lg hover:opacity-70 transition-colors" aria-label={`Delete question ${qIndex + 1}`}>
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <textarea className="input-field mb-4 min-h-[90px]" placeholder="Enter question text..."
                                        value={q.text} onChange={e => updateQuestion(qIndex, 'text', e.target.value)} />

                                    {/* Image Upload */}
                                    <div className="mb-4">
                                        {q.image_url ? (
                                            <div className="relative inline-block">
                                                <img src={q.image_url} alt={`Question ${qIndex + 1} attachment`}
                                                    className="max-w-full max-h-48 rounded-lg border" style={{ borderColor: 'var(--border-color)' }} />
                                                <button onClick={() => removeImage(qIndex)}
                                                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white"
                                                    style={{ backgroundColor: 'var(--danger-color)' }} title="Remove image">
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ) : (
                                            <label style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                                                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-dashed cursor-pointer hover:opacity-70 transition-colors text-xs font-medium">
                                                <ImagePlus size={14} />
                                                <span>Attach Image (optional)</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(qIndex, e)} />
                                            </label>
                                        )}
                                    </div>

                                    {q.type === 'mcq' ? (
                                        <div className="space-y-3">
                                            <label className="block text-[10px] text-slate-400 font-black mb-2 uppercase tracking-widest">Options (Select the correct answer)</label>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {q.options.map((opt, oIndex) => (
                                                    <div key={oIndex} className={`flex items-center space-x-2.5 p-2 rounded-lg border-2 transition-all ${q.correctOption === oIndex ? 'border-blue-500 bg-blue-50/50' : 'border-transparent'}`}>
                                                        <input
                                                            type="radio"
                                                            name={`correct-${qIndex}`}
                                                            checked={q.correctOption === oIndex}
                                                            onChange={() => updateQuestion(qIndex, 'correctOption', oIndex)}
                                                            className="w-5 h-5 text-blue-600 bg-white border-slate-300 focus:ring-blue-500 cursor-pointer"
                                                            title={`Mark Option ${oIndex + 1} as Correct`}
                                                        />
                                                        <input
                                                            type="text"
                                                            className={`flex-1 p-2.5 bg-slate-50 border-2 rounded-lg focus:border-blue-600 focus:bg-white focus:ring-0 transition-all text-sm font-medium placeholder-slate-400 ${q.correctOption === oIndex ? 'border-blue-200 text-blue-900' : 'border-slate-100 text-slate-900'}`}
                                                            placeholder={`Option ${oIndex + 1}`}
                                                            value={opt}
                                                            onChange={e => updateQuestionOption(qIndex, oIndex, e.target.value)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold mb-2 uppercase tracking-widest">Model Answer</label>
                                                <textarea className="input-field min-h-[80px]" placeholder="Enter the ideal/expected answer..."
                                                    value={q.model_answer} onChange={e => updateQuestion(qIndex, 'model_answer', e.target.value)} />
                                            </div>
                                            <div>
                                                <label style={{ color: 'var(--text-muted)' }} className="block text-[10px] font-semibold mb-2 uppercase tracking-widest">Key Points</label>
                                                <div className="space-y-2">
                                                    {q.key_points.map((kp, kpIndex) => (
                                                        <div key={kpIndex} className="flex items-center space-x-2">
                                                            <span style={{ color: 'var(--accent-color)' }} className="text-xs font-mono w-5 font-semibold">{kpIndex + 1}.</span>
                                                            <input type="text" className="input-field" placeholder={`Key point ${kpIndex + 1}`}
                                                                value={kp} onChange={e => updateKeyPoint(qIndex, kpIndex, e.target.value)} />
                                                            {q.key_points.length > 1 && (
                                                                <button onClick={() => removeKeyPoint(qIndex, kpIndex)} style={{ color: 'var(--danger-color)' }}
                                                                    className="p-1 rounded hover:opacity-70 transition-colors" aria-label={`Remove key point ${kpIndex + 1}`}>
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button onClick={() => addKeyPoint(qIndex)} style={{ color: 'var(--accent-color)' }}
                                                        className="text-xs font-semibold flex items-center space-x-1 mt-1 hover:opacity-80">
                                                        <Plus size={12} /><span>Add Key Point</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Bottom Actions */}
                        <div className="mt-8 flex justify-between">
                            <div className="flex space-x-3">
                                <button onClick={() => addQuestion('mcq')} className="btn btn-ghost">
                                    <Plus size={16} /><span>Add MCQ</span>
                                </button>
                                <button onClick={() => addQuestion('subjective')} className="btn btn-secondary">
                                    <Plus size={16} /><span>Add Subjective</span>
                                </button>
                            </div>
                            <button onClick={handleSave} disabled={!isFormValid() || isSaving} className="btn btn-primary" aria-busy={isSaving}>
                                {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                <span>{isSaving ? 'Saving...' : 'Save & Generate Code'}</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CreateExam;
