import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

const LastChance = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const examId = searchParams.get('examId');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!examId) {
            navigate('/join');
        }
    }, [examId, navigate]);

    const handleRequestChance = async () => {
        setLoading(true);
        setError('');
        try {
            await api.post('/monitor/last-chance', { examId });
            // Successfully granted last chance, redirect back to exam
            navigate('/exam', { state: { examId } });
        } catch (err) {
            console.error('Last chance error:', err);
            setError(err.response?.data?.message || 'Failed to request a final attempt.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 selection:bg-blue-500/30">
            <div className="max-w-md w-full bg-slate-800 rounded-2xl shadow-2xl border border-red-500/50 overflow-hidden relative">

                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500"></div>

                <div className="p-8 text-center flex flex-col items-center">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                        <ShieldAlert className="w-10 h-10 text-red-500" />
                    </div>

                    <h2 className="text-2xl font-bold font-display text-white mb-3">Monitoring Limits Exceeded</h2>

                    <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                        Your exam session was automatically terminated because our AI proctoring system detected too many suspicious activities (e.g., looking away, leaving the frame, or multiple people).
                    </p>

                    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 mb-8 w-full">
                        <div className="flex items-start space-x-3">
                            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <div className="text-left">
                                <h3 className="text-sm font-semibold text-slate-200">You have ONE final attempt.</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    If you exceed the allowed warnings again, your exam will be permanently submitted and locked.
                                </p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 w-full mb-6">
                            <p className="text-red-400 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <button
                        onClick={handleRequestChance}
                        disabled={loading}
                        className="w-full bg-red-600 hover:bg-red-500 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        {loading ? (
                            <Clock className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <span>Request Final Attempt</span>
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => navigate('/join')}
                        className="mt-4 text-slate-400 text-sm hover:text-white transition-colors"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LastChance;
