import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Award, Brain, Shield, CheckCircle2, XCircle } from 'lucide-react';

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

    if (loading) return <div className="min-h-screen bg-white flex items-center justify-center text-slate-500 font-medium">Loading...</div>;
    if (!data) return <div className="min-h-screen bg-white flex items-center justify-center text-red-500 font-medium">Submission not found</div>;

    const { submission, student, exam, questions, answers, finalGrade } = data;

    const getScoreColor = (score) => {
        if (score === null || score === undefined) return 'text-slate-400';
        const normalizedScore = score > 1 ? score / 100 : score;
        if (normalizedScore >= 0.8) return 'text-emerald-600';
        if (normalizedScore >= 0.55) return 'text-amber-600';
        return 'text-red-600';
    };

    const getScoreBg = (score) => {
        if (score === null || score === undefined) return 'bg-slate-50 border-slate-200';
        const normalizedScore = score > 1 ? score / 100 : score;
        if (normalizedScore >= 0.8) return 'bg-emerald-50 border-emerald-200';
        if (normalizedScore >= 0.55) return 'bg-amber-50 border-amber-200';
        return 'bg-red-50 border-red-200';
    };

    return (
        <div className="min-h-screen bg-white flex flex-col font-inter">
            <Navbar />
            <div className="flex-1 max-w-5xl w-full mx-auto p-8">
                <button
                    onClick={() => navigate(user.role === 'teacher' ? '/teacher' : '/history')}
                    className="flex items-center space-x-2 text-slate-400 hover:text-slate-700 mb-6 transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    <span>Back</span>
                </button>

                {/* Header */}
                <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest mb-1">Submission Detail</p>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">{exam.title}</h1>
                            <p className="text-slate-400 text-sm font-medium">
                                Student: <span className="text-slate-700 font-semibold">{student.name}</span> ({student.email})
                            </p>
                            <p className="text-slate-400 text-sm">
                                Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : 'Not submitted'}
                            </p>
                        </div>
                        {finalGrade && (
                            <div className={`text-center px-5 py-3 rounded-xl border ${getScoreBg(finalGrade.final_score)}`}>
                                <div className={`text-4xl font-black ${getScoreColor(finalGrade.final_score)}`}>
                                    {Math.round(finalGrade.final_score)}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-1">Final Score</div>
                                <div className="flex items-center space-x-3 mt-2 text-xs text-slate-500 font-medium">
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
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-center">
                            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Award size={20} className="text-blue-600" />
                            </div>
                            <p className="text-2xl font-black text-slate-900">{Math.round(finalGrade.base_score)}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Base Score</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-center">
                            <div className="w-10 h-10 bg-cyan-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Shield size={20} className="text-cyan-600" />
                            </div>
                            <p className="text-2xl font-black text-slate-900">{finalGrade.trust_factor}x</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Trust Factor</p>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] text-center">
                            <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mx-auto mb-2">
                                <Brain size={20} className="text-indigo-600" />
                            </div>
                            <p className={`text-2xl font-black ${getScoreColor(finalGrade.final_score)}`}>{Math.round(finalGrade.final_score)}</p>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Final Score</p>
                        </div>
                    </div>
                )}

                {/* Per-Question Breakdown */}
                <h2 className="text-lg font-black text-slate-900 tracking-tight mb-4">Question-by-Question Breakdown</h2>
                <div className="space-y-4">
                    {questions.map((q, index) => {
                        const answer = answers.find(a => a.question_id === (q.id ?? index));
                        const isSubjective = q.type === 'subjective';

                        return (
                            <div key={index} className="bg-white rounded-xl p-6 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-start space-x-3 flex-1">
                                        <span className="text-blue-600 font-black">Q{index + 1}.</span>
                                        <span className="text-slate-900 font-medium">{q.text}</span>
                                    </div>
                                    <span className={`text-[10px] px-2 py-1 rounded-md border font-black uppercase tracking-widest shrink-0 ml-3 ${isSubjective
                                        ? 'bg-indigo-50 text-indigo-600 border-indigo-200'
                                        : 'bg-blue-50 text-blue-600 border-blue-200'
                                        }`}>
                                        {isSubjective ? 'Subjective' : 'MCQ'}
                                    </span>
                                </div>

                                {/* Student's Answer */}
                                <div className="bg-slate-50 rounded-lg p-4 mb-3 border border-slate-100">
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Student's Answer</p>
                                    <p className="text-slate-700 text-sm">{answer?.answer_text || 'No answer provided'}</p>
                                </div>

                                {/* MCQ: show correct answer */}
                                {!isSubjective && (
                                    <div className="flex items-center space-x-2 mb-3">
                                        {q.options && answer?.answer_text === q.options[q.correctOption] ? (
                                            <CheckCircle2 size={16} className="text-emerald-500" />
                                        ) : (
                                            <XCircle size={16} className="text-red-500" />
                                        )}
                                        <span className="text-sm text-slate-500">
                                            Correct: <span className="text-emerald-600 font-semibold">{q.options?.[q.correctOption]}</span>
                                        </span>
                                    </div>
                                )}

                                {/* Subjective: show model answer + ATI scores */}
                                {isSubjective && (
                                    <>
                                        <div className="bg-blue-50/50 rounded-lg p-4 mb-3 border border-blue-100/50">
                                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Model Answer</p>
                                            <p className="text-slate-600 text-sm">{q.model_answer}</p>
                                        </div>

                                        {answer && Number.isFinite(answer.ati_score) && (
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className={`rounded-lg p-3 border text-center ${getScoreBg(answer.semantic_score)}`}>
                                                    <p className={`text-lg font-black ${getScoreColor(answer.semantic_score)}`}>
                                                        {Number.isFinite(answer.semantic_score) ? Math.round(answer.semantic_score * 100) : '-'}%
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Content</p>
                                                </div>
                                                <div className={`rounded-lg p-3 border text-center ${getScoreBg(answer.similarity_score)}`}>
                                                    <p className={`text-lg font-black ${getScoreColor(answer.similarity_score)}`}>
                                                        {Number.isFinite(answer.similarity_score) ? Math.round(answer.similarity_score * 100) : '-'}%
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">Pattern</p>
                                                </div>
                                                <div className={`rounded-lg p-3 border text-center ${getScoreBg(answer.ati_score)}`}>
                                                    <p className={`text-lg font-black ${getScoreColor(answer.ati_score)}`}>
                                                        {Number.isFinite(answer.ati_score) ? Math.round(answer.ati_score) : '-'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">ATI Score</p>
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
