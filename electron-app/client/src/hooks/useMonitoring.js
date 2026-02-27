import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import api from '../services/api';

export const useMonitoring = (examId) => {
    const [faceLandmarker, setFaceLandmarker] = useState(null);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const lastLogTime = useRef(0);

    useEffect(() => {
        const initModel = async () => {
            const vision = await FilesetResolver.forVisionTasks(
                "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
            );
            const faceLandmarkerObj = await FaceLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                    delegate: "GPU"
                },
                outputFaceBlendshapes: true,
                runningMode: "VIDEO",
                numFaces: 2 // Detect up to 2 to check for multiple faces
            });
            setFaceLandmarker(faceLandmarkerObj);
        };
        initModel();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const sendLog = useCallback(async (eventType) => {
        const now = Date.now();
        // Throttle logs to at most 1 every 5 seconds for the same event type to prevent spam
        if (now - lastLogTime.current < 5000) return;

        lastLogTime.current = now;
        setAlerts(prev => [...prev, { time: new Date(), type: eventType }]);

        try {
            await api.post('/monitor/log', { examId, eventType });
        } catch (err) {
            console.error('Failed to log event:', err);
        }
    }, [examId]);

    useEffect(() => {
        if (!isMonitoring || !faceLandmarker || !videoRef.current) return;

        let animationFrameId;

        const detectFaces = async () => {
            if (videoRef.current && videoRef.current.readyState >= 2) {
                const results = faceLandmarker.detectForVideo(videoRef.current, performance.now());

                if (results.faceLandmarks) {
                    if (results.faceLandmarks.length === 0) {
                        sendLog('No face detected');
                    } else if (results.faceLandmarks.length > 1) {
                        sendLog('Multiple faces detected');
                    } else {
                        // Basic head pose estimation from blendshapes or specific landmark coordinates
                        // For simplicity in this implementation, we look at the horizontal position of nose vs ears
                        const face = results.faceLandmarks[0];
                        const nose = face[1];
                        const leftEye = face[33];
                        const rightEye = face[263];

                        // Very heuristic check for looking away (head turned significantly)
                        // distance ratio between nose to eye left vs nose to eye right
                        const distLeft = Math.abs(nose.x - leftEye.x);
                        const distRight = Math.abs(nose.x - rightEye.x);

                        if (distLeft / distRight > 3 || distRight / distLeft > 3) {
                            sendLog('Looking away detected');
                        }
                    }
                }
            }
            animationFrameId = requestAnimationFrame(detectFaces);
        };

        detectFaces();

        return () => {
            cancelAnimationFrame(animationFrameId);
        };
    }, [isMonitoring, faceLandmarker, sendLog]);

    // Window blur detection
    useEffect(() => {
        if (!isMonitoring) return;

        const handleBlur = () => {
            sendLog('Window blur / loss of focus detected');
        };

        if (window.electronAPI) {
            window.electronAPI.onWindowBlur(handleBlur);
        } else {
            // Fallback for non-electron env testing
            window.addEventListener('blur', handleBlur);
        }

        return () => {
            if (window.electronAPI) {
                window.electronAPI.removeBlurListeners();
            } else {
                window.removeEventListener('blur', handleBlur);
            }
        };
    }, [isMonitoring, sendLog]);

    const startMonitoring = async (videoElement) => {
        videoRef.current = videoElement;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = stream;
            streamRef.current = stream;

            videoElement.play();
            setIsMonitoring(true);
        } catch (err) {
            console.error("Camera access denied!", err);
            sendLog('Camera access denied');
        }
    };

    const stopMonitoring = () => {
        setIsMonitoring(false);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };

    return { startMonitoring, stopMonitoring, alerts, isReady: !!faceLandmarker };
};
