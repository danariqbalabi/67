import { useState } from 'react';
import { ArrowRight, Camera, Hand, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import { CameraPanel } from './components/CameraPanel';

export default function App() {
  const [mode, setMode] = useState<'solo' | 'duel'>('solo');
  const [cameraActive, setCameraActive] = useState(false);
  const [names, setNames] = useState<[string, string]>(['', '']);
  return <div className="app-shell">
    <header className="site-header"><a href="/" className="brand"><span className="brand-mark">67</span> Battle<span className="brand-dot">.</span></a><span className="header-note">Sedikit gerak. Banyak ketawa.</span></header>
    {cameraActive ? <CameraPanel mode={mode} names={names} onExit={() => setCameraActive(false)} /> : <main className="landing">
      <section className="hero-copy">
        <span className="eyebrow"><span className="status-dot" /> Webcam party game</span>
        <h1>Seberapa<br /><span>six seven</span> lu?</h1>
        <p className="hero-description">Dua tangan. Tiga puluh detik.<br />Buktiin siapa yang paling jago nge-67.</p>
        <div className="mode-picker" aria-label="Mode permainan"><button aria-pressed={mode === 'solo'} className={mode === 'solo' ? 'selected' : ''} onClick={() => setMode('solo')}><UserRound size={19} />Solo</button><button aria-pressed={mode === 'duel'} className={mode === 'duel' ? 'selected' : ''} onClick={() => setMode('duel')}><UsersRound size={19} />Adu Temen</button></div>
        <p className="mode-description">{mode === 'solo' ? 'Lu, kamera, dan rekor yang harus dikalahin.' : 'Satu kamera, dua pemain. Mainnya gantian.'}</p>
        <form onSubmit={event => { event.preventDefault(); setNames(([a, b]) => [a.trim() || 'Pemain 1', b.trim() || 'Pemain 2']); setCameraActive(true); }}>
          {mode === 'duel' && <div className="player-inputs"><label>Nama pemain 1<input required maxLength={24} value={names[0]} onChange={event => setNames([event.target.value, names[1]])} placeholder="Nama lu" autoComplete="off" /></label><label>Nama pemain 2<input required maxLength={24} value={names[1]} onChange={event => setNames([names[0], event.target.value])} placeholder="Nama temen lu" autoComplete="off" /></label></div>}
          <button className="primary-button" type="submit"><Camera size={19} />Aktifkan Kamera<ArrowRight size={18} /></button>
        </form>
        <p className="privacy-note"><ShieldCheck size={15} /> Video tetap di perangkat lu.</p>
      </section>
      <section className="playground" aria-label="Panduan gerakan six seven"><div className="playground-top"><span>Gerakannya gini nih</span><span className="small-pill">A → B → A = +1</span></div><div className="hand-demo"><div className="demo-hand left"><Hand strokeWidth={1.4} /><span>Kiri naik</span></div><span className="demo-number">67</span><div className="demo-hand right"><Hand strokeWidth={1.4} /><span>Kanan naik</span></div></div><div className="demo-caption"><span className="demo-step">01</span><p>Naik-turun bergantian.<br /><strong>Balik ke posisi awal, dapet satu poin.</strong></p><ArrowRight size={22} /></div></section>
    </main>}
    <footer className="site-footer"><span>Main santai, saingan boleh.</span><span>Webcam · Di perangkat lu · Tanpa akun</span></footer>
  </div>;
}
