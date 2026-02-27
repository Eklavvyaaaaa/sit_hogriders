import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { Plus, Trash2, Save, Users } from 'lucide-react';

const CreateExam = () => {
    const [title, setTitle] = useState('');
    const [duration, setDuration] = useState(60);
    const [questions, setQuestions] = useState([
        { text: '', options: ['', '', '', ''], correctOption: 0 }
    ]);
    const [classroomCode, setClassroomCode] = useState(null);

    const navigate = useNavigate();

    const addQuestion = () => {
        setQuestions([...questions, { text: '', options: ['', '', '', ''], correctOption: 0 }]);
    };

    const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        updated[index][field] = value;
        setQuestions(updated);
    };

    const updateQuestionOption = (qIndex, oIndex, value) => {
        const updated = [...questions];
        updated[qIndex].options[oIndex] = value;
        setQuestions(updated);
    };

    const removeQuestion = (index) => {
        setQuestions(questions.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        try {
            // 1. Create Exam
            const examRes = await api.post('/exam/create', { title, duration, questions });
            const examId = examRes.data.examId;

            // 2. Generate Classroom
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
                            <p className="text-slate-400">Configure exam details and add questions.</p>
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
                                        <h3 className="text-lg font-semibold text-slate-300">Question {qIndex + 1}</h3>
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {q.options.map((opt, oIndex) => (
                                            <div key={oIndex} className="flex items-center space-x-3">
                                                <input
                                                    type="radio"
                                                    name={\`correct-\${qIndex}\`}
                                                checked={q.correctOption === oIndex}
                                                onChange={() => updateQuestion(qIndex, 'correctOption', oIndex)}
                                                className="w-4 h-4 text-blue-500 bg-slate-900 border-slate-600 focus:ring-blue-500"
                        />
                                                <input
                                                    type="text"
                                                    className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-white text-sm"
                                                    placeholder={\`Option \${oIndex + 1}\`}
                                                value={opt}
                                                onChange={e => updateQuestionOption(qIndex, oIndex, e.target.value)}
                        />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-8 flex justify-between">
                            <button
                                onClick={addQuestion}
                                className="flex items-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
                            >
                                <Plus size={18} />
                                <span>Add Question</span>
                            </button>

                            <button
                                onClick={handleSave}
                                disabled={!title || questions.some(q => !q.text || q.options.some(o => !o))}
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
