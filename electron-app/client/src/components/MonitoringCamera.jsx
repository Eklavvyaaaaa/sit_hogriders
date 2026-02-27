import React, { useEffect, useRef } from 'react';
import { useMonitoring } from '../hooks/useMonitoring';
import { Camera, AlertTriangle } from 'lucide-react';

const MonitoringCamera = ({ examId, stream }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const integrityRef = useRef(100);

    const onFrameUpdate = (data) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (isTerminated) return;

        if (!data) return;

        const { boundingBox, yaw, pitch } = data;

        // Calculate coordinates for unmirrored canvas laying over mirrored video
        const boxScreenLeft = (1 - boundingBox.maxX) * canvas.width;
        const boxScreenRight = (1 - boundingBox.minX) * canvas.width;
        const boxScreenTop = boundingBox.minY * canvas.height;
        const boxScreenBottom = boundingBox.maxY * canvas.height;

        const width = boxScreenRight - boxScreenLeft;
        const height = boxScreenBottom - boxScreenTop;

        // Draw bounding box
        ctx.strokeStyle = '#22c55e'; // green-500
        ctx.lineWidth = 2;
        ctx.strokeRect(boxScreenLeft, boxScreenTop, width, height);

        // Draw Background for text
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)'; // slate-900 with opacity
        ctx.fillRect(boxScreenLeft, boxScreenTop - 45, 110, 40);

        // Draw Yaw and Pitch Text
        ctx.fillStyle = '#22c55e';
        ctx.font = '12px monospace';
        ctx.fillText(`Yaw:   ${yaw.toFixed(3)}`, boxScreenLeft + 5, boxScreenTop - 25);
        ctx.fillText(`Pitch: ${pitch.toFixed(3)}`, boxScreenLeft + 5, boxScreenTop - 10);

        // Draw Integrity Score at top right
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(canvas.width - 150, 10, 140, 30);
        ctx.fillStyle = integrityRef.current > 50 ? '#22c55e' : '#ef4444'; // green or red
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`Integrity: ${Math.round(integrityRef.current)}/100`, canvas.width - 140, 30);
    };

    const { startMonitoring, stopMonitoring, alerts, integrityScore, isReady, monitoringError, isTerminated } = useMonitoring(examId, onFrameUpdate);

    useEffect(() => {
        integrityRef.current = integrityScore;
    }, [integrityScore]);

    useEffect(() => {
        if (isReady && videoRef.current) {
            startMonitoring(videoRef.current, stream);
        }
        return () => {
            stopMonitoring();
        };
    }, [isReady, startMonitoring, stopMonitoring, stream]);

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

            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover transform -scale-x-100" // Mirrors the video
                    muted
                    playsInline
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                // Canvas is NOT mirrored, coordinates are inverted via JS to keep text readable
                />
                {!isReady && !monitoringError && !isTerminated && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {monitoringError && !isTerminated && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-center px-4">
                        <span className="text-yellow-500 text-sm font-semibold mb-1">⚠ Monitoring Unavailable</span>
                        <span className="text-slate-400 text-xs">{monitoringError}</span>
                        <span className="text-slate-500 text-[10px] mt-2">Your exam will continue without AI proctoring.</span>
                    </div>
                )}
                {isTerminated && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-red-900/90 text-center px-6">
                        <AlertTriangle size={48} className="text-red-500 mb-4 animate-bounce" />
                        <h2 className="text-red-500 text-xl font-bold mb-2 uppercase tracking-widest">Session Terminated</h2>
                        <span className="text-red-200 text-sm mb-4">You have exceeded the maximum allowed suspicious activities.</span>
                        <span className="bg-red-950 text-red-400 px-4 py-2 border border-red-800 rounded-lg text-xs font-mono">
                            Alert Count: {alerts.length}/15
                        </span>
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
