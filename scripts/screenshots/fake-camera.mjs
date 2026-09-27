import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(
  new URL("../../server/package.json", import.meta.url)
);
const sharp = require("sharp");

const WIDTH = 720;
const HEIGHT = 1280;

function sceneSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a2a22"/>
      <stop offset="1" stop-color="#14100e"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#1c0b13"/>
      <stop offset="0.45" stop-color="#3b1424"/>
      <stop offset="1" stop-color="#160810"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <rect x="0" y="1010" width="${WIDTH}" height="270" fill="#5a4032"/>
  <rect x="0" y="1010" width="${WIDTH}" height="14" fill="#7a5a48"/>
  <path d="M312 60 h96 v200 c0 60 68 110 68 200 v560 a48 48 0 0 1 -48 48 h-136 a48 48 0 0 1 -48 -48 v-560 c0 -90 68 -140 68 -200 z" fill="url(#glass)"/>
  <rect x="312" y="60" width="96" height="82" rx="8" fill="#7A2B54"/>
  <rect x="248" y="640" width="224" height="290" rx="8" fill="#F5EEDC"/>
  <rect x="262" y="654" width="196" height="262" rx="4" fill="none" stroke="#5C1736" stroke-width="3" opacity="0.5"/>
  <text x="360" y="745" text-anchor="middle" font-family="Georgia, serif" font-size="44" font-weight="700" fill="#5C1736">CATENA</text>
  <text x="360" y="795" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="24" letter-spacing="4" fill="#5C1736">MALBEC</text>
  <line x1="290" y1="825" x2="430" y2="825" stroke="#5C1736" stroke-width="2" opacity="0.6"/>
  <text x="360" y="870" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="20" fill="#5C1736" opacity="0.85">MENDOZA · 2021</text>
  <ellipse cx="360" cy="1030" rx="120" ry="16" fill="#000" opacity="0.35"/>
</svg>`;
}

function toI420(rgb, width, height) {
  const ySize = width * height;
  const chromaWidth = width / 2;
  const chromaHeight = height / 2;
  const y = Buffer.alloc(ySize);
  const u = Buffer.alloc(chromaWidth * chromaHeight);
  const v = Buffer.alloc(chromaWidth * chromaHeight);
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = (row * width + col) * 3;
      const r = rgb[index];
      const g = rgb[index + 1];
      const b = rgb[index + 2];
      y[row * width + col] = Math.round(
        16 + (65.738 * r + 129.057 * g + 25.064 * b) / 256
      );
      if (row % 2 === 0 && col % 2 === 0) {
        const chromaIndex = (row / 2) * chromaWidth + col / 2;
        u[chromaIndex] = Math.round(
          128 + (-37.945 * r - 74.494 * g + 112.439 * b) / 256
        );
        v[chromaIndex] = Math.round(
          128 + (112.439 * r - 94.154 * g - 18.285 * b) / 256
        );
      }
    }
  }
  return Buffer.concat([y, u, v]);
}

export async function writeFakeCameraFeed(file) {
  const rgb = await sharp(Buffer.from(sceneSvg()))
    .flop()
    .removeAlpha()
    .raw()
    .toBuffer();
  const header = Buffer.from(
    `YUV4MPEG2 W${WIDTH} H${HEIGHT} F30:1 Ip A1:1 C420jpeg\n`
  );
  const frame = toI420(rgb, WIDTH, HEIGHT);
  const frames = [];
  for (let index = 0; index < 30; index += 1) {
    frames.push(Buffer.from("FRAME\n"), frame);
  }
  await writeFile(file, Buffer.concat([header, ...frames]));
  return file;
}
