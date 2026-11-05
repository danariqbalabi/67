import {
  cp,
  mkdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'public/vision');
const modelPath = path.join(target, 'hand_landmarker.task');
const modelUrl =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
const expectedHash =
  'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

await mkdir(target, { recursive: true });
await cp(
  path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm'),
  path.join(target, 'wasm'),
  { recursive: true },
);

let modelExists = false;
try {
  modelExists =
    (await stat(modelPath)).size > 1_000_000 &&
    hash(await readFile(modelPath)) === expectedHash;
} catch {
  /* First install. */
}
if (!modelExists) {
  console.log(
    'Downloading official MediaPipe Hand Landmarker model (float16 v1)…',
  );
  const response = await fetch(modelUrl, {
    signal: AbortSignal.timeout(90_000),
  });
  if (!response.ok)
    throw new Error(`Model download failed: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 1_000_000)
    throw new Error(
      'Model download is incomplete. Run npm run setup:vision again.',
    );
  if (hash(bytes) !== expectedHash)
    throw new Error('Model checksum mismatch. Download rejected.');
  const temporaryPath = `${modelPath}.partial`;
  try {
    await writeFile(temporaryPath, bytes);
    await rename(temporaryPath, modelPath);
  } finally {
    await rm(temporaryPath, { force: true });
  }
}
const model = await readFile(modelPath);
console.log(
  `Vision assets ready locally: ${model.length} bytes, sha256 ${createHash('sha256').update(model).digest('hex')}`,
);
