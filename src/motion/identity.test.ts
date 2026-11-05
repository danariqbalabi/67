import { expect, it } from 'vitest';
import { HandIdentity } from './identity';
import { CycleCounter } from './counter';
import type { HandDetection, TrackingFrame } from '../tracking/types';

function hand(x: number, y: number): HandDetection {
  const landmarks = Array.from({ length: 21 }, () => ({ x, y, z: 0 }));
  landmarks[0] = { x, y: y + 0.08, z: 0 };
  return { landmarks, handedness: 'Unknown', handednessScore: 0.7 };
}
const frame = (hands: HandDetection[], timestamp: number): TrackingFrame => ({
  hands,
  timestamp,
  width: 960,
  height: 720,
});

it('mirrors inference coordinates to fixed screen-side identities', () => {
  const identity = new HandIdentity();
  const result = identity.update(frame([hand(0.8, 0.3), hand(0.2, 0.6)], 20));
  expect(result.pair!.left.x).toBeLessThan(result.pair!.right.x);
  expect(result.pair!.left.y).toBeLessThan(result.pair!.right.y);
});

it('shuffling the detection array does not create false points', () => {
  const identity = new HandIdentity();
  const counter = new CycleCounter();
  const a = hand(0.8, 0.3),
    b = hand(0.2, 0.6);
  for (let i = 1; i <= 100; i++) {
    const result = identity.update(frame(i % 2 ? [a, b] : [b, a], i * 20));
    expect(result.pair).not.toBeNull();
    counter.update(i * 20, result.pair, true);
  }
  expect(counter.snapshot().score).toBe(0);
});

it('rejects overlapped hands and clears continuity when a hand is missing', () => {
  const identity = new HandIdentity();
  expect(
    identity.update(frame([hand(0.5, 0.4), hand(0.51, 0.4)], 20)).pair,
  ).toBeNull();
  identity.update(frame([hand(0.8, 0.3), hand(0.2, 0.6)], 40));
  expect(identity.update(frame([hand(0.8, 0.3)], 60)).pair).toBeNull();
});
