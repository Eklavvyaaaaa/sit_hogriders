import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { SocketContext } from './SocketContext';
import { AuthContext } from './AuthContext';

export const WebRTCContext = createContext();

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

export const WebRTCProvider = ({ children }) => {
    const { socket, isConnected } = useContext(SocketContext);
    const { user } = useContext(AuthContext);

    // Teacher state: Map of studentId -> MediaStream
    const [remoteStreams, setRemoteStreams] = useState({});

    // Internal references to prevent memory leaks across React re-renders
    const peerConnectionsRef = useRef({}); // Map of userId -> RTCPeerConnection
    const localStreamRef = useRef(null);   // Single local stream (Student)

    // ==========================================
    // Core WebRTC Event Listeners
    // ==========================================
    useEffect(() => {
        if (!socket || !isConnected) return;

        // 1. Student receives a request to start broadcasting
        const handleWebrtcRequest = async ({ teacherId, examId }) => {
            console.log(`[WebRTCContext] Received request to broadcast to teacher ${teacherId}`);
            if (!localStreamRef.current) {
                console.warn("No local stream to broadcast!");
                return;
            }

            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionsRef.current[teacherId] = pc;

            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('webrtc:ice-candidate', {
                        targetUserId: teacherId,
                        candidate: event.candidate,
                        examId
                    });
                }
            };

            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('webrtc:offer', { targetTeacherId: teacherId, offer, examId });
            } catch (err) {
                console.error("Failed to create offer:", err);
            }
        };

        // 2. Teacher receives an Offer from a student
        const handleWebrtcOffer = async ({ studentId, offer, examId }) => {
            console.log(`[WebRTCContext] Received Offer from student ${studentId}`);

            let pc = peerConnectionsRef.current[studentId];
            if (!pc) {
                pc = new RTCPeerConnection(ICE_SERVERS);
                peerConnectionsRef.current[studentId] = pc;

                pc.ontrack = (event) => {
                    if (event.streams && event.streams[0]) {
                        console.log(`[WebRTCContext] Incoming track from ${studentId}`);
                        setRemoteStreams(prev => ({
                            ...prev,
                            [studentId]: event.streams[0]
                        }));
                    }
                };

                pc.oniceconnectionstatechange = () => {
                    if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                        console.log(`[WebRTCContext] Connection lost with ${studentId}`);
                        pc.close();
                        delete peerConnectionsRef.current[studentId];
                        setRemoteStreams(prev => {
                            const newStreams = { ...prev };
                            delete newStreams[studentId];
                            return newStreams;
                        });
                    }
                };

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('webrtc:ice-candidate', {
                            targetUserId: studentId,
                            candidate: event.candidate,
                            examId
                        });
                    }
                };
            }

            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);

                socket.emit('webrtc:answer', { targetStudentId: studentId, answer, examId });
            } catch (err) {
                console.error("Error setting up remote stream:", err);
            }
        };

        // 3. Student receives the Teacher's Answer
        const handleWebrtcAnswer = async ({ teacherId, answer }) => {
            console.log(`[WebRTCContext] Received Answer from teacher ${teacherId}`);
            const pc = peerConnectionsRef.current[teacherId];
            if (pc) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(answer));
                } catch (err) {
                    console.error("Error setting remote description from answer:", err);
                }
            }
        };

        // 4. Exchange ICE Candidates
        const handleWebrtcIceCandidate = async ({ senderId, candidate }) => {
            const pc = peerConnectionsRef.current[senderId];
            if (pc && pc.remoteDescription) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error("Error adding remote ICE candidate:", err);
                }
            }
        };

        socket.on('webrtc:request', handleWebrtcRequest);
        socket.on('webrtc:offer', handleWebrtcOffer);
        socket.on('webrtc:answer', handleWebrtcAnswer);
        socket.on('webrtc:ice-candidate', handleWebrtcIceCandidate);

        return () => {
            socket.off('webrtc:request', handleWebrtcRequest);
            socket.off('webrtc:offer', handleWebrtcOffer);
            socket.off('webrtc:answer', handleWebrtcAnswer);
            socket.off('webrtc:ice-candidate', handleWebrtcIceCandidate);
        };
    }, [socket, isConnected]);

    // ==========================================
    // Callable Actions
    // ==========================================

    // Called by ExamPage.jsx to globally register the student's camera
    const registerLocalStream = useCallback((stream) => {
        localStreamRef.current = stream;
        console.log("[WebRTCContext] Registered local MediaStream for broadcast");
    }, []);

    const unregisterLocalStream = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        // Cleanup all outgoing P2P connections
        Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
        peerConnectionsRef.current = {};
    }, []);

    // Called by Teacher to trigger the WebRTC P2P flow
    const requestVideoFeed = useCallback((studentId, examId) => {
        if (socket && isConnected) {
            console.log(`[WebRTCContext] Requesting P2P feed from student ${studentId}`);
            socket.emit('webrtc:request', { studentId, examId });
        }
    }, [socket, isConnected]);

    // Cleanup a specific teacher's view of a student
    const closeVideoFeed = useCallback((studentId) => {
        const pc = peerConnectionsRef.current[studentId];
        if (pc) {
            pc.close();
            delete peerConnectionsRef.current[studentId];
        }
        setRemoteStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[studentId];
            return newStreams;
        });
    }, []);

    return (
        <WebRTCContext.Provider value={{
            remoteStreams,
            registerLocalStream,
            unregisterLocalStream,
            requestVideoFeed,
            closeVideoFeed
        }}>
            {children}
        </WebRTCContext.Provider>
    );
};

export const useWebRTC = () => {
    return useContext(WebRTCContext);
};
