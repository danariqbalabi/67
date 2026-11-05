import { describe, expect, it } from 'vitest';
import { CycleCounter } from './counter';
import type { HandPair } from './config';

const pair = (delta: number): HandPair => ({ left: { x: .3, y: .5 - delta * .05, size: .1 }, right: { x: .9, y: .5 + delta * .05, size: .1 } });

function harness() {
  const counter = new CycleCounter();
  let time = 0;
  return {
    counter,
    hold(delta: number, active = true, ms = 420) {
      let result = counter.snapshot();
      for (let i = 0; i < ms; i += 20) { time += 20; result = counter.update(time, pair(delta), active); }
      return result;
    },
    lose() { time += 20; return counter.update(time, null, true); },
    gap() { time += 800; },
  };
}

describe('complete alternating motion cycles', () => {
  it('stationary hands never score, including a held A pose', () => {
    const h = harness(); h.hold(0, true, 2000); expect(h.hold(2, true, 2000).score).toBe(0);
  });
  it('small jitter never scores', () => {
    const h = harness(); for (let i = 0; i < 100; i++) h.hold(i % 2 ? .2 : -.2, true, 20);
    expect(h.counter.snapshot().score).toBe(0);
  });
  it('A → B is only a partial cycle', () => {
    const h = harness(); h.hold(2); expect(h.hold(-2).score).toBe(0);
  });
  it('A → B → A is exactly one point', () => {
    const h = harness(); h.hold(2); h.hold(-2); expect(h.hold(2).score).toBe(1);
  });
  it('B → A → B is exactly one point', () => {
    const h = harness(); h.hold(-2); h.hold(2); expect(h.hold(-2).score).toBe(1);
  });
  it('shares the ending pose with the next cycle', () => {
    const h = harness(); h.hold(2); for (let i = 0; i < 4; i++) { h.hold(-2); h.hold(2); }
    expect(h.counter.snapshot().score).toBe(4);
  });
  it('loss cancels partial cycles but preserves earned points', () => {
    const h = harness(); h.hold(2); h.hold(-2); h.hold(2); h.hold(-2); h.lose();
    expect(h.hold(2).score).toBe(1); h.hold(-2); expect(h.hold(2).score).toBe(2);
  });
  it('does not count outside an active round or carry preparation into it', () => {
    const h = harness(); h.hold(2, false); h.hold(-2, false); h.hold(2, false);
    expect(h.counter.snapshot().score).toBe(0);
    h.hold(-2); expect(h.hold(2).score).toBe(0);
  });
  it('a long frame gap cancels partial progress', () => {
    const h = harness(); h.hold(2); h.hold(-2); h.gap(); expect(h.hold(2).score).toBe(0);
  });
  it('brief spikes do not form a cycle', () => {
    const h = harness(); h.hold(2); h.hold(-8, true, 20); expect(h.hold(2).score).toBe(0);
  });
  it('passes through neutral without losing a valid partial cycle', () => {
    const h = harness(); h.hold(2); h.hold(0); h.hold(-2); h.hold(0); expect(h.hold(2).score).toBe(1);
  });
});
