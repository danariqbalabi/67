import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, Check, Flag, LoaderCircle, Play, RefreshCw, ScanLine, ShieldCheck, Trophy, Volume2, VolumeX } from 'lucide-react';
import { useCamera } from '../tracking/useCamera';
import { useRound } from '../game/useRound';
import { MOTION_CONFIG } from '../motion/config';
import { readBest, saveBest } from '../game/storage';
import { useAudio } from '../game/useAudio';
import { Confetti } from './Confetti';

interface Props { mode: 'solo' | 'duel'; names: [string, string]; onExit: () => void }

export function CameraPanel({ mode, names, onExit }: Props) {
  const round = useRound();
  const { videoRef, canvasRef, status, retry } = useCamera(round.onFrame);
  const [debug, setDebug] = useState(false);
  const [player, setPlayer] = useState(0);
  const [firstScore, setFirstScore] = useState(0);
  const [best, setBest] = useState(readBest);
  const [storageFailed, setStorageFailed] = useState(false);
  const recorded = useRef(false);
  const audio = useAudio();
  const { phase } = round.clock;
  const live = phase === 'playing' || phase === 'countdown';
  const complete = phase === 'finished' || phase === 'cancelled';
  const handoff = phase === 'finished' && mode === 'duel' && player === 0;
  const duelDone = phase === 'finished' && mode === 'duel' && player === 1;
  const winner = firstScore === round.motion.score ? 'Seri. Rematch?' : `${firstScore > round.motion.score ? names[0] : names[1]} menang!`;
  useEffect(() => {
    if (phase === 'finished' && mode === 'solo' && !recorded.current) {
      recorded.current = true; const result = saveBest(Math.max(best, round.motion.score)); setBest(result.best); setStorageFailed(!result.saved);
    }
  }, [phase, mode, round.motion.score, best]);
  useEffect(() => { if (round.clock.countdown > 0) audio.beep(450, .1); }, [round.clock.countdown, audio.beep]);
  useEffect(() => { if (round.motion.score > 0 && phase === 'playing') audio.beep(750); }, [round.motion.score, phase, audio.beep]);
  useEffect(() => { if (phase === 'finished') audio.beep(950, .18); }, [phase, audio.beep]);
  const restart = () => { recorded.current = false; round.reset(); };
  const rematch = () => { setPlayer(0); setFirstScore(0); restart(); };
  useEffect(() => { if (status.phase === 'error') round.cancel('Kamera berhenti. Ronde dibatalkan.'); }, [status.phase, round.cancel]);
  const instruction = phase === 'preparing' ? status.handCount === 2 ? round.calibration.message : status.message : phase === 'playing' ? status.handCount === 2 ? round.motion.reason || 'Naik-turun. Gantian. Gas!' : 'Tangan lu keluar frame. Timer tetap jalan.' : phase === 'countdown' ? 'Siap nge-67?' : 'Ronde selesai.';
  return <main className="camera-page">
    <div className="session-heading"><button className="secondary-button" onClick={onExit}><ArrowLeft size={16} />Keluar</button><span className="session-mode">{mode === 'solo' ? 'Solo' : `Giliran ${names[player]}`} <span> / {live ? 'Lagi nge-67' : 'Persiapan kamera'}</span></span><div className="session-tools"><button className="icon-button" onClick={audio.toggle} aria-label={audio.muted ? 'Aktifkan suara' : 'Matikan suara'} aria-pressed={audio.muted}>{audio.muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button><button className="secondary-button" aria-expanded={debug} onClick={() => setDebug(value => !value)}>Debug</button></div></div>
    <div className="session-intro"><span className="eyebrow">{phase === 'playing' ? 'Waktunya buktiin' : 'Dua tangan, satu tantangan'}</span><h1>{phase === 'playing' ? 'Gas, jangan kasih kendor.' : 'Tunjukin dua tangan lu.'}</h1><p>{phase === 'preparing' ? 'Kalibrasi sebentar. Setelah itu, 30 detik buat pecahin rekor.' : 'Satu pola bolak-balik lengkap = satu poin.'}</p></div>
    <div className="session-grid"><section className="camera-stage" aria-label="Preview kamera seperti cermin">
      <div className="video-viewport"><video ref={videoRef} muted playsInline autoPlay aria-label="Webcam lu" /><canvas ref={canvasRef} aria-hidden="true" />
        <div className="camera-top"><span className="camera-badge"><span className={`live-dot ${status.phase === 'ready' ? 'on' : ''}`} />{status.phase === 'ready' ? 'Kamera aktif' : status.phase === 'error' ? 'Kamera berhenti' : 'Menyiapkan kamera'}</span><span className="camera-badge numeric">{status.handCount}/2 tangan</span></div>
        {status.phase !== 'ready' && <div className="camera-cover">{status.phase === 'loading' ? <LoaderCircle className="spin" size={34} /> : <Camera size={36} />}<p role="status">{status.message}</p>{status.phase === 'error' && <button className="primary-button" onClick={() => { round.reset(); retry(); }}><RefreshCw size={17} />Coba lagi</button>}</div>}
        {status.phase === 'ready' && <div className="camera-guide" aria-hidden="true"><span /><span /><span /><span /></div>}
        {phase === 'countdown' && <div className="countdown-overlay"><span key={round.clock.countdown}>{round.clock.countdown}</span><p>Siap nge-67?</p></div>}
        {complete && <div className="result-overlay" role="dialog" aria-modal="false" aria-label="Hasil ronde">{phase === 'finished' && !handoff && <Confetti />}<div className="result-card"><span className="result-icon">{phase === 'finished' ? <Trophy size={25} /> : <Flag size={25} />}</span><h2>{phase === 'cancelled' ? 'Ulang dulu, yuk.' : handoff ? `Giliran ${names[1]}.` : duelDone ? winner : 'Ronde beres!'}</h2>{phase === 'finished' ? duelDone ? <div className="duel-scores"><div><span>{names[0]}</span><strong className="numeric">{firstScore}</strong></div><span>vs</span><div><span>{names[1]}</span><strong className="numeric">{round.motion.score}</strong></div></div> : <><div className="result-score numeric">{round.motion.score}<span>{handoff ? `siklus valid ${names[0]}` : 'siklus valid'}</span></div><p>{handoff ? 'Ganti pemain dulu. Kalibrasi ulang setelah klik Siap.' : round.motion.score === 0 ? 'Pemanasan dulu. Berikutnya pasti lebih luwes.' : 'Tangan lu punya ritme juga.'}</p>{mode === 'solo' && <p className="record-note">Rekor pribadi: <strong className="numeric">{best}</strong>{storageFailed && <span> Penyimpanan browser tidak tersedia. Rekor ini cuma berlaku selama sesi.</span>}</p>}</> : <p>{round.clock.reason}</p>}<button className="primary-button" onClick={handoff ? () => { setFirstScore(round.motion.score); setPlayer(1); restart(); } : duelDone ? rematch : restart}>{handoff ? <Play size={16} /> : <RefreshCw size={16} />}{handoff ? 'Siap' : duelDone ? 'Rematch' : 'Main lagi'}</button><button className="text-button" onClick={onExit}>Balik ke awal</button></div></div>}
      </div>
      <div className="camera-caption" role="status"><ScanLine size={18} /><span>{status.phase === 'ready' ? instruction : 'Preview lu muncul di sini.'}</span><span className="mirror-label">Mode cermin</span></div>
    </section>
    <aside className="setup-aside">{live ? <><span className="small-pill">{mode === 'duel' ? names[player] : 'Lagi nge-67'}</span><div className="live-score numeric" key={round.motion.score}>{round.motion.score}<span>siklus valid</span></div><div className="timer-line"><span>Sisa waktu</span><strong className="numeric">{Math.ceil(round.clock.remainingMs / 1000)}<small> detik</small></strong></div><div className="timer-track"><div style={{ width: `${round.clock.remainingMs / MOTION_CONFIG.roundMs * 100}%` }} /></div><p className="tracking-hint">A → B → A = +1<br />B → A → B juga +1.</p><button className="secondary-button" onClick={() => round.cancel('Ronde dihentikan. Skor tidak dicatat.')}><Flag size={15} />Hentikan ronde</button></> : <><span className="small-pill">{mode === 'duel' ? `Pemain ${player + 1} dari 2` : 'Biar tracking enak'}</span><h2>Kasih tangan lu<br />ruang buat gerak.</h2><ul className="setup-checklist"><li><span className={status.phase === 'ready' ? 'check ready' : 'check'}>{status.phase === 'ready' ? <Check size={13} /> : '1'}</span>Kamera dan model siap</li><li><span className={status.handCount === 2 ? 'check ready' : 'check'}>{status.handCount === 2 ? <Check size={13} /> : '2'}</span>Dua tangan masuk frame</li><li><span className={round.calibration.stage === 'ready' ? 'check ready' : 'check'}>{round.calibration.stage === 'ready' ? <Check size={13} /> : '3'}</span>Kalibrasi gerakan</li></ul><div className="calibration-track"><div style={{ width: `${round.calibration.progress * 100}%` }} /></div><p className="tracking-hint">{instruction}</p><button className="primary-button" disabled={!round.canStart || status.phase !== 'ready' || phase !== 'preparing'} onClick={() => { round.start(); audio.unlock(); }}><Play size={17} />Mulai nge-67</button>{phase === 'preparing' && round.calibration.stage === 'ready' && <button className="text-button" onClick={restart}>Kalibrasi ulang</button>}<p className="round-rules">Tangan keluar frame? Timer tetap jalan. Pindah tab membatalkan ronde.</p><p className="privacy-note"><ShieldCheck size={15} /> Tidak ada video yang disimpan.</p></>}</aside></div>
    {status.fps > 0 && status.fps < 12 && <p className="performance-note">Tracking agak lambat. Tutup tab atau aplikasi lain supaya lebih lancar.</p>}
    {debug && <section className="debug-panel"><h2>Tracking debug</h2><dl><div><dt>Inference FPS</dt><dd>{status.fps.toFixed(1)}</dd></div><div><dt>Tangan</dt><dd>{status.handCount}/2</dd></div><div><dt>Delegate</dt><dd>{status.delegate ?? '—'}</dd></div><div><dt>Handedness score</dt><dd>{status.handednessScores.map(score => score.toFixed(3)).join(' / ') || '—'}</dd></div><div><dt>Selisih normalisasi</dt><dd>{round.motion.delta.toFixed(3)}</dd></div><div><dt>State</dt><dd>{round.motion.state}</dd></div><div><dt>Tahap siklus</dt><dd>{round.motion.cycle}</dd></div><div><dt>Threshold aktif</dt><dd>{round.motion.threshold.toFixed(3)}</dd></div><div><dt>Kalibrasi</dt><dd>{round.calibration.stage}</dd></div><div><dt>Ukuran telapak kalibrasi</dt><dd>{round.calibration.palmSize.toFixed(3)}</dd></div><div><dt>Alasan / feedback</dt><dd>{round.motion.reason || '—'}</dd></div></dl><p>Handedness score adalah confidence klasifikasi Left/Right, bukan confidence setiap landmark. Tidak ada rekaman atau skor simulasi.</p></section>}
  </main>;
}
