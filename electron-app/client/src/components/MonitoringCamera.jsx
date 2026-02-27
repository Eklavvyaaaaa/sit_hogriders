import React, { useEffect, useRef } from 'react';
import { useMonitoring } from '../hooks/useMonitoring';
import { Camera, AlertTriangle } from 'lucide-react';

const MonitoringCamera = ({ examId }) => {
    const videoRef = useRef(null);
    const { startMonitoring, stopMonitoring, alerts, isReady } = useMonitoring(examId);

    useEffect(() => {
        if (isReady && videoRef.current) {
            startMonitoring(videoRef.current);
        }
        return () => {
            stopMonitoring();
        };
    }, [isReady]);

    return (
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 flex flex-col">
            <div className="p-3 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center text-slate-300">
                    <Camera size={18} className="mr-2" />
                    <span className="font-semibold text-sm">Live Monitoring</span>
                </div>
                <div className="flex items-center space-x-2">
                    {(!isReady) && <span className="text-xs text-yellow-500 animate-pulse">Initializing AI...</span>}
                    {isReady && <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>}
                </div>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover transform -scale-x-100" // Mirrors the video
                    muted
                    playsInline
                />
                {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
            </div>

            <div className="p-3 max-h-32 overflow-y-auto bg-slate-900/30 text-xs">
                {alerts.length === 0 ? (
                    <div className="text-slate-500 italic text-center py-2">No suspicious activity detected.</div>
                ) : (
                    <ul className="space-y-1">
                        {alerts.slice().reverse().map((alert, i) => (
                            <li key={i} className="flex flex-col text-red-400 border-l-2 border-red-500 pl-2 py-1">
                                <span className="font-semibold flex items-center"><AlertTriangle size={12} className="mr-1" /> {alert.type}</span>
                                <span className="text-slate-500 text-[10px]">{alert.time.toLocaleTimeString()}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default MonitoringCamera;
