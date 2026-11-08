import { expect, test, type Page } from '@playwright/test';

// Browser-only test fixture. Production has no synthetic tracking or score injection.
const fakeVision = `
export const FilesetResolver = { forVisionTasks: async () => ({}) };
export const HandLandmarker = { createFromOptions: async () => {
  window.__modelLoads = (window.__modelLoads || 0) + 1;
  return { close() {}, detectForVideo(_video, timestamp) {
    if (window.__noHands) return { landmarks: [], handedness: [] };
    const period = window.__wavePeriod || 600;
    const delta = window.__waveStart == null ? window.__delta || 0 : timestamp < window.__waveStart + period * 5.5 ? (window.__waveAmplitude || 1.1) * Math.cos(2 * Math.PI * (timestamp - window.__waveStart) / period) : 0;
    const hand = (x, y) => Array.from({ length: 21 }, (_, i) => ({ x, y: y + (i === 0 ? .08 : 0), z: 0 }));
    return { landmarks: [hand(.8, .5 - delta * .04), hand(.2, .5 + delta * .04)], handedness: [[{categoryName:'Right',score:.99}], [{categoryName:'Left',score:.99}]] };
  }};
}};`;

async function fixture(page: Page) {
  await page.clock.install();
  await page.route(
    '**/node_modules/.vite/deps/@mediapipe_tasks-vision.js*',
    (route) =>
      route.fulfill({
        contentType: 'application/javascript',
        body: fakeVision,
      }),
  );
}
async function delta(page: Page, value: number) {
  await page.evaluate((value) => {
    (window as unknown as { __delta: number }).__delta = value;
  }, value);
}
async function calibrate(page: Page) {
  await delta(page, 0);
  await expect(
    page
      .getByRole('complementary')
      .getByText('Sekarang, tangan kiri layar lebih tinggi.'),
  ).toBeVisible({ timeout: 7000 });
  await delta(page, 2);
  await expect(
    page
      .getByRole('complementary')
      .getByText('Gantian, tangan kanan layar lebih tinggi.'),
  ).toBeVisible();
  await delta(page, -2);
  await expect(
    page
      .getByRole('complementary')
      .getByText(
        'Kalibrasi beres. Klik Mulai, lalu balikin tangan lu ke kamera.',
      ),
  ).toBeVisible();
}
async function start(page: Page) {
  await page.getByRole('button', { name: 'Mulai nge-67' }).click();
  await expect(page.locator('.countdown-overlay')).toBeVisible();
  await page.clock.fastForward(3100);
  await expect(
    page.getByRole('heading', { name: 'Gas, jangan kasih kendor.' }),
  ).toBeVisible();
}
async function oneCycle(page: Page) {
  for (const value of [2, -2, 2]) {
    await delta(page, value);
    await page.waitForTimeout(500);
  }
  await expect(page.locator('.live-score')).toHaveText('1siklus valid');
}
async function finish(page: Page) {
  await page.clock.fastForward(30_100);
  await expect(page.getByRole('dialog', { name: 'Hasil ronde' })).toBeVisible();
}

test('synthetic landmarks exercise calibration, full-cycle scoring, solo record and replay', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await calibrate(page);
  await start(page);
  await oneCycle(page);
  await finish(page);
  await expect(page.locator('.result-score')).toHaveText('1siklus valid');
  await expect(page.locator('.record-note')).toContainText('Rekor pribadi: 1');
  expect(
    await page.evaluate(() => localStorage.getItem('67-battle:best:v1')),
  ).toBe('1');
  await page.screenshot({ path: '.local/solo-result.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: '.local/solo-result-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.getByRole('button', { name: 'Main lagi', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Mulai nge-67' }),
  ).toBeEnabled();
  await expect(page.locator('.auto-start-note')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as { __modelLoads: number }).__modelLoads,
    ),
  ).toBe(1);
});

test('duel switches players, recalibrates, compares results and rematches', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Adu Temen', exact: true }).click();
  await page.getByLabel('Nama pemain 1').fill('Dara');
  await page.getByLabel('Nama pemain 2').fill('Bima');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await calibrate(page);
  await start(page);
  await oneCycle(page);
  await finish(page);
  await expect(
    page.getByRole('heading', { name: 'Giliran Bima.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Siap', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Mulai nge-67' }),
  ).toBeEnabled();
  await expect(page.locator('.auto-start-note')).toHaveCount(0);
  await calibrate(page);
  await start(page);
  await finish(page);
  await expect(
    page.getByRole('heading', { name: 'Dara menang!' }),
  ).toBeVisible();
  await expect(page.locator('.duel-scores')).toContainText('Dara1vsBima0');
  expect(
    await page.evaluate(() => localStorage.getItem('67-battle:best:v1')),
  ).toBeNull();
  await page.screenshot({ path: '.local/duel-result.png', fullPage: true });
  await page.getByRole('button', { name: 'Rematch', exact: true }).click();
  await expect(page.locator('.session-mode')).toContainText('Giliran Dara');
  await expect(
    page.getByRole('button', { name: 'Mulai nge-67' }),
  ).toBeEnabled();
  await expect(page.locator('.auto-start-note')).toHaveCount(0);
});

test('tab inactivity cancels a round without storing a record', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await calibrate(page);
  await start(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(
    page.getByRole('heading', { name: 'Ulang dulu, yuk.' }),
  ).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Tab jadi tidak aktif.');
  expect(
    await page.evaluate(() => localStorage.getItem('67-battle:best:v1')),
  ).toBeNull();
});

test('lost hands stop scoring while elapsed time continues', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await calibrate(page);
  await start(page);
  await oneCycle(page);
  await page.evaluate(() => {
    (window as unknown as { __noHands: boolean }).__noHands = true;
  });
  await expect(page.getByText('0/2 tangan', { exact: true })).toBeVisible();
  await page.clock.fastForward(5000);
  await expect(page.locator('.live-score')).toHaveText('1siklus valid');
  expect(
    parseInt(await page.locator('.timer-line strong').innerText(), 10),
  ).toBeLessThanOrEqual(25);
  await page.getByRole('button', { name: 'Hentikan ronde' }).click();
  await expect(
    page.getByRole('heading', { name: 'Ulang dulu, yuk.' }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem('67-battle:best:v1')),
  ).toBeNull();
});

test('equal scores produce a draw', async ({ page }) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Adu Temen', exact: true }).click();
  await page.getByLabel('Nama pemain 1').fill('Dara');
  await page.getByLabel('Nama pemain 2').fill('Bima');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await calibrate(page);
  await start(page);
  await finish(page);
  await page.getByRole('button', { name: 'Siap', exact: true }).click();
  await calibrate(page);
  await start(page);
  await finish(page);
  await expect(
    page.getByRole('heading', { name: 'Seri. Rematch?' }),
  ).toBeVisible();
});

test('a start click works with no hands visible and countdown waits until hands return', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await calibrate(page);
  await page.evaluate(() => {
    (window as unknown as { __noHands: boolean }).__noHands = true;
  });
  await expect(page.getByText('0/2 tangan', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mulai nge-67' }).click();
  await expect(
    page.getByRole('button', { name: 'Batal mulai otomatis' }),
  ).toBeEnabled();
  await page.clock.fastForward(4000);
  await expect(page.locator('.countdown-overlay')).toHaveCount(0);
  await expect(page.locator('.auto-start-note')).toBeVisible();
  await page.screenshot({
    path: '.local/start-without-hands.png',
    fullPage: true,
  });
  await page.evaluate(() => {
    (window as unknown as { __noHands: boolean }).__noHands = false;
  });
  await expect(page.locator('.countdown-overlay')).toBeVisible();
  await page.clock.fastForward(3100);
  await expect(page.locator('.live-score')).toHaveText('0siklus valid');
});

test('start can be armed before calibration and cancelled without starting a round', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await expect(
    page.getByRole('button', { name: 'Mulai nge-67' }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Mulai nge-67' }).click();
  await expect(page.locator('.auto-start-note')).toBeVisible();
  await page.getByRole('button', { name: 'Batal mulai otomatis' }).click();
  await calibrate(page);
  await expect(page.locator('.countdown-overlay')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Mulai nge-67' }),
  ).toBeEnabled();
});

test('smooth alternating hands count without holding the extremes', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await calibrate(page);
  await start(page);
  await delta(page, 2);
  await page.waitForTimeout(250); // Establish a starting pose before the continuous wave.
  await page.evaluate(() => {
    (window as unknown as { __waveStart: number }).__waveStart =
      performance.now();
  });
  await expect(page.locator('.live-score')).toHaveText('5siklus valid', {
    timeout: 6000,
  });
  await page.screenshot({
    path: '.local/smooth-motion-score.png',
    fullPage: true,
  });
});

test('camera expands with controls, score and timer, then restores with Escape', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await calibrate(page);
  expect(
    (await page.locator('.camera-stage').boundingBox())!.width,
  ).toBeGreaterThan(1000);
  await page.getByRole('button', { name: 'Perbesar kamera' }).click();
  const expanded = page.locator('.camera-expanded');
  const box = (await expanded.boundingBox())!;
  expect(box.width).toBeGreaterThan(1300);
  expect(box.height).toBeGreaterThan(850);
  await expanded.getByRole('button', { name: 'Mulai nge-67' }).click();
  await expect(page.locator('.countdown-overlay')).toBeVisible();
  await page.clock.fastForward(3100);
  await expect(expanded.getByLabel('Skor dan waktu')).toContainText('siklus');
  await expect(
    expanded.getByRole('button', { name: 'Hentikan ronde' }),
  ).toBeVisible();
  await expect(expanded.locator('.motion-preview strong')).toHaveText(
    'Kanan lebih tinggi',
  );
  await page.screenshot({ path: '.local/camera-expanded.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    expanded.getByRole('button', { name: 'Kecilkan kamera' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: '.local/camera-expanded-mobile.png',
    fullPage: true,
  });
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.camera-expanded')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Perbesar kamera' }),
  ).toBeFocused();
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    'hidden',
  );
  expect(
    await page.evaluate(
      () => (window as unknown as { __modelLoads: number }).__modelLoads,
    ),
  ).toBe(1);
});

test('fast continuous movement counts five cycles without pauses', async ({
  page,
}) => {
  await fixture(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Aktifkan Kamera' }).click();
  await calibrate(page);
  await start(page);
  await delta(page, 2);
  await page.waitForTimeout(250);
  await page.evaluate(() => {
    Object.assign(window, {
      __waveStart: performance.now(),
      __wavePeriod: 300,
      __waveAmplitude: 1.5,
    });
  });
  await expect(page.locator('.live-score')).toHaveText('5siklus valid', {
    timeout: 5000,
  });
});
