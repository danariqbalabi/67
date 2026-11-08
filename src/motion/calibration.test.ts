import { expect, it } from 'vitest';
import { Calibration } from './calibration';
import type { HandPair } from './config';
const pair = (delta = 0): HandPair => ({
  left: { x: 0.2, y: 0.5 - delta * 0.05, size: 0.1 },
  right: { x: 1, y: 0.5 + delta * 0.05, size: 0.1 },
});

it('requires stable palms and both alternating poses before becoming ready', () => {
  const c = new Calibration();
  for (let t = 0; t <= 1400; t += 40) c.update(t, pair());
  expect(c.snapshot().stage).toBe('left');
  for (let t = 1440; t <= 1800; t += 40) c.update(t, pair(2));
  expect(c.snapshot().stage).toBe('right');
  for (let t = 1840; t <= 2200; t += 40) c.update(t, pair(-2));
  expect(c.snapshot().stage).toBe('ready');
  expect(c.snapshot().threshold).toBeCloseTo(0.8);
  expect(c.snapshot().palmSize).toBeCloseTo(0.1);
});

it('losing tracking restarts incomplete calibration', () => {
  const c = new Calibration();
  for (let t = 0; t <= 1400; t += 40) c.update(t, pair());
  expect(c.update(1440, null).stage).toBe('hold');
  expect(c.snapshot().progress).toBe(0);
});
