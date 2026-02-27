import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Award, Brain, Shield, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

const SubmissionResults = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await api.get(`/history/submission/${submissionId}`);
                setData(res.data);
            } catch (err) {
                console.error('Failed to fetch submission', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [submissionId]);

    if (loading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>;
    if (!data) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-400">Submission not found</div>;

    const { submission, student, exam, questions, answers, finalGrade } = data;

    const getScoreColor = (score) => {
        if (score === null || score === undefined) return 'text-slate-400';
        const normalizedScore = score > 1 ? score / 100 : score;
        if (normalizedScore >= 0.8) return 'text-green-400';
        if (normalizedScore >= 0.55) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            <div className="flex-1 max-w-5xl w-full mx-auto p-8">
                <button
                    onClick={() => navigate(user.role === 'teacher' ? '/teacher' : '/history')}
                    className="flex items-center space-x-2 text-slate-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft size={18} />
                    <span>Back</span>
                </button>

                {/* Header */}
                <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-1">{exam.title}</h1>
                            <p className="text-slate-400 text-sm">
                                Student: <span className="text-white">{student.name}</span> ({student.email})
                            </p>
                            <p className="text-slate-400 text-sm">
<<<<<<< HEAD
                                Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Not submitted'}
=======
                                Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Not submitted'}
>>>>>>> d779e8544c9cb639a7dd66c4f5986c5c8403f16c
                            </p>
                        </div>
                        {finalGrade && (
                            <div className="text-center">
                                <div className={`text-4xl font-bold ${getScoreColor(finalGrade.final_score)}`}>
                                    {Math.round(finalGrade.final_score)}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">Final Score</div>
                                <div className="flex items-center space-x-3 mt-2 text-xs text-slate-500">
                                    <span>Base: {Math.round(finalGrade.base_score)}</span>
                                    <span>Trust: {finalGrade.trust_factor}x</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Score Overview Cards */}
                {finalGrade && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-center">
                            <Award size={24} className="mx-auto text-blue-400 mb-2" />
                            <p className="text-2xl font-bold text-white">{Math.round(finalGrade.base_score)}</p>
                            <p className="text-xs text-slate-400">Base Score</p>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-center">
                            <Shield size={24} className="mx-auto text-cyan-400 mb-2" />
                            <p className="text-2xl font-bold text-white">{finalGrade.trust_factor}x</p>
                            <p className="text-xs text-slate-400">Trust Factor</p>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 text-center">
                            <Brain size={24} className="mx-auto text-purple-400 mb-2" />
                            <p className={`text-2xl font-bold ${getScoreColor(finalGrade.final_score)}`}>{Math.round(finalGrade.final_score)}</p>
                            <p className="text-xs text-slate-400">Final Score</p>
                        </div>
                    </div>
                )}

                {/* Per-Question Breakdown */}
                <h2 className="text-xl font-bold text-white mb-4">Question-by-Question Breakdown</h2>
                <div className="space-y-4">
                    {questions.map((q, index) => {
                        const answer = answers.find(a => a.question_id === (q.id || index));
                        const isSubjective = q.type === 'subjective';

                        return (
                            <div key={index} className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start space-x-3 flex-1">
                                        <span className="text-blue-500 font-bold">Q{index + 1}.</span>
                                        <span className="text-white">{q.text}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-lg border font-medium shrink-0 ml-3 ${isSubjective
                                        ? 'bg-purple-900/30 text-purple-400 border-purple-900/50'
                                        : 'bg-blue-900/30 text-blue-400 border-blue-900/50'
                                        }`}>
                                        {isSubjective ? 'Subjective' : 'MCQ'}
                                    </span>
                                </div>

                                {/* Student's Answer */}
                                <div className="bg-slate-900 rounded-xl p-4 mb-3 border border-slate-700/50">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Student's Answer</p>
                                    <p className="text-slate-300">{answer?.answer_text || 'No answer provided'}</p>
                                </div>

                                {/* MCQ: show correct answer */}
                                {!isSubjective && (
                                    <div className="flex items-center space-x-2 mb-3">
                                        {q.options && answer?.answer_text === q.options[q.correctOption] ? (
                                            <CheckCircle2 size={16} className="text-green-400" />
                                        ) : (
                                            <XCircle size={16} className="text-red-400" />
                                        )}
                                        <span className="text-sm text-slate-400">
                                            Correct: <span className="text-green-400">{q.options?.[q.correctOption]}</span>
                                        </span>
                                    </div>
                                )}

                                {/* Subjective: show model answer + ATI scores */}
                                {isSubjective && (
                                    <>
                                        <div className="bg-slate-900/50 rounded-xl p-4 mb-3 border border-slate-700/30">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Model Answer</p>
                                            <p className="text-slate-400 text-sm">{q.model_answer}</p>
                                        </div>

                                        {answer && Number.isFinite(answer.ati_score) && (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="bg-blue-900/20 rounded-lg p-3 border border-blue-900/30 text-center">
                                                    <p className={`text-lg font-bold ${getScoreColor(answer.semantic_score)}`}>
                                                        {Number.isFinite(answer.semantic_score) ? Math.round(answer.semantic_score * 100) : '-'}%
                                                    </p>
                                                    <p className="text-xs text-slate-400">Content</p>
                                                </div>
                                                <div className="bg-purple-900/20 rounded-lg p-3 border border-purple-900/30 text-center">
                                                    <p className={`text-lg font-bold ${getScoreColor(answer.similarity_score)}`}>
                                                        {Number.isFinite(answer.similarity_score) ? Math.round(answer.similarity_score * 100) : '-'}%
                                                    </p>
                                                    <p className="text-xs text-slate-400">Pattern</p>
                                                </div>
                                                <div className="bg-cyan-900/20 rounded-lg p-3 border border-cyan-900/30 text-center">
                                                    <p className={`text-lg font-bold ${getScoreColor(answer.ati_score)}`}>
                                                        {Number.isFinite(answer.ati_score) ? Math.round(answer.ati_score) : '-'}
                                                    </p>
                                                    <p className="text-xs text-slate-400">ATI Score</p>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SubmissionResults;
