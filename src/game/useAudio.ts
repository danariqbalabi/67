import { useCallback, useEffect, useRef, useState } from 'react';
import { readMuted, saveMuted } from './storage';

export function useAudio() {
  const [muted, setMuted] = useState(readMuted);
  const mutedRef = useRef(muted);
  const context = useRef<AudioContext | null>(null);
  const unlock = useCallback(() => {
    try {
      context.current ??= new AudioContext();
      void context.current.resume().catch(() => {});
    } catch {
      /* Audio optional. */
    }
  }, []);
  const beep = useCallback((frequency = 600, duration = 0.065) => {
    const ctx = context.current;
    if (mutedRef.current || !ctx || ctx.state !== 'running') return;
    const oscillator = ctx.createOscillator(),
      gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }, []);
  const toggle = useCallback(() => {
    unlock();
    setMuted((current) => {
      mutedRef.current = !current;
      saveMuted(!current);
      return !current;
    });
  }, [unlock]);
  useEffect(
    () => () => {
      const ctx = context.current;
      context.current = null;
      if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => {});
    },
    [],
  );
  return { muted, unlock, beep, toggle };
}
