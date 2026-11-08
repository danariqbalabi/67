import { expect, it } from 'vitest';
import { RoundSession } from './session';
import type { TrackingFrame } from '../tracking/types';

function frame(timestamp: number, delta: number | null): TrackingFrame {
  const hand = (x: number, y: number) => ({
    landmarks: Array.from({ length: 21 }, (_, i) => ({
      x,
      y: y + (i === 0 ? 0.08 : 0),
      z: 0,
    })),
    handedness: 'Unknown',
    handednessScore: 0.9,
  });
  return {
    timestamp,
    width: 960,
    height: 720,
    hands:
      delta === null
        ? []
        : [hand(0.8, 0.5 - delta * 0.04), hand(0.2, 0.5 + delta * 0.04)],
  };
}

function harness() {
  const session = new RoundSession();
  let time = 0;
  return {
    session,
    snapshot: () => session.snapshot(time),
    request: () => session.requestStart(time),
    hold(delta: number | null, duration: number) {
      for (let elapsed = 0; elapsed < duration; elapsed += 40) {
        time += 40;
        session.update(frame(time, delta));
      }
      return session.snapshot(time);
    },
    calibrate() {
      this.hold(0, 1320);
      this.hold(2, 400);
      this.hold(-2, 400);
      expect(this.snapshot().calibration.stage).toBe('ready');
    },
    gap(duration: number) {
      time += duration;
      return session.snapshot(time);
    },
  };
}

it('accepts a start request before either hand is visible, then starts hands-free after calibration', () => {
  const h = harness();
  h.request();
  expect(h.hold(null, 800).startRequested).toBe(true);
  expect(h.snapshot().clock.phase).toBe('preparing');
  h.calibrate();
  expect(h.snapshot().clock.phase).toBe('preparing');
  expect(h.hold(-2, 700).clock.phase).toBe('countdown');
  expect(h.snapshot().motion.score).toBe(0);
});

it('allows moving a hand to the mouse after calibration without another click to start', () => {
  const h = harness();
  h.calibrate();
  h.hold(null, 400);
  h.request();
  expect(h.snapshot().startRequested).toBe(true);
  expect(h.snapshot().clock.phase).toBe('preparing');
  expect(h.hold(-2, 700).clock.phase).toBe('countdown');
});

it('never auto-starts without an explicit start request or completed calibration', () => {
  const h = harness();
  h.calibrate();
  expect(h.hold(2, 1200).clock.phase).toBe('preparing');
  const other = harness();
  other.request();
  expect(other.hold(0, 3000).calibration.stage).toBe('left');
  expect(other.snapshot().clock.phase).toBe('preparing');
});

it('hand loss and stale frames restart the ready hold without spending round time', () => {
  const h = harness();
  h.calibrate();
  h.request();
  h.hold(-2, 400);
  h.hold(null, 40);
  expect(h.hold(-2, 400).clock.phase).toBe('preparing');
  h.gap(500);
  expect(h.hold(-2, 400).clock.phase).toBe('preparing');
  expect(h.snapshot().clock.remainingMs).toBe(30_000);
  expect(h.hold(-2, 300).clock.phase).toBe('countdown');
});

it('cancelling a pending start disarms it even when calibration becomes ready', () => {
  const h = harness();
  h.request();
  h.session.cancelStart();
  h.calibrate();
  expect(h.hold(-2, 800).clock.phase).toBe('preparing');
  expect(h.snapshot().startRequested).toBe(false);
  h.request();
  h.session.cancel('Tab inactive');
  expect(h.hold(-2, 800).clock.phase).toBe('preparing');
  expect(h.snapshot().startRequested).toBe(false);
});

it('shows live position diagnostics during preparation but does not score', () => {
  const h = harness();
  h.hold(2, 400);
  h.hold(-2, 400);
  const state = h.hold(2, 400);
  expect(state.tracking.state).toBe('A');
  expect(state.tracking.delta).toBeCloseTo(2);
  expect(state.motion.score).toBe(0);
  expect(state.clock.phase).toBe('preparing');
});
