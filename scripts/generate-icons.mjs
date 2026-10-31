import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const BRAND = '#3b4fe4';
const svg = await readFile(new URL('../public/favicon.svg', import.meta.url));
const out = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url));
const solid = (size) =>
  sharp(svg, { density: 512 }).resize(size, size).flatten({ background: BRAND });

await solid(192).png().toFile(out('pwa-192x192.png'));
await solid(512).png().toFile(out('pwa-512x512.png'));
await solid(180).png().toFile(out('apple-touch-icon.png'));

const maskableBase = await solid(410).png().toBuffer();
await sharp(maskableBase)
  .extend({ top: 51, bottom: 51, left: 51, right: 51, background: BRAND })
  .png()
  .toFile(out('maskable-512x512.png'));
