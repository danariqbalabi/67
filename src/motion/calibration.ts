import { MOTION_CONFIG, type HandPair } from './config';

export interface CalibrationSnapshot {
  stage: 'hold' | 'left' | 'right' | 'ready';
  progress: number;
  message: string;
  threshold: number;
  palmSize: number;
}
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

export class Calibration {
  private stage: CalibrationSnapshot['stage'] = 'hold';
  private since: number | null = null;
  private poseSince: number | null = null;
  private anchor: HandPair | null = null;
  private sizes: number[] = [];
  private leftRange = 0;
  private rightRange = 0;
  private threshold: number = MOTION_CONFIG.enterThreshold;
  private lastTime: number | null = null;
  private progress = 0;

  snapshot(): CalibrationSnapshot {
    const messages = { hold: 'Tahan dua tangan sejajar sebentar.', left: 'Sekarang, tangan kiri layar lebih tinggi.', right: 'Gantian, tangan kanan layar lebih tinggi.', ready: 'Kalibrasi beres. Siap nge-67?' };
    return { stage: this.stage, progress: this.progress, message: messages[this.stage], threshold: this.threshold, palmSize: this.sizes.length ? median(this.sizes) : 0 };
  }

  update(timestamp: number, pair: HandPair | null): CalibrationSnapshot {
    if (this.stage === 'ready') return this.snapshot();
    if (!pair || (this.lastTime !== null && timestamp - this.lastTime > MOTION_CONFIG.maxFrameGapMs)) {
      this.stage = 'hold'; this.since = null; this.poseSince = null; this.anchor = null; this.sizes = []; this.progress = 0;
      this.lastTime = timestamp;
      return this.snapshot();
    }
    this.lastTime = timestamp;
    const size = (pair.left.size + pair.right.size) / 2;
    const delta = (pair.right.y - pair.left.y) / size;
    if (this.stage === 'hold') {
      const stable = this.anchor && Math.abs(pair.left.y - this.anchor.left.y) < .06 && Math.abs(pair.right.y - this.anchor.right.y) < .06 && Math.abs(size / ((this.anchor.left.size + this.anchor.right.size) / 2) - 1) < .3 && Math.abs(delta) < .65;
      if (!stable) { this.anchor = pair; this.since = timestamp; this.sizes = []; this.progress = 0; }
      if (Math.abs(delta) >= .65) return this.snapshot();
      this.sizes.push(size);
      this.progress = Math.min(1, (timestamp - (this.since ?? timestamp)) / MOTION_CONFIG.calibrationHoldMs) / 3;
      if (timestamp - (this.since ?? timestamp) >= MOTION_CONFIG.calibrationHoldMs) { this.stage = 'left'; this.poseSince = null; this.progress = 1 / 3; }
    } else {
      const valid = this.stage === 'left' ? delta >= MOTION_CONFIG.calibrationMinRange : delta <= -MOTION_CONFIG.calibrationMinRange;
      if (!valid) this.poseSince = null;
      else {
        this.poseSince ??= timestamp;
        if (timestamp - this.poseSince >= MOTION_CONFIG.calibrationMotionHoldMs) {
          if (this.stage === 'left') { this.leftRange = delta; this.stage = 'right'; this.progress = 2 / 3; }
          else { this.rightRange = -delta; this.threshold = Math.max(.65, Math.min(1.15, Math.min(this.leftRange, this.rightRange) * .55)); this.stage = 'ready'; this.progress = 1; }
          this.poseSince = null;
        }
      }
    }
    return this.snapshot();
  }
}
