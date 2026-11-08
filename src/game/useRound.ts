import { useCallback, useEffect, useRef, useState } from 'react';
import type { TrackingFrame } from '../tracking/types';
import { RoundSession } from './session';

export function useRound() {
  const session = useRef(new RoundSession());
  const lastPublish = useRef(-Infinity);
  const [state, setState] = useState(() =>
    session.current.snapshot(performance.now()),
  );
  const publish = useCallback((now: number, force = false) => {
    if (force || now - lastPublish.current >= 100) {
      lastPublish.current = now;
      setState(session.current.snapshot(now));
    }
  }, []);
  const onFrame = useCallback(
    (frame: TrackingFrame) => {
      session.current.update(frame);
      publish(frame.timestamp);
    },
    [publish],
  );
  useEffect(() => {
    let animation = 0;
    const loop = (now: number) => {
      publish(now);
      animation = requestAnimationFrame(loop);
    };
    const visibility = () => {
      if (document.hidden) {
        session.current.cancel(
          'Tab jadi tidak aktif. Ronde dibatalkan biar adil.',
        );
        publish(performance.now(), true);
      }
    };
    document.addEventListener('visibilitychange', visibility);
    animation = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animation);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [publish]);
  const start = useCallback(() => {
    if (document.hidden) return;
    const now = performance.now();
    session.current.requestStart(now);
    publish(now, true);
  }, [publish]);
  const cancelStart = useCallback(() => {
    session.current.cancelStart();
    publish(performance.now(), true);
  }, [publish]);
  const reset = useCallback(() => {
    session.current = new RoundSession();
    publish(performance.now(), true);
  }, [publish]);
  const cancel = useCallback(
    (reason: string) => {
      session.current.cancel(reason);
      publish(performance.now(), true);
    },
    [publish],
  );
  return { ...state, onFrame, start, cancelStart, reset, cancel };
}
