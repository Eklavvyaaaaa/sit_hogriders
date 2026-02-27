import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { ShieldAlert, RefreshCw, EyeOff, UserSearch, AlertCircle, Download, Flag, BarChart3 } from 'lucide-react';

const MonitorDashboard = () => {
  const { examId } = useParams();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examStats, setExamStats] = useState(null);

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

  const fetchStats = async () => {
    try {
      const res = await api.get(`/exam/${examId}/stats`);
      setExamStats(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchStats();
    const interval = setInterval(() => {
      fetchLogs();
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [examId]);

  const handleExportCSV = async () => {
    try {
      const res = await api.get(`/exam/${examId}/export`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `exam_${examId}_logs.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const handleViewFlagged = async () => {
    try {
      const res = await api.get(`/exam/${examId}/flagged`);
      const flagged = res.data;
      if (flagged.length === 0) {
        alert('No flagged students for this exam.');
      } else {
        const list = flagged.map(s => `• ${s.name} (${s.email}) — ${s.violation_count} violations`).join('\n');
        alert(`Flagged Students:\n\n${list}`);
      }
    } catch (err) {
      console.error('Failed to fetch flagged', err);
    }
  };

  const getEventIcon = (type) => {
    if (type.includes('No face')) return <EyeOff size={16} className="text-red-500" />;
    if (type.includes('Multiple faces')) return <UserSearch size={16} className="text-orange-500" />;
    return <AlertCircle size={16} className="text-yellow-500" />;
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      low: 'bg-yellow-900/20 text-yellow-300 border-yellow-900/50',
      medium: 'bg-orange-900/20 text-orange-300 border-orange-900/50',
      high: 'bg-red-900/20 text-red-300 border-red-900/50'
    };
    return colors[severity] || colors.medium;
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-6xl w-full mx-auto p-8">

        <div className="flex justify-between items-center mb-6">
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
              onClick={handleViewFlagged}
              className="flex items-center space-x-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-xl border border-red-900/50 transition-colors"
            >
              <Flag size={18} />
              <span>Flagged</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center space-x-2 bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-400 px-4 py-2 rounded-xl border border-emerald-900/50 transition-colors"
            >
              <Download size={18} />
              <span>Export CSV</span>
            </button>
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

        {/* Exam Stats Summary */}
        {examStats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center space-x-3">
              <BarChart3 size={20} className="text-cyan-400" />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Students</p>
                <p className="text-xl font-bold text-white">{examStats.studentsJoined}</p>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center space-x-3">
              <BarChart3 size={20} className="text-blue-400" />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Submissions</p>
                <p className="text-xl font-bold text-white">{examStats.submissions}</p>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center space-x-3">
              <AlertCircle size={20} className="text-orange-400" />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Violations</p>
                <p className="text-xl font-bold text-white">{examStats.violations}</p>
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center space-x-3">
              <Flag size={20} className="text-red-400" />
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Flagged</p>
                <p className="text-xl font-bold text-white">{examStats.flaggedStudents}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-800 rounded-3xl overflow-hidden shadow-2xl border border-slate-700">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/50 text-slate-400 uppercase text-xs tracking-wider border-b border-slate-700">
                  <th className="p-6 font-semibold">Timestamp</th>
                  <th className="p-6 font-semibold">Student Name</th>
                  <th className="p-6 font-semibold">Email</th>
                  <th className="p-6 font-semibold">Suspicious Event</th>
                  <th className="p-6 font-semibold">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 border border-slate-800">
                          <ShieldAlert size={24} className="text-slate-700" />
                        </div>
                        <p className="text-lg font-medium">No suspicious activity detected yet.</p>
                        <p className="text-sm">Logs will appear here in real-time.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/80 transition-colors group">
                      <td className="p-6 text-slate-400 whitespace-nowrap">
                        <span className="bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 font-mono text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-6 text-white font-medium">{log.student_name}</td>
                      <td className="p-6 text-slate-400">{log.student_email}</td>
                      <td className="p-6">
                        <div className="inline-flex items-center space-x-2 bg-red-900/20 text-red-200 px-3 py-1.5 rounded-lg border border-red-900/50">
                          {getEventIcon(log.event_type)}
                          <span className="font-medium text-sm">{log.event_type}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`text-xs px-3 py-1.5 rounded-lg border font-medium capitalize ${getSeverityBadge(log.severity)}`}>
                          {log.severity || 'medium'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitorDashboard;
