import { useState } from 'react';
import { ArrowLeft, Camera, Check, LoaderCircle, RefreshCw, ScanLine, ShieldCheck } from 'lucide-react';
import { useCamera } from '../tracking/useCamera';

interface Props { mode: 'solo' | 'duel'; onExit: () => void }

export function CameraPanel({ mode, onExit }: Props) {
  const { videoRef, canvasRef, status, retry } = useCamera();
  const [debug, setDebug] = useState(false);
  return <main className="camera-page">
    <div className="session-heading"><button className="secondary-button" onClick={onExit}><ArrowLeft size={16} />Kembali</button><span className="session-mode">{mode === 'solo' ? 'Solo' : 'Adu Temen'} <span> / Persiapan kamera</span></span><button className="secondary-button" aria-expanded={debug} onClick={() => setDebug(value => !value)}>Debug</button></div>
    <div className="session-intro"><span className="eyebrow">Langkah pertama</span><h1>Tunjukin dua tangan lu.</h1><p>Posisikan kamera di depan. Biar telapak dan jari masuk frame.</p></div>
    <div className="session-grid"><section className="camera-stage" aria-label="Preview kamera seperti cermin">
      <div className="video-viewport"><video ref={videoRef} muted playsInline autoPlay aria-label="Webcam lu" /><canvas ref={canvasRef} aria-hidden="true" />
        <div className="camera-top"><span className="camera-badge"><span className={`live-dot ${status.phase === 'ready' ? 'on' : ''}`} />{status.phase === 'ready' ? 'Kamera aktif' : status.phase === 'error' ? 'Kamera berhenti' : 'Menyiapkan kamera'}</span><span className="camera-badge numeric">{status.handCount}/2 tangan</span></div>
        {status.phase !== 'ready' && <div className="camera-cover">{status.phase === 'loading' ? <LoaderCircle className="spin" size={34} /> : <Camera size={36} />}<p role="status">{status.message}</p>{status.phase === 'error' && <button className="primary-button" onClick={retry}><RefreshCw size={17} />Coba lagi</button>}</div>}
        {status.phase === 'ready' && <div className="camera-guide" aria-hidden="true"><span /><span /><span /><span /></div>}
      </div>
      <div className="camera-caption" role="status"><ScanLine size={18} /><span>{status.phase === 'ready' ? status.message : 'Preview lu muncul di sini.'}</span><span className="mirror-label">Mode cermin</span></div>
    </section>
    <aside className="setup-aside"><span className="small-pill">Biar tracking enak</span><h2>Kasih tangan lu<br />ruang buat gerak.</h2><ul className="setup-checklist"><li><span className={status.phase === 'ready' ? 'check ready' : 'check'}>{status.phase === 'ready' ? <Check size={13} /> : '1'}</span>Kamera dan model siap</li><li><span className={status.handCount === 2 ? 'check ready' : 'check'}>{status.handCount === 2 ? <Check size={13} /> : '2'}</span>Dua tangan masuk frame</li><li><span className="check">3</span>Cahaya cukup, tangan kelihatan</li></ul><p className="tracking-hint">Coba naik-turunin tangan bergantian. Skeleton harus ikut gerakan tangan lu.</p><div className="milestone-message">Tracking webcam siap dicoba.<br /><strong>Kalibrasi dan skor masuk tahap berikutnya.</strong></div><p className="privacy-note"><ShieldCheck size={15} /> Tidak ada video yang disimpan.</p></aside></div>
    {status.fps > 0 && status.fps < 12 && <p className="performance-note">Tracking agak lambat. Tutup tab atau aplikasi lain supaya lebih lancar.</p>}
    {debug && <section className="debug-panel"><h2>Tracking debug</h2><dl><div><dt>Inference FPS</dt><dd>{status.fps.toFixed(1)}</dd></div><div><dt>Tangan</dt><dd>{status.handCount}/2</dd></div><div><dt>Delegate</dt><dd>{status.delegate ?? '—'}</dd></div><div><dt>Handedness score</dt><dd>{status.handednessScores.map(score => score.toFixed(3)).join(' / ') || '—'}</dd></div></dl><p>Score di atas adalah confidence klasifikasi Left/Right, bukan confidence setiap landmark. Tidak ada rekaman atau skor simulasi.</p></section>}
  </main>;
}
