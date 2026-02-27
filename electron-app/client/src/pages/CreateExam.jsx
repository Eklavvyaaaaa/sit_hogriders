import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Plus, Trash2, Save, Users, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

const CreateExam = () => {
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(60);
    const [isSaving, setIsSaving] = useState(false);
    const [questions, setQuestions] = useState([
        { text: '', type: 'mcq', options: ['', '', '', ''], correctOption: 0, model_answer: '', key_points: [''] }
    ]);
    const [classroomCode, setClassroomCode] = useState(null);

    const navigate = useNavigate();

    const addQuestion = (type = 'mcq') => {
        setQuestions(prev => {
            if (type === 'subjective') {
                return [...prev, { text: '', type: 'subjective', model_answer: '', key_points: [''] }];
            } else {
                return [...prev, { text: '', type: 'mcq', options: ['', '', '', ''], correctOption: 0, model_answer: '', key_points: [''] }];
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
                return {
                    ...rest,
                    type: 'mcq',
                    options: q.options || ['', '', '', ''],
                    correctOption: q.correctOption !== undefined ? q.correctOption : 0
                };
            }
        }));
    };

    const updateQuestion = (index, field, value) => {
        setQuestions(prev => prev.map((q, i) =>
            i === index ? { ...q, [field]: value } : q
        ));
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

    const isFormValid = () => {
        if (!title) return false;
        if (!Number.isInteger(duration) || duration < 1) return false;
        return questions.every(q => {
            if (!q.text) return false;
            if (q.type === 'mcq') {
                return q.options && q.options.every(o => o.trim() !== '');
            } else {
                return q.model_answer && q.model_answer.trim() !== '';
            }
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
            alert('Failed to create exam');
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

    return (
        <div className="min-h-screen bg-white flex flex-col font-inter">
            <Navbar />
            <div className="flex-1 max-w-4xl w-full mx-auto p-8">

                {classroomCode ? (
                    <div className="bg-white p-10 rounded-2xl text-center shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-slate-200 relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-1.5 bg-blue-600"></div>
                        <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-6">
                            <Users size={32} className="text-blue-600" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Classroom Generated!</h2>
                        <p className="text-slate-500 mb-8 font-medium">Share this code with your students to let them join the exam.</p>

                        <div className="bg-slate-50 inline-block px-10 py-5 rounded-xl border border-slate-200 mb-8">
                            <span className="text-5xl font-mono tracking-[0.5em] text-blue-600 font-black">{classroomCode}</span>
                        </div>
                        <div>
                            <button
                                onClick={() => navigate('/teacher')}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1">Teacher Portal</p>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">Create New Exam</h1>
                            <p className="text-slate-500 text-sm font-medium">Configure exam details and add questions. Supports both MCQ and subjective questions.</p>
                        </div>

                        {/* Exam Details */}
                        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] mb-6 space-y-5">
                            <div>
                                <label className="block text-[11px] text-slate-500 font-black uppercase tracking-widest mb-2">Exam Title</label>
                                <input
                                    type="text"
                                    className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-600 focus:bg-white focus:ring-0 transition-all text-slate-900 placeholder-slate-400 font-medium"
                                    placeholder="E.g. Final Computer Science Midterm"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-500 font-black uppercase tracking-widest mb-2">Duration (minutes)</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-600 focus:bg-white focus:ring-0 transition-all text-slate-900 placeholder-slate-400 font-medium"
                                    value={duration}
                                    onChange={handleDurationChange}
                                />
                            </div>
                        </div>

                        {/* Questions */}
                        <div className="space-y-5">
                            {questions.map((q, qIndex) => (
                                <div key={qIndex} className="bg-white rounded-xl p-6 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center space-x-3">
                                            <h3 className="text-base font-black text-slate-900">Question {qIndex + 1}</h3>
                                            <button
                                                onClick={() => toggleQuestionType(qIndex)}
                                                className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-colors border ${q.type === 'subjective'
                                                    ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                                    : 'bg-blue-50 text-blue-600 border-blue-200'
                                                    }`}
                                            >
                                                {q.type === 'subjective' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                                <span>{q.type === 'subjective' ? 'Subjective' : 'MCQ'}</span>
                                            </button>
                                        </div>
                                        {questions.length > 1 && (
                                            <button
                                                onClick={() => removeQuestion(qIndex)}
                                                className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                                                aria-label={`Delete question ${qIndex + 1}`}
                                                title={`Delete question ${qIndex + 1}`}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>

                                    <textarea
                                        className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-blue-600 focus:bg-white focus:ring-0 transition-all text-slate-900 placeholder-slate-400 font-medium mb-4 min-h-[90px]"
                                        placeholder="Enter question text..."
                                        value={q.text}
                                        onChange={e => updateQuestion(qIndex, 'text', e.target.value)}
                                    />

                                    {q.type === 'mcq' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {q.options.map((opt, oIndex) => (
                                                <div key={oIndex} className="flex items-center space-x-2.5">
                                                    <input
                                                        type="radio"
                                                        name={`correct-${qIndex}`}
                                                        checked={q.correctOption === oIndex}
                                                        onChange={() => updateQuestion(qIndex, 'correctOption', oIndex)}
                                                        className="w-4 h-4 text-blue-600 bg-white border-slate-300 focus:ring-blue-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        className="flex-1 p-2.5 bg-slate-50 border-2 border-slate-100 rounded-lg focus:border-blue-600 focus:bg-white focus:ring-0 transition-all text-slate-900 text-sm font-medium placeholder-slate-400"
                                                        placeholder={`Option ${oIndex + 1}`}
                                                        value={opt}
                                                        onChange={e => updateQuestionOption(qIndex, oIndex, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] text-slate-400 font-black mb-2 uppercase tracking-widest">Model Answer</label>
                                                <textarea
                                                    className="w-full p-3.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:border-indigo-500 focus:bg-white focus:ring-0 transition-all text-slate-900 font-medium min-h-[80px] placeholder-slate-400"
                                                    placeholder="Enter the ideal/expected answer..."
                                                    value={q.model_answer}
                                                    onChange={e => updateQuestion(qIndex, 'model_answer', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-slate-400 font-black mb-2 uppercase tracking-widest">Key Points</label>
                                                <div className="space-y-2">
                                                    {q.key_points.map((kp, kpIndex) => (
                                                        <div key={kpIndex} className="flex items-center space-x-2">
                                                            <span className="text-indigo-500 text-xs font-mono w-5 font-black">{kpIndex + 1}.</span>
                                                            <input
                                                                type="text"
                                                                className="flex-1 p-2.5 bg-slate-50 border-2 border-slate-100 rounded-lg focus:border-indigo-500 focus:bg-white focus:ring-0 transition-all text-slate-900 text-sm font-medium placeholder-slate-400"
                                                                placeholder={`Key point ${kpIndex + 1}`}
                                                                value={kp}
                                                                onChange={e => updateKeyPoint(qIndex, kpIndex, e.target.value)}
                                                            />
                                                            {q.key_points.length > 1 && (
                                                                <button
                                                                    onClick={() => removeKeyPoint(qIndex, kpIndex)}
                                                                    className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                                                    aria-label={`Remove key point ${kpIndex + 1} from question ${qIndex + 1}`}
                                                                    title={`Remove key point ${kpIndex + 1}`}
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => addKeyPoint(qIndex)}
                                                        className="text-indigo-600 hover:text-indigo-700 text-xs font-bold flex items-center space-x-1 mt-1"
                                                    >
                                                        <Plus size={12} />
                                                        <span>Add Key Point</span>
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
                                <button
                                    onClick={() => addQuestion('mcq')}
                                    className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-lg font-bold transition-colors text-sm"
                                >
                                    <Plus size={18} />
                                    <span>Add MCQ</span>
                                </button>
                                <button
                                    onClick={() => addQuestion('subjective')}
                                    className="flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-5 py-3 rounded-lg font-bold transition-colors border border-indigo-200 text-sm"
                                >
                                    <Plus size={18} />
                                    <span>Add Subjective</span>
                                </button>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={!isFormValid() || isSaving}
                                aria-busy={isSaving}
                                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white px-8 py-3 rounded-full font-black shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
                            >
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
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
