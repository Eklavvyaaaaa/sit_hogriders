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
                    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
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
            globalInitPromise = null;
            err('Init', 'Fatal error during global initialization:', error.message);
            throw error;
        } finally {
            isGlobalInitializing = false;
        }
    })();

    return globalInitPromise;
};

// ── RISK ENGINE CONSTANTS ──
const GRACE_PERIOD_MS = 120000;           // 120s grace period for minor events
const FRAMES_TO_TRIGGER = 90;             // ~3 seconds at 30fps
const DECAY_INTERVAL_MS = 30000;          // Risk decays every 30s
const DECAY_AMOUNT = 3;                   // Points removed per decay tick
const RISK_LEVELS = {
    LOW: 'low',           // 0–20
    MEDIUM: 'medium',     // 21–50
    HIGH: 'high',         // 51–80
    CRITICAL: 'critical', // >80
};

/**
 * Compute risk level string from a numeric risk score.
 */
const getRiskLevel = (score) => {
    if (score > 80) return RISK_LEVELS.CRITICAL;
    if (score > 50) return RISK_LEVELS.HIGH;
    if (score > 20) return RISK_LEVELS.MEDIUM;
    return RISK_LEVELS.LOW;
};

export const useMonitoring = (examId, onFrameUpdate, options = {}) => {
    // ── State ──
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [alerts, setAlerts] = useState([]);
    const [riskScore, setRiskScore] = useState(0);
    const [integrityScore, setIntegrityScore] = useState(100);
    const [riskLevel, setRiskLevel] = useState(getRiskLevel(0));
    const [monitoringError, setMonitoringError] = useState(null);
    const [isReady, setIsReady] = useState(false);

    // Backward compat: isTerminated is always false (no auto-terminate)
    const [isTerminated] = useState(false);

    // ── Refs ──
    const faceLandmarkerRef = useRef(null);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const onFrameUpdateRef = useRef(onFrameUpdate);
    const animationFrameRef = useRef(null);
    const isLoopRunningRef = useRef(false);
    const fatalErrorRef = useRef(false);
    const consecutiveErrorsRef = useRef(0);
    const alertsRef = useRef([]);
    const riskScoreRef = useRef(0);
    const examStartTimeRef = useRef(null);
    const decayIntervalRef = useRef(null);
    const lastCleanFrameTimeRef = useRef(null);

    // Duration tracking refs
    const noFaceStartRef = useRef(null);
    const multiFaceStartRef = useRef(null);
    const blurStartRef = useRef(null);

    // Per-event-type throttle (prevents log flooding)
    const lastLogTimeByType = useRef({});

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

            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            isLoopRunningRef.current = false;

            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            if (decayIntervalRef.current) {
                clearInterval(decayIntervalRef.current);
                decayIntervalRef.current = null;
            }

            faceLandmarkerRef.current = null;
            setIsReady(false);
            log('Cleanup', 'Component cleanup finished ✓');
        };
    }, []);

    // ══════════════════════════════════════════════════════
    // 2. RISK ENGINE — Accumulation, Decay, Escalation
    // ══════════════════════════════════════════════════════
    const stopMonitoring = useCallback(() => {
        log('Stop', 'stopMonitoring called');
        setIsMonitoring(false);

        isLoopRunningRef.current = false;
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (decayIntervalRef.current) {
            clearInterval(decayIntervalRef.current);
            decayIntervalRef.current = null;
        }
    }, []);

    /**
     * Core risk accumulation function.
     * Adds weighted risk points and handles grace period, escalation, and logging.
     */
    const addRisk = useCallback((weight, eventType, confidence = 1.0) => {
        const now = Date.now();
        const examStart = examStartTimeRef.current || now;
        const elapsed = now - examStart;

        // ── Grace Period: ignore minor events (<= 5 weight) in first 120s ──
        const isMinor = weight <= 5;
        if (isMinor && elapsed < GRACE_PERIOD_MS) {
            log('Risk', `Grace period active — ignoring minor event: ${eventType}`);
            return;
        }

        // ── Per-event-type throttle (3s between same event type) ──
        const lastTime = lastLogTimeByType.current[eventType] || 0;
        if (now - lastTime < 3000) return;
        lastLogTimeByType.current[eventType] = now;

        // ── Accumulate risk ──
        const newRisk = Math.min(100, riskScoreRef.current + weight);
        riskScoreRef.current = newRisk;
        setRiskScore(newRisk);
        setIntegrityScore(Math.max(0, 100 - newRisk));

        const level = getRiskLevel(newRisk);
        setRiskLevel(level);

        // ── Create alert entry ──
        const newAlert = { time: new Date(), type: eventType, confidence, weight, riskAfter: newRisk };
        const updatedAlerts = [...alertsRef.current, newAlert];
        alertsRef.current = updatedAlerts;
        setAlerts(updatedAlerts);

        log('Risk', `+${weight} [${eventType}] → riskScore=${newRisk} (${level})`);

        // ── Risk Escalation Events ──
        if (level === RISK_LEVELS.CRITICAL) {
            log('Risk', '🔴 CRITICAL RISK — flagging for review');
            api.post('/monitor/log', {
                examId, eventType: `CRITICAL_RISK: ${eventType}`,
                confidence, severity: 'critical'
            }).catch(e => {
                err('Risk', 'Failed to send critical risk:', e.message);
                enqueueFailedLog({ examId, eventType: `CRITICAL_RISK: ${eventType}`, confidence, severity: 'critical', weight, riskAfter: newRisk });
            });
        } else if (level === RISK_LEVELS.HIGH) {
            log('Risk', '🟠 HIGH RISK — notifying server');
            api.post('/monitor/log', {
                examId, eventType: `HIGH_RISK: ${eventType}`,
                confidence, severity: 'high'
            }).catch(e => {
                err('Risk', 'Failed to send high risk:', e.message);
                enqueueFailedLog({ examId, eventType: `HIGH_RISK: ${eventType}`, confidence, severity: 'high', weight, riskAfter: newRisk });
            });
        } else {
            // Standard log for medium/low events
            api.post('/monitor/log', {
                examId, eventType, confidence, severity: level
            }).catch(e => {
                err('Log', 'Failed to send log:', e.message);
                enqueueFailedLog({ examId, eventType, confidence, severity: level, weight, riskAfter: newRisk });
            });
        }
    }, [examId]);

    // ══════════════════════════════════════════════════════
    // 3. RETRY QUEUE HELPERS
    // ══════════════════════════════════════════════════════
    const enqueueFailedLog = (payload) => {
        try {
            const queue = JSON.parse(localStorage.getItem('monitoring_retry_queue') || '[]');
            queue.push({ ...payload, failedAt: Date.now(), attempts: 0 });
            localStorage.setItem('monitoring_retry_queue', JSON.stringify(queue));
        } catch (e) {
            console.error('Failed to enqueue log:', e);
        }
    };

    const processRetryQueue = useCallback(async () => {
        try {
            const queue = JSON.parse(localStorage.getItem('monitoring_retry_queue') || '[]');
            if (queue.length === 0) return;

            const newQueue = [];
            for (const item of queue) {
                // Exponential backoff: Base 2s * 2^attempts
                const backoffMs = 2000 * Math.pow(2, item.attempts);
                if (Date.now() - item.failedAt < backoffMs) {
                    newQueue.push(item);
                    continue; // Skip: waiting for backoff
                }

                item.attempts++;
                try {
                    const { failedAt, attempts, weight, riskAfter, ...payload } = item;
                    await api.post('/monitor/log', payload);
                    log('Risk', `Successfully retried failed log: ${payload.eventType}`);
                } catch (e) {
                    if (item.attempts < 5) { // Max 5 attempts
                        item.failedAt = Date.now(); // Reset timer for next backoff
                        newQueue.push(item);
                    } else {
                        err('Risk', 'Dropped failed log after 5 attempts', item);
                    }
                }
            }
            localStorage.setItem('monitoring_retry_queue', JSON.stringify(newQueue));
        } catch (e) {
            console.error('Failed to process retry queue:', e);
        }
    }, []);

    useEffect(() => {
        // Periodically process retry queue
        const retryTimer = setInterval(processRetryQueue, 5000);
        return () => clearInterval(retryTimer);
    }, [processRetryQueue]);

    // ══════════════════════════════════════════════════════
    // 3. RISK DECAY TIMER
    // ══════════════════════════════════════════════════════
    useEffect(() => {
        if (!isMonitoring) return;

        decayIntervalRef.current = setInterval(() => {
            if (riskScoreRef.current > 0) {
                const decayed = Math.max(0, riskScoreRef.current - DECAY_AMOUNT);
                riskScoreRef.current = decayed;
                setRiskScore(decayed);
                setIntegrityScore(Math.max(0, 100 - decayed));
                setRiskLevel(getRiskLevel(decayed));
                log('Decay', `Risk decayed → ${decayed}`);
            }
        }, DECAY_INTERVAL_MS);

        return () => {
            if (decayIntervalRef.current) {
                clearInterval(decayIntervalRef.current);
                decayIntervalRef.current = null;
            }
        };
    }, [isMonitoring]);

    // ══════════════════════════════════════════════════════
    // 4. DETECTION LOOP (RAF-based, crash-proof)
    // ══════════════════════════════════════════════════════
    useEffect(() => {
        if (!isMonitoring || !isReady) return;

        if (isLoopRunningRef.current) {
            warn('Loop', 'Detection loop already running — skipping duplicate.');
            return;
        }

        isLoopRunningRef.current = true;
        fatalErrorRef.current = false;
        consecutiveErrorsRef.current = 0;
        let suspiciousFrameCount = 0;

        log('Loop', 'Detection loop started ✓ (risk-based model)');

        const detectFaces = () => {
            if (fatalErrorRef.current || !isLoopRunningRef.current) {
                log('Loop', 'Loop terminated (fatal error or cleanup).');
                return;
            }

            const video = videoRef.current;
            const landmarker = faceLandmarkerRef.current;

            if (!landmarker || !video || video.readyState < 2) {
                animationFrameRef.current = requestAnimationFrame(detectFaces);
                return;
            }

            const now = Date.now();

            try {
                const results = landmarker.detectForVideo(video, performance.now());
                consecutiveErrorsRef.current = 0;

                if (results.faceLandmarks) {
                    // ── NO FACE DETECTED ──
                    if (results.faceLandmarks.length === 0) {
                        // Start tracking face-missing duration
                        if (!noFaceStartRef.current) {
                            noFaceStartRef.current = now;
                        }
                        const missingDuration = (now - noFaceStartRef.current) / 1000;

                        if (missingDuration >= 5) {
                            addRisk(10, 'Face missing >5s');
                        } else if (missingDuration >= 2) {
                            addRisk(5, 'Face missing 2-5s');
                        }
                        // <2s → intentionally ignored

                        // Reset multi-face tracker
                        multiFaceStartRef.current = null;
                        suspiciousFrameCount = 0;
                        if (onFrameUpdateRef.current) onFrameUpdateRef.current(null);

                        // ── MULTIPLE FACES ──
                    } else if (results.faceLandmarks.length > 1) {
                        // Reset no-face tracker
                        noFaceStartRef.current = null;

                        if (!multiFaceStartRef.current) {
                            multiFaceStartRef.current = now;
                        }
                        const multiFaceDuration = (now - multiFaceStartRef.current) / 1000;

                        if (multiFaceDuration >= 2) {
                            addRisk(15, 'Multiple faces detected >2s');
                        }

                        suspiciousFrameCount = 0;
                        if (onFrameUpdateRef.current) onFrameUpdateRef.current(null);

                        // ── SINGLE FACE (normal path) ──
                    } else {
                        // Reset duration trackers when face is back to normal
                        noFaceStartRef.current = null;
                        multiFaceStartRef.current = null;

                        const face = results.faceLandmarks[0];

                        // 3D head pose approximation (unchanged)
                        const nose = face[1];
                        const forehead = face[10];
                        const chin = face[152];
                        const leftEar = face[234];
                        const rightEar = face[454];

                        const { yawThreshold = 0.05, pitchThreshold = 0.04 } = options;

                        const earMidpointX = (leftEar.x + rightEar.x) / 2;
                        const verticalMidpointY = (forehead.y + chin.y) / 2;

                        const yawDeviation = Math.abs(nose.x - earMidpointX);
                        const pitchDeviation = Math.abs(nose.y - verticalMidpointY);

                        // Eye gaze via blendshapes (unchanged)
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

                            // ── Sustained detection: 90 frames (~3s) ──
                            if (suspiciousFrameCount >= FRAMES_TO_TRIGGER) {
                                const confidenceScore = parseFloat((
                                    (Math.min(yawDeviation / yawThreshold, 1.0) * 0.4) +
                                    (Math.min(pitchDeviation / pitchThreshold, 1.0) * 0.4) +
                                    (Math.min(maxEyeDeviation / 0.6, 1.0) * 0.2)
                                ).toFixed(2));

                                if (isExtremeRotation) {
                                    addRisk(8, 'Extreme head rotation detected', confidenceScore);
                                } else if (isHeadTurned) {
                                    addRisk(4, 'Sustained head turn detected', confidenceScore);
                                } else {
                                    addRisk(2, 'Minor gaze deviation detected', confidenceScore);
                                }
                                suspiciousFrameCount = 0;
                            }
                        } else {
                            suspiciousFrameCount = 0;
                        }

                        // Bounding box for canvas overlay (unchanged)
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

                if (consecutiveErrorsRef.current >= 5) {
                    err('Loop', 'FATAL: 5 consecutive detection errors. Killing loop.');
                    fatalErrorRef.current = true;
                    setMonitoringError('AI monitoring encountered a fatal error and was disabled to protect the exam.');
                    return;
                }
            }

            if (!fatalErrorRef.current) {
                animationFrameRef.current = requestAnimationFrame(detectFaces);
            }
        };

        animationFrameRef.current = requestAnimationFrame(detectFaces);

        return () => {
            log('Loop', 'Stopping detection loop');
            isLoopRunningRef.current = false;
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [isMonitoring, isReady, addRisk, options]);

    // ══════════════════════════════════════════════════════
    // 5. WINDOW BLUR DETECTION (duration-aware)
    // ══════════════════════════════════════════════════════
    useEffect(() => {
        if (!isMonitoring) return;

        const handleBlur = () => {
            blurStartRef.current = Date.now();
            log('Blur', 'Window lost focus');
        };

        const handleFocus = () => {
            if (!blurStartRef.current) return;
            const blurDuration = (Date.now() - blurStartRef.current) / 1000;
            blurStartRef.current = null;

            if (blurDuration >= 3) {
                addRisk(12, `Window blur >=3s (${blurDuration.toFixed(1)}s)`);
            } else if (blurDuration >= 0.5) {
                // Only log blurs longer than 0.5s to avoid accidental clicks
                addRisk(5, `Window blur <3s (${blurDuration.toFixed(1)}s)`);
            }
        };

        let disposeBlur = null;
        let disposeFocus = null;

        try {
            if (window.electronAPI && typeof window.electronAPI.onWindowBlur === 'function') {
                disposeBlur = window.electronAPI.onWindowBlur(handleBlur);
                // Try to listen for focus restore
                if (typeof window.electronAPI.onWindowFocus === 'function') {
                    disposeFocus = window.electronAPI.onWindowFocus(handleFocus);
                } else {
                    window.addEventListener('focus', handleFocus);
                }
            } else if (window.electronAPI && typeof window.electronAPI.onFocusLost === 'function') {
                disposeBlur = window.electronAPI.onFocusLost(handleBlur);
                window.addEventListener('focus', handleFocus);
            } else {
                window.addEventListener('blur', handleBlur);
                window.addEventListener('focus', handleFocus);
            }
        } catch (e) {
            warn('Blur', 'Failed to attach blur listener:', e.message);
            window.addEventListener('blur', handleBlur);
            window.addEventListener('focus', handleFocus);
        }

        return () => {
            if (typeof disposeBlur === 'function') disposeBlur();
            else window.removeEventListener('blur', handleBlur);

            if (typeof disposeFocus === 'function') disposeFocus();
            else window.removeEventListener('focus', handleFocus);
        };
    }, [isMonitoring, addRisk]);

    // ══════════════════════════════════════════════════════
    // 6. PUBLIC API
    // ══════════════════════════════════════════════════════
    const startMonitoring = useCallback(async (videoElement, existingStream = null) => {
        videoRef.current = videoElement;
        examStartTimeRef.current = Date.now();
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
            addRisk(5, 'Camera access denied');
            setMonitoringError('Camera access denied or unavailable. Monitoring disabled.');
        }
    }, [addRisk]);

    return {
        startMonitoring,
        stopMonitoring,
        alerts,
        integrityScore,
        riskScore,
        riskLevel,
        isReady,
        monitoringError,
        isTerminated,  // Always false — backward compat
    };
};
