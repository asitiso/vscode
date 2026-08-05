// 흰 배경(불투명) 캐릭터 5종을 투명 처리 + 트리밍 + 압축한다.
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';

const DIR = 'public/assets/characters';

const MAPPING = {
  'main-character.png': 'main-character.png',
  'main-character-2.png': 'main-character-2.png',
  'main-character-3.png': 'main-character-3.png',
  'main-character-4.png': 'main-character-4.png',
  '9b16a076-000c-4fd8-b1a5-a1490f9beeef.png': 'main-character-5.png',
};

function isWhite(r, g, b) {
  return r > 245 && g > 245 && b > 245;
}

async function process(srcFile, outFile) {
  const img = sharp(srcFile).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const n = width * height;

  // 가장자리에서 flood fill로 흰 배경 투명화
  const bg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0, qt = 0;
  const tryEnqueue = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const i = y * width + x;
    if (bg[i]) return;
    const p = i * channels;
    if (!isWhite(data[p], data[p + 1], data[p + 2])) return;
    bg[i] = 1;
    queue[qt++] = i;
  };
  for (let x = 0; x < width; x++) { tryEnqueue(x, 0); tryEnqueue(x, height - 1); }
  for (let y = 0; y < height; y++) { tryEnqueue(0, y); tryEnqueue(width - 1, y); }
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % width, y = (i / width) | 0;
    tryEnqueue(x + 1, y); tryEnqueue(x - 1, y); tryEnqueue(x, y + 1); tryEnqueue(x, y - 1);
  }
  for (let i = 0; i < n; i++) if (bg[i]) data[i * channels + 3] = 0;

  // 연결 요소 분석 — 가장 큰 덩어리(캐릭터 본체)만 유지, 그림자 등 잔여물 제거
  const label = new Int32Array(n).fill(-1);
  const components = [];
  const q2 = new Int32Array(n);
  for (let start = 0; start < n; start++) {
    if (label[start] !== -1) continue;
    if (data[start * channels + 3] <= 20) continue;
    const compId = components.length;
    let h1 = 0, t1 = 0;
    label[start] = compId;
    q2[t1++] = start;
    let size = 0, minX = width, minY = height, maxX = 0, maxY = 0;
    while (h1 < t1) {
      const i = q2[h1++];
      const x = i % width, y = (i / width) | 0;
      size++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (const [nx, ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const ni = ny * width + nx;
        if (label[ni] !== -1 || data[ni * channels + 3] <= 20) continue;
        label[ni] = compId;
        q2[t1++] = ni;
      }
    }
    components.push({ size, minX, minY, maxX, maxY });
  }
  let mainIdx = 0;
  for (let i = 1; i < components.length; i++) {
    if (components[i].size > components[mainIdx].size) mainIdx = i;
  }
  const main = components[mainIdx];
  for (let i = 0; i < n; i++) if (label[i] !== mainIdx) data[i * channels + 3] = 0;

  const padX = Math.round((main.maxX - main.minX) * 0.03);
  const padY = Math.round((main.maxY - main.minY) * 0.03);
  const left = Math.max(0, main.minX - padX);
  const top = Math.max(0, main.minY - padY);
  const w = Math.min(width, main.maxX + padX) - left;
  const h = Math.min(height, main.maxY + padY) - top;

  const out = await sharp(data, { raw: { width, height, channels } })
    .extract({ left, top, width: w, height: h })
    .resize({ width: 600, fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();

  writeFileSync(`${DIR}/${outFile}`, out);
  console.log(`${srcFile} -> ${outFile}: ${w}x${h} → resized`);
}

for (const [src, out] of Object.entries(MAPPING)) {
  await process(`${DIR}/${src}`, `${DIR}/${out}.tmp`);
}
