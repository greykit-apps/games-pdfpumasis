/* PDF Pumasis -- the view over the bow, and through the glasses.
 *
 * The sea is drawn as it is: the sky for the hour, the sun or the moon, the
 * coast standing up off the horizon where it lies (Pumacity's hills, the
 * Keys, Lupenmark's dark shore), hazed by the miles. Every ship is placed by
 * its true bearing and range, at the angle off its bow it truly shows, and
 * sinks below the horizon past a dozen miles, masts last. Our own bow and
 * the 76mm stand in front, seen from the mast, the gun trained where it is
 * aimed. The glasses show the target close, the aim's crosshair, the
 * corrector bars round them, and the splashes where the shells fall. */
"use strict";
(() => {
  const K = PD.K, C = PD.C, Co = PD.Coast, A = PD.ShipArt, Mo = PD.Model, W = PD.Weapons, V = PD.View = {};
  const R_EARTH = 6371000, NM = 1852;
  const INK = "#05070a";

  V.lightKey = t => { const l = C.light(t); return l > 0.5 ? "day" : l > 0.16 ? "dusk" : "night"; };
  /* where the sun is: azimuth (east at dawn, south at noon) and how high */
  V.sunPos = t => { const h = (t / 3600) % 24; return { az: PD.normAng((90 + (h - 6.2) / 12.6 * 180) * PD.DEG), alt: C.sun(t) }; };
  /* how many miles you can see a ship */
  V.seeing = t => { const l = C.light(t); return l > 0.5 ? 26 : l > 0.16 ? 12 : 5; };
  const dipM = (d, eyeH) => { const dh = Math.sqrt(2 * R_EARTH * eyeH), x = Math.max(0, d - dh); return x * x / (2 * R_EARTH); };

  /* ---- the whole view: o = { x, y, eyeH, brg, fov, W, top, bot, hz, t, S, own, now, aids } ---- */
  V.draw = (g, o) => {
    const S = o.S, light = C.light(o.t), sun = V.sunPos(o.t), key = V.lightKey(o.t);
    const f = (o.W / 2) / Math.tan(o.fov / 2), cx = o.W / 2, hz = Math.round(o.hz);
    const toX = b => cx + Math.tan(PD.angDiff(o.brg, b)) * f;
    const sky = K.sky(light, sun.alt);
    /* sky, dithered toward the horizon */
    K.vgradC(g, 0, o.top, o.W, hz - o.top, sky, 1);
    /* the sun, or the moon */
    if (Math.abs(PD.angDiff(o.brg, sun.az)) < o.fov / 2 + 0.1 && sun.alt > -0.05) {
      const sx = toX(sun.az), sy = hz - Math.max(-2, sun.alt * f * 0.9);
      K.disc(g, sx, sy, 7, 7, K.mix("#fff0c0", "#ff9a52", PD.clamp(1 - sun.alt * 3, 0, 1)));
    }
    const moonAz = PD.normAng(sun.az + Math.PI);
    if (key === "night" && Math.abs(PD.angDiff(o.brg, moonAz)) < o.fov / 2) { const mx = toX(moonAz); K.disc(g, mx, hz - 60, 5, 5, "#e8e4d4"); K.disc(g, mx + 2, hz - 61, 4, 4, sky[1]); }
    if (key === "night") for (let i = 0; i < 90; i++) { const sb = PD.normAng(K.hash(i, 3, 9) * PD.TAU), y = o.top + K.hash(i, 5, 9) * (hz - o.top) * 0.8; if (Math.abs(PD.angDiff(o.brg, sb)) < o.fov / 2) K.px(g, toX(sb), y, K.hash(i, 7, 9) > 0.7 ? "#cfd8ff" : "#7a86a8"); }
    /* the sea */
    const seaTop = K.mix(sky[4], "#2a4a66", 0.55), seaCols = [K.dim(seaTop, light, 0.05), K.dim("#1f4664", light), K.dim("#123049", light), K.dim("#0b2034", light)];
    K.vgradC(g, 0, hz, o.W, o.bot - hz, seaCols, 3);
    /* the swell: short light dashes that drift */
    const ph = (o.now / 1000) * 0.6;
    for (let y = hz + 2; y < o.bot; y += 1 + Math.floor((y - hz) / 14)) {
      const k = (y - hz) / Math.max(1, o.bot - hz), n = 4 + Math.floor(k * 16);
      for (let i = 0; i < n; i++) {
        const x = ((K.hash(i, y, 2) * o.W + (ph * (20 + k * 80)) * (K.hash(i, y, 4) > 0.5 ? 1 : -1) + o.brg * f) % o.W + o.W) % o.W;
        K.rect(g, x, y, 2 + Math.floor(k * 6), 1, K.dim(k > 0.5 ? "#4f86a8" : "#3c6d8e", light, 0.1));
      }
    }
    /* the coast */
    coast(g, o, f, cx, hz, sky, light, key);
    /* ships, aircraft, missiles, splashes: far to near */
    const items = [];
    const look = V.seeing(o.t);
    for (const u of S.u) {
      if (u.gone || (u.id === o.own)) continue;
      const d = PD.dist(o.x, o.y, u.x, u.y);
      if (d < 0.02 || d > (u.alive ? look : Math.min(look, 15))) continue;
      const b = PD.angTo(o.x, o.y, u.x, u.y), rel = PD.angDiff(o.brg, b);
      if (Math.abs(rel) > o.fov / 2 + 0.15) continue;
      items.push({ u, d, b });
    }
    if (o.ownShip) { const m = o.ownShip, d = PD.dist(o.x, o.y, m.x, m.y), b = PD.angTo(o.x, o.y, m.x, m.y); if (Math.abs(PD.angDiff(o.brg, b)) < o.fov / 2 + 0.2) items.push({ u: m, d, b, own: true }); }
    items.sort((a, b) => b.d - a.d);
    const drawn = [];
    for (const it of items) {
      const u = it.u, dm = Math.max(30, it.d * NM), x = toX(it.b);
      const wl = hz + f * Math.max(0, o.eyeH / dm - o.eyeH / Math.sqrt(2 * R_EARTH * o.eyeH));
      if (u.cls === "helo") {
        const px = Math.max(3, 14 / dm * f), yy = wl - 120 / dm * f;
        const s = A.get("helo", PD.angDiff(u.hdg, PD.angTo(u.x, u.y, o.x, o.y)), Math.min(px, 140), key, 0.15);
        g.drawImage(s.c, Math.round(x - s.c.ox * s.k), Math.round(yy - s.c.oy * s.k), Math.round(s.c.width * s.k), Math.round(s.c.height * s.k));
        continue;
      }
      const cls = it.own ? A.modelOf(u.key, u.foil === "foil" || u.foil === "up") : A.modelOf(u.cls, false);
      const mod = A.model(cls), len = it.own ? C.BOATS[u.key].len : C.SHIPS[u.cls].len;
      const px = len / dm * f, aob = PD.angDiff(u.hdg, PD.angTo(u.x, u.y, o.x, o.y));
      const hid = dipM(dm, o.eyeH) / dm * f;
      let sink = 0;
      if (!u.alive && u.sinkT !== undefined) sink = PD.clamp((S.t - u.sinkT) / 80, 0, 1);
      const top = wl - mod.top * (px / mod.len);
      drawn.push({ id: u.id, x, wl, top, px, d: it.d });
      if (px < 6) {
        /* a speck on the horizon: hull, and the masts showing first */
        const h = Math.max(1, Math.round((mod.top * (px / mod.len)) - hid));
        if (h >= 1 && sink < 0.9) { K.rect(g, x - Math.max(1, px / 2), wl - h, Math.max(1, Math.round(px)), h, K.dim(u.side === "wolf" ? "#3a3d44" : "#6a727c", light, 0.2)); }
        continue;
      }
      const s = A.get(cls, aob, Math.min(px, 274), key);
      const sc = s.c, k = s.k, sinkPx = sink * (sc.oy * k + 2);
      const rows = Math.max(0, Math.floor(sc.oy - (hid + sinkPx) / k));
      if (rows <= 0) continue;
      const dx = Math.round(x - sc.ox * k), dy = Math.round(wl - sc.oy * k + sinkPx);
      g.drawImage(sc, 0, 0, sc.width, rows, dx, dy, Math.round(sc.width * k), Math.round(rows * k));
      /* the bow wave and wake */
      if (u.spd > 4 && sink === 0) {
        const foam = K.dim("#dfeaf0", light, 0.25), w = Math.max(2, Math.round(sc.width * k * 0.9)), fy = Math.round(wl + sinkPx - Math.max(0, hid));
        for (let i = 0; i < w; i += 2) if (K.hash(i, Math.floor(o.now / 120), u.id) < 0.25 + u.spd / 90) K.px(g, dx + i, fy - (K.hash(i, 1, u.id) > 0.6 ? 1 : 0), foam);
      }
      if (sink > 0 && sink < 1) for (let i = 0; i < 5; i++) { const sy = wl - (sc.oy * k) * (0.5 + i * 0.3) - (o.now / 40 % 20); K.disc(g, x + Math.sin(o.now / 400 + i) * 3 + i * 2, sy, 2 + i, 2 + i, K.dim("#3a3a3e", light, 0.2)); }
    }
    /* missiles in the air: a bright head low over the water, a smoke trail behind */
    for (const q of S.msl) {
      const d = PD.dist(o.x, o.y, q.x, q.y), b = PD.angTo(o.x, o.y, q.x, q.y);
      if (d > look + 4 || Math.abs(PD.angDiff(o.brg, b)) > o.fov / 2) continue;
      const dm = Math.max(40, d * NM), x = toX(b), y = hz + f * Math.max(0, o.eyeH / dm - o.eyeH / Math.sqrt(2 * R_EARTH * o.eyeH)) - 8 / dm * f;
      const tb = PD.angTo(o.x, o.y, q.x - PD.hx(q.hdg) * 0.25, q.y - PD.hy(q.hdg) * 0.25), tx = toX(tb);
      K.line(g, x, y, tx, y + 1, K.dim("#c8ccd2", light, 0.4));
      K.rect(g, x - 1, y - 1, 3, 2, q.side === "ours" ? "#fff2b0" : "#ffb070");
    }
    /* chaff blooming */
    for (const c of S.chaff) {
      const age = S.t - c.at, d = PD.dist(o.x, o.y, c.x, c.y), b = PD.angTo(o.x, o.y, c.x, c.y);
      if (Math.abs(PD.angDiff(o.brg, b)) > o.fov / 2 || age > 40) continue;
      const x = toX(b), dm = Math.max(60, d * NM), r = Math.min(30, (6 + age * 1.5) / dm * f * 6);
      for (let i = 0; i < 18; i++) K.px(g, x + (K.hash(i, 1, c.at) - 0.5) * r * 2, hz - 10 - K.hash(i, 2, c.at) * r, K.hash(i, Math.floor(o.now / 80), 3) > 0.5 ? "#e6eaf0" : "#8890a0");
    }
    PD.FX.draw(g, o, f, cx, hz, toX, light);
    return { drawn, toX, f, cx, hz };
  };

  /* the land standing up off the horizon, column by column, kept while nothing moves much */
  let coastCache = null;
  function coast(g, o, f, cx, hz, sky, light, key) {
    const step = 2, cols = Math.ceil(o.W / step) + 1;
    const ck = `${o.x.toFixed(2)},${o.y.toFixed(2)},${o.brg.toFixed(3)},${o.W},${o.fov.toFixed(3)},${o.eyeH}`;
    if (!coastCache || coastCache.k !== ck) {
      const cs = [];
      for (let i = 0; i < cols; i++) {
        const b = PD.normAng(o.brg + Math.atan((i * step - cx) / f));
        const hit = Co.rayLand(o.x, o.y, b, 44, 0.3);
        if (!hit) { cs.push(null); continue; }
        const L = hit.L, base = !L ? 40 : L.key ? 14 : L.id === "tawny" ? 140 : L.id === "lupen" ? 110 : L.id === "sable" ? 90 : 30;
        const hx = o.x + PD.hx(b) * hit.d, hy = o.y + PD.hy(b) * hit.d;
        const hgt = base * (0.35 + 0.9 * K.fbm2(hx * 0.18, hy * 0.18, 4)), dm = hit.d * NM;
        const px = (hgt - dipM(dm, o.eyeH)) / dm * f;
        cs.push(px > 0.5 ? { px, d: hit.d, side: L ? L.side : "ours", key: L && L.key } : null);
      }
      coastCache = { k: ck, cs };
    }
    const haze = sky[4];
    coastCache.cs.forEach((c, i) => {
      if (!c) return;
      const base = c.side === "wolf" ? "#2f3a34" : c.side === "neutral" ? "#5a5440" : c.key ? "#4f6a3c" : "#55683e";
      const col = key === "night" ? K.mix("#0a1018", haze, 0.3) : K.mix(K.dim(base, light, 0.15), haze, PD.clamp(c.d / 40, 0, 0.85));
      const h = Math.round(Math.min(c.px, hz - o.top - 2));
      K.rect(g, i * step, hz - h, step, h, col);
      if (h > 3 && key !== "night") K.rect(g, i * step, hz - h, step, 1, K.mix(col, "#ffffff", 0.12));
    });
  }

  /* ---- our bow and the 76mm, from the bridge windows: traced once for each boat, foils and light ----
   * The lens is wider than the sea's, so the foredeck and the gun fit under the horizon; the eye stands
   * just forward of the deckhouse, so only the bow is in the picture. */
  const EYE = { pumasis: [7.4, 2.4, 2.6], lynx: [5.4, 2.1, 2.2], ocelot: [4.4, 1.9, 1.9] };
  V.bowCam = (m, W, Hgt, f, hz) => {
    const up = m.foil === "foil" || m.foil === "up", M = A.model(A.modelOf(m.key, up)), [ez, eh, F] = EYE[m.key];
    const lift = up ? { pumasis: 2.6, lynx: 2, ocelot: 1.9 }[m.key] : 0;
    return { M, e: [0, F + lift + eh, ez], fl: f * 0.5, W, H: Hgt, up };
  };
  V.bow = (m, W, Hgt, f, hz, lightKey) => K.get(`bow:${m.key}:${m.foil === "foil" || m.foil === "up"}:${lightKey}:${W}:${Hgt}:${Math.round(f)}:${Math.round(hz)}`, () => {
    const cam = V.bowCam(m, W, Hgt, f, hz);
    const parts = cam.M.parts.filter(p => !p.tag && boundsZ(p) > cam.e[2] + 0.5);
    const pc = Mo.persp(cam.e, [0, 0, 1], [0, 1, 0], cam.fl, W / 2, hz);
    return Mo.trace(parts, W, Hgt, pc, Mo.LIGHTS[lightKey]);
  });
  /* the turret alone, turned th radians off the bow: the camera turned the other way round its mounting */
  V.turret = (m, W, Hgt, f, hz, lightKey, th) => {
    const bin = ((Math.round(th / PD.TAU * 24) % 24) + 24) % 24;
    return K.get(`tur:${m.key}:${m.foil === "foil" || m.foil === "up"}:${lightKey}:${W}:${Hgt}:${Math.round(f)}:${Math.round(hz)}:${bin}`, () => {
      const cam = V.bowCam(m, W, Hgt, f, hz), parts = cam.M.parts.filter(p => p.tag === "turret");
      if (!parts.length) return K.mk(1, 1);
      const bb = Mo.bounds(parts.slice(0, 1)), tz = (bb[0][2] + bb[1][2]) / 2, a = -bin / 24 * PD.TAU;
      const rot = ([x, y, z]) => [x * Math.cos(a) + (z - tz) * Math.sin(a), y, -x * Math.sin(a) + (z - tz) * Math.cos(a) + tz];
      const rotv = ([x, y, z]) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
      const pc = Mo.persp(rot(cam.e), rotv([0, 0, 1]), [0, 1, 0], cam.fl, W / 2, hz);
      return Mo.trace(parts, W, Hgt, pc, Mo.LIGHTS[lightKey]);
    });
  };
  function boundsZ(p) { const b = Mo.bounds([p]); return b[1][2]; }

  /* ---- the glasses: { x, y, w, h } on the screen ---- */
  V.bino = (g, S, r, ui, now) => {
    const m = S.me, t = W.tgt(S), light = C.light(S.t), key = V.lightKey(S.t), sky = K.sky(light, V.sunPos(S.t).alt);
    const hz = Math.round(r.y + r.h * 0.56);
    K.vgradC(g, r.x, r.y, r.w, hz - r.y, [sky[2], sky[3], sky[4]], 2);
    K.vgradC(g, r.x, hz, r.w, r.y + r.h - hz, [K.dim("#2a5a7a", light, 0.05), K.dim("#123049", light)], 5);
    const out = { hz, cx: r.x + r.w / 2 };
    if (!t) {
      K.text5(g, "NO TARGET SELECTED", Math.round(out.cx - K.text5w("NO TARGET SELECTED") / 2), hz - 14, "#e9e4d8", INK);
      mask(g, r); return out;
    }
    const d = PD.dist(m.x, m.y, t.x, t.y), isM = !!t.mk;
    const len = isM ? 6 : C.SHIPS[t.cls].len, lenNm = len / NM;
    const L = isM ? { a: 0, r: 0 } : W.lead(S, t);
    /* the glasses take in the ship, and the aim, and the lead: a few steps of zoom */
    const want = Math.max(lenNm * 3.4, (Math.max(Math.abs(m.aim.a), Math.abs(L.a)) * 2 + lenNm) * 1.35, 0.03);
    let span = 0.02; while (span < want) span *= 1.6;
    const ppn = r.w / span, rScale = (r.h * 0.34) / Math.max(0.25, d * 0.14);
    out.ppn = ppn; out.rScale = rScale;
    /* the target */
    const cx = Math.round(out.cx);
    if (isM) {
      K.rect(g, cx - 5, hz - 4, 10, 2, "#c8ccd2"); K.rect(g, cx + 4, hz - 4, 2, 2, "#ffb070");
      for (let i = 1; i < 14; i++) K.px(g, cx - 5 - i * 2, hz - 4 + (i % 2), "#9aa0a8");
    } else {
      const aob = PD.angDiff(t.hdg, PD.angTo(t.x, t.y, m.x, m.y)), px = Math.min(274, lenNm * ppn);
      const s = A.get(A.modelOf(t.cls, false), aob, px, key);
      const sc = s.c, k = s.k, sink = !t.alive && t.sinkT !== undefined ? PD.clamp((S.t - t.sinkT) / 80, 0, 1) : 0;
      const rows = Math.max(0, Math.floor(sc.oy - sink * sc.oy));
      if (rows > 0) g.drawImage(sc, 0, 0, sc.width, rows, Math.round(cx - sc.ox * k), Math.round(hz - sc.oy * k + sink * sc.oy * k), Math.round(sc.width * k), Math.round(rows * k));
      if (t.spd > 3) for (let i = 0; i < sc.width * k; i += 2) if (K.hash(i, Math.floor(now / 110), t.id) < 0.3) K.px(g, Math.round(cx - sc.ox * k) + i, hz, "#dfeaf0");
    }
    /* the shells' splashes, where they fell against her */
    for (const sp of PD.Render.splashes) {
      if (sp.id !== t.id) continue;
      const age = (now - sp.at) / 1000; if (age > 1.6) continue;
      const x = Math.round(cx + sp.a * ppn), y = Math.round(hz - sp.r * rScale), h = Math.round((sp.hit ? 10 : 16) * (1 - age / 1.6) + 3);
      if (sp.hit) { K.disc(g, x, y - 4, 4, 4, "#ffd27a"); K.disc(g, x, y - 4, 2, 2, "#fff6d8"); }
      else { K.rect(g, x - 1, y - h, 3, h, "#e8f2f6"); K.rect(g, x - 2, y - 2, 5, 2, "#b8d0dc"); }
    }
    /* the crosshair, where the gun is laid */
    const ax = Math.round(cx + m.aim.a * ppn), ay = Math.round(hz - 6 - m.aim.r * rScale);
    out.aim = { x: ax, y: ay };
    if (m.weapon === "gun") {
      const col = m.mode === "aim" ? "#ffd36a" : "rgba(255,211,106,.55)";
      K.rect(g, ax - 9, ay, 6, 1, col); K.rect(g, ax + 4, ay, 6, 1, col); K.rect(g, ax, ay - 8, 1, 5, col); K.rect(g, ax, ay + 4, 1, 5, col);
      /* the Field aid: where the lead puts the shells */
      if (ui.aids.lead && !isM && t.spd > 1) { const lx = Math.round(cx + L.a * ppn), ly = Math.round(hz - 6 - L.r * rScale); K.poly(g, [[lx, ly - 3], [lx + 3, ly], [lx, ly + 3], [lx - 3, ly]], "#7fe0a8"); }
    } else { K.ring(g, cx, hz - 6, 10, "rgba(255,211,106,.8)", 1); }
    mask(g, r);
    /* the aim-corrector bars, round the glasses (1987) */
    if (m.weapon === "gun" && !isM) {
      const [bx, by] = W.bars(S, t), on = "#f4f2ea", off = "#2a3240";
      K.rect(g, r.x - 7, r.y + r.h / 2 - 12, 4, 24, bx < 0 ? on : off); K.rect(g, r.x + r.w + 3, r.y + r.h / 2 - 12, 4, 24, bx > 0 ? on : off);
      K.rect(g, r.x + r.w / 2 - 14, r.y - 7, 28, 4, by > 0 ? on : off); K.rect(g, r.x + r.w / 2 - 14, r.y + r.h + 3, 28, 4, by < 0 ? on : off);
    }
    /* what the glasses read: range and bearing; in Field, what she is */
    const brg = PD.deg3(PD.angTo(m.x, m.y, t.x, t.y));
    K.text3(g, PD.nm(d) + " " + brg, r.x + 4, r.y + r.h - 8, "#e9e4d8", INK);
    if (ui.aids.labels) {
      const nm = isM ? "MISSILE" : (C.SHIPS[t.cls].name + (t.side === "wolf" ? " · WOLF" : t.side === "neutral" ? " · NEUTRAL" : " · OURS")).toUpperCase();
      K.text5(g, nm, Math.round(r.x + r.w - 4 - K.text5w(nm)), r.y + 4, t.side === "wolf" || isM ? "#ff9a72" : "#9fd6ff", INK);
    }
    if (t.photo === 1) K.text5(g, "PHOTOGRAPHED", r.x + 4, r.y + 4, "#7fe0a8", INK);
    if (ui.aids.gunDial) gunDial(g, S, t, r);
    return out;
  };
  /* the Field aid: where the glasses and the gun point, against the bow; the gun's blind arc astern in red */
  function gunDial(g, S, t, r) {
    const m = S.me, rel = PD.angDiff(m.hdg, PD.angTo(m.x, m.y, t.x, t.y)), R0 = 13, cx = r.x + r.w - R0 - 5, cy = r.y + r.h - R0 - 5;
    K.disc(g, cx, cy, R0 + 2, R0 + 2, INK); K.ring(g, cx, cy, R0, "#4a5668", 1);
    for (let i = 0; i < 12; i++) { const a = i * 30 * PD.DEG; K.px(g, cx + Math.sin(a) * (R0 - 2), cy - Math.cos(a) * (R0 - 2), i % 3 ? "#5c6470" : "#c8c0aa"); }
    for (let a = C.GUN.arcAft; a <= Math.PI * 2 - C.GUN.arcAft; a += 0.08) K.px(g, cx + Math.sin(a) * R0, cy - Math.cos(a) * R0, "#ff6a4a");
    /* the boat, bow up */
    K.poly(g, [[cx, cy - 6], [cx + 3, cy + 1], [cx + 2, cy + 5], [cx - 2, cy + 5], [cx - 3, cy + 1]], "#b9c4cf");
    const blind = Math.abs(rel) > C.GUN.arcAft, col = blind ? "#ff6a4a" : "#ffd36a";
    K.line(g, cx, cy, cx + Math.sin(rel) * (R0 - 1), cy - Math.cos(rel) * (R0 - 1), col);
    const d = Math.round(Math.abs(rel) / PD.DEG), s = d < 3 ? "AHEAD" : d > 177 ? "ASTERN" : (rel > 0 ? "STBD " : "PORT ") + String(d).padStart(3, "0");
    K.text3(g, s, Math.round(cx - K.text3w(s) / 2), cy - R0 - 9, col, INK);
  }
  /* two round lenses, joined: the dark outside them */
  function mask(g, r) {
    const rr = r.h * 0.62, cy = r.y + r.h / 2, off = Math.max(0, Math.min(r.w / 2 - rr * 0.92, rr * 1.15)), c1 = r.x + r.w / 2 - off, c2 = r.x + r.w / 2 + off;
    g.fillStyle = INK;
    for (let y = r.y; y < r.y + r.h; y++) {
      const dy = y + 0.5 - cy, ins = rr * rr - dy * dy;
      if (ins <= 0) { g.fillRect(r.x, y, r.w, 1); continue; }
      const w = Math.sqrt(ins), a = Math.round(Math.max(r.x, c1 - w)), b = Math.round(Math.min(r.x + r.w, c2 + w));
      if (a > r.x) g.fillRect(r.x, y, a - r.x, 1);
      if (b < r.x + r.w) g.fillRect(b, y, r.x + r.w - b, 1);
    }
    K.rect(g, r.x - 1, r.y - 1, r.w + 2, 1, "#3a4452"); K.rect(g, r.x - 1, r.y + r.h, r.w + 2, 1, "#3a4452"); K.rect(g, r.x - 1, r.y, 1, r.h, "#3a4452"); K.rect(g, r.x + r.w, r.y, 1, r.h, "#3a4452");
  }
})();
