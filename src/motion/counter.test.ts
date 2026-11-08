import { describe, expect, it } from 'vitest';
import { CycleCounter } from './counter';
import type { HandPair } from './config';

const pair = (delta: number): HandPair => ({
  left: { x: 0.3, y: 0.5 - delta * 0.05, size: 0.1 },
  right: { x: 0.9, y: 0.5 + delta * 0.05, size: 0.1 },
});

function harness() {
  const counter = new CycleCounter();
  let time = 0;
  return {
    counter,
    hold(delta: number, active = true, ms = 420) {
      let result = counter.snapshot();
      for (let i = 0; i < ms; i += 20) {
        time += 20;
        result = counter.update(time, pair(delta), active);
      }
      return result;
    },
    lose() {
      time += 20;
      return counter.update(time, null, true);
    },
    gap() {
      time += 800;
    },
  };
}

describe('complete alternating motion cycles', () => {
  it('counts fast continuous cycles at 30 and 60 FPS', () => {
    for (const period of [300, 400]) {
      for (const fps of [20, 24, 30, 60]) {
        const counter = new CycleCounter(0.8);
        for (let time = 0; time < period * 5.5; time += 1000 / fps) {
          counter.update(
            time,
            pair(1.5 * Math.sin((2 * Math.PI * time) / period)),
            true,
          );
        }
        expect(counter.snapshot().score).toBe(5);
      }
    }
  });
  it('counts smooth up-and-down motion without requiring a pause at each peak', () => {
    for (const threshold of [0.65, 0.8]) {
      for (const period of [500, 600]) {
        for (const fps of [15, 20, 24, 30]) {
          const counter = new CycleCounter(threshold);
          const step = 1000 / fps;
          for (let time = 0; time < period * 5.5; time += step) {
            counter.update(
              time,
              pair(1.1 * Math.sin((2 * Math.PI * time) / period)),
              true,
            );
          }
          expect(counter.snapshot().score).toBe(5);
        }
      }
    }
  });
  it('counts the same cycles at 15, 30 and 60 FPS', () => {
    for (const fps of [15, 30, 60]) {
      const counter = new CycleCounter();
      const interval = 1000 / fps;
      for (let time = 0; time < 3000; time += interval) {
        const phase = Math.floor(time / 600);
        counter.update(time, pair(phase % 2 === 0 ? 2 : -2), true);
      }
      expect(counter.snapshot().score).toBe(2);
    }
  });
  it('stationary hands never score, including a held A pose', () => {
    const h = harness();
    h.hold(0, true, 2000);
    expect(h.hold(2, true, 2000).score).toBe(0);
  });
  it('small jitter never scores', () => {
    const h = harness();
    for (let i = 0; i < 100; i++) h.hold(i % 2 ? 0.2 : -0.2, true, 20);
    expect(h.counter.snapshot().score).toBe(0);
  });
  it('A → B is only a partial cycle', () => {
    const h = harness();
    h.hold(2);
    expect(h.hold(-2).score).toBe(0);
  });
  it('A → B → A is exactly one point', () => {
    const h = harness();
    h.hold(2);
    h.hold(-2);
    expect(h.hold(2).score).toBe(1);
  });
  it('B → A → B is exactly one point', () => {
    const h = harness();
    h.hold(-2);
    h.hold(2);
    expect(h.hold(-2).score).toBe(1);
  });
  it('shares the ending pose with the next cycle', () => {
    const h = harness();
    h.hold(2);
    for (let i = 0; i < 4; i++) {
      h.hold(-2);
      h.hold(2);
    }
    expect(h.counter.snapshot().score).toBe(4);
  });
  it('loss cancels partial cycles but preserves earned points', () => {
    const h = harness();
    h.hold(2);
    h.hold(-2);
    h.hold(2);
    h.hold(-2);
    h.lose();
    expect(h.hold(2).score).toBe(1);
    h.hold(-2);
    expect(h.hold(2).score).toBe(2);
  });
  it('does not count outside an active round or carry preparation into it', () => {
    const h = harness();
    h.hold(2, false);
    h.hold(-2, false);
    h.hold(2, false);
    expect(h.counter.snapshot().score).toBe(0);
    h.hold(-2);
    expect(h.hold(2).score).toBe(0);
  });
  it('a long frame gap cancels partial progress', () => {
    const h = harness();
    h.hold(2);
    h.hold(-2);
    h.gap();
    expect(h.hold(2).score).toBe(0);
  });
  it('brief spikes do not form a cycle', () => {
    const h = harness();
    h.hold(2);
    h.hold(-8, true, 20);
    expect(h.hold(2).score).toBe(0);
  });
  it('passes through neutral without losing a valid partial cycle', () => {
    const h = harness();
    h.hold(2);
    h.hold(0);
    h.hold(-2);
    h.hold(0);
    expect(h.hold(2).score).toBe(1);
  });
});
