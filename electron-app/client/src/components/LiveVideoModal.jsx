import React, { useEffect, useRef, useState } from 'react';
import { CameraOff, Loader2, X } from 'lucide-react';
import { useWebRTC } from '../context/WebRTCContext';

const LiveVideoModal = ({ student, examId, onClose }) => {
    const videoRef = useRef(null);
    const { remoteStreams, requestVideoFeed, closeVideoFeed } = useWebRTC();
    const [status, setStatus] = useState('connecting'); // connecting, connected, failed

    // Resolve which ID is used for this student depending on view mode
    const studentId = student.sender_id || student.id || student.student_id;

    useEffect(() => {
        // Fire request so WebRTCContext negotiates with Student globally
        requestVideoFeed(studentId, examId);

        const retryInterval = setInterval(() => {
            if (!remoteStreams[studentId]) {
                console.log("[LiveVideoModal] Checking stream availability...");
                requestVideoFeed(studentId, examId);
            }
        }, 5000); // Retry every 5 seconds if connection fails

        return () => {
            clearInterval(retryInterval);
            // We do NOT call closeVideoFeed() here! We just unmount the modal.
            // This is the core architectural fix: the stream stays alive in the background
            // even if the teacher closes the modal and reopens it.
        };
    }, [studentId, examId, requestVideoFeed, remoteStreams]);

    // Attach stream to video element when it arrives
    useEffect(() => {
        const stream = remoteStreams[studentId];
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
            setStatus('connected');
        } else if (!stream && status === 'connected') {
            setStatus('connecting');
        }
    }, [remoteStreams, studentId, status]);

    const handleClose = () => {
        // Only if the user explicitly wants to end the stream do we close the connection
        // Optional: you can leave it alive for instant reopening
        closeVideoFeed(studentId);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl shadow-black/50 w-full max-w-4xl flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex justify-between items-center p-4 bg-slate-800/80 border-b border-slate-700">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold uppercase ring-1 ring-blue-500/50">
                            {student.student_name ? student.student_name[0] : student.name ? student.name[0] : '?'}
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg leading-tight">
                                {student.student_name || student.name || 'Unknown Student'}
                            </h2>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                                <span className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 animate-pulse' : status === 'failed' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`}></span>
                                <span className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                                    {status === 'connecting' ? 'Establishing persistent P2P connection...' : status === 'connected' ? 'Live Video Feed' : 'Connection Failed'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleClose}
                        className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-600 hover:border-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Video Container */}
                <div className="relative aspect-[16/9] bg-black flex flex-col items-center justify-center overflow-hidden">

                    {status === 'connecting' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-10">
                            <Loader2 size={48} className="text-blue-500 animate-spin mb-6" />
                            <p className="text-blue-400 font-semibold tracking-wide">Waiting for student's webcam...</p>
                            <p className="text-slate-500 text-sm mt-2">Signaling over global WebRTC Context gateway</p>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-10">
                            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 ring-2 ring-red-500/20">
                                <CameraOff size={32} className="text-red-500" />
                            </div>
                            <p className="text-red-400 font-bold text-lg">Connection Lost</p>
                            <p className="text-slate-500 text-sm mt-2">The student may have disconnected or blocked camera access.</p>
                            <button onClick={handleClose} className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors text-sm font-bold tracking-wide">
                                Close Viewer
                            </button>
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className={`w-full h-full object-contain transition-opacity duration-1000 ${status === 'connected' ? 'opacity-100' : 'opacity-0'}`}
                    />
                </div>
            </div>
        </div>
    );
};

export default LiveVideoModal;
