import { expect, it } from 'vitest';
import { RoundClock } from './clock';

it('uses elapsed time with a fixed deadline, even when callbacks are delayed', () => {
  const clock = new RoundClock();
  clock.start(1000);
  expect(clock.tick(1000).countdown).toBe(3);
  expect(clock.tick(3999).phase).toBe('countdown');
  expect(clock.tick(4000).phase).toBe('playing');
  expect(clock.tick(14_000).remainingMs).toBe(20_000);
  expect(clock.tick(34_000).phase).toBe('finished');
  expect(clock.tick(50_000).remainingMs).toBe(0);
});

it('cancellation during countdown or play cannot become a recorded result', () => {
  const clock = new RoundClock();
  clock.start(0);
  clock.tick(4000);
  clock.cancel('Tab tidak aktif.');
  expect(clock.tick(99_000).phase).toBe('cancelled');
  expect(clock.tick(99_000).reason).toBe('Tab tidak aktif.');
});
