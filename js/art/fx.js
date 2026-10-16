/* PDF Pumasis -- what happens for a moment: a shell's splash, a hit's
 * flash, a missile striking home, a ship burning, our own gun's smoke.
 *
 * These live in the world (miles, and metres above the water), not on the
 * screen: the view projects each one where it is, so looking away and back
 * finds the smoke still standing. Not part of the game: Math.random is fine
 * here. */
"use strict";
(() => {
  const K = PD.K, FX = PD.FX = { items: [] };
  const rnd = (a, b) => a + Math.random() * (b - a);
  FX.clear = () => { FX.items = []; };
  FX.add = p => { if (FX.items.length > 300) FX.items.shift(); p.t = 0; FX.items.push(p); return p; };
  FX.splash = (x, y) => FX.add({ k: "column", x, y, h: 14, w: 3, life: 1.6 });
  FX.shellHit = (x, y) => { FX.add({ k: "flash", x, y, h: 4, r: 6, life: 0.25 }); FX.add({ k: "smoke", x, y, z: 4, r: 3, grow: 2, vz: 2, life: 5, dark: 0.7 }); };
  FX.boom = (x, y, big = 1) => {
    FX.add({ k: "flash", x, y, h: 6, r: 22 * big, life: 0.4 });
    FX.add({ k: "column", x, y, h: 40 * big, w: 12 * big, life: 2.4 });
    for (let i = 0; i < 5 * big; i++) FX.add({ k: "smoke", x: x + rnd(-0.01, 0.01), y: y + rnd(-0.01, 0.01), z: rnd(4, 18), r: rnd(5, 10), grow: rnd(3, 6), vz: rnd(3, 6), life: rnd(10, 20), dark: 0.85 });
  };
  FX.burn = (x, y) => FX.add({ k: "smoke", x, y, z: 6, r: 5, grow: 4, vz: 5, life: 12, dark: 0.9 });
  FX.step = dt => {
    for (const p of FX.items) { p.t += dt; if (p.k === "smoke") { p.z += p.vz * dt; p.r += p.grow * dt; p.x += 0.00002; } }
    FX.items = FX.items.filter(p => p.t < p.life);
  };
  /* drawn into the view: o its eye, f its focal length, toX a bearing to a column */
  FX.draw = (g, o, f, cx, hz, toX, light) => {
    for (const p of FX.items) {
      const d = PD.dist(o.x, o.y, p.x, p.y), b = PD.angTo(o.x, o.y, p.x, p.y);
      if (Math.abs(PD.angDiff(o.brg, b)) > o.fov / 2 + 0.1) continue;
      const dm = Math.max(40, d * 1852), k = f / dm, x = toX(b), wl = hz + f * Math.max(0, o.eyeH / dm - o.eyeH / Math.sqrt(2 * 6371000 * o.eyeH));
      const a = 1 - p.t / p.life;
      if (p.k === "column") {
        const h = Math.max(2, p.h * k * Math.sin(Math.min(1, p.t / p.life * 2.2) * Math.PI * 0.5 + (p.t / p.life > 0.45 ? 0 : 0)) * (p.t / p.life > 0.5 ? a * 2 : 1)), w = Math.max(1, p.w * k);
        K.rect(g, x - w / 2, wl - h, w, h, K.dim("#e4eef2", light, 0.3));
        if (w > 2) K.rect(g, x - w / 2, wl - h, 1, h, K.dim("#ffffff", light, 0.3));
      } else if (p.k === "flash") {
        const r = Math.max(2, p.r * k * a);
        K.disc(g, x, wl - p.h * k, r, r * 0.8, "#ffd27a"); K.disc(g, x, wl - p.h * k, r * 0.5, r * 0.4, "#fff6d8");
      } else if (p.k === "smoke") {
        const r = Math.max(1, p.r * k), y = wl - p.z * k;
        g.globalAlpha = Math.min(1, a * 1.4) * 0.85;
        K.disc(g, x, y, r, r * 0.85, K.dim(p.dark > 0.8 ? "#2c2c30" : "#5a5c62", light, 0.1));
        g.globalAlpha = 1;
      }
    }
  };
})();
