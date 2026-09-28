import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(
  new URL("../../server/package.json", import.meta.url)
);
const sharp = require("sharp");

const WIDTH = 720;
const HEIGHT = 1280;

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
  const rgb = await sharp(
    new URL("./assets/nero-label-camera.jpg", import.meta.url).pathname
  )
    .rotate()
    .resize({ fit: "cover", height: HEIGHT, position: "centre", width: WIDTH })
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
