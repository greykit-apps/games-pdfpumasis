/* PDF Pumasis -- what happens for a moment: a shell's splash, a hit's
 * flash and smoke, a missile striking home, a ship blowing up and burning,
 * her wreckage floating and going down after her.
 *
 * These live in the world (miles, and metres above the water), not on the
 * screen: the bridge and the glasses each project them where they are, so
 * looking away and back finds the smoke still standing. A damaged ship
 * trails smoke while she is hurt; a sinking one burns until she is under.
 * Wreckage keeps the game's clock, as the hull it came off does; the rest
 * keeps the wall clock. Not part of the game: Math.random is fine here. */
"use strict";
(() => {
  const K = PD.K, C = PD.C, NM = 1852, FX = PD.FX = { items: [], gt: 0 };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const acc = new Map();
  /* the wind the smoke drifts on, miles a second */
  const WIND = [0.0011, -0.0004];
  FX.clear = () => { FX.items = []; acc.clear(); };
  FX.add = p => { if (FX.items.length > 900) FX.items.shift(); p.t = -(p.delay || 0); FX.items.push(p); return p; };
  const lenOf = u => (C.SHIPS[u.cls] || { len: 40 }).len;
  /* a point along a ship's hull, f from -0.5 (stern) to 0.5 (bow) */
  const along = (u, f) => { const l = lenOf(u) / NM * f; return [u.x + PD.hx(u.hdg) * l, u.y + PD.hy(u.hdg) * l]; };

  FX.splash = (x, y) => FX.add({ k: "column", x, y, h: 14, w: 3, life: 1.6 });
  const sparks = (x, y, n, z, sp, hot) => { for (let i = 0; i < n; i++) { const a = rnd(0, PD.TAU), v = rnd(0.3, 1) * sp / NM; FX.add({ k: "spark", x, y, z, vx: Math.sin(a) * v, vy: Math.cos(a) * v, vz: rnd(6, 16) * sp / 8, life: 4, hot }); } };
  const puff = (x, y, z, r, o = {}) => FX.add(Object.assign({ k: "smoke", x, y, z, r, grow: 2, vz: 2.5, life: 6, dark: 0.6 }, o));
  /* a shell strikes: a flash, a few bits, a puff of grey */
  FX.shellHit = (x, y) => {
    FX.add({ k: "flash", x, y, h: 3, r: 4, life: 0.22 });
    sparks(x, y, 5, 3, 6, true);
    puff(x, y, 3, 1.6, { grow: 0.9, life: 3.5, dark: 0.65 });
    puff(x, y, 4, 1.2, { grow: 0.7, life: 3, dark: 0.5, delay: 0.15 });
  };
  /* a missile strikes, or a ship's magazine goes: a fireball, bits flung, a column, black smoke */
  FX.boom = (x, y, big = 1) => {
    FX.add({ k: "flash", x, y, h: 6, r: 18 * big, life: 0.35 });
    FX.add({ k: "fire", x, y, z: 6 * big, r: 6 * big, grow: 4 * big, vz: 4, life: 1.1 });
    FX.add({ k: "column", x, y, h: 34 * big, w: 10 * big, life: 2.4 });
    sparks(x, y, Math.round(10 * big), 6, 11 * big, true);
    for (let i = 0; i < 5 * big; i++) puff(x + rnd(-0.005, 0.005), y + rnd(-0.005, 0.005), rnd(4, 12) * big, rnd(2.5, 4.5) * big, { grow: rnd(0.8, 1.6), vz: rnd(3, 6), life: rnd(7, 11), dark: 0.9, delay: rnd(0.1, 0.6) });
  };
  /* a missile's hit on a ship that stays afloat */
  FX.mslHit = u => { const [x, y] = along(u, rnd(-0.2, 0.2)); FX.boom(x, y, Math.max(0.8, lenOf(u) / 50)); };
  /* the end of her: two blasts down her length, then the wreckage, which goes down by the game's clock */
  FX.sunk = (u, gt) => {
    const sc = PD.clamp(lenOf(u) / 40, 0.7, 2.4);
    { const [x, y] = along(u, rnd(-0.1, 0.1)); FX.boom(x, y, 1.3 * sc); }
    { const [x, y] = along(u, rnd(0.15, 0.35) * (Math.random() < 0.5 ? -1 : 1)); FX.add({ k: "flash", x, y, h: 8, r: 14 * sc, life: 0.3, delay: 0.7 }); FX.add({ k: "fire", x, y, z: 8 * sc, r: 5 * sc, grow: 4 * sc, vz: 5, life: 1.2, delay: 0.7 }); }
    const n = Math.round(6 + sc * 6);
    for (let i = 0; i < n; i++) {
      const [x, y] = along(u, rnd(-0.6, 0.6)), a = rnd(0, PD.TAU), d = rnd(0, lenOf(u) * 0.4) / NM;
      FX.add({ k: "wreck", x: x + Math.sin(a) * d, y: y + Math.cos(a) * d, w: rnd(1.5, 5) * sc, h: rnd(0.4, 1.4), at: gt, life: rnd(40, 85), life0: 1e9, seed: Math.random() * 1000 });
    }
    FX.add({ k: "slick", x: u.x, y: u.y, r: lenOf(u) * 0.5, grow: 0.25, at: gt, life: 90, life0: 1e9 });
  };
  FX.burn = (x, y) => puff(x, y, 6, 5, { grow: 4, vz: 5, life: 12, dark: 0.9 });

  /* the damaged smoke, and the sinking burn, every frame: S the world, dt wall seconds, near a point to keep it to */
  FX.emit = (S, dt, near) => {
    FX.gt = S.t;
    for (const u of S.u) {
      if (u.gone || u.cls === "helo" || !C.SHIPS[u.cls]) continue;
      if (near && PD.dist(near.x, near.y, u.x, u.y) > 16) continue;
      const sc = PD.clamp(lenOf(u) / 40, 0.7, 2.4);
      let rate, sink = 0, frac;
      if (u.alive) { frac = 1 - u.hp / C.SHIPS[u.cls].hp; if (frac <= 0.04) continue; rate = 0.8 + frac * 4; }
      else if (u.sinkT !== undefined) { const age = S.t - u.sinkT; if (age > 70) continue; sink = age / 80; frac = 1; rate = 5 * (1 - sink) * sc; }
      else continue;
      let a = (acc.get(u.id) || 0) + dt * rate;
      while (a >= 1) {
        a--;
        const [x, y] = along(u, rnd(-0.35, 0.35)), z = (u.alive ? rnd(3, 6) : rnd(1, 5) * (1 - sink)) * sc;
        /* a plume: thin where it leaves her, spreading as it rises */
        puff(x, y, z, (0.8 + frac * 1.2) * sc, { grow: (0.4 + frac * 0.9) * sc, vz: 3 + frac * 3, life: 4 + frac * 4, dark: 0.55 + frac * 0.4 });
        if ((frac > 0.45 || !u.alive) && Math.random() < (u.alive ? 0.35 : 0.8)) FX.add({ k: "fire", x, y, z: z * 0.6, r: rnd(1, 2.4) * sc, grow: rnd(0.5, 2) * sc, vz: 1.5, life: rnd(0.4, 0.9) });
      }
      acc.set(u.id, a);
    }
  };

  FX.step = dt => {
    for (const p of FX.items) {
      p.t += dt;
      if (p.t < 0) continue;
      if (p.k === "smoke") { p.z += p.vz * dt; p.r += p.grow * dt; p.vz *= Math.pow(0.85, dt); p.x += WIND[0] * dt * Math.min(1, p.z / 20); p.y += WIND[1] * dt * Math.min(1, p.z / 20); }
      else if (p.k === "fire") { p.z += p.vz * dt; p.r += p.grow * dt; }
      else if (p.k === "spark") { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 9.8 * dt; if (p.z < 0) p.t = p.life; }
    }
    /* wreckage and slicks go by the game's clock, the rest by the wall's */
    FX.items = FX.items.filter(p => p.at !== undefined ? FX.gt - p.at < p.life && FX.gt >= p.at - 1 : p.t < p.life);
  };

  /* ---- drawing: proj(x, y, z) gives { x, y, wl, k } on the screen (k pixels a metre), or null ---- */
  const FIRE = ["#fff6d8", "#ffd27a", "#ff9a3a", "#d4521e", "#5a2a1e"];
  function draw(g, proj, light, now, small) {
    /* the oil first, flat on the water; then the rest */
    for (const p of FX.items) if (p.k === "slick") one(g, p, proj, light, now, small);
    for (const p of FX.items) if (p.k !== "slick" && p.t >= 0) one(g, p, proj, light, now, small);
    g.globalAlpha = 1;
  }
  function one(g, p, proj, light, now, small) {
    const P = proj(p.x, p.y, p.k === "smoke" || p.k === "fire" || p.k === "spark" ? p.z : p.k === "flash" ? p.h : 0);
    if (!P) return;
    const k = P.k, f = PD.clamp(p.t / p.life, 0, 1), a = 1 - f;
    /* far off, the bridge keeps everything a few pixels big, so a hit can be seen at all */
    const min = small ? 1 : 0;
    switch (p.k) {
      case "column": {
        const rise = Math.sin(Math.min(1, f * 2.2) * Math.PI * 0.5), h = Math.max(2 + min, p.h * k * rise * (f > 0.5 ? a * 2 : 1)), w = Math.max(1, p.w * k);
        K.rect(g, P.x - w / 2, P.wl - h, w, h, K.dim("#e4eef2", light, 0.3));
        if (w > 2) K.rect(g, P.x - w / 2, P.wl - h, 1, h, K.dim("#ffffff", light, 0.3));
        break;
      }
      case "flash": {
        const r = Math.max(1.5 + min * 1.5, p.r * k * a);
        K.disc(g, P.x, P.y, r, r * 0.8, "#ffd27a"); K.disc(g, P.x, P.y, r * 0.5, r * 0.4, "#fff6d8");
        break;
      }
      case "fire": {
        const r = Math.max(1 + min, p.r * k);
        g.globalAlpha = f < 0.6 ? 1 : (1 - f) / 0.4;
        K.disc(g, P.x, P.y, r, r * 0.9, K.ramp(FIRE, f * 0.9 + 0.1));
        if (r > 2 && f < 0.6) K.disc(g, P.x, P.y + r * 0.2, r * 0.55, r * 0.5, K.ramp(FIRE, f));
        g.globalAlpha = 1;
        break;
      }
      case "smoke": {
        const r = Math.max(1 + min * 0.5, p.r * k);
        g.globalAlpha = Math.min(1, a * 1.4) * (small ? 0.85 : 0.7);
        K.disc(g, P.x, P.y, r, r * 0.85, K.dim(K.mix("#8a8c92", "#1e1e22", p.dark), light, 0.1));
        if (r > 3) { g.globalAlpha *= 0.6; K.disc(g, P.x - r * 0.25, P.y - r * 0.3, r * 0.5, r * 0.4, K.dim(K.mix("#a8aab0", "#3a3a40", p.dark), light, 0.1)); }
        g.globalAlpha = 1;
        break;
      }
      case "spark": {
        const s = k > 1.5 ? 2 : 1;
        K.rect(g, P.x, P.y, s, s, p.hot && f < 0.25 ? "#ffd27a" : K.dim("#2a2a2e", light, 0.2));
        break;
      }
      case "wreck": {
        /* floating, bobbing, then lower and lower until she takes the last of it down */
        const age = FX.gt - p.at, sink = PD.clamp(age / p.life, 0, 1), w = Math.max(1, p.w * k), h = p.h * k * (1 - sink * sink);
        if (h < 0.4 && sink > 0.9) break;
        const bob = Math.sin(now / 520 + p.seed) * Math.min(1, k * 0.4);
        K.rect(g, P.x - w / 2, P.wl - Math.max(1, h) + bob, w, Math.max(1, h), K.dim(p.seed % 3 < 1 ? "#4a3a2c" : "#34363c", light, 0.15));
        if (k > 0.8 && sink < 0.8) K.rect(g, P.x - w / 2 - 1, P.wl + bob, w + 2, 1, K.dim("#c8d6de", light, 0.25));
        break;
      }
      case "slick": {
        const age = FX.gt - p.at, f2 = PD.clamp(age / p.life, 0, 1), r = (p.r + p.grow * age) * k;
        if (r < 2) break;
        g.globalAlpha = 0.45 * (1 - f2);
        /* the near half of a flat ellipse: the far half is behind the waterline */
        g.fillStyle = "#0a1218";
        const ry = Math.max(1, Math.round(r * 0.08));
        for (let y = 0; y <= ry; y++) { const w = Math.round(r * Math.sqrt(Math.max(0, 1 - (y * y) / ((ry + 0.5) * (ry + 0.5))))); g.fillRect(Math.round(P.x) - w, Math.round(P.wl) + y, w * 2 + 1, 1); }
        g.globalAlpha = 1;
        break;
      }
    }
  }

  /* the bridge's view: o its eye, f its focal length, toX a bearing to a column, look how far it sees */
  FX.draw = (g, o, f, cx, hz, toX, light, look = 26) => {
    const dip = o.eyeH / Math.sqrt(2 * 6371000 * o.eyeH);
    const proj = (x, y, z) => {
      const d = PD.dist(o.x, o.y, x, y), b = PD.angTo(o.x, o.y, x, y);
      if (d > look || Math.abs(PD.angDiff(o.brg, b)) > o.fov / 2 + 0.1) return null;
      const dm = Math.max(40, d * NM), k = f / dm, wl = hz + f * Math.max(0, o.eyeH / dm - dip);
      return { x: toX(b), y: wl - z * k, wl, k };
    };
    draw(g, proj, light, o.now || 0, true);
  };
  /* the glasses' view: t the ship at their middle, (cx, hz) where she sits, k pixels a metre, rScale pixels a mile toward or away */
  FX.drawGlasses = (g, me, t, cx, hz, k, rScale, light, now) => {
    const los = PD.angTo(me.x, me.y, t.x, t.y), ax = PD.hx(los), ay = PD.hy(los);
    const proj = (x, y, z) => {
      const ex = x - t.x, ey = y - t.y, r = ex * ax + ey * ay, a = ex * -ay + ey * ax;
      if (Math.abs(r) > 0.6 || Math.abs(a) * NM * k > 600) return null;
      const wl = hz - r * rScale;
      return { x: cx + a * NM * k, y: wl - z * k, wl, k };
    };
    draw(g, proj, light, now, false);
  };
})();
