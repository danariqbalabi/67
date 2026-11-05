import { MOTION_CONFIG } from '../motion/config';
export type RoundPhase = 'preparing' | 'countdown' | 'playing' | 'finished' | 'cancelled';
export interface ClockSnapshot { phase: RoundPhase; remainingMs: number; countdown: number; reason: string }

export class RoundClock {
  private phase: RoundPhase = 'preparing';
  private startsAt = 0;
  private reason = '';
  start(timestamp: number) { this.startsAt = timestamp + MOTION_CONFIG.countdownMs; this.phase = 'countdown'; this.reason = ''; }
  cancel(reason: string) {
    if (this.phase === 'countdown' || this.phase === 'playing') { this.phase = 'cancelled'; this.reason = reason; }
  }
  tick(timestamp: number): ClockSnapshot {
    if (this.phase === 'countdown' && timestamp >= this.startsAt) this.phase = 'playing';
    if (this.phase === 'playing' && timestamp >= this.startsAt + MOTION_CONFIG.roundMs) this.phase = 'finished';
    const remainingMs = this.phase === 'finished' ? 0 : this.phase === 'playing' ? Math.max(0, MOTION_CONFIG.roundMs - (timestamp - this.startsAt)) : MOTION_CONFIG.roundMs;
    return { phase: this.phase, remainingMs, countdown: this.phase === 'countdown' ? Math.max(1, Math.ceil((this.startsAt - timestamp) / 1000)) : 0, reason: this.reason };
  }
}
