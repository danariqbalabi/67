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

it('keeps tracking when a fingertip slips outside the image but the palm remains visible', () => {
  const left = hand(0.8, 0.3),
    right = hand(0.2, 0.6);
  left.landmarks[8].y = -0.015;
  right.landmarks[20].x = 1.02;
  expect(
    new HandIdentity().update(frame([left, right], 20)).pair,
  ).not.toBeNull();
});

it('tracks a tilted palm when wrist-to-middle distance shrinks but palm width is clear', () => {
  const left = hand(0.8, 0.4),
    right = hand(0.2, 0.6);
  for (const hand of [left, right]) {
    hand.landmarks[0].y = hand.landmarks[9].y + 0.01;
    hand.landmarks[5].x -= 0.04;
    hand.landmarks[17].x += 0.04;
  }
  expect(
    new HandIdentity().update(frame([left, right], 20)).pair,
  ).not.toBeNull();
});

it('does not swap nearby hands just because their heights alternate', () => {
  const identity = new HandIdentity();
  expect(
    identity.update(frame([hand(0.55, 0.3), hand(0.45, 0.6)], 20)).pair,
  ).not.toBeNull();
  const result = identity.update(
    frame([hand(0.45, 0.3), hand(0.55, 0.6)], 180),
  );
  expect(result.pair).not.toBeNull();
  expect(result.pair!.left.y).toBeGreaterThan(result.pair!.right.y);
});

it('rejects a palm outside the image and non-finite landmarks', () => {
  expect(
    new HandIdentity().update(frame([hand(0.8, -0.1), hand(0.2, 0.6)], 20))
      .pair,
  ).toBeNull();
  const left = hand(0.8, 0.3);
  left.landmarks[8].y = NaN;
  expect(
    new HandIdentity().update(frame([left, hand(0.2, 0.6)], 20)).pair,
  ).toBeNull();
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
