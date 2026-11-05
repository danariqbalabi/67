import { useEffect, useRef, useState } from 'react';
import type { HandLandmarker } from '@mediapipe/tasks-vision';
import { drawHands } from './draw';
import { cameraError } from './errors';
import type { CameraStatus, TrackingFrame } from './types';

const initialStatus: CameraStatus = { phase: 'loading', message: 'Minta izin kamera dulu…', handCount: 0, fps: 0, handednessScores: [], delegate: null };

export function useCamera(onFrame?: (frame: TrackingFrame) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbackRef = useRef(onFrame);
  const [status, setStatus] = useState<CameraStatus>(initialStatus);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { callbackRef.current = onFrame; }, [onFrame]);

  useEffect(() => {
    let disposed = false;
    let stream: MediaStream | undefined;
    let model: HandLandmarker | undefined;
    let animation = 0;
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    let lastVideoTime = -1, lastInference = -Infinity, lastUi = 0, sampleStart = 0, sampleCount = 0, fps = 0;
    let delegate: 'GPU' | 'CPU' = 'GPU';
    let removeTrackListener: (() => void) | undefined;

    function stop() {
      cancelAnimationFrame(animation);
      removeTrackListener?.();
      stream?.getTracks().forEach(track => track.stop());
      stream = undefined;
      model?.close();
      model = undefined;
      video.srcObject = null;
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    }
    function fail(message: string) {
      if (disposed) return;
      stop();
      callbackRef.current?.({ timestamp: performance.now(), width: 1, height: 1, hands: [] });
      setStatus({ ...initialStatus, phase: 'error', message });
    }
    async function start() {
      setStatus(initialStatus);
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        fail('Kamera butuh browser modern di localhost atau HTTPS. Coba Chrome atau Edge terbaru.'); return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { width: { ideal: 960 }, height: { ideal: 720 }, facingMode: 'user', frameRate: { ideal: 30, max: 30 } } });
        if (disposed) { stop(); return; }
        video.srcObject = stream;
        await video.play();
        if (disposed) { stop(); return; }
        const track = stream.getVideoTracks()[0];
        const ended = () => fail('Kamera terputus. Sambungkan lagi, lalu coba ulang.');
        track.addEventListener('ended', ended);
        removeTrackListener = () => track.removeEventListener('ended', ended);
      } catch (error) { fail(cameraError(error)); return; }
      setStatus({ ...initialStatus, message: 'Kamera nyala. Lagi siapin model tangan…' });
      try {
        const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision');
        if (disposed) { stop(); return; }
        const vision = await FilesetResolver.forVisionTasks(`${import.meta.env.BASE_URL}vision/wasm`);
        if (disposed) { stop(); return; }
        const create = (device: 'GPU' | 'CPU') => HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}vision/hand_landmarker.task`, delegate: device },
          runningMode: 'VIDEO', numHands: 2,
          minHandDetectionConfidence: .6, minHandPresenceConfidence: .6, minTrackingConfidence: .6,
        });
        try { model = await create('GPU'); }
        catch { if (disposed) { stop(); return; } delegate = 'CPU'; model = await create('CPU'); }
        if (disposed) { stop(); return; }
      } catch { fail('Model tangan gagal dimuat. Jalankan npm run setup:vision, muat ulang halaman, lalu coba lagi.'); return; }
      sampleStart = performance.now();
      setStatus({ ...initialStatus, phase: 'ready', message: 'Tunjukin dua tangan lu.', delegate });
      function loop(timestamp: number) {
        if (disposed || !model) return;
        try {
          // Synchronous inference: one call at a time, on new video frames only, capped at 24 Hz.
          if (!document.hidden && video.readyState >= 2 && video.currentTime !== lastVideoTime && timestamp - lastInference >= 1000 / 24) {
            lastVideoTime = video.currentTime; lastInference = timestamp;
            const result = model.detectForVideo(video, timestamp);
            const hands = result.landmarks.map((landmarks, i) => ({ landmarks, handedness: result.handedness[i]?.[0]?.categoryName ?? 'Unknown', handednessScore: result.handedness[i]?.[0]?.score ?? 0 }));
            drawHands(canvas, hands, video.videoWidth, video.videoHeight);
            callbackRef.current?.({ timestamp, width: video.videoWidth, height: video.videoHeight, hands });
            sampleCount++;
            if (timestamp - sampleStart >= 1000) { fps = sampleCount * 1000 / (timestamp - sampleStart); sampleCount = 0; sampleStart = timestamp; }
            if (timestamp - lastUi >= 100) {
              lastUi = timestamp;
              setStatus({ phase: 'ready', message: hands.length === 2 ? 'Dua tangan ketemu. Mantap!' : hands.length === 1 ? 'Satu lagi, masukin dua tangan lu.' : 'Tunjukin dua tangan lu.', handCount: hands.length, fps, handednessScores: hands.map(hand => hand.handednessScore), delegate });
            }
          }
          animation = requestAnimationFrame(loop);
        } catch { fail('Tracking berhenti. Coba ulang kamera. Kalau masih gagal, pakai browser lain.'); }
      }
      animation = requestAnimationFrame(loop);
    }
    void start();
    return () => { disposed = true; stop(); };
  }, [attempt]);

  return { videoRef, canvasRef, status, retry: () => setAttempt(value => value + 1) };
}
