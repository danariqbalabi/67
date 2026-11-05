const BEST_KEY = '67-battle:best:v1';
const MUTE_KEY = '67-battle:muted:v1';
export function readBest(): number {
  try { const value = Number(localStorage.getItem(BEST_KEY)); return Number.isSafeInteger(value) && value >= 0 ? value : 0; } catch { return 0; }
}
export function saveBest(score: number): { best: number; saved: boolean } {
  const best = Math.max(readBest(), score);
  try { localStorage.setItem(BEST_KEY, String(best)); return { best, saved: true }; } catch { return { best, saved: false }; }
}
export function readMuted(): boolean { try { return localStorage.getItem(MUTE_KEY) === 'true'; } catch { return false; } }
export function saveMuted(muted: boolean) { try { localStorage.setItem(MUTE_KEY, String(muted)); } catch { /* Session preference still works. */ } }
