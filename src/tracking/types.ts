export interface Landmark { x: number; y: number; z: number }

export interface HandDetection {
  landmarks: Landmark[];
  handedness: string;
  /** Confidence of Left/Right classification, NOT landmark or tracking confidence. */
  handednessScore: number;
}

export interface TrackingFrame {
  timestamp: number;
  width: number;
  height: number;
  hands: HandDetection[];
}

export type CameraPhase = 'loading' | 'ready' | 'error';
export interface CameraStatus {
  phase: CameraPhase;
  message: string;
  handCount: number;
  fps: number;
  handednessScores: number[];
  delegate: 'GPU' | 'CPU' | null;
}
