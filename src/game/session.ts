import { Calibration, type CalibrationSnapshot } from '../motion/calibration';
import { CycleCounter, type CounterSnapshot } from '../motion/counter';
import { MOTION_CONFIG, type HandPair, type Position } from '../motion/config';
import { HandIdentity } from '../motion/identity';
import type { TrackingFrame } from '../tracking/types';
import { RoundClock, type ClockSnapshot } from './clock';

export interface SessionSnapshot {
  clock: ClockSnapshot;
  calibration: CalibrationSnapshot;
  motion: CounterSnapshot;
  startRequested: boolean;
  startProgress: number;
  tracking: { valid: boolean; delta: number; state: Position; reason: string };
}

/** A start click arms the round. Only subsequent valid tracking can start the countdown. */
export class RoundSession {
  private identity = new HandIdentity();
  private calibration = new Calibration();
  private counter = new CycleCounter();
  private clock = new RoundClock();
  private startRequested = false;
  private readySince: number | null = null;
  private lastPairAt = -Infinity;
  private pair: HandPair | null = null;
  private trackingReason = '';
  private motionReason = '';

  requestStart(timestamp: number) {
    if (this.clock.tick(timestamp).phase !== 'preparing') return;
    this.startRequested = true;
    this.readySince = null;
  }

  cancelStart() {
    this.startRequested = false;
    this.readySince = null;
  }

  cancel(reason: string) {
    this.cancelStart();
    this.clock.cancel(reason);
    this.counter.resetPartial();
  }

  update(frame: TrackingFrame) {
    const previousPairAt = this.lastPairAt;
    const result = this.identity.update(frame);
    this.pair = result.pair;
    this.trackingReason = result.reason;
    const clock = this.clock.tick(frame.timestamp);
    if (clock.phase === 'preparing') {
      const calibration = this.calibration.update(frame.timestamp, result.pair);
      if (this.startRequested && calibration.stage === 'ready' && result.pair) {
        if (frame.timestamp - previousPairAt > MOTION_CONFIG.maxFrameGapMs)
          this.readySince = null;
        this.readySince ??= frame.timestamp;
        if (frame.timestamp - this.readySince >= MOTION_CONFIG.startHoldMs) {
          this.counter = new CycleCounter(calibration.threshold);
          this.clock.start(frame.timestamp);
          this.cancelStart();
        }
      } else this.readySince = null;
    }
    if (result.pair) this.lastPairAt = frame.timestamp;
    this.motionReason = this.counter.update(
      frame.timestamp,
      result.pair,
      this.clock.tick(frame.timestamp).phase === 'playing',
      result.reason,
    ).reason;
  }

  snapshot(timestamp: number): SessionSnapshot {
    const clock = this.clock.tick(timestamp);
    const calibration = this.calibration.snapshot();
    const valid =
      Boolean(this.pair) &&
      timestamp - this.lastPairAt <= MOTION_CONFIG.maxFrameGapMs;
    const delta =
      valid && this.pair
        ? (this.pair.right.y - this.pair.left.y) /
          ((this.pair.left.size + this.pair.right.size) / 2)
        : 0;
    if (!valid) this.readySince = null;
    return {
      clock,
      calibration,
      motion: this.counter.snapshot(this.trackingReason || this.motionReason),
      startRequested: this.startRequested,
      startProgress:
        this.readySince === null
          ? 0
          : Math.min(
              1,
              (timestamp - this.readySince) / MOTION_CONFIG.startHoldMs,
            ),
      tracking: {
        valid,
        delta,
        state:
          delta >= calibration.threshold
            ? 'A'
            : delta <= -calibration.threshold
              ? 'B'
              : 'neutral',
        reason:
          this.trackingReason ||
          (!valid ? 'Tunjukin dua telapak tangan ke kamera.' : ''),
      },
    };
  }
}
