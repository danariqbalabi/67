export function cameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError')
    return 'Izin kamera belum dikasih. Izinkan lewat ikon kamera di address bar, lalu coba lagi.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
    return 'Kamera belum ketemu. Sambungkan webcam, lalu coba lagi.';
  if (name === 'NotReadableError' || name === 'TrackStartError')
    return 'Kamera belum bisa dibuka. Tutup aplikasi lain yang memakai kamera, lalu coba lagi.';
  if (name === 'SecurityError')
    return 'Browser memblokir kamera. Buka lewat localhost atau HTTPS.';
  if (name === 'OverconstrainedError')
    return 'Pengaturan kamera tidak didukung. Coba webcam lain.';
  return 'Kamera gagal dibuka. Cek sambungan dan izin kamera, lalu coba lagi.';
}
