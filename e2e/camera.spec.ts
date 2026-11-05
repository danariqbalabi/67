import { expect, test } from '@playwright/test';

test('homepage waits for an explicit camera action and works on mobile width', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: () => { throw new Error('Camera must not start on homepage'); } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('six seven');
  await expect(page.getByRole('button', { name: 'Aktifkan Kamera' })).toBeVisible();
  await expect(page.locator('video')).toHaveCount(0);
  await page.getByRole('button', { name: 'Adu Temen', exact: true }).click();
  await expect(page.getByText('Satu kamera, dua pemain. Mainnya gantian.')).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Aktifkan Kamera' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: '.local/landing-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.screenshot({ path: '.local/landing-desktop.png', fullPage: true });
});

test('denied camera permission has a useful retry and exit', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async () => { throw new DOMException('Denied for test', 'NotAllowedError'); } });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await expect(page.getByText(/Izin kamera belum dikasih/)).toBeVisible();
  await page.getByRole('button', { name: 'Coba lagi' }).click();
  await expect(page.getByText(/Izin kamera belum dikasih/)).toBeVisible();
  await page.getByRole('button', { name: 'Kembali', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Aktifkan Kamera' })).toBeVisible();
});

test('real model initializes on a synthetic camera and exit stops camera tracks', async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { value: async (constraints: MediaStreamConstraints) => {
      const stream = await original(constraints);
      const target = window as unknown as { testTracks: MediaStreamTrack[] };
      target.testTracks ??= [];
      target.testTracks.push(...stream.getTracks());
      return stream;
    } });
  });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await expect(page.getByText('Kamera aktif', { exact: true })).toBeVisible({ timeout: 35_000 });
  await expect(page.getByText('0/2 tangan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Debug', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tracking debug' })).toBeVisible();
  await page.screenshot({ path: '.local/camera-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Kembali', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { testTracks: MediaStreamTrack[] }).testTracks.every(track => track.readyState === 'ended'))).toBe(true);
  expect(errors).toEqual([]);
});
