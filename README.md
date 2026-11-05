# 67 Battle

Game webcam untuk menghitung siklus gerakan dua tangan naik-turun bergantian. React + TypeScript + Vite; target desktop/laptop.

## Menjalankan

Butuh Node.js 22.12+ (disarankan Node 24).

```sh
npm ci
npm run dev
```

Buka http://localhost:5173. Kamera membutuhkan localhost atau HTTPS.

```sh
npm run typecheck
npm run build
```

## Milestone

- [x] Fondasi proyek dan design system pastel dengan Poppins.
- [x] Webcam dan Hand Landmarker.
- [ ] Kalibrasi dan penghitung siklus beserta unit test.
- [ ] Solo, timer, dan hasil.
- [ ] Adu Temen dan rekor lokal.
- [ ] Debug, penanganan error, dan verifikasi akhir.

Tidak ada backend atau akun. Video tidak diunggah atau disimpan.

## Tracking webcam (milestone 2)

Klik **Aktifkan Kamera** untuk meminta izin; tidak ada akses kamera otomatis saat halaman dibuka. Dua tangan ditampilkan dengan skeleton pada preview seperti cermin. Klik **Kembali** untuk mematikan kamera dan melepas model. Debug tersembunyi secara default dan menampilkan FPS, jumlah tangan, GPU/CPU, serta confidence klasifikasi Left/Right (bukan confidence landmark).

`npm ci` menjalankan `postinstall` yang menyalin WASM dari versi SDK terkunci dan mengunduh model resmi MediaPipe float16 v1. File model diverifikasi dengan SHA-256. Aset ini dilayani dari localhost, bukan CDN saat bermain. Unduhan model saat instalasi memerlukan internet. Jika unduhan gagal, jalankan:

```sh
npm run setup:vision
```

Model dan WASM tidak dimasukkan ke Git; aset dibuat di `public/vision/` dan ikut disalin saat build. Inferensi dibatasi 24 Hz, hanya pada frame video baru, tanpa panggilan bertumpuk. GPU dicoba lebih dahulu dengan fallback CPU. Model dipertahankan sepanjang sesi kamera dan dilepas ketika keluar. Kamera terputus, izin ditolak, perangkat tidak tersedia, dan kegagalan model memiliki pesan coba lagi.

Dokumentasi API: [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker?tab=Web), [Vite](https://vite.dev/guide/).

Tahap ini belum menghitung skor atau memulai ronde. Validasi gerakan berikutnya akan memakai data sintetis dan webcam nyata secara terpisah.

Browser check memakai Playwright dengan Edge yang terpasang (`npm run test:e2e`). Test kamera menggunakan perangkat video sintetis browser, bukan webcam nyata. Screenshot hasil pemeriksaan disimpan di `.local/` (tidak di-commit).
