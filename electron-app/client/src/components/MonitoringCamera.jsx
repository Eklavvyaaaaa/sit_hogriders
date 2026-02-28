import React, { useEffect, useRef } from 'react';
import { useMonitoring } from '../hooks/useMonitoring';
import { Camera, AlertTriangle, ShieldAlert } from 'lucide-react';

// Color mapping for risk levels
const RISK_COLORS = {
    low: '#22c55e',       // green
    medium: '#eab308',    // yellow
    high: '#f97316',      // orange
    critical: '#ef4444',  // red
};

const RISK_LABELS = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical Risk',
};

const MonitoringCamera = ({ examId, stream }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const integrityRef = useRef(100);
    const riskLevelRef = useRef('low');

    const onFrameUpdate = (data) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        canvas.width = video.clientWidth;
        canvas.height = video.clientHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!data) return;

        const { boundingBox, yaw, pitch } = data;

        // Calculate coordinates for unmirrored canvas laying over mirrored video
        const boxScreenLeft = (1 - boundingBox.maxX) * canvas.width;
        const boxScreenRight = (1 - boundingBox.minX) * canvas.width;
        const boxScreenTop = boundingBox.minY * canvas.height;
        const boxScreenBottom = boundingBox.maxY * canvas.height;

        const width = boxScreenRight - boxScreenLeft;
        const height = boxScreenBottom - boxScreenTop;

        // Color bounding box based on risk level
        const riskColor = RISK_COLORS[riskLevelRef.current] || '#22c55e';

        ctx.strokeStyle = riskColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(boxScreenLeft, boxScreenTop, width, height);

        // Draw Background for text
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(boxScreenLeft, boxScreenTop - 45, 110, 40);

        // Draw Yaw and Pitch Text
        ctx.fillStyle = riskColor;
        ctx.font = '12px monospace';
        ctx.fillText(`Yaw:   ${yaw.toFixed(3)}`, boxScreenLeft + 5, boxScreenTop - 25);
        ctx.fillText(`Pitch: ${pitch.toFixed(3)}`, boxScreenLeft + 5, boxScreenTop - 10);

        // Draw Integrity Score at top right
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(canvas.width - 150, 10, 140, 30);
        ctx.fillStyle = riskColor;
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`Integrity: ${Math.round(integrityRef.current)}/100`, canvas.width - 140, 30);
    };

    const { startMonitoring, stopMonitoring, alerts, integrityScore, riskLevel, isReady, monitoringError } = useMonitoring(examId, onFrameUpdate);

    useEffect(() => {
        integrityRef.current = integrityScore;
    }, [integrityScore]);

    useEffect(() => {
        riskLevelRef.current = riskLevel;
    }, [riskLevel]);

    useEffect(() => {
        if (isReady && videoRef.current) {
            startMonitoring(videoRef.current, stream);
        }
        return () => {
            stopMonitoring();
        };
    }, [isReady, startMonitoring, stopMonitoring, stream]);

    const riskColor = RISK_COLORS[riskLevel] || '#22c55e';

    return (
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-lg border border-slate-700 flex flex-col">
            <div className="p-3 bg-slate-900/50 border-b border-slate-700 flex justify-between items-center">
                <div className="flex items-center text-slate-300">
                    <Camera size={18} className="mr-2" />
                    <span className="font-semibold text-sm">Live Monitoring</span>
                </div>
                <div className="flex items-center space-x-2">
                    {(!isReady) && <span className="text-xs text-yellow-500 animate-pulse">Initializing AI...</span>}
                    {isReady && <span className="w-2.5 h-2.5 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" style={{ backgroundColor: riskColor }}></span>}
                    {isReady && (
                        <span className="text-xs font-semibold" style={{ color: riskColor }}>
                            {RISK_LABELS[riskLevel] || 'Low Risk'}
                        </span>
                    )}
                </div>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                <video
                    ref={videoRef}
                    className="w-full h-full object-cover transform -scale-x-100"
                    muted
                    playsInline
                />
                <canvas
                    ref={canvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                />
                {!isReady && !monitoringError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {monitoringError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-center px-4">
                        <span className="text-yellow-500 text-sm font-semibold mb-1">⚠ Monitoring Unavailable</span>
                        <span className="text-slate-400 text-xs">{monitoringError}</span>
                        <span className="text-slate-500 text-[10px] mt-2">Your exam will continue without AI proctoring.</span>
                    </div>
                )}

                {/* Risk Warning Banners */}
                {riskLevel === 'high' && (
                    <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-center bg-orange-900/80 py-2 px-4 animate-pulse">
                        <ShieldAlert size={16} className="text-orange-400 mr-2" />
                        <span className="text-orange-200 text-xs font-semibold">High Risk — Suspicious activity is being recorded</span>
                    </div>
                )}
                {riskLevel === 'critical' && (
                    <div className="absolute top-0 left-0 right-0 z-40 flex items-center justify-center bg-red-900/90 py-2 px-4 animate-pulse">
                        <AlertTriangle size={16} className="text-red-400 mr-2" />
                        <span className="text-red-200 text-xs font-bold">Critical Risk — Your session has been flagged for review</span>
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
                                <span className="text-slate-500 text-[10px]">{alert.time.toLocaleTimeString()} • +{alert.weight} risk</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default MonitoringCamera;
