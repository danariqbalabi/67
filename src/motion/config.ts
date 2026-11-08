export const MOTION_CONFIG = Object.freeze({
  smoothingMs: 45,
  enterThreshold: 0.65,
  exitRatio: 0.58,
  stableMs: 60,
  minTransitionMs: 180,
  maxFrameGapMs: 300,
  maxIdentityJump: 0.35,
  identityAmbiguity: 0.002,
  identityVerticalWeight: 0.1,
  minHorizontalGap: 0.06,
  calibrationHoldMs: 1200,
  calibrationMotionHoldMs: 180,
  calibrationMinRange: 0.65,
  calibrationThresholdRatio: 0.45,
  calibrationThresholdMin: 0.45,
  calibrationThresholdMax: 0.8,
  startHoldMs: 600,
  roundMs: 30_000,
  countdownMs: 3000,
});

export type Position = 'neutral' | 'A' | 'B';
export interface Palm {
  x: number;
  y: number;
  size: number;
}
export interface HandPair {
  left: Palm;
  right: Palm;
}
export interface PairResult {
  pair: HandPair | null;
  reason: string;
}
