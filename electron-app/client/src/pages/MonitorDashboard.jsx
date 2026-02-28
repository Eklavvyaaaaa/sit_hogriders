import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { ShieldAlert, RefreshCw, EyeOff, UserSearch, AlertCircle, Download, Flag, BarChart3, ArrowLeft } from 'lucide-react';
import ChatBox from '../components/ChatBox';

const MonitorDashboard = () => {
  const { examId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'live');
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examStats, setExamStats] = useState(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await api.get(`/monitor/logs/${examId}`);
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [examId]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get(`/exam/${examId}/stats`);
      setExamStats(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [examId]);

  useEffect(() => {
    fetchLogs();
    fetchStats();
    const interval = setInterval(() => {
      fetchLogs();
      fetchStats();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchLogs, fetchStats]);

  const handleExportCSV = async () => {
    let url;
    try {
      const res = await api.get(`/exam/${examId}/export`, { responseType: 'blob' });
      url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `exam_${examId}_logs.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      if (url) window.URL.revokeObjectURL(url);
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
    return <AlertCircle size={16} className="text-amber-500" />;
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      low: 'bg-amber-50 text-amber-700 border-amber-200',
      medium: 'bg-orange-50 text-orange-700 border-orange-200',
      high: 'bg-red-50 text-red-700 border-red-200'
    };
    return colors[severity] || colors.medium;
  };

  const getStudentStatusColor = (violationCount) => {
    if (violationCount >= 10) return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500', label: 'Critical' };
    if (violationCount >= 5) return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500', label: 'Attention' };
    return { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'On Track' };
  };

  return (
    <div className="min-h-screen bg-white flex flex-col font-inter">
      <Navbar />
      <div className="flex-1 max-w-6xl w-full mx-auto p-8">

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate('/teacher')} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <ArrowLeft size={20} />
            </button>
            <div>
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Monitoring</p>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Live Monitor</h1>
              <p className="text-slate-400 text-sm font-medium">Exam ID: <span className="text-blue-600 font-mono">{examId}</span></p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button onClick={handleViewFlagged} className="flex items-center space-x-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg border border-red-200 transition-colors text-sm font-semibold">
              <Flag size={16} />
              <span>Flagged</span>
            </button>
            <button onClick={handleExportCSV} className="flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 px-4 py-2 rounded-lg border border-emerald-200 transition-colors text-sm font-semibold">
              <Download size={16} />
              <span>Export CSV</span>
            </button>
            <button onClick={() => { fetchLogs(); fetchStats(); }} className="flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 px-4 py-2 rounded-lg border border-slate-200 transition-colors text-sm font-semibold">
              <RefreshCw size={16} className={loading ? "animate-spin text-blue-500" : "text-blue-500"} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        {examStats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Students', value: examStats.studentsJoined, icon: BarChart3, color: 'text-cyan-600', bg: 'bg-cyan-50' },
              { label: 'Submissions', value: examStats.submissions, icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Violations', value: examStats.violations, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Flagged', value: examStats.flaggedStudents, icon: Flag, color: 'text-red-600', bg: 'bg-red-50' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-xl p-4 border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] flex items-center space-x-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon size={18} className={stat.color} />
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black">{stat.label}</p>
                  <p className="text-xl font-black text-slate-900">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-50 rounded-lg p-1 border border-slate-100 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-5 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'live' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            Live Monitoring
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-5 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
          >
            Violation Logs
          </button>
        </div>

        {activeTab === 'live' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {examStats && examStats.studentsList && examStats.studentsList.length > 0 ? (
              examStats.studentsList.map(student => {
                const status = getStudentStatusColor(student.violation_count);
                return (
                  <div key={student.student_id} className={`${status.bg} rounded-xl p-5 border ${status.border} text-center flex flex-col items-center shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-all hover:shadow-md`}>
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-3 border border-slate-200 shadow-sm">
                      <UserSearch size={22} className={status.text} />
                    </div>
                    <h3 className="text-slate-900 font-bold text-sm mb-0.5 truncate w-full" title={student.name}>{student.name}</h3>
                    <p className="text-xs text-slate-400 mb-3 truncate w-full" title={student.email}>{student.email}</p>
                    <div className="mt-auto flex items-center space-x-1.5">
                      <span className={`w-2 h-2 rounded-full ${status.dot}`}></span>
                      <span className={`text-[10px] font-black uppercase tracking-widest ${status.text}`}>{status.label}</span>
                    </div>
                    <span className={`text-2xl font-black mt-1 ${status.text}`}>{student.violation_count}</span>
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Violations</p>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-16 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                <p className="text-lg font-medium">No students have joined yet.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-widest font-black border-b border-slate-200">
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Suspicious Event</th>
                    <th className="p-4">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                            <ShieldAlert size={22} className="text-slate-300" />
                          </div>
                          <p className="text-base font-semibold text-slate-500">No suspicious activity detected yet.</p>
                          <p className="text-sm text-slate-400">Logs will appear here in real-time.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log, i) => (
                      <tr key={log.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                        <td className="p-4 text-slate-500 whitespace-nowrap">
                          <span className="bg-slate-50 px-2 py-1 rounded-md border border-slate-100 font-mono text-xs">
                            {new Date(log.timestamp).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-slate-900 font-semibold text-sm">{log.student_name}</td>
                        <td className="p-4 text-slate-500 text-sm">{log.student_email}</td>
                        <td className="p-4">
                          <div className="inline-flex items-center space-x-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-md border border-red-100 text-xs font-semibold">
                            {getEventIcon(log.event_type)}
                            <span>{log.event_type}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`text-[10px] px-2.5 py-1 rounded-md border font-black uppercase tracking-widest ${getSeverityBadge(log.severity)}`}>
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
        )}
      </div>
      <ChatBox examId={examId} />
    </div>
  );
};

export default MonitorDashboard;
