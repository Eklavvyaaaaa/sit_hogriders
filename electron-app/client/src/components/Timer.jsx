import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

const Timer = ({ durationMinutes, onTimeUp }) => {
    const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);

    useEffect(() => {
        if (timeLeft <= 0) {
            onTimeUp();
            return;
        }

        const interval = setInterval(() => {
            setTimeLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [timeLeft, onTimeUp]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return \`\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
  };

  return (
    <div className={\`flex items-center space-x-2 px-4 py-2 rounded-lg font-mono text-xl shadow-md \${timeLeft < 60 ? 'bg-red-900/50 text-red-400 border border-red-500/50 animate-pulse' : 'bg-slate-800 text-blue-400 border border-slate-700'}\`}>
      <Clock size={24} />
      <span>{formatTime(timeLeft)}</span>
    </div>
  );
};

export default Timer;
