import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { ShieldAlert, RefreshCw, EyeOff, UserSearch, AlertCircle, X, User } from 'lucide-react';

const MonitorDashboard = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentEmail, setSelectedStudentEmail] = useState(null);

  const fetchLogs = async () => {
    try {
      const res = await api.get(`/monitor/${examId}`);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // Poll every 5 seconds
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, [examId]);

  const getEventIcon = (type) => {
    if (type.includes('No face')) return <EyeOff size={16} className="text-red-500" />;
    if (type.includes('Multiple faces')) return <UserSearch size={16} className="text-orange-500" />;
    return <AlertCircle size={16} className="text-yellow-500" />;
  };

  const groupedLogs = useMemo(() => {
    const map = {};
    logs.forEach(log => {
      if (!map[log.student_email]) {
        map[log.student_email] = {
          name: log.student_name,
          email: log.student_email,
          count: 0,
          logs: []
        };
      }
      map[log.student_email].count += 1;
      map[log.student_email].logs.push(log);
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [logs]);

  const getStatusStyles = (count) => {
    if (count > 10) return { border: 'border-red-500', bg: 'bg-red-900/20', text: 'text-red-400', label: 'High Risk' };
    if (count > 5) return { border: 'border-yellow-500', bg: 'bg-yellow-900/20', text: 'text-yellow-400', label: 'Medium Risk' };
    return { border: 'border-green-500', bg: 'bg-green-900/20', text: 'text-green-400', label: 'Low Risk' };
  };

  const selectedStudentData = useMemo(() => {
    if (!selectedStudentEmail) return null;
    return groupedLogs.find(g => g.email === selectedStudentEmail) || null;
  }, [selectedStudentEmail, groupedLogs]);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8">

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-red-900/30 p-3 rounded-2xl border border-red-500/20">
              <ShieldAlert size={32} className="text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">Live Monitor Logs</h1>
              <p className="text-slate-400">Exam ID: <span className="text-blue-400 font-mono tracking-wider">{examId}</span></p>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={fetchLogs}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-xl border border-slate-700 transition-colors shadow-lg shadow-slate-900/50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin text-blue-400" : "text-blue-400"} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => navigate('/teacher')}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-xl transition-colors font-semibold"
            >
              Back
            </button>
          </div>
        </div>

        {groupedLogs.length === 0 && !loading ? (
          <div className="bg-slate-800 rounded-3xl p-12 text-center text-slate-500 border border-slate-700 shadow-2xl">
            <div className="flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                <ShieldAlert size={24} className="text-slate-700" />
              </div>
              <p className="text-lg font-medium text-slate-300">No suspicious activity detected yet.</p>
              <p className="text-sm mt-2">Logs will appear here in real-time as students take the exam.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {groupedLogs.map(student => {
              const status = getStatusStyles(student.count);
              const isSelected = selectedStudentEmail === student.email;
              return (
                <div
                  key={student.email}
                  onClick={() => setSelectedStudentEmail(isSelected ? null : student.email)}
                  className={`relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/40 border-2 ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 border-slate-600' : 'border-slate-700'} ${status.bg}`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${status.bg} ${status.border} border-l-4`} />
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-3 truncate">
                      <div className="bg-slate-800 p-2 rounded-full hidden sm:block shrink-0">
                        <User size={20} className="text-slate-400" />
                      </div>
                      <div className="truncate">
                        <h3 className="text-white font-semibold truncate text-lg">{student.name}</h3>
                        <p className="text-slate-400 text-xs truncate">{student.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end mt-4">
                    <div className={`font-medium text-sm px-2 py-1 rounded-md border ${status.border} ${status.bg} border-opacity-50 ${status.text}`}>
                      {status.label}
                    </div>
                    <div className="text-right">
                      <span className={`text-3xl font-bold ${status.text}`}>{student.count}</span>
                      <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Violations</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {selectedStudentData && (
          <div className="bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 mt-8 animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <User size={24} className="text-slate-400" />
                  Detailed Logs: {selectedStudentData.name}
                </h2>
                <p className="text-slate-400 text-sm mt-1">{selectedStudentData.email}</p>
              </div>
              <button
                onClick={() => setSelectedStudentEmail(null)}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white"
                title="Close details"
              >
                <X size={24} />
              </button>
            </div>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-left border-collapse relative">
                <thead className="sticky top-0 bg-slate-900 z-10 shadow-sm border-b border-slate-700">
                  <tr className="text-slate-400 uppercase text-xs tracking-wider">
                    <th className="p-6 font-semibold w-1/3">Timestamp</th>
                    <th className="p-6 font-semibold">Suspicious Event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {selectedStudentData.logs.map((log, index) => (
                    <tr key={log.id || index} className="hover:bg-slate-800/80 transition-colors group">
                      <td className="p-6 text-slate-400 whitespace-nowrap">
                        <span className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 font-mono text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="inline-flex items-center space-x-2 bg-slate-900 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 shadow-sm">
                          {getEventIcon(log.event_type)}
                          <span className="font-medium text-sm">{log.event_type}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonitorDashboard;
