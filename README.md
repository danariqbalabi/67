# 67 Battle

Game webcam buat adu gerakan six seven selama 30 detik. React + TypeScript + Vite, MediaPipe Hand Landmarker, canvas overlay, dan localStorage. Target utama desktop/laptop dengan webcam; tanpa backend atau akun.

## Menjalankan

Butuh **Node.js 22.12+** (disarankan Node 24) dan internet untuk instalasi pertama.

```sh
git clone https://github.com/danariqbalabi/67.git
cd 67
git switch feat/67-battle
npm ci
npm run dev
```

Buka **http://localhost:5173**. Kamera membutuhkan localhost atau HTTPS. Akses dari alamat IP HTTP di jaringan lokal biasanya diblokir browser. Chrome/Edge desktop terbaru adalah target awal; browser lain perlu diverifikasi.

`npm ci` menjalankan `postinstall`: menyalin WASM dari SDK yang versinya terkunci dan mengunduh model resmi MediaPipe **float16 v1** (sekitar 7,8 MB). SHA-256 diverifikasi. Model dan WASM dibuat di `public/vision/` (diabaikan Git), dilayani lokal saat bermain, dan disalin ke `dist/` saat build. Jika unduhan gagal atau instalasi memakai `--ignore-scripts`:

```sh
npm run setup:vision
```

Build produksi berupa website statis:

```sh
npm run build
npm run preview
```

Untuk hosting, unggah seluruh isi `dist/`, termasuk `vision/`, lewat HTTPS. Proyek ini tidak memerlukan `.env` atau secret. Tidak ada deployment hosting yang dibuat dalam workflow lokal/GitHub ini.

## Cara bermain

1. Pilih **Solo** atau **Adu Temen**. Adu Temen meminta dua nama, maksimum 24 karakter.
2. Klik **Aktifkan Kamera**. Izin kamera hanya diminta setelah interaksi ini.
3. Begitu model siap, klik **Mulai nge-67**. Tombol tetap bisa diklik meski tangan sedang di mouse atau belum di frame. Ini mengaktifkan permintaan mulai otomatis; **Batal mulai otomatis** membatalkannya.
4. Kalibrasi: tahan tangan sejajar selama 1,2 detik, lalu kiri layar lebih tinggi, lalu kanan layar lebih tinggi. Ikuti instruksi di samping kamera.
5. Kembalikan dua telapak ke frame. Setelah kalibrasi selesai dan dua telapak terbaca selama 600 ms, countdown 3–2–1 berjalan otomatis, dilanjutkan ronde 30 detik. Tidak perlu menekan tombol lagi. Kalau tangan hilang saat menunggu, aplikasi menunggu tangan kembali; waktu ronde belum terpakai.
6. **Keluar** mematikan kamera dan melepas model. **Hentikan ronde** membatalkan hasil. **Main lagi** mengulang kalibrasi.

Satu poin adalah **satu siklus penuh**:

- **A:** tangan kiri layar lebih tinggi.
- **B:** tangan kanan layar lebih tinggi.
- A → B → A atau B → A → B = **+1**.
- Posisi awal belum menambah poin. Posisi akhir menjadi awal siklus berikutnya.
- Gerakan selama persiapan, countdown, atau hasil tidak dihitung.

Tangan hilang dari frame menghentikan penambahan skor dan membuang siklus parsial, tetapi **timer tetap berjalan**. Pindah tab saat countdown atau bermain membatalkan ronde demi fairness. Timer memakai `performance.now()` dan deadline tetap, bukan jumlah callback.

Solo menyimpan rekor pribadi di localStorage hanya untuk ronde yang selesai. Jika penyimpanan browser ditolak, hasil tetap ditampilkan dan rekor berlaku selama sesi. Tidak ada skor simulasi di aplikasi produksi.

Adu Temen berjalan bergantian: pemain pertama → layar pergantian dengan tombol **Siap** → kalibrasi ulang pemain kedua → ronde kedua → skor/pemenang/seri → **Rematch**. Kedua pemain memakai algoritma, batas konfigurasi, kebijakan kalibrasi, dan durasi yang sama. Threshold menyesuaikan hasil kalibrasi masing-masing dan tidak bisa diubah manual selama pertandingan. Skor duel tidak mengubah rekor solo.

Audio singkat baru aktif setelah interaksi tombol mulai/suara. Preferensi mute disimpan lokal. Animasi menghormati `prefers-reduced-motion`.

## Struktur dan algoritma

```text
src/tracking/    kamera, model, canvas, error handling
src/motion/      identitas tangan, kalibrasi, penghitung murni TypeScript
src/game/        clock ronde, integrasi, penyimpanan dan audio
src/components/  layar kamera, hasil dan efek
src/styles.css  design token pastel, Poppins, layout responsif
e2e/            browser test dengan kamera/landmark sintetis
```

`HandIdentity` memakai pusat telapak dari landmark **0/5/9/13/17**, bukan ujung jari. Ukuran telapak memakai nilai terbesar antara jarak pergelangan–pangkal jari tengah dan lebar pangkal telunjuk–kelingking, sehingga telapak miring/menghadap atas tidak langsung dianggap terlalu kecil. Ujung jari boleh sedikit keluar frame selama jangkar telapak masih terlihat dan semua koordinat finite. Koordinat x diubah menjadi sisi layar yang dicerminkan dan dikoreksi rasio aspek agar jarak x/y memakai satuan tinggi video yang sama. Identitas antarframe dicocokkan dari kedekatan posisi, bukan urutan array deteksi. Gerak vertikal diberi bobot lebih kecil dalam pencocokan agar naik-turun tidak menukar identitas dua tangan yang berdekatan. Tangan bersilangan, bertumpuk, atau meloncat jauh tetap dianggap ambigu dan memutus kontinuitas.

`Calibration` mencatat median ukuran telapak pada posisi stabil dan mengukur rentang dua arah. Threshold awal dihitung dari 45% rentang yang lebih kecil, dibatasi 0,45–0,8 satuan telapak. Saat menghitung, selisih tinggi dibagi rata-rata ukuran telapak saat itu supaya jarak kamera tidak menjadi threshold piksel tetap. Smoothing 45 ms dan durasi stabil 60 ms menerima gerakan naik-turun mulus tanpa harus berhenti di setiap puncak; penolakan jitter dan siklus parsial tetap diuji.

`CycleCounter` memakai smoothing eksponensial berbasis waktu, zona netral, hysteresis, durasi stabil minimum, dan minimum waktu perpindahan. State machine memvalidasi satu pola bolak-balik lengkap. Tracking hilang/jeda panjang/timestamp tidak valid membatalkan progres parsial tanpa menghapus poin yang sudah sah.

Parameter ada di **`src/motion/config.ts`**:

| Parameter             |           Default | Pengaruh                                            |
| --------------------- | ----------------: | --------------------------------------------------- |
| `smoothingMs`         |             45 ms | Lebih besar meredam jitter, tetapi menambah latensi |
| `enterThreshold`      |      0,65 telapak | Threshold awal sebelum hasil kalibrasi              |
| `exitRatio`           |              0,58 | Batas keluar A/B relatif terhadap threshold masuk   |
| `stableMs`            |             60 ms | Lama posisi harus bertahan sebelum diterima         |
| `minTransitionMs`     |            180 ms | Menolak pergantian yang terlalu cepat               |
| `maxFrameGapMs`       |            300 ms | Jeda yang memutus siklus parsial                    |
| `maxIdentityJump`     | 0,35 tinggi video | Batas lonjakan identitas antarframe                 |
| `calibrationHoldMs`   |           1200 ms | Waktu tangan sejajar stabil                         |
| `calibrationMinRange` |      0,65 telapak | Rentang minimum untuk tahap gerakan kalibrasi       |
| `startHoldMs`         |            600 ms | Dua telapak terbaca sebelum countdown otomatis      |
| `roundMs`             |          30000 ms | Durasi ronde kedua mode                             |

Threshold confidence detection/presence/tracking MediaPipe diatur **0,6** pada `src/tracking/useCamera.ts`. API hasil menyediakan confidence klasifikasi **Left/Right**, bukan confidence landmark individual; debug memberi label sesuai makna tersebut.

Model dimuat sekali per sesi kamera, dipertahankan lintas ronde dan giliran, lalu ditutup saat keluar. GPU dicoba dahulu dengan fallback CPU. Inference sinkron dibatasi maksimum 24 Hz dan hanya untuk frame video baru, sehingga tidak bertumpuk. Landmark dan canvas memakai ref; UI diperbarui sekitar 10 Hz. Tab tersembunyi melewatkan inference. Loop, listener, media track, audio context, dan model dibersihkan saat keluar.

`index.html` memasang Content Security Policy `connect-src` yang membatasi koneksi ke origin aplikasi (ditambah WebSocket localhost untuk Vite). Ini memblokir permintaan log penggunaan bawaan SDK ke layanan eksternal. Model, WASM, dan font dilayani dari aplikasi sendiri. Jangan menghapus kebijakan ini saat deploy. Perilaku logging SDK dijelaskan oleh [maintainer MediaPipe](https://github.com/google-ai-edge/mediapipe/issues/6306); [privacy notice](https://developers.google.com/edge/mediapipe/solutions/privacy) membedakan input video dari metrik penggunaan.

## Debug dan pemulihan

Di atas kamera ada indikator posisi kiri/kanan/sejajar dan label **Persiapan · skor belum dihitung** atau **Ronde aktif**. Skeleton menunjukkan hasil model, tetapi belum menjamin telapak lolos validasi. Alasan penolakan telapak ditampilkan langsung di instruksi. Skor hanya dihitung saat ronde aktif.

Klik **Debug** untuk membuka panel yang tersembunyi secara default: inference FPS, jumlah tangan, delegate, confidence handedness, selisih tinggi ternormalisasi, state A/B/netral, tahap siklus, threshold, tahap kalibrasi, ukuran telapak, serta alasan penolakan/reset. Saat persiapan, selisih/state menampilkan posisi mentah untuk mengecek gerakan tanpa menambah poin; saat bermain, panel menampilkan sinyal yang sudah di-smoothing dan state penghitung.

Izin ditolak, kamera tidak ditemukan/sedang dipakai/terputus, fitur browser tidak tersedia, model gagal, tracking hilang, dan FPS rendah memiliki pesan atau petunjuk pemulihan. Model gagal tidak diganti skor acak. Untuk izin ditolak, izinkan kamera lewat address bar. Untuk kamera sibuk, tutup aplikasi pemakai webcam. Untuk model gagal, jalankan `npm run setup:vision` dan coba lagi.

## Verifikasi

```sh
npm run typecheck
npm test
npm run build
npm run format:check
npx playwright install chromium
npm run test:e2e
```

Hasil verifikasi pengembangan:

- **30 unit test sintetis:** diam, jitter, A → B parsial, kedua arah siklus lengkap, siklus beruntun, neutral, spike, tracking hilang, jeda panjang, identitas/urutan array, gerakan di luar ronde, kalibrasi, deadline timer, pembatalan, konsistensi FPS, gerakan sinus mulus pada 15/20/24/30 FPS, ujung jari keluar frame, telapak miring, identitas tangan berdekatan, start tanpa tangan di frame, pembatalan permintaan start, dan kesiapan setelah tangan kembali.
- **14 browser test Chromium:** halaman awal tanpa kamera otomatis, layout mobile, izin ditolak dan retry, model asli pada video kamera sintetis, cleanup track, kamera tidak tersedia/sibuk, kegagalan model, solo/rekor/replay, duel/pergantian/kalibrasi/rematch, seri, tracking hilang dengan timer berjalan, pembatalan saat tab tidak aktif, klik Mulai saat 0/2 tangan, permintaan Mulai sebelum kalibrasi, pembatalannya, dan penghitungan gerakan mulus tanpa menahan posisi. Beberapa pemeriksaan digabung dalam satu test.
- Instalasi `npm ci` dan build berhasil dari salinan bersih di `.local/verify-install`, termasuk unduhan dan checksum model.
- Screenshot desktop, mobile, kamera, dan hasil diperiksa secara visual. Aset/screenshot/hasil build tidak di-commit.

Browser test gameplay menyuntikkan landmark sintetis lewat mock module khusus test. Test model asli memakai video buatan browser. **Belum ada pengujian webcam nyata atau validasi akurasi pada pengguna nyata.**

## Batasan dan uji webcam berikutnya

MVP memvalidasi pola dua tangan naik-turun bergantian. Gerakan lain dengan pola serupa mungkin terhitung; ini belum merupakan pengenal gesture six seven yang sempurna. Arah telapak tidak menjadi syarat wajib. Tangan yang saling menutupi, keluar frame, blur, atau pencahayaan buruk bisa memutus tracking. Inference masih di main thread; perangkat lambat perlu diuji sebelum memutuskan migrasi ke worker.

Uji manual berikutnya:

1. Gunakan webcam nyata dengan pencahayaan terang/redup dan beberapa jarak.
2. Pastikan overlay dan label kiri/kanan sesuai preview cermin.
3. Hitung manual 10 siklus pada tempo lambat/sedang/cepat; bandingkan poin palsu dan siklus yang terlewat.
4. Diamkan tangan, gerakkan sedikit, silang/tumpuk tangan, lalu keluarkan satu tangan di tengah siklus. Tidak boleh mendapat poin tambahan dari kejadian itu.
5. Selesaikan solo, duel dua orang berbeda, rematch, mute, dan reload untuk memeriksa rekor.
6. Pindah tab saat countdown/ronde dan pastikan hasil dibatalkan. Tutup sesi kamera dan cek indikator webcam browser padam.

Tuning harus memakai beberapa orang/perangkat, lalu ulangi unit dan browser test. Jangan menganggap lulus data sintetis sebagai bukti akurasi webcam.

## Workflow Git dan referensi

Pekerjaan ada di branch **`feat/67-battle`**, dipush bertahap: fondasi → koreksi lockfile → webcam → kalibrasi/counter → solo → duel/rekor/audio → penyempurnaan/verifikasi. Tidak ada merge ke main atau force push.

- [MediaPipe Hand Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker?tab=Web)
- [Vite](https://vite.dev/guide/)
- [Playwright](https://playwright.dev/docs/test-configuration)
