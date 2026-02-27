import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertTriangle } from 'lucide-react';

const Timer = ({ durationMinutes, onTimeUp }) => {
  const [timeLeft, setTimeLeft] = useState(Math.max(0, durationMinutes * 60));
  const hasTriggered = useRef(false);
  const navigate = useNavigate();

  // Stable callback that won't cause re-renders
  const handleTimeUp = useCallback(async () => {
    if (hasTriggered.current) return;
    hasTriggered.current = true;

    try {
      // Call the parent's onTimeUp (which triggers submission in ExamPage)
      await onTimeUp();
    } catch (err) {
      console.error('Auto-submit on timer expiry failed:', err);
    }

    // Redirect to student dashboard / exam history after submission
    navigate('/join', { replace: true });
  }, [onTimeUp, navigate]);

  useEffect(() => {
    // If already at 0, trigger immediately
    if (timeLeft <= 0) {
      handleTimeUp();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(interval);
          // Use setTimeout to avoid state update during render
          setTimeout(() => handleTimeUp(), 0);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [handleTimeUp]); // Only depend on handleTimeUp, not timeLeft

  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, seconds); // Prevent negative display
    const h = Math.floor(safeSeconds / 3600);
    const m = Math.floor((safeSeconds % 3600) / 60);
    const s = safeSeconds % 60;

    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Visual urgency levels
  const isUrgent = timeLeft < 60;
  const isWarning = timeLeft < 300 && timeLeft >= 60;

  const timerClasses = isUrgent
    ? 'bg-red-900/50 text-red-400 border border-red-500/50 animate-pulse'
    : isWarning
      ? 'bg-amber-900/40 text-amber-400 border border-amber-500/50'
      : 'bg-slate-800 text-blue-400 border border-slate-700';

  return (
    <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-mono text-xl shadow-md transition-all duration-500 ${timerClasses}`}>
      {isUrgent && <AlertTriangle size={20} className="text-red-400" />}
      <Clock size={24} />
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
};

export default Timer;
