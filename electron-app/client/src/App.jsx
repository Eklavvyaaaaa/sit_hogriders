import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import TeacherDashboard from './pages/TeacherDashboard';
import CreateExam from './pages/CreateExam';
import StudentDashboard from './pages/StudentDashboard';
import JoinClassroom from './pages/JoinClassroom';
import ExamPage from './pages/ExamPage';
import MonitorDashboard from './pages/MonitorDashboard';
import StudentHistory from './pages/StudentHistory';
import SubmissionResults from './pages/SubmissionResults';
import SubmissionReview from './pages/SubmissionReview';
import ExamResults from './pages/ExamResults';

const ProtectedRoute = ({ children, roleRequired }) => {
  const { user, loading } = useContext(AuthContext);

  // Fallback: check localStorage if context hasn't updated yet (React 18 batching)
  const effectiveUser = user || (() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  })();

  if (loading) return <div className="h-screen bg-white flex items-center justify-center text-slate-500 font-medium">Loading...</div>;
  if (!effectiveUser) return <Navigate to="/login" replace />;
  if (roleRequired && effectiveUser.role !== roleRequired) {
    return <Navigate to={effectiveUser.role === 'teacher' ? '/teacher' : '/dashboard'} replace />;
  }

  return children;
};

const AppRoutes = () => {
  const { user } = useContext(AuthContext);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={<Navigate to={user ? (user.role === 'teacher' ? '/teacher' : '/dashboard') : '/login'} replace />}
      />

      {/* Teacher Routes */}
      <Route
        path="/teacher"
        element={
          <ProtectedRoute roleRequired="teacher">
            <TeacherDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/create-exam"
        element={
          <ProtectedRoute roleRequired="teacher">
            <CreateExam />
          </ProtectedRoute>
        }
      />
      <Route
        path="/monitor/:examId"
        element={
          <ProtectedRoute roleRequired="teacher">
            <MonitorDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam-results/:examId"
        element={
          <ProtectedRoute roleRequired="teacher">
            <ExamResults />
          </ProtectedRoute>
        }
      />

      {/* Student Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute roleRequired="student">
            <StudentDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/join"
        element={
          <ProtectedRoute roleRequired="student">
            <JoinClassroom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/exam"
        element={
          <ProtectedRoute roleRequired="student">
            <ExamPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute roleRequired="student">
            <StudentHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/review/:submissionId"
        element={
          <ProtectedRoute roleRequired="student">
            <SubmissionReview />
          </ProtectedRoute>
        }
      />

      {/* Shared Routes */}
      <Route
        path="/results/:submissionId"
        element={
          <ProtectedRoute>
            <SubmissionResults />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
