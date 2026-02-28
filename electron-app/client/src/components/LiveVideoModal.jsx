import React, { useEffect, useRef, useState } from 'react';
import { CameraOff, Loader2, X } from 'lucide-react';
import { io } from 'socket.io-client';
import Cookies from 'js-cookie';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

const LiveVideoModal = ({ student, examId, onClose }) => {
    const videoRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const [status, setStatus] = useState('connecting'); // connecting, connected, failed
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        // Connect to socket with JWT auth
        const token = Cookies.get('token');
        const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001', {
            auth: { token }
        });

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionRef.current = pc;

        // Handle incoming video track
        pc.ontrack = (event) => {
            if (videoRef.current && event.streams && event.streams[0]) {
                videoRef.current.srcObject = event.streams[0];
                setStatus('connected');
            }
        };

        // Handle connection state changes
        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                setStatus('failed');
                setErrorMsg('Connection lost');
            }
        };

        // Send local ICE candidates to the student
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc:ice-candidate', {
                    targetUserId: student.sender_id || student.id || student.student_id,
                    candidate: event.candidate,
                    examId
                });
            }
        };

        socket.on('connect', () => {
            // Join specific exam chat room if needed, but 'user:id' is joined automatically on backend.
            // 1. Send the initial request to the student
            socket.emit('webrtc:request', {
                studentId: student.sender_id || student.id || student.student_id,
                examId
            });
        });

        socket.on('connect_error', () => {
            setStatus('failed');
            setErrorMsg('Signaling Server Error');
        });

        // 2. Listen for the WebRTC Offer from the student
        const handleOffer = async ({ studentId, offer, examId: recvExamId }) => {
            const targetId = student.sender_id || student.id || student.student_id;
            if (String(studentId) !== String(targetId) || String(recvExamId) !== String(examId)) return;

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                // Send Answer back to student
                socket.emit('webrtc:answer', {
                    targetStudentId: studentId,
                    answer,
                    examId
                });
            } catch (err) {
                console.error('Error handling WebRTC offer:', err);
                setStatus('failed');
                setErrorMsg('Failed to establish video feed');
            }
        };

        // 3. Listen for incoming ICE candidates from the student
        const handleIceCandidate = async ({ senderId, candidate, examId: recvExamId }) => {
            const targetId = student.sender_id || student.id || student.student_id;
            if (String(senderId) !== String(targetId) || String(recvExamId) !== String(examId)) return;

            try {
                if (pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
            } catch (err) {
                console.error('Error adding ICE candidate:', err);
            }
        };

        socket.on('webrtc:offer', handleOffer);
        socket.on('webrtc:ice-candidate', handleIceCandidate);

        return () => {
            // Cleanup
            socket.off('connect');
            socket.off('connect_error');
            socket.off('webrtc:offer', handleOffer);
            socket.off('webrtc:ice-candidate', handleIceCandidate);
            socket.disconnect();
            pc.close();
            peerConnectionRef.current = null;
        };
    }, [student, examId]);

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
                                    {status === 'connecting' ? 'Establishing secure P2P connection...' : status === 'connected' ? 'Live Video Feed' : 'Connection Failed'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
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
                            <p className="text-slate-500 text-sm mt-2">Signaling over Socket.io WebRTC gateway</p>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-10">
                            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 ring-2 ring-red-500/20">
                                <CameraOff size={32} className="text-red-500" />
                            </div>
                            <p className="text-red-400 font-bold text-lg">{errorMsg}</p>
                            <p className="text-slate-500 text-sm mt-2">The student may have disconnected or blocked camera access.</p>
                            <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors text-sm font-bold tracking-wide">
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
