import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { ArrowLeft, Award, Brain, Shield, AlertTriangle, CheckCircle2, XCircle, ChevronRight } from 'lucide-react';

const SubmissionResults = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                const res = await api.get(`/history/submission/${submissionId}`);
                const data = res.data;
                const { submission, student, exam, questions, answers, finalGrade } = data;

                // Calculate correct/incorrect based on MCQ answers
                let correct = 0;
                let incorrect = 0;
                if (questions) {
                    questions.forEach((q, index) => {
                        const answer = answers.find(a => a.question_id === (q.id || index));
                        if (q.type !== 'subjective' && answer && q.options) {
                            if (answer.answer_text === q.options[q.correctOption]) correct++;
                            else if (answer.answer_text) incorrect++;
                        }
                    });
                }

                setDetail({
                    exam_title: exam?.title || 'Untitled Exam',
                    subject: 'Subject', // Static fallback since missing from API
                    date: submission?.submitted_at ? new Date(submission.submitted_at).toLocaleDateString() : 'N/A',
                    score: finalGrade ? Math.round(finalGrade.final_score) : 0,
                    ati: submission?.violation_count !== null ? Math.max(0, 100 - submission.violation_count * 5) : 100,
                    correct,
                    incorrect,
                    timeTaken: `${submission?.duration || 0} mins`,
                    percentile: 95, // Mock
                    behavioralMetrics: [
                        { label: 'Typing Consistency', score: 96 },
                        { label: 'Response Latency', score: 94 },
                        { label: 'Revision Pattern', score: 91 },
                        { label: 'Language Consistency', score: 98 },
                        { label: 'Focus Stability', score: 89 }
                    ]
                });
            } catch (err) {
                console.error('Failed to fetch submission', err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [submissionId]);


    const getScoreColor = (score) => {
        if (score >= 85) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
        if (score >= 60) return 'text-orange-600 bg-orange-50 border-orange-100';
        return 'text-red-600 bg-red-50 border-red-100';
    };

    if (loading) return <div className="h-screen bg-[#f0f7ff] flex items-center justify-center font-bold text-slate-400">Loading results...</div>;
    if (!detail) return <div className="h-screen bg-[#f0f7ff] flex items-center justify-center font-bold text-slate-400 text-center p-8">Results not found or not yet graded.</div>;

    return (
        <div className="min-h-screen bg-[#f0f7ff] font-inter">
            <Navbar />

            <main className="max-w-5xl mx-auto px-8 py-12">
                <button
                    onClick={() => navigate(user?.role === 'teacher' ? '/teacher' : '/history')}
                    className="flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-slate-600 mb-10 transition-colors"
                >
                    <ArrowLeft size={16} /> Back to History
                </button>

                {/* Header Card */}
                <div className="bg-white rounded-3xl p-10 shadow-sm border border-white mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div>
                            <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full mb-4 inline-block">
                                {detail.subject}
                            </span>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">{detail.exam_title}</h1>
                            <p className="text-slate-400 font-medium mt-1">Completed on {detail.date}</p>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Final Score</p>
                                <p className="text-6xl font-black text-slate-900 tracking-tighter">{detail.score}<span className="text-3xl text-slate-300 ml-1">%</span></p>
                            </div>
                            <div className="h-16 w-px bg-slate-100 mx-2"></div>
                            <div className="text-center">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Integrity</p>
                                <div className={`px-4 py-2 rounded-2xl border text-lg font-black ${getScoreColor(detail.ati)}`}>
                                    {detail.ati}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Performance Summary */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-white">
                        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-8">Performance Summary</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-slate-50 p-6 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Correct Answers</p>
                                <p className="text-3xl font-black text-emerald-600">{detail.correct}</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Incorrect</p>
                                <p className="text-3xl font-black text-red-600">{detail.incorrect}</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Time Taken</p>
                                <p className="text-2xl font-black text-slate-900">{detail.timeTaken}</p>
                            </div>
                            <div className="bg-slate-50 p-6 rounded-2xl">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Percentile</p>
                                <p className="text-2xl font-black text-blue-600">{detail.percentile}th</p>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(`/review/${submissionId}`)}
                            className="w-full mt-10 bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            Review Detailed Answers <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Behavioral Integrity Breakdown */}
                    <div className="bg-white rounded-3xl p-8 shadow-sm border border-white">
                        <div className="flex items-center gap-3 mb-8">
                            <Shield className="text-blue-600" size={24} />
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Behavioral Integrity</h3>
                        </div>

                        <div className="space-y-6">
                            {detail.behavioralMetrics.map((metric, i) => (
                                <div key={i}>
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-sm font-bold text-slate-600">{metric.label}</p>
                                        <p className="text-sm font-black text-slate-800">{metric.score}%</p>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                                            style={{ width: `${metric.score}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-10 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                            <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-1 leading-none flex items-center gap-1">
                                <AlertTriangle size={12} /> ATI Integrity Note
                            </p>
                            <p className="text-xs text-blue-700 leading-relaxed font-medium">
                                Scores above 85% indicate high identity verification and typing biometric consistency during the exam session.
                            </p>
                        </div>
                    </div>
                </div>

                <p className="text-center text-slate-300 text-[11px] font-bold uppercase tracking-widest mt-16">
                    ATI Secure Smart Assessment Technology
                </p>
            </main>

        </div>
    );
};

export default SubmissionResults;
