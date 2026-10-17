/* PDF Pumasis -- the operations map: the whole of the mission's waters,
 * as 1987 had it. Land and borders, our hydrofoil in white with her radar's
 * circle, the Kestrels (green: one dot for the first, three for the
 * second), the ship we escort as a grey diamond, and whatever the radar and
 * the Kestrels can see. A cursor sets the autopilot's course, and the
 * courses of the craft selected with 6 to 9. D shows or hides the radar
 * circles. Along the foot, the selected craft, its knots, and the clock:
 * now, and when the mission ends. Scroll or Z zooms in on the boat. */
"use strict";
(() => {
  const K = PD.K, C = PD.C, Co = PD.Coast, E = PD.Engine, M = PD.Missions, O = PD.OpsMap = {};
  const INK = "#05070a", TXT = "#e9e4d8", DIM = "#7d8796", GREEN = "#7fe0a8", PHOS = "#58e08a";
  const LAND = { ours: ["#3d5a35", "#6f8f52"], wolf: ["#3a2f30", "#7a5450"], neutral: ["#4a4434", "#8a7d58"] };
  O.ZOOMS = [1, 2, 4, 8];

  /* the frame: miles to pixels for this window, zoom and centre */
  O.frame = (S, ui, r) => {
    const w = S.win, z = O.ZOOMS[ui.mapZoom || 0];
    const ww = (w[2] - w[0]) / z, wh = (w[3] - w[1]) / z, k = Math.min(r.w / ww, r.h / wh);
    let cx = (w[0] + w[2]) / 2, cy = (w[1] + w[3]) / 2;
    if (z > 1) { const c = ui.mapAt || S.me; cx = PD.clamp(c.x, w[0] + ww / 2, w[2] - ww / 2); cy = PD.clamp(c.y, w[1] + wh / 2, w[3] - wh / 2); }
    const ox = r.x + r.w / 2 - cx * k, oy = r.y + r.h / 2 - cy * k;
    return { k, ox, oy, toS: (x, y) => [ox + x * k, oy + y * k], toW: (px, py) => ({ x: (px - ox) / k, y: (py - oy) / k }) };
  };

  /* the land, drawn once for each frame: hard pixel edges, a lighter shore */
  function landLayer(F, r) {
    return K.get(`land:${Math.round(F.k * 1000)}:${Math.round(F.ox)}:${Math.round(F.oy)}:${r.w}:${r.h}`, () => {
      const c = K.mk(r.w, r.h), g = c.getContext("2d");
      for (const side of ["ours", "wolf", "neutral"]) {
        const tmp = K.mk(r.w, r.h), tg = tmp.getContext("2d");
        tg.fillStyle = "#ffffff";
        for (const L of Co.LANDS) {
          if (L.side !== side) continue;
          tg.beginPath(); L.pts.forEach(([x, y], i) => { const px = F.ox - r.x + x * F.k, py = F.oy - r.y + y * F.k; i ? tg.lineTo(px, py) : tg.moveTo(px, py); }); tg.closePath(); tg.fill();
        }
        const img = tg.getImageData(0, 0, r.w, r.h), d = img.data, out = g.getImageData(0, 0, r.w, r.h), od = out.data;
        const [base, shore] = LAND[side].map(K.rgb);
        const at = (x, y) => x >= 0 && y >= 0 && x < r.w && y < r.h && d[(y * r.w + x) * 4 + 3] > 120;
        for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) {
          if (!at(x, y)) continue;
          const edge = !at(x + 1, y) || !at(x - 1, y) || !at(x, y + 1) || !at(x, y - 1);
          const col = edge ? shore : K.bayer(x, y) > 0.3 ? base.map(v => v * 0.86) : base, o = (y * r.w + x) * 4;
          od[o] = col[0]; od[o + 1] = col[1]; od[o + 2] = col[2]; od[o + 3] = 255;
        }
        g.putImageData(out, 0, 0);
      }
      return c;
    });
  }

  O.draw = (g, S, ui, r, now) => {
    const F = O.frame(S, ui, r), m = S.me, w = S.win, aids = ui.aids;
    /* the water, and a grid every ten miles */
    K.vgradC(g, r.x, r.y, r.w, r.h, ["#0c1a2c", "#0a1626", "#08121f"], 2);
    for (let x = Math.ceil(w[0] / 10) * 10; x <= w[2]; x += 10) { const [px] = F.toS(x, 0); if (px >= r.x && px < r.x + r.w) for (let y = r.y; y < r.y + r.h; y += 2) K.px(g, px, y, "#13253a"); }
    for (let y = Math.ceil(w[1] / 10) * 10; y <= w[3]; y += 10) { const [, py] = F.toS(0, y); if (py >= r.y && py < r.y + r.h) for (let x = r.x; x < r.x + r.w; x += 2) K.px(g, x, py, "#13253a"); }
    g.drawImage(landLayer(F, r), r.x, r.y);
    /* outside the operations area, shaded */
    const [ax, ay] = F.toS(w[0], w[1]), [bx, by] = F.toS(w[2], w[3]);
    g.fillStyle = "rgba(5,7,10,.55)";
    if (ay > r.y) g.fillRect(r.x, r.y, r.w, ay - r.y); if (by < r.y + r.h) g.fillRect(r.x, by, r.w, r.y + r.h - by);
    if (ax > r.x) g.fillRect(r.x, Math.max(r.y, ay), ax - r.x, Math.min(by, r.y + r.h) - Math.max(r.y, ay)); if (bx < r.x + r.w) g.fillRect(bx, Math.max(r.y, ay), r.x + r.w - bx, Math.min(by, r.y + r.h) - Math.max(r.y, ay));
    /* and its edge, dotted, so the shade reads as the boundary it is */
    for (let x = Math.max(r.x, ax); x < Math.min(r.x + r.w, bx); x += 3) { if (ay > r.y) K.px(g, x, ay, "#4a5d78"); if (by < r.y + r.h) K.px(g, x, by, "#4a5d78"); }
    for (let y = Math.max(r.y, ay); y < Math.min(r.y + r.h, by); y += 3) { if (ax > r.x) K.px(g, ax, y, "#4a5d78"); if (bx < r.x + r.w) K.px(g, bx, y, "#4a5d78"); }
    /* names */
    for (const n of Co.WATERS) { const [px, py] = F.toS(n.x, n.y); if (px > r.x && px < r.x + r.w && py > r.y && py < r.y + r.h) K.text3(g, n.name, Math.round(px - K.text3w(n.name) / 2), Math.round(py), "#7a9cc4", INK); }
    for (const p of Co.PLACES) { const [px, py] = F.toS(p.x, p.y); if (px < r.x || px > r.x + r.w || py < r.y || py > r.y + r.h) continue; K.rect(g, px - 1, py - 1, 3, 3, p.side === "wolf" ? "#ff8a62" : p.side === "neutral" ? "#e9d8a8" : "#9fd6ff"); K.text3(g, p.name, Math.round(px + 4), Math.round(py - 2), TXT, INK); }
    /* the objective, a Field aid */
    if (aids.goal) goal(g, S, F, r, now);
    /* radar circles: ours, and the Kestrels' sight (D) */
    if (ui.circles !== false) {
      dashed(g, F, m.x, m.y, PD.Boats.radarMax(m), "#1d5a3a", now);
      for (const h of E.helos(S)) dashed(g, F, h.x, h.y, C.HELO.spot, "#1d4a2a", now);
    }
    /* the Field aid: how far the fuel goes at this speed */
    if (aids.fuel && m.spd > 1) {
      const k = C.BOATS[m.key], foil = m.foil === "foil";
      const hours = m.fuel * (foil ? k.fuelH[0] / (0.55 + 0.45 * m.spd / k.notch[5]) : k.fuelH[1] / (0.25 + 0.75 * m.spd / k.hull)) / [1, 1.5, 2.2][m.dmg.fuel];
      dashed(g, F, m.x, m.y, m.spd * hours, m.fuel < 0.2 ? "#a0502a" : "#5a4a22", now);
    }
    /* weapon reach, a Field aid */
    if (aids.rings) { dashed(g, F, m.x, m.y, C.MSL[C.BOATS[m.key].msl].range, "#5a5530", now); dashed(g, F, m.x, m.y, C.GUN.range, "#4a3a2a", now); }
    /* courses */
    if (m.auto && m.route.length) { let [px, py] = F.toS(m.x, m.y); for (const p of m.route) { const [qx, qy] = F.toS(p.x, p.y); K.line(g, px, py, qx, qy, "rgba(244,242,234,.45)"); K.rect(g, qx - 1, qy - 1, 3, 3, "#f4f2ea"); px = qx; py = qy; } }
    for (const u of S.u) if (u.alive && u.dest && (u.cls === "helo" || u.convoy)) { const [px, py] = F.toS(u.x, u.y), [qx, qy] = F.toS(u.dest.x, u.dest.y); K.line(g, px, py, qx, qy, u.cls === "helo" ? "rgba(127,224,168,.4)" : "rgba(200,200,200,.4)"); }
    /* what we see */
    for (const u of S.u) {
      if (!u.alive && !(u.sinkT !== undefined && S.t - u.sinkT < 20)) continue;
      if (u.cls === "helo" || u.side === "ours") continue;
      if (!E.known(S, u) && u.alive) continue;
      const [px, py] = F.toS(u.x, u.y);
      if (px < r.x || px > r.x + r.w || py < r.y || py > r.y + r.h) continue;
      const col = aids.labels ? (u.side === "wolf" ? "#ff8a62" : "#e9e4d8") : PHOS;
      if (!u.alive) { K.line(g, px - 2, py - 2, px + 2, py + 2, col); K.line(g, px + 2, py - 2, px - 2, py + 2, col); continue; }
      K.rect(g, px - 1, py - 1, 3, 3, col);
      K.line(g, px, py, px + PD.hx(u.hdg) * 5, py + PD.hy(u.hdg) * 5, col);
      if (aids.labels) K.text3(g, C.SHIPS[u.cls].name.toUpperCase(), Math.round(px + 4), Math.round(py + 2), col, INK);
      if (u.photo === 1) K.text3(g, "P", Math.round(px - 2), Math.round(py - 8), GREEN, INK);
      if (u.id === m.tgt) K.ring(g, px, py, 5, "#ffd36a", 1);
    }
    for (const q of S.msl) { const [px, py] = F.toS(q.x, q.y), [tx, ty] = F.toS(q.x - PD.hx(q.hdg) * 0.6, q.y - PD.hy(q.hdg) * 0.6); K.line(g, px, py, tx, ty, q.side === "ours" ? "#fff2b0" : "#ff6a4a"); }
    /* ours: the Kestrels, the ship we escort, the cutters, and the boat */
    const hs = E.helos(S);
    hs.forEach((h, i) => { const [px, py] = F.toS(h.x, h.y); K.ring(g, px, py, 3, GREEN, 1); if (i === 0) K.px(g, px, py, GREEN); else { K.px(g, px - 1, py, GREEN); K.px(g, px + 1, py, GREEN); K.px(g, px, py - 1, GREEN); } if (S.sel === i + 1) sel(g, px, py, now); });
    for (const u of S.u) {
      if (!u.alive || u.side !== "ours" || u.cls === "helo") continue;
      const [px, py] = F.toS(u.x, u.y);
      if (u.convoy || u.cls === "supply" || u.cls === "star") { K.poly(g, [[px, py - 4], [px + 4, py], [px, py + 4], [px - 4, py]], "#b8bcc4"); K.poly(g, [[px, py - 2], [px + 2, py], [px, py + 2], [px - 2, py]], "#6a707a"); if (S.sel === 3) sel(g, px, py, now); }
      else { K.rect(g, px - 1, py - 1, 3, 3, "#9fd6ff"); }
    }
    const [mx, my] = F.toS(m.x, m.y);
    const tip = [mx + PD.hx(m.hdg) * 6, my + PD.hy(m.hdg) * 6], l = [mx + PD.hx(m.hdg + 2.5) * 4, my + PD.hy(m.hdg + 2.5) * 4], rr = [mx + PD.hx(m.hdg - 2.5) * 4, my + PD.hy(m.hdg - 2.5) * 4];
    K.poly(g, [tip, l, rr], "#ffffff");
    if (S.sel === 0) sel(g, mx, my, now);
    /* the cursor */
    if (ui.cursor) {
      const [cx, cy] = F.toS(ui.cursor.x, ui.cursor.y), col = Math.floor(now / 300) % 2 ? "#ffd36a" : "#f4f2ea";
      K.rect(g, cx - 7, cy, 5, 1, col); K.rect(g, cx + 3, cy, 5, 1, col); K.rect(g, cx, cy - 7, 1, 5, col); K.rect(g, cx, cy + 3, 1, 5, col);
      /* the range and bearing from us, once the cursor has left the boat */
      const d = PD.dist(m.x, m.y, ui.cursor.x, ui.cursor.y), s = PD.nm(d) + " NM " + PD.deg3(PD.angTo(m.x, m.y, ui.cursor.x, ui.cursor.y));
      if (d * F.k >= 4) K.text3(g, s, Math.round(cx + 8), Math.round(cy + 6), "#ffd36a", INK);
    }
    /* a scale bar */
    const sb = [5, 10, 20, 40].find(v => v * F.k > 40) || 40, sx = r.x + 8, sy = r.y + r.h - 8;
    K.rect(g, sx, sy, Math.round(sb * F.k), 1, TXT); K.rect(g, sx, sy - 2, 1, 3, TXT); K.rect(g, sx + Math.round(sb * F.k), sy - 2, 1, 3, TXT);
    K.text3(g, sb + " NM", sx, sy - 8, TXT, INK);
    return F;
  };
  function sel(g, x, y, now) { const o = 6 + (Math.floor(now / 250) % 2); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { K.rect(g, x + sx * o - (sx > 0 ? 2 : 0), y + sy * o, 3, 1, "#ffd36a"); K.rect(g, x + sx * o, y + sy * o - (sy > 0 ? 2 : 0), 1, 3, "#ffd36a"); } }
  function dashed(g, F, x, y, rad, col, now) {
    const [cx, cy] = F.toS(x, y), rp = rad * F.k, n = Math.max(24, Math.round(rp * 0.8));
    for (let i = 0; i < n; i += 2) { const a = i / n * PD.TAU + now / 20000; K.px(g, cx + Math.cos(a) * rp, cy + Math.sin(a) * rp, col); }
  }
  /* where the mission wants you, marked */
  function goal(g, S, F, r, now) {
    const mi = M.get(S.mission), col = Math.floor(now / 500) % 2 ? "#7fe0a8" : "#4a9a70";
    const line = (x0, y0, x1, y1) => { const [a, b] = F.toS(x0, y0), [c, d] = F.toS(x1, y1); const n = Math.max(1, Math.round(Math.hypot(c - a, d - b) / 3)); for (let i = 0; i < n; i += 2) K.px(g, a + (c - a) * i / n, b + (d - b) * i / n, col); };
    if (mi.exit) line(S.win[0], mi.exit.y, S.win[2], mi.exit.y);
    if (mi.dest) line(mi.dest.x0, mi.dest.y0, mi.dest.x0, mi.dest.y1);
    if (mi.supply) { const c = S.u.find(u => u.cls === "supply"); if (c && c.waiting) { const [px, py] = F.toS(c.x, c.y); K.ring(g, px, py, Math.max(4, Math.round(3 * F.k)), col, 1); } line(mi.out.x, S.win[1], mi.out.x, S.win[3]); }
    if (S.mission === 3) line(205, 30, 205, 168);
    if (S.mission === 5) line(S.win[0], 236, S.win[2], 236);
    void r;
  }
})();
