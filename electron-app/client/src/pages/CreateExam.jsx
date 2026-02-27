import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Plus, Trash2, Save, Users, ToggleLeft, ToggleRight } from 'lucide-react';

const CreateExam = () => {
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(60);
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
        try {
            const examRes = await api.post('/exam/create', { title, duration, questions });
            const examId = examRes.data.examId;
            const classRes = await api.post('/classroom/generate', { examId });
            setClassroomCode(classRes.data.code);
        } catch (err) {
            console.error(err);
            alert('Failed to create exam');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            <div className="flex-1 max-w-4xl w-full mx-auto p-8">

                {classroomCode ? (
                    <div className="bg-slate-800 p-10 rounded-3xl text-center shadow-2xl border border-slate-700 relative overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
                        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Users size={40} className="text-blue-500" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-2">Classroom Generated!</h2>
                        <p className="text-slate-400 mb-8">Share this code with your students to let them join the exam.</p>

                        <div className="bg-slate-900 inline-block px-10 py-5 rounded-2xl border border-slate-700 shadow-inner mb-8">
                            <span className="text-6xl font-mono tracking-[0.5em] text-blue-400 font-extrabold">{classroomCode}</span>
                        </div>
                        <div>
                            <button
                                onClick={() => navigate('/teacher')}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-colors"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-8">
                            <h1 className="text-3xl font-bold text-white mb-2">Create New Exam</h1>
                            <p className="text-slate-400">Configure exam details and add questions. Supports both MCQ and subjective questions.</p>
                        </div>

                        <div className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 mb-8 space-y-6">
                            <div>
                                <label className="block text-slate-400 text-sm font-semibold mb-2">Exam Title</label>
                                <input
                                    type="text"
                                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
                                    placeholder="E.g. Final Computer Science Midterm"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-sm font-semibold mb-2">Duration (minutes)</label>
                                <input
                                    type="number"
                                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white"
                                    value={duration}
                                    onChange={e => setDuration(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="space-y-6">
                            {questions.map((q, qIndex) => (
                                <div key={qIndex} className="bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-700 relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center space-x-3">
                                            <h3 className="text-lg font-semibold text-slate-300">Question {qIndex + 1}</h3>
                                            <button
                                                onClick={() => toggleQuestionType(qIndex)}
                                                className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-colors border ${q.type === 'subjective'
                                                    ? 'bg-purple-900/30 text-purple-400 border-purple-900/50'
                                                    : 'bg-blue-900/30 text-blue-400 border-blue-900/50'
                                                    }`}
                                            >
                                                {q.type === 'subjective' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                                <span>{q.type === 'subjective' ? 'Subjective' : 'MCQ'}</span>
                                            </button>
                                        </div>
                                        {questions.length > 1 && (
                                            <button onClick={() => removeQuestion(qIndex)} className="text-red-400 hover:text-red-300 p-2">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>

                                    <textarea
                                        className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white mb-4 min-h-[100px]"
                                        placeholder="Enter question text..."
                                        value={q.text}
                                        onChange={e => updateQuestion(qIndex, 'text', e.target.value)}
                                    />

                                    {q.type === 'mcq' ? (
                                        /* MCQ Options */
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {q.options.map((opt, oIndex) => (
                                                <div key={oIndex} className="flex items-center space-x-3">
                                                    <input
                                                        type="radio"
                                                        name={`correct-${qIndex}`}
                                                        checked={q.correctOption === oIndex}
                                                        onChange={() => updateQuestion(qIndex, 'correctOption', oIndex)}
                                                        className="w-4 h-4 text-blue-500 bg-slate-900 border-slate-600 focus:ring-blue-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white text-sm"
                                                        placeholder={`Option ${oIndex + 1}`}
                                                        value={opt}
                                                        onChange={e => updateQuestionOption(qIndex, oIndex, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        /* Subjective: Model Answer + Key Points */
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Model Answer</label>
                                                <textarea
                                                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white min-h-[80px]"
                                                    placeholder="Enter the ideal/expected answer..."
                                                    value={q.model_answer}
                                                    onChange={e => updateQuestion(qIndex, 'model_answer', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Key Points</label>
                                                <div className="space-y-2">
                                                    {q.key_points.map((kp, kpIndex) => (
                                                        <div key={kpIndex} className="flex items-center space-x-2">
                                                            <span className="text-purple-400 text-xs font-mono w-6">{kpIndex + 1}.</span>
                                                            <input
                                                                type="text"
                                                                className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-white text-sm"
                                                                placeholder={`Key point ${kpIndex + 1}`}
                                                                value={kp}
                                                                onChange={e => updateKeyPoint(qIndex, kpIndex, e.target.value)}
                                                            />
                                                            {q.key_points.length > 1 && (
                                                                <button
                                                                    onClick={() => removeKeyPoint(qIndex, kpIndex)}
                                                                    className="text-red-400 hover:text-red-300 p-1"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    <button
                                                        onClick={() => addKeyPoint(qIndex)}
                                                        className="text-purple-400 hover:text-purple-300 text-xs font-medium flex items-center space-x-1 mt-1"
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

                        <div className="mt-8 flex justify-between">
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => addQuestion('mcq')}
                                    className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-5 py-3 rounded-xl font-semibold transition-colors"
                                >
                                    <Plus size={18} />
                                    <span>Add MCQ</span>
                                </button>
                                <button
                                    onClick={() => addQuestion('subjective')}
                                    className="flex items-center space-x-2 bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 px-5 py-3 rounded-xl font-semibold transition-colors border border-purple-900/50"
                                >
                                    <Plus size={18} />
                                    <span>Add Subjective</span>
                                </button>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={!isFormValid()}
                                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all"
                            >
                                <Save size={18} />
                                <span>Save & Generate Code</span>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CreateExam;
