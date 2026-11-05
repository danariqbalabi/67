import type { TrackingFrame } from '../tracking/types';
import { MOTION_CONFIG, type HandPair, type Palm, type PairResult } from './config';

const distanceSquared = (a: Palm, b: Palm) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/** Fixed screen-side identities, matched by proximity. Crossing or ambiguous hands reset continuity. */
export class HandIdentity {
  private previous: HandPair | null = null;
  private lastTime = -Infinity;
  reset() { this.previous = null; this.lastTime = -Infinity; }

  update(frame: TrackingFrame): PairResult {
    const reject = (reason: string): PairResult => { this.reset(); return { pair: null, reason }; };
    if (frame.hands.length !== 2) return reject('Tangan lu keluar frame.');
    if (frame.width <= 0 || frame.height <= 0) return reject('Ukuran video belum siap.');
    const aspect = frame.width / frame.height;
    const palms: Palm[] = [];
    for (const { landmarks } of frame.hands) {
      if (landmarks.length !== 21 || landmarks.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)) return reject('Masukin seluruh tangan ke frame.');
      const points = [0, 5, 9, 13, 17].map(index => landmarks[index]);
      const x = (1 - points.reduce((sum, p) => sum + p.x, 0) / points.length) * aspect;
      const y = points.reduce((sum, p) => sum + p.y, 0) / points.length;
      const wrist = landmarks[0], middle = landmarks[9];
      const size = Math.hypot((wrist.x - middle.x) * aspect, wrist.y - middle.y);
      if (size < .025 || size > .65) return reject('Geser jarak lu biar telapak kelihatan jelas.');
      palms.push({ x, y, size });
    }
    let [left, right] = [...palms].sort((a, b) => a.x - b.x);
    if (frame.timestamp - this.lastTime > MOTION_CONFIG.maxFrameGapMs) this.previous = null;
    if (this.previous) {
      const [a, b] = palms;
      const same = distanceSquared(a, this.previous.left) + distanceSquared(b, this.previous.right);
      const swapped = distanceSquared(b, this.previous.left) + distanceSquared(a, this.previous.right);
      if (Math.abs(same - swapped) < MOTION_CONFIG.identityAmbiguity) return reject('Identitas tangan ambigu. Pisahin tangan lu.');
      [left, right] = same < swapped ? [a, b] : [b, a];
      if (Math.max(distanceSquared(left, this.previous.left), distanceSquared(right, this.previous.right)) > MOTION_CONFIG.maxIdentityJump ** 2) return reject('Tracking meloncat. Stabilin tangan sebentar.');
    }
    if (right.x - left.x < MOTION_CONFIG.minHorizontalGap * aspect) return reject('Jangan silangin atau tumpuk tangan lu.');
    this.previous = { left, right };
    this.lastTime = frame.timestamp;
    return { pair: this.previous, reason: '' };
  }
}
