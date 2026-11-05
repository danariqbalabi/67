import { MOTION_CONFIG, type HandPair, type Position } from './config';

export interface CounterSnapshot {
  score: number;
  delta: number;
  state: Position;
  cycle: string;
  threshold: number;
  reason: string;
}

export class CycleCounter {
  private score = 0;
  private smoothed: number | null = null;
  private lastTime: number | null = null;
  private state: Position = 'neutral';
  private candidate: Position = 'neutral';
  private candidateSince = 0;
  private accepted: Position = 'neutral';
  private acceptedAt = -Infinity;
  private base: Position = 'neutral';
  private halfway = false;
  constructor(private threshold: number = MOTION_CONFIG.enterThreshold) {}

  resetPartial() {
    this.smoothed = null;
    this.lastTime = null;
    this.state = 'neutral';
    this.candidate = 'neutral';
    this.candidateSince = 0;
    this.accepted = 'neutral';
    this.acceptedAt = -Infinity;
    this.base = 'neutral';
    this.halfway = false;
  }

  snapshot(reason = ''): CounterSnapshot {
    return {
      score: this.score,
      delta: this.smoothed ?? 0,
      state: this.state,
      cycle:
        this.base === 'neutral'
          ? 'Menunggu posisi awal'
          : this.halfway
            ? `${this.base} → ${this.base === 'A' ? 'B' : 'A'} → …`
            : `${this.base} → …`,
      threshold: this.threshold,
      reason,
    };
  }

  update(
    timestamp: number,
    pair: HandPair | null,
    active: boolean,
    missingReason = 'Tracking hilang; siklus parsial direset.',
  ): CounterSnapshot {
    if (!active || !pair) {
      this.resetPartial();
      return this.snapshot(active ? missingReason : 'Ronde belum aktif.');
    }
    if (
      !Number.isFinite(timestamp) ||
      (this.lastTime !== null && timestamp <= this.lastTime)
    ) {
      this.resetPartial();
      return this.snapshot('Timestamp tidak valid.');
    }
    const dt = this.lastTime === null ? 0 : timestamp - this.lastTime;
    if (dt > MOTION_CONFIG.maxFrameGapMs) this.resetPartial();
    const size = (pair.left.size + pair.right.size) / 2;
    if (
      !Number.isFinite(size) ||
      size <= 0 ||
      !Number.isFinite(pair.left.y) ||
      !Number.isFinite(pair.right.y)
    ) {
      this.resetPartial();
      return this.snapshot('Data telapak tidak valid.');
    }
    const raw = (pair.right.y - pair.left.y) / size;
    this.smoothed =
      this.smoothed === null
        ? raw
        : this.smoothed +
          (1 - Math.exp(-dt / MOTION_CONFIG.smoothingMs)) *
            (raw - this.smoothed);
    this.lastTime = timestamp;
    const d = this.smoothed;
    const exit = this.threshold * MOTION_CONFIG.exitRatio;
    const next: Position =
      d >= this.threshold
        ? 'A'
        : d <= -this.threshold
          ? 'B'
          : this.state === 'A' && d > exit
            ? 'A'
            : this.state === 'B' && d < -exit
              ? 'B'
              : 'neutral';
    this.state = next;
    if (next !== this.candidate) {
      this.candidate = next;
      this.candidateSince = timestamp;
    }
    if (next === 'neutral')
      return this.snapshot('Gerakin lebih jauh, naik-turun bergantian.');
    if (timestamp - this.candidateSince < MOTION_CONFIG.stableMs)
      return this.snapshot('Menunggu posisi stabil.');
    if (next === this.accepted) return this.snapshot();
    if (timestamp - this.acceptedAt < MOTION_CONFIG.minTransitionMs) {
      this.resetPartial();
      return this.snapshot('Perpindahan terlalu cepat; siklus direset.');
    }
    this.accepted = next;
    this.acceptedAt = timestamp;
    if (this.base === 'neutral') this.base = next;
    else if (next !== this.base) this.halfway = true;
    else if (this.halfway) {
      this.score++;
      this.halfway = false;
      return this.snapshot('+1 siklus. Mantap!');
    }
    return this.snapshot();
  }
}
