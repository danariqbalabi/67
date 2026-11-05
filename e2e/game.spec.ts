import { expect, test, type Page } from '@playwright/test';

// Browser-only test fixture. Production has no synthetic tracking or score injection.
const fakeVision = `
export const FilesetResolver = { forVisionTasks: async () => ({}) };
export const HandLandmarker = { createFromOptions: async () => {
  window.__modelLoads = (window.__modelLoads || 0) + 1;
  return { close() {}, detectForVideo() {
    if (window.__noHands) return { landmarks: [], handedness: [] };
    const delta = window.__delta || 0;
    const hand = (x, y) => Array.from({ length: 21 }, (_, i) => ({ x, y: y + (i === 0 ? .08 : 0), z: 0 }));
    return { landmarks: [hand(.8, .5 - delta * .04), hand(.2, .5 + delta * .04)], handedness: [[{categoryName:'Right',score:.99}], [{categoryName:'Left',score:.99}]] };
  }};
}};`;

async function fixture(page: Page) {
  await page.clock.install();
  await page.route('**/node_modules/.vite/deps/@mediapipe_tasks-vision.js*', route => route.fulfill({ contentType: 'application/javascript', body: fakeVision }));
}
async function delta(page: Page, value: number) { await page.evaluate(value => { (window as unknown as { __delta: number }).__delta = value; }, value); }
async function calibrate(page: Page) {
  await delta(page, 0);
  await expect(page.getByRole('complementary').getByText('Sekarang, tangan kiri layar lebih tinggi.')).toBeVisible({ timeout: 7000 });
  await delta(page, 2);
  await expect(page.getByRole('complementary').getByText('Gantian, tangan kanan layar lebih tinggi.')).toBeVisible();
  await delta(page, -2);
  await expect(page.getByRole('button', { name: 'Mulai nge-67' })).toBeEnabled();
}
async function start(page: Page) {
  await page.getByRole('button', { name: 'Mulai nge-67' }).click();
  await expect(page.locator('.countdown-overlay')).toBeVisible();
  await page.clock.fastForward(3100);
  await expect(page.getByRole('heading', { name: 'Gas, jangan kasih kendor.' })).toBeVisible();
}
async function oneCycle(page: Page) {
  for (const value of [2, -2, 2]) { await delta(page, value); await page.waitForTimeout(500); }
  await expect(page.locator('.live-score')).toHaveText('1siklus valid');
}
async function finish(page: Page) {
  await page.clock.fastForward(30_100);
  await expect(page.getByRole('dialog', { name: 'Hasil ronde' })).toBeVisible();
}

test('synthetic landmarks exercise calibration, full-cycle scoring, solo record and replay', async ({ page }) => {
  await fixture(page); await page.goto('/');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await calibrate(page); await start(page); await oneCycle(page);
  await finish(page);
  await expect(page.locator('.result-score')).toHaveText('1siklus valid');
  await expect(page.locator('.record-note')).toContainText('Rekor pribadi: 1');
  expect(await page.evaluate(() => localStorage.getItem('67-battle:best:v1'))).toBe('1');
  await page.screenshot({ path: '.local/solo-result.png', fullPage: true });
  await page.getByRole('button', { name: 'Main lagi', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mulai nge-67' })).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { __modelLoads: number }).__modelLoads)).toBe(1);
});

test('duel switches players, recalibrates, compares results and rematches', async ({ page }) => {
  await fixture(page); await page.goto('/');
  await page.getByRole('button', { name: 'Adu Temen', exact: true }).click();
  await page.getByLabel('Nama pemain 1').fill('Dara');
  await page.getByLabel('Nama pemain 2').fill('Bima');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await calibrate(page); await start(page); await oneCycle(page); await finish(page);
  await expect(page.getByRole('heading', { name: 'Giliran Bima.' })).toBeVisible();
  await page.getByRole('button', { name: 'Siap', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mulai nge-67' })).toBeDisabled();
  await calibrate(page); await start(page); await finish(page);
  await expect(page.getByRole('heading', { name: 'Dara menang!' })).toBeVisible();
  await expect(page.locator('.duel-scores')).toContainText('Dara1vsBima0');
  expect(await page.evaluate(() => localStorage.getItem('67-battle:best:v1'))).toBeNull();
  await page.screenshot({ path: '.local/duel-result.png', fullPage: true });
  await page.getByRole('button', { name: 'Rematch', exact: true }).click();
  await expect(page.locator('.session-mode')).toContainText('Giliran Dara');
  await expect(page.getByRole('button', { name: 'Mulai nge-67' })).toBeDisabled();
});

test('tab inactivity cancels a round without storing a record', async ({ page }) => {
  await fixture(page); await page.goto('/');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await calibrate(page); await start(page);
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(page.getByRole('heading', { name: 'Ulang dulu, yuk.' })).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Tab jadi tidak aktif.');
  expect(await page.evaluate(() => localStorage.getItem('67-battle:best:v1'))).toBeNull();
});
