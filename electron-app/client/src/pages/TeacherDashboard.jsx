import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { PlusCircle, Eye, Activity } from 'lucide-react';

const TeacherDashboard = () => {
    const [exams, setExams] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const res = await api.get('/exam');
                setExams(res.data);
            } catch (err) {
                console.error('Failed to fetch exams', err);
            }
        };
        fetchExams();
    }, []);
    const testReviewAPI = async () => {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("No authentication token found.");
            return;
        }

        try {
            const response = await fetch("http://localhost:5001/api/review/15", {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + token
                }
            });

            console.log("Response status:", response.status);

            if (response.status !== 200) {
                alert("Server error");
                return;
            }

            const data = await response.json();
            console.log("Parsed data:", data);

            if (Array.isArray(data) && data.length === 0) {
                alert("Review API working. No submissions found.");
            } else {
                alert(JSON.stringify(data, null, 2));
            }
        } catch (err) {
            console.error("Error:", err);
            alert("Backend not reachable");
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col">
            <Navbar />
            <div className="flex-1 max-w-7xl w-full mx-auto p-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Teacher Dashboard</h1>
                        <p className="text-slate-400">Manage your exams and monitor live sessions.</p>
                    </div>
                    <div className="flex space-x-4">
                        <button
                            onClick={testReviewAPI}
                            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98]"
                        >
                            <span>Test Review API</span>
                        </button>
                        <button
                            onClick={() => navigate('/create-exam')}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98]"
                        >
                            <PlusCircle size={20} />
                            <span>Create Exam</span>
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {exams.length === 0 ? (
                        <div className="col-span-full text-center py-20 bg-slate-800/50 rounded-2xl border border-slate-700/50 border-dashed">
                            <p className="text-slate-400 text-lg mb-4">No exams created yet.</p>
                            <button
                                onClick={() => navigate('/create-exam')}
                                className="text-blue-400 hover:text-blue-300 font-semibold flex items-center justify-center w-full max-w-[200px] mx-auto"
                            >
                                <PlusCircle size={18} className="mr-2" /> Create your first exam
                            </button>
                        </div>
                    ) : (
                        exams.map(exam => (
                            <div key={exam.id} className="bg-slate-800 rounded-2xl p-6 border border-slate-700 hover:border-slate-600 transition-colors shadow-lg shadow-slate-900/50 flex flex-col">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-slate-100 mb-2">{exam.title}</h3>
                                    <div className="flex items-center space-x-2 text-slate-400 text-sm mb-4">
                                        <span className="bg-slate-900 px-2 py-1 rounded">Duration: {exam.duration} mins</span>
                                        <span className="bg-slate-900 px-2 py-1 rounded">ID: {exam.id}</span>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-700 grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => navigate(`/monitor/${exam.id}`)}
                                        className="flex items-center justify-center space-x-2 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        <Activity size={16} />
                                        <span>Live Monitor</span>
                                    </button>
                                    <button
                                        onClick={() => navigate(`/monitor/${exam.id}`)} // For simplicity sharing monitoring dashboard
                                        className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-indigo-600/20"
                                    >
                                        <Eye size={16} />
                                        <span>View Logs</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div >
        </div >
    );
};

export default TeacherDashboard;
