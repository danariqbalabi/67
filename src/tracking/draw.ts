import type { HandDetection } from './types';

const connections = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15],
  [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

export function drawHands(canvas: HTMLCanvasElement, hands: HandDetection[], width: number, height: number) {
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  for (const hand of hands) {
    // Both video and canvas are mirrored by CSS. Draw in original inference coordinates.
    const screenLeft = hand.landmarks[0].x > .5;
    const color = screenLeft ? '#edb7e1' : '#a6d4ff';
    ctx.lineCap = 'round';
    for (const [from, to] of connections) {
      const a = hand.landmarks[from], b = hand.landmarks[to];
      ctx.beginPath(); ctx.moveTo(a.x * width, a.y * height); ctx.lineTo(b.x * width, b.y * height);
      ctx.lineWidth = 7; ctx.strokeStyle = '#302b46bb'; ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.stroke();
    }
    for (const point of hand.landmarks) {
      ctx.beginPath(); ctx.arc(point.x * width, point.y * height, 4, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#302b46'; ctx.stroke();
    }
  }
}
