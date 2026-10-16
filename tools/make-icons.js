#!/usr/bin/env node
/*
 * PDF Pumasis's icons, from one pixel drawing: a hydrofoil up on her foils
 * at dusk, spray at her struts, a puma's ears on her radar dome.
 *
 *   node tools/make-icons.js
 *
 * Writes icon.svg (crisp rects), favicon-16x16.png, favicon-32x32.png,
 * apple-touch-icon.png (180, also the GitLab project's avatar) and
 * favicon.ico (16, 32, 48, each a PNG inside). No dependencies: the drawing
 * is made here, cell by cell, and the PNG and ICO writers are below (Raid on
 * Puma Bay's). The share card is tools/og.html, rendered in a browser.
 */
"use strict";
const fs = require("fs"), path = require("path"), zlib = require("zlib");
const ROOT = path.join(__dirname, "..");

/* ---- the drawing, 40 x 40 ---- */
const N = 40, R = 4;   /* the plate's corner radius, in cells */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x, y) => BAYER[(y & 3) * 4 + (x & 3)] / 16;
const hash = (x, y, s) => { let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 974634721)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const band = (stops, t, x, y) => { const f = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1), i = Math.floor(f); return bayer(x, y) < f - i ? stops[i + 1] : stops[i]; };
const SKY = ["#121c38", "#2a2a56", "#5a3a66", "#a8566a", "#ec9460"], SEA = ["#5a4a64", "#33405a", "#1d2c46", "#111c30"];
const HZ = 26;
const ART = [];
for (let y = 0; y < N; y++) {
  const row = [];
  for (let x = 0; x < N; x++) {
    let c = y < HZ ? band(SKY, y / (HZ - 1), x, y) : band(SEA, (y - HZ) / (N - HZ - 1), x, y);
    if (y >= HZ && hash(x >> 1, y, 7) > 0.86) c = "#4a5878";
    row.push(c);
  }
  ART.push(row);
}
const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) ART[y][x] = c; };
const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) put(x + i, y + j, c); };
/* the struts down to the foils, and the spray where they cut the water */
for (const sx of [9, 29]) { rect(sx, 21, 2, HZ - 21 + 1, "#2a313c"); put(sx + 1, 22, "#5c6674"); }
for (let i = -4; i <= 4; i++) for (const sx of [9, 29]) if (hash(i, sx, 9) > 0.3) put(sx + i, HZ - (Math.abs(i) < 2 ? 1 : 0), Math.abs(i) < 3 ? "#f2f6f8" : "#b8c8d6");
for (let i = 1; i < 9; i++) { put(9 - 3 - i, HZ + 1 + (i >> 2), i % 2 ? "#8ea4ba" : "#5c6e88"); }
/* the hull, clear of the water: pale PDF grey, the tawny stripe, a dark keel line */
rect(4, 17, 30, 4, "#b9c4cf"); rect(4, 17, 30, 1, "#e2e8ee"); rect(4, 19, 30, 1, "#f0ad5c"); rect(5, 21, 28, 1, "#3c4552");
rect(34, 18, 2, 2, "#b9c4cf"); put(36, 18, "#8d9aa8"); put(3, 18, "#8d9aa8");
/* the deckhouse, its windows catching the sun */
rect(14, 13, 11, 4, "#b9c4cf"); rect(14, 13, 11, 1, "#e2e8ee"); rect(16, 14, 2, 1, "#ffd89a"); rect(19, 14, 2, 1, "#ffd89a"); rect(22, 14, 2, 1, "#ffd89a");
/* the 76mm forward, its barrel over the bow */
rect(28, 15, 3, 2, "#8d9aa8"); put(29, 14, "#b9c4cf"); rect(31, 15, 5, 1, "#2a313c");
/* the mast and its dome, with a puma's ears */
rect(19, 7, 1, 6, "#3c4552"); rect(17, 5, 5, 3, "#e2e8ee"); rect(17, 7, 5, 1, "#b9c4cf");
const ear = (x, dir) => { rect(x, 3, 2, 2, "#c98b49"); put(x + (dir > 0 ? 1 : 0), 2, "#c98b49"); put(x + (dir > 0 ? 1 : 0), 1, "#2a1a0e"); put(x + (dir > 0 ? 0 : 1), 4, "#ebb877"); };
ear(17, 1); ear(20, -1);
/* the missile canisters aft */
rect(6, 15, 6, 2, "#8d9aa8"); rect(6, 15, 6, 1, "#b9c4cf");

/* ---- icon.svg: one rect per run of a colour along a row ---- */
const rects = [];
ART.forEach((row, y) => {
  for (let x = 0; x < N;) {
    let e = x + 1;
    while (e < N && row[e] === row[x]) e++;
    rects.push(`<rect x="${x}" y="${y}" width="${e - x}" height="1" fill="${row[x]}"/>`);
    x = e;
  }
});
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges" role="img" aria-label="PDF Pumasis">
<title>PDF Pumasis</title>
<!-- A hydrofoil up on her foils at dusk, a puma's ears on her radar. Written by tools/make-icons.js; edit the drawing there, not this file. -->
<clipPath id="p"><rect width="${N}" height="${N}" rx="${R}"/></clipPath>
<g clip-path="url(#p)">
${rects.join("\n")}
</g>
</svg>
`;
fs.writeFileSync(path.join(ROOT, "icon.svg"), svg);
const PAL = new Proxy({}, { get: (_, k) => k });
/* ---- rasters. Small ones average 4x4 samples of the drawing per pixel, so
 * 16 and 32 keep the ears as colour rather than losing them; big ones take the nearest cell, so the pixels stay pixels. ---- */
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const cellAt = (gx, gy) => {
  const cx = Math.min(Math.max(gx, R), N - R), cy = Math.min(Math.max(gy, R), N - R);
  if (Math.hypot(gx - cx, gy - cy) > R) return null;
  return hex(PAL[ART[Math.min(N - 1, Math.floor(gy))][Math.min(N - 1, Math.floor(gx))]]);
};
function raster(size) {
  const px = Buffer.alloc(size * size * 4), S = size >= 2 * N ? 1 : 4;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < S; sy++) for (let sx = 0; sx < S; sx++) {
      const c = cellAt((x + (sx + 0.5) / S) / size * N, (y + (sy + 0.5) / S) / size * N);
      if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
    }
    const i = (y * size + x) * 4;
    if (a) { px[i] = r / a; px[i + 1] = g / a; px[i + 2] = b / a; px[i + 3] = 255 * a / (S * S); }
  }
  return png(size, size, px);
}

/* ---- a minimal PNG writer: RGBA, no filtering ---- */
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = buf => { let c = -1; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]), crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};
function png(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
/* ---- ICO: a directory of PNGs ---- */
function ico(images) {
  const head = Buffer.alloc(6); head.writeUInt16LE(1, 2); head.writeUInt16LE(images.length, 4);
  let off = 6 + 16 * images.length;
  const dir = images.map(([size, data]) => {
    const e = Buffer.alloc(16);
    e[0] = size % 256; e[1] = size % 256; e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(off, 12); off += data.length;
    return e;
  });
  return Buffer.concat([head, ...dir, ...images.map(([, d]) => d)]);
}

fs.writeFileSync(path.join(ROOT, "favicon-16x16.png"), raster(16));
fs.writeFileSync(path.join(ROOT, "favicon-32x32.png"), raster(32));
fs.writeFileSync(path.join(ROOT, "apple-touch-icon.png"), raster(180));
fs.writeFileSync(path.join(ROOT, "favicon.ico"), ico([[16, raster(16)], [32, raster(32)], [48, raster(48)]]));
console.log("wrote icon.svg, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, favicon.ico");
