import { useCallback, useEffect, useRef, useState } from 'react';
import { Calibration, type CalibrationSnapshot } from '../motion/calibration';
import { CycleCounter, type CounterSnapshot } from '../motion/counter';
import { HandIdentity } from '../motion/identity';
import { MOTION_CONFIG } from '../motion/config';
import type { TrackingFrame } from '../tracking/types';
import { RoundClock, type ClockSnapshot } from './clock';

function createRuntime() {
  return { identity: new HandIdentity(), calibration: new Calibration(), counter: new CycleCounter(), clock: new RoundClock(), lastPairAt: -Infinity, lastPublish: -Infinity, pairReady: false };
}
interface RoundView { clock: ClockSnapshot; calibration: CalibrationSnapshot; motion: CounterSnapshot; canStart: boolean }
function view(runtime: ReturnType<typeof createRuntime>, now: number): RoundView {
  return { clock: runtime.clock.tick(now), calibration: runtime.calibration.snapshot(), motion: runtime.counter.snapshot(), canStart: runtime.calibration.snapshot().stage === 'ready' && runtime.pairReady && now - runtime.lastPairAt < MOTION_CONFIG.maxFrameGapMs };
}

export function useRound() {
  const runtime = useRef(createRuntime());
  const [state, setState] = useState(() => view(runtime.current, performance.now()));
  const reasonRef = useRef('');
  const publish = useCallback((now: number, force = false) => {
    const r = runtime.current;
    if (force || now - r.lastPublish >= 100) { r.lastPublish = now; const next = view(r, now); next.motion.reason = reasonRef.current; setState(next); }
  }, []);
  const onFrame = useCallback((frame: TrackingFrame) => {
    const r = runtime.current;
    const { pair, reason } = r.identity.update(frame);
    r.pairReady = Boolean(pair);
    if (pair) r.lastPairAt = frame.timestamp;
    const clock = r.clock.tick(frame.timestamp);
    if (clock.phase === 'preparing') r.calibration.update(frame.timestamp, pair);
    reasonRef.current = r.counter.update(frame.timestamp, pair, clock.phase === 'playing', reason).reason;
    publish(frame.timestamp);
  }, [publish]);
  useEffect(() => {
    let animation = 0;
    const loop = (now: number) => { publish(now); animation = requestAnimationFrame(loop); };
    const visibility = () => {
      if (document.hidden) { runtime.current.clock.cancel('Tab jadi tidak aktif. Ronde dibatalkan biar adil.'); runtime.current.counter.resetPartial(); publish(performance.now(), true); }
    };
    document.addEventListener('visibilitychange', visibility);
    animation = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(animation); document.removeEventListener('visibilitychange', visibility); };
  }, [publish]);
  const start = useCallback(() => {
    const now = performance.now(), r = runtime.current;
    if (document.hidden || r.clock.tick(now).phase !== 'preparing' || !view(r, now).canStart) return;
    r.counter = new CycleCounter(r.calibration.snapshot().threshold); r.clock.start(now); reasonRef.current = ''; publish(now, true);
  }, [publish]);
  const reset = useCallback(() => { runtime.current = createRuntime(); reasonRef.current = ''; publish(performance.now(), true); }, [publish]);
  const cancel = useCallback((reason: string) => { runtime.current.clock.cancel(reason); runtime.current.counter.resetPartial(); publish(performance.now(), true); }, [publish]);
  return { ...state, onFrame, start, reset, cancel };
}
