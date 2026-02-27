import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Calendar, Clock, BookOpen, Award, CheckCircle2, AlertCircle, ChevronRight, TrendingUp } from 'lucide-react';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState({
        completed: 0,
        avgScore: 0,
        avgAti: 0,
        lastScore: 0
    });
    const [upcomingExams, setUpcomingExams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // In a real app, these would be API calls
                // const statsRes = await api.get('/student/stats');
                // const examsRes = await api.get('/student/upcoming-exams');

                // Mock data for demonstration
                setStats({
                    completed: 12,
                    avgScore: 84,
                    avgAti: 91,
                    lastScore: 88
                });

                setUpcomingExams([
                    {
                        id: 1,
                        subject: 'COMPUTER SCIENCE',
                        title: 'Data Structures Midterm',
                        date: 'Feb 28, 2026',
                        duration: '60 min',
                        status: 'Available'
                    },
                    {
                        id: 2,
                        subject: 'MATHEMATICS',
                        title: 'Calculus Final',
                        date: 'Mar 02, 2026',
                        duration: '90 min',
                        status: 'Upcoming'
                    }
                ]);
            } catch (err) {
                console.error('Failed to fetch dashboard data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const statCards = [
        { label: 'Exams Completed', value: stats.completed, icon: CheckCircle2, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Average Score', value: `${stats.avgScore}%`, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Average ATI', value: `${stats.avgAti}%`, icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Last Exam Score', value: `${stats.lastScore}%`, icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50' }
    ];

    return (
        <div className="min-h-screen bg-[#f0f7ff] font-inter">
            <Navbar />

            <main className="max-w-7xl mx-auto px-8 py-12">
                {/* Welcome Header */}
                <div className="mb-12">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">
                        Welcome back, {user?.name || 'Student'}!
                    </h1>
                    <p className="text-slate-500 font-medium">Here's an overview of your academic progress.</p>
                </div>

                {/* Quick Stats Panel */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    {statCards.map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-white hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`${stat.bg} ${stat.color} p-3 rounded-xl`}>
                                    <stat.icon size={24} />
                                </div>
                            </div>
                            <div>
                                <p className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-1">{stat.label}</p>
                                <p className="text-3xl font-black text-slate-900">{stat.value}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Upcoming Exams Section */}
                <section>
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Upcoming Exams</h2>
                        <button
                            onClick={() => navigate('/join')}
                            className="text-blue-600 font-bold text-sm hover:underline flex items-center"
                        >
                            View all exams <ChevronRight size={16} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[1, 2].map(i => (
                                <div key={i} className="bg-white h-48 rounded-2xl animate-pulse"></div>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {upcomingExams.map(exam => (
                                <div
                                    key={exam.id}
                                    className="bg-white p-8 rounded-2xl shadow-sm border border-white hover:border-blue-100 hover:shadow-md transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                                                {exam.subject}
                                            </span>
                                            <h3 className="text-2xl font-black text-slate-900 mt-4 tracking-tight group-hover:text-blue-600 transition-colors">
                                                {exam.title}
                                            </h3>
                                        </div>
                                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${exam.status === 'Available'
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                                : 'bg-slate-50 text-slate-400 border border-slate-100'
                                            }`}>
                                            {exam.status}
                                        </span>
                                    </div>

                                    <div className="flex items-center space-x-6 mb-8 text-sm font-medium text-slate-400">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={18} className="text-slate-300" />
                                            <span>{exam.date}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock size={18} className="text-slate-300" />
                                            <span>{exam.duration}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => navigate('/join')}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <span>Start Exam</span>
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default StudentDashboard;
