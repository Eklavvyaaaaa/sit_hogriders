import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ArrowLeft, ChevronDown, ChevronUp, CheckCircle, XCircle, Info } from 'lucide-react';

const SubmissionReview = () => {
    const { submissionId } = useParams();
    const navigate = useNavigate();
    const [reviewData, setReviewData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        const fetchReviewData = async () => {
            try {
                // Mock data for demo
                const mockData = {
                    exam_title: 'Algorithms Quiz',
                    questions: [
                        {
                            id: 1,
                            text: 'What is the average time complexity of searching in a Hash Map?',
                            studentAnswer: 'O(1)',
                            correctAnswer: 'O(1)',
                            marks: 5,
                            maxMarks: 5,
                            isCorrect: true,
                            explanation: 'Average case time complexity for hash map search is constant time O(1) assuming a good hash function.'
                        },
                        {
                            id: 2,
                            text: 'Which data structure is best for implementing a LIFO behavior?',
                            studentAnswer: 'Queue',
                            correctAnswer: 'Stack',
                            marks: 0,
                            maxMarks: 5,
                            isCorrect: false,
                            explanation: 'Stack follows Last-In-First-Out (LIFO) behavior, whereas Queue follows First-In-First-Out (FIFO).'
                        },
                        {
                            id: 3,
                            text: 'Explain the difference between BFS and DFS.',
                            studentAnswer: 'BFS uses a queue and explores layer by layer. DFS uses a stack (or recursion) and explores deep into branches.',
                            correctAnswer: 'BFS: Queue-based, level-order traversal. DFS: Stack-based, explores depth before breadth.',
                            marks: 10,
                            maxMarks: 10,
                            isCorrect: true,
                            explanation: 'BFS is generally used for shortest path in unweighted graphs, while DFS is useful for cycle detection and topological sorting.'
                        }
                    ]
                };
                setReviewData(mockData);
            } catch (err) {
                console.error('Failed to fetch review data', err);
            } finally {
                setLoading(false);
            }
        };
        fetchReviewData();
    }, [submissionId]);

    const toggleExpand = (id) => {
        setExpandedId(expandedId === id ? null : id);
    };

    if (loading) return <div className="h-screen bg-[#f0f7ff] flex items-center justify-center font-bold text-slate-400">Loading review...</div>;
    if (!reviewData) return <div className="h-screen bg-[#f0f7ff] flex items-center justify-center font-bold text-slate-400">Review data not found.</div>;

    return (
        <div className="min-h-screen bg-[#f0f7ff] font-inter">
            <Navbar />

            <main className="max-w-4xl mx-auto px-8 py-12">
                <button
                    onClick={() => navigate(`/results/${submissionId}`)}
                    className="flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-slate-600 mb-10 transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Summary
                </button>

                <div className="mb-12">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Detailed Review</h1>
                    <p className="text-slate-500 font-medium">{reviewData.exam_title}</p>
                </div>

                <div className="space-y-6">
                    {reviewData.questions.map((q, index) => (
                        <div
                            key={q.id}
                            className={`bg-white rounded-3xl overflow-hidden shadow-sm border ${expandedId === q.id ? 'border-blue-200' : 'border-white'
                                } transition-all`}
                        >
                            <button
                                onClick={() => toggleExpand(q.id)}
                                className="w-full text-left px-8 py-6 flex items-start justify-between gap-6 group"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question {index + 1}</span>
                                        {q.isCorrect ? (
                                            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Correct</span>
                                        ) : (
                                            <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Incorrect</span>
                                        )}
                                    </div>
                                    <p className="text-lg font-bold text-slate-800 tracking-tight leading-tight">{q.text}</p>
                                </div>
                                <div className="flex items-center gap-4 mt-1">
                                    <div className="text-right">
                                        <p className="text-sm font-black text-slate-900">{q.marks} / {q.maxMarks}</p>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marks</p>
                                    </div>
                                    <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                                        {expandedId === q.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                                    </div>
                                </div>
                            </button>

                            {expandedId === q.id && (
                                <div className="px-8 pb-8 pt-2 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div className={`p-6 rounded-2xl ${q.isCorrect ? 'bg-emerald-50 border border-emerald-100' : 'bg-red-50 border border-red-100'}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                {q.isCorrect ? <CheckCircle size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-red-600" />}
                                                <p className="text-xs font-black uppercase tracking-widest text-slate-500">Your Answer</p>
                                            </div>
                                            <p className="text-slate-900 font-bold">{q.studentAnswer}</p>
                                        </div>

                                        {!q.isCorrect && (
                                            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <CheckCircle size={16} className="text-emerald-600" />
                                                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Correct Answer</p>
                                                </div>
                                                <p className="text-slate-900 font-bold">{q.correctAnswer}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Info size={16} className="text-blue-600" />
                                            <p className="text-xs font-black uppercase tracking-widest text-blue-800">Explanation</p>
                                        </div>
                                        <p className="text-sm text-blue-900/80 font-medium leading-relaxed">
                                            {q.explanation}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <p className="text-center text-slate-300 text-[11px] font-bold uppercase tracking-widest mt-16">
                    ATI Secure Smart Assessment Technology
                </p>
            </main>
        </div>
    );
};

export default SubmissionReview;
