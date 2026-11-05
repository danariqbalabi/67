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
- [x] Modul kalibrasi dan penghitung siklus beserta 16 unit test.
- [x] Solo, timer, dan hasil.
- [x] Adu Temen dan rekor lokal.
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

Kalibrasi, countdown 3–2–1, ronde solo 30 detik, dan hasil sudah terhubung ke tracking. Tombol mulai hanya aktif ketika model, dua tangan, dan kalibrasi siap. Gerakan di luar ronde tidak dihitung. Timer tetap berjalan jika tracking hilang. Tab tidak aktif membatalkan ronde dan menawarkan ulang; ronde batal tidak boleh dicatat sebagai hasil.

Browser check memakai Playwright Chromium (`npm run test:e2e`). Instal browser test dengan `npx playwright install chromium` jika belum ada. Test kamera menggunakan perangkat video sintetis browser, bukan webcam nyata. Test gameplay memakai landmark sintetis melalui mock module khusus browser test, yang tidak tersedia dalam aplikasi produksi. Screenshot hasil pemeriksaan disimpan di `.local/` (tidak di-commit).

## Solo dan Adu Temen

Solo menyimpan rekor pribadi di localStorage. Hanya ronde 30 detik yang selesai yang dicatat; ronde batal tidak dicatat. Jika penyimpanan browser ditolak, permainan tetap bisa berjalan dan hasil ditampilkan untuk sesi saat ini.

Adu Temen meminta dua nama (maksimum 24 karakter). Pemain pertama menyelesaikan ronde, lalu layar pergantian meminta pemain kedua klik **Siap**. Pemain kedua melakukan kalibrasi baru dengan algoritma, batas parameter, dan durasi yang sama. Hasil menampilkan skor, pemenang atau seri, dan rematch. Tidak ada pengaturan sensitivitas manual di tengah pertandingan. Skor Adu Temen tidak mengubah rekor solo.

Audio singkat baru diaktifkan setelah klik tombol mulai atau suara. Tombol mute tersimpan sebagai preferensi browser. Animasi skor, countdown, dan confetti menghormati `prefers-reduced-motion`.

## Logika gerakan

Modul `src/motion/` terpisah dari React. `HandIdentity` mengubah koordinat ke sisi layar yang dicerminkan, memakai pusat telapak landmark 0/5/9/13/17, dan mencocokkan posisi antarframe. Jarak horizontal dan vertikal memakai unit tinggi video yang sama agar rasio aspek tidak mengubah ukuran telapak. Tangan bersilangan, tumpang-tindih, atau tracking meloncat dianggap ambigu dan memutus kontinuitas.

`CycleCounter` memakai smoothing berbasis waktu, selisih tinggi dibagi rata-rata ukuran telapak saat ini, zona netral, hysteresis, durasi stabil minimum, dan minimum waktu perpindahan. Posisi awal belum menghasilkan poin. A → B → A atau B → A → B menghasilkan satu poin; posisi terakhir menjadi awal siklus berikutnya. Tracking hilang atau jeda frame panjang membatalkan siklus parsial, tanpa menghapus poin sebelumnya. Di luar ronde aktif gerakan tidak dihitung.

`Calibration` meminta tangan sejajar stabil selama 1,2 detik, lalu kiri layar lebih tinggi dan kanan layar lebih tinggi. Ukuran telapak dicatat dan rentang kedua arah menentukan threshold awal. Threshold dikunci untuk satu ronde. Semua parameter ada di `src/motion/config.ts`.

```sh
npm test
```

Test sintetis memverifikasi diam, jitter, kedua arah siklus penuh, rangkaian siklus, tracking hilang, urutan array berubah, spike singkat, neutral, dan gerakan di luar ronde. Ini belum membuktikan akurasi webcam nyata.
