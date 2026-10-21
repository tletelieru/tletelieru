import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const svg = await readFile(new URL('../public/favicon.svg', import.meta.url));
const out = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));

await sharp(svg, { density: 512 }).resize(192, 192).png().toFile(out('pwa-192x192.png'));
await sharp(svg, { density: 512 }).resize(512, 512).png().toFile(out('pwa-512x512.png'));
await sharp(svg, { density: 512 }).resize(180, 180).png().toFile(out('apple-touch-icon.png'));
await sharp(svg, { density: 512 })
  .resize(410, 410)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#3b4fe4' })
  .png()
  .toFile(out('maskable-512x512.png'));
