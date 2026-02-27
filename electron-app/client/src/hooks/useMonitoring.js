import { useState, useEffect, useRef, useCallback } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import api from '../services/api';

// Tagged logger for debugging lifecycle
const log = (tag, ...args) => console.log(`[MediaPipe][${tag}]`, ...args);
const warn = (tag, ...args) => console.warn(`[MediaPipe][${tag}]`, ...args);
const err = (tag, ...args) => console.error(`[MediaPipe][${tag}]`, ...args);

// ── GLOBAL SINGLETON CACHE ──
// Prevents React StrictMode or remounts from crashing WebGL/WASM 
// by attempting to load the model multiple times in the same thread.
let globalVisionResolver = null;
let globalFaceLandmarker = null;
let isGlobalInitializing = false;
let globalInitPromise = null;

const initializeGlobalMediaPipe = async () => {
    if (globalFaceLandmarker) return globalFaceLandmarker;
    if (isGlobalInitializing) return globalInitPromise;

    isGlobalInitializing = true;
    log('Init', 'Starting Global Model Initialization...');

    globalInitPromise = (async () => {
        try {
            if (!globalVisionResolver) {
                log('Init', 'Loading WASM FilesetResolver...');
                globalVisionResolver = await FilesetResolver.forVisionTasks(
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
                );
            }

            log('Init', 'Attempting GPU delegate...');
            try {
                globalFaceLandmarker = await FaceLandmarker.createFromOptions(globalVisionResolver, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                        delegate: "GPU"
                    },
                    outputFaceBlendshapes: true,
                    runningMode: "VIDEO",
                    numFaces: 2
                });
                log('Init', 'GPU delegate succeeded');
            } catch (gpuErr) {
                warn('Init', 'GPU delegate failed, falling back to CPU:', gpuErr.message);
                globalFaceLandmarker = await FaceLandmarker.createFromOptions(globalVisionResolver, {
                    baseOptions: {
                        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
                        delegate: "CPU"
                    },
                    outputFaceBlendshapes: true,
                    runningMode: "VIDEO",
                    numFaces: 2
                });
                log('Init', 'CPU delegate succeeded');
            }

            return globalFaceLandmarker;
        } catch (error) {
            err('Init', 'Fatal error during global initialization:', error.message);
            throw error;
        } finally {
            isGlobalInitializing = false;
        }
    })();

    return globalInitPromise;
};

export const useMonitoring = (examId, onFrameUpdate) => {
    // ── State ──
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const [integrityScore, setIntegrityScore] = useState(100);
    const [monitoringError, setMonitoringError] = useState(null);
    const [isReady, setIsReady] = useState(false);

    // ── Refs (survives re-renders, prevents double-init) ──
    const faceLandmarkerRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const lastLogTime = useRef(0);
    const onFrameUpdateRef = useRef(onFrameUpdate);
    const animationFrameRef = useRef(null);     // Stores current RAF ID
    const isLoopRunningRef = useRef(false);     // Lock: prevents duplicate detection loops
    const fatalErrorRef = useRef(false);        // Kill switch: stops loop after fatal crash
    const consecutiveErrorsRef = useRef(0);     // Tracks repeated detection failures

    // Keep callback ref in sync without triggering re-renders
    useEffect(() => {
        onFrameUpdateRef.current = onFrameUpdate;
    }, [onFrameUpdate]);

    // ══════════════════════════════════════════════════════
    // 1. MODEL INITIALIZATION (runs exactly ONCE)
    // ══════════════════════════════════════════════════════
    useEffect(() => {
        let isMounted = true;

        const loadModel = async () => {
            try {
                const landmarker = await initializeGlobalMediaPipe();
                if (isMounted) {
                    faceLandmarkerRef.current = landmarker;
                    setIsReady(true);
                    setMonitoringError(null);
                    log('Init', 'Hook attached to global model ✓');
                }
            } catch (error) {
                if (isMounted) {
                    setMonitoringError('Failed to load AI monitoring core. Monitoring unavailable.');
                }
            }
        };

        loadModel();

        // ── Hook Cleanup (Do NOT destroy the global model here) ──
        return () => {
            isMounted = false;
            log('Cleanup', 'Component unmounting — releasing resources');

            // Cancel any running detection loop
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            isLoopRunningRef.current = false;

            // Stop camera stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            // We no longer call landmarker.close() here because the model is globally cached.
            // Closing it would break the exam if the user navigates away and comes back.
            faceLandmarkerRef.current = null;

            setIsReady(false);
            log('Cleanup', 'Component cleanup finished ✓');
        };
    }, []); // Empty deps — runs exactly once

    // ══════════════════════════════════════════════════════
    // 2. THROTTLED EVENT LOGGER
    // ══════════════════════════════════════════════════════
    const sendLog = useCallback(async (eventType, confidence = 1.0) => {
        const now = Date.now();
        if (now - lastLogTime.current < 5000) return;

        lastLogTime.current = now;
        setAlerts(prev => [...prev, { time: new Date(), type: eventType, confidence }]);

        setIntegrityScore(prev => {
            let deduction = 0;
            if (eventType.includes('No face')) deduction = 20;
            else if (eventType.includes('Multiple faces')) deduction = 40;
            else if (eventType.includes('Extreme head rotation')) deduction = 10;
            else if (eventType.includes('Looking away')) deduction = 5;
            return Math.max(0, prev - deduction);
        });

        try {
            await api.post('/monitor/log', { examId, eventType, confidence });
        } catch (e) {
            err('Log', 'Failed to send log to API:', e.message);
        }
    }, [examId]);

    // ══════════════════════════════════════════════════════
    // 3. DETECTION LOOP (RAF-based, crash-proof)
    // ══════════════════════════════════════════════════════
    useEffect(() => {
        if (!isMonitoring || !isReady) return;

        // Guard: Prevent duplicate loops
        if (isLoopRunningRef.current) {
            warn('Loop', 'Detection loop already running — skipping duplicate.');
            return;
        }

        isLoopRunningRef.current = true;
        fatalErrorRef.current = false;
        consecutiveErrorsRef.current = 0;
        let suspiciousFrameCount = 0;
        const framesToTriggerAlert = 20;

        log('Loop', 'Detection loop started ✓');

        const detectFaces = () => {
            // Kill switch: stop loop if fatal error occurred
            if (fatalErrorRef.current || !isLoopRunningRef.current) {
                log('Loop', 'Loop terminated (fatal error or cleanup).');
                return;
            }

            const video = videoRef.current;
            const landmarker = faceLandmarkerRef.current;

            // Triple guard: landmarker + video + readyState
            if (!landmarker || !video || video.readyState < 2) {
                animationFrameRef.current = requestAnimationFrame(detectFaces);
                return;
            }

            try {
                const results = landmarker.detectForVideo(video, performance.now());
                consecutiveErrorsRef.current = 0; // Reset on success

                if (results.faceLandmarks) {
                    if (results.faceLandmarks.length === 0) {
                        sendLog('No face detected');
                        suspiciousFrameCount = 0;
                        if (onFrameUpdateRef.current) onFrameUpdateRef.current(null);
                    } else if (results.faceLandmarks.length > 1) {
                        sendLog('Multiple faces detected');
                        suspiciousFrameCount = 0;
                        if (onFrameUpdateRef.current) onFrameUpdateRef.current(null);
                    } else {
                        const face = results.faceLandmarks[0];

                        // 3D head pose approximation
                        const nose = face[1];
                        const forehead = face[10];
                        const chin = face[152];
                        const leftEar = face[234];
                        const rightEar = face[454];

                        const yawThreshold = 0.05;
                        const pitchThreshold = 0.04;

                        const earMidpointX = (leftEar.x + rightEar.x) / 2;
                        const verticalMidpointY = (forehead.y + chin.y) / 2;

                        const yawDeviation = Math.abs(nose.x - earMidpointX);
                        const pitchDeviation = Math.abs(nose.y - verticalMidpointY);

                        // Eye gaze via blendshapes
                        const blendshapes = results.faceBlendshapes?.[0]?.categories || [];
                        const getScore = (name) => blendshapes.find(b => b.categoryName === name)?.score || 0;

                        const maxEyeDeviation = Math.max(
                            getScore('eyeLookInLeft'),
                            getScore('eyeLookOutLeft'),
                            getScore('eyeLookInRight'),
                            getScore('eyeLookOutRight')
                        );

                        const isHeadTurned = yawDeviation > yawThreshold || pitchDeviation > pitchThreshold;
                        const isLookingAway = maxEyeDeviation > 0.6;
                        const isExtremeRotation = yawDeviation > (yawThreshold * 2.5) || pitchDeviation > (pitchThreshold * 2.5);

                        if (isHeadTurned || isLookingAway) {
                            suspiciousFrameCount++;
                            if (suspiciousFrameCount >= framesToTriggerAlert) {
                                const confidenceScore = parseFloat((
                                    (Math.min(yawDeviation / yawThreshold, 1.0) * 0.4) +
                                    (Math.min(pitchDeviation / pitchThreshold, 1.0) * 0.4) +
                                    (Math.min(maxEyeDeviation / 0.6, 1.0) * 0.2)
                                ).toFixed(2));

                                if (isExtremeRotation) {
                                    sendLog('Extreme head rotation detected', confidenceScore);
                                } else {
                                    sendLog('Looking away detected', confidenceScore);
                                }
                                suspiciousFrameCount = 0;
                            }
                        } else {
                            suspiciousFrameCount = 0;
                        }

                        // Bounding box for canvas overlay
                        if (onFrameUpdateRef.current) {
                            let minX = 1, minY = 1, maxX = 0, maxY = 0;
                            for (const pt of face) {
                                if (pt.x < minX) minX = pt.x;
                                if (pt.x > maxX) maxX = pt.x;
                                if (pt.y < minY) minY = pt.y;
                                if (pt.y > maxY) maxY = pt.y;
                            }
                            onFrameUpdateRef.current({
                                yaw: yawDeviation,
                                pitch: pitchDeviation,
                                boundingBox: { minX, minY, maxX, maxY }
                            });
                        }
                    }
                }
            } catch (detectErr) {
                consecutiveErrorsRef.current++;
                err('Loop', `Detection error (${consecutiveErrorsRef.current}/5):`, detectErr.message);

                // After 5 consecutive errors, assume WASM/WebGL is dead — stop loop
                if (consecutiveErrorsRef.current >= 5) {
                    err('Loop', 'FATAL: 5 consecutive detection errors. Killing loop to prevent renderer crash.');
                    fatalErrorRef.current = true;
                    setMonitoringError('AI monitoring encountered a fatal error and was disabled to protect the exam.');
                    return; // Do NOT schedule another frame
                }
            }

            // Schedule next frame (only if not killed)
            if (!fatalErrorRef.current) {
                animationFrameRef.current = requestAnimationFrame(detectFaces);
            }
        };

        // Kick off the loop
        animationFrameRef.current = requestAnimationFrame(detectFaces);

        // Cleanup when deps change or component unmounts
        return () => {
            log('Loop', 'Stopping detection loop');
            isLoopRunningRef.current = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isMonitoring, isReady, sendLog]);

    // ══════════════════════════════════════════════════════
    // 4. WINDOW BLUR DETECTION
    // ══════════════════════════════════════════════════════
    useEffect(() => {
        if (!isMonitoring) return;

        const handleBlur = () => {
            sendLog('Window blur / loss of focus detected');
        };

        let dispose = null;
        try {
            if (window.electronAPI && typeof window.electronAPI.onWindowBlur === 'function') {
                dispose = window.electronAPI.onWindowBlur(handleBlur);
            } else if (window.electronAPI && typeof window.electronAPI.onFocusLost === 'function') {
                dispose = window.electronAPI.onFocusLost(handleBlur);
            } else {
                window.addEventListener('blur', handleBlur);
            }
        } catch (e) {
            warn('Blur', 'Failed to attach blur listener:', e.message);
            window.addEventListener('blur', handleBlur);
        }

        return () => {
            if (typeof dispose === 'function') {
                dispose();
            } else {
                window.removeEventListener('blur', handleBlur);
            }
        };
    }, [isMonitoring, sendLog]);

    // ══════════════════════════════════════════════════════
    // 5. PUBLIC API
    // ══════════════════════════════════════════════════════
    const startMonitoring = async (videoElement, existingStream = null) => {
        videoRef.current = videoElement;
        log('Camera', 'Requesting camera access...');

        try {
            const stream = existingStream || await navigator.mediaDevices.getUserMedia({ video: true });
            videoElement.srcObject = stream;
            streamRef.current = stream;
            log('Camera', 'Camera stream started ✓');

            try {
                await videoElement.play();
                log('Camera', 'Video element playing');
                setIsMonitoring(true);
                setMonitoringError(null);
            } catch (playErr) {
                warn('Camera', 'video.play() failed:', playErr.message);
                setMonitoringError('Failed to play camera feed.');
            }
        } catch (camErr) {
            err('Camera', 'getUserMedia failed:', camErr.message);
            sendLog('Camera access denied');
            setMonitoringError('Camera access denied or unavailable. Monitoring disabled.');
        }
    };

    const stopMonitoring = () => {
        log('Stop', 'stopMonitoring called');
        setIsMonitoring(false);

        // Stop detection loop
        isLoopRunningRef.current = false;
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        // Release camera
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    };

    return {
        startMonitoring,
        stopMonitoring,
        alerts,
        integrityScore,
        isReady,
        monitoringError
    };
};
