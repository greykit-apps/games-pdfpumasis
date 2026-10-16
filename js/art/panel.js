/* PDF Pumasis -- the console under the bridge windows, as 1987 laid it out:
 * the weapons board on the left; the gyrocompass, the radar, and the speed,
 * engine and fuel gauges in the middle, with the LOCK and DEPTH lamps over
 * them; the damage report on the right, the boat side-on with her systems'
 * lamps and the six compartments from above. Painted steel, brass rims,
 * phosphor green. A lamp's state is told by its fill and a mark as well as
 * its colour. */
"use strict";
(() => {
  const K = PD.K, C = PD.C, B = PD.Boats, E = PD.Engine, W = PD.Weapons, A = PD.ShipArt, P = PD.Panel = {};
  const INK = "#05070a", TXT = "#e9e4d8", DIM = "#8b95a3", BRASS = "#d8b25e", GREEN = "#7fe0a8", PHOS = "#58e08a", AMBER = "#f0a43c", RED = "#ff6a4a";
  const LVL = [["OK", GREEN], ["DMG", AMBER], ["OUT", RED]];

  /* the panel's ground: dark painted steel, a lip along the top, rivets */
  function ground(g, x, y, w, h) {
    K.vgradC(g, x, y, w, h, ["#1c2430", "#161d27", "#10161e"], 7);
    K.rect(g, x, y, w, 2, "#3a4656"); K.rect(g, x, y + 2, w, 1, "#0a0e14");
    for (let i = x + 8; i < x + w; i += 46) { K.rivet(g, i, y + 6, "#4a5668", INK); K.rivet(g, i, y + h - 7, "#4a5668", INK); }
  }
  function plate(g, x, y, w, h, title) {
    K.rect(g, x, y, w, h, "#0d1219"); K.rect(g, x, y, w, 1, "#2e3846"); K.rect(g, x, y + h - 1, w, 1, "#262e3a"); K.rect(g, x, y, 1, h, "#2a3442"); K.rect(g, x + w - 1, y, 1, h, "#202834");
    if (title) K.text3(g, title, x + 4, y + 3, DIM);
  }
  const lamp = (g, x, y, on, col, label) => {
    K.disc(g, x + 3, y + 3, 3.5, 3.5, INK); K.disc(g, x + 3, y + 3, 2.5, 2.5, on ? col : "#232a33");
    if (on) K.px(g, x + 2, y + 2, "#ffffff");
    if (label) K.text3(g, label, x + 9, y + 1, on ? col : DIM);
  };

  P.draw = (g, S, ui, r, now) => {
    const m = S.me, k = C.BOATS[m.key];
    ground(g, r.x, r.y, r.w, r.h);
    const h = r.h - 12, y = r.y + 7;
    /* the widths: the radar in the middle, the rest round it */
    const rad = Math.max(30, Math.min(64, Math.floor(h / 2) - 4));
    const wW = Math.min(150, Math.max(120, Math.round(r.w * 0.2))), dW = Math.min(196, Math.max(150, Math.round(r.w * 0.26)));
    const midL = r.x + wW + 10, midR = r.x + r.w - dW - 10, mid = (midL + midR) / 2;
    weapons(g, S, ui, r.x + 6, y, wW, h, now);
    damage(g, S, r.x + r.w - dW - 6, y, dW, h, now);
    const rcx = Math.round(mid), rcy = Math.round(y + h / 2 + 4);
    radar(g, S, ui, rcx, rcy, rad, now);
    const side = (midR - midL - rad * 2) / 2;
    compass(g, S, Math.round(midL + side / 2 - 2), rcy, Math.max(18, Math.min(34, Math.floor(side / 2) - 6)), now);
    gauges(g, S, Math.round(rcx + rad + 8), y, Math.round(midR - rcx - rad - 8), h, now);
    /* LOCK and DEPTH, over the radar */
    const locked = E.incoming(S).length > 0;
    lamp(g, rcx - rad, y, locked && Math.floor(now / 250) % 2 === 0, RED, "LOCK");
    lamp(g, rcx + rad - 30, y, m.depth && Math.floor(now / 300) % 2 === 0, AMBER, "DEPTH");
    void k;
  };

  /* ---- the weapons board ---- */
  function weapons(g, S, ui, x, y, w, h, now) {
    const m = S.me, k = C.BOATS[m.key];
    plate(g, x, y, w, h, "WEAPONS");
    const rows = [["gun", "6", "76MM GUN", m.ammo.shells, "gun"], ["chaff", "7", "CHAFF", m.ammo.chaff, "chaff"], ["msl", k.msl === "gabriel" ? "9" : "8", C.MSL[k.msl].name.toUpperCase(), m.ammo.msl, "msl"]];
    let yy = y + 12;
    for (const [id, key, name, n, sec] of rows) {
      const sel = m.weapon === id, lv = B.lvl(m, sec);
      if (sel) { K.rect(g, x + 2, yy - 2, w - 4, 11, "#2a3a2e"); K.rect(g, x + 2, yy - 2, 2, 11, GREEN); }
      K.text3(g, key, x + 7, yy, sel ? GREEN : DIM);
      K.text5(g, name.slice(0, 11), x + 14, yy - 1, sel ? TXT : "#b8b2a4");
      const ns = String(n);
      K.text5(g, ns, x + w - 22 - K.text5w(ns), yy - 1, n > 0 ? TXT : RED);
      lvlMark(g, x + w - 14, yy, lv);
      yy += 13;
    }
    yy += 2;
    K.rect(g, x + 4, yy, w - 8, 1, "#232c38"); yy += 5;
    const aiming = m.mode === "aim";
    K.text3(g, "MODE", x + 5, yy, DIM);
    K.text5(g, aiming ? "AIMING" : "MANEUVER", x + 26, yy - 1, aiming ? "#ffd36a" : TXT);
    yy += 11;
    const t = W.tgt(S);
    K.text3(g, "TARGET", x + 5, yy, DIM);
    if (t) {
      const d = PD.dist(m.x, m.y, t.x, t.y), s = PD.nm(d) + " NM " + PD.deg3(PD.angTo(m.x, m.y, t.x, t.y));
      K.text5(g, s, x + 34, yy - 1, TXT);
      /* the reach of what is selected, against the range */
      const reach = m.weapon === "gun" ? C.GUN.range : m.weapon === "msl" ? C.MSL[k.msl].range : 0, min = m.weapon === "msl" ? C.MSL[k.msl].min : 0;
      if (reach) { yy += 10; const ok = d <= reach && d >= min; K.text3(g, ok ? "IN RANGE" : d < min ? "TOO CLOSE" : "OUT OF RANGE", x + 34, yy, ok ? GREEN : AMBER); }
    } else K.text5(g, "NONE", x + 34, yy - 1, DIM);
    void ui; void now;
  }
  function lvlMark(g, x, y, lv) {
    const [, col] = LVL[lv];
    K.rect(g, x, y - 1, 9, 7, INK); K.rect(g, x + 1, y, 7, 5, lv ? col : "#203026");
    if (lv === 1) { K.rect(g, x + 1, y + 2, 7, 1, INK); }
    if (lv === 2) { K.line(g, x + 1, y, x + 7, y + 4, INK); K.line(g, x + 7, y, x + 1, y + 4, INK); }
  }

  /* ---- the gyrocompass, north up ---- */
  function compass(g, S, cx, cy, r, now) {
    const m = S.me;
    K.disc(g, cx, cy, r + 3, r + 3, "#5c4a22"); K.disc(g, cx, cy, r + 2, r + 2, BRASS); K.disc(g, cx, cy, r, r, "#0e141b");
    for (let i = 0; i < 36; i++) { const a = i * 10 * PD.DEG, big = i % 9 === 0, l = big ? 4 : 2; K.line(g, cx + PD.hx(a) * (r - l), cy + PD.hy(a) * (r - l), cx + PD.hx(a) * (r - 1), cy + PD.hy(a) * (r - 1), big ? TXT : "#5c6470"); }
    K.text3(g, "N", cx - 1, cy - r + 5, "#ff9a72");
    /* the ordered course, a brass tick; the heading, the needle */
    const oa = m.ordHdg; K.line(g, cx + PD.hx(oa) * (r - 6), cy + PD.hy(oa) * (r - 6), cx + PD.hx(oa) * (r - 1), cy + PD.hy(oa) * (r - 1), BRASS, 2);
    K.line(g, cx, cy, cx + PD.hx(m.hdg) * (r - 5), cy + PD.hy(m.hdg) * (r - 5), "#f4f2ea");
    K.disc(g, cx, cy, 1.5, 1.5, BRASS);
    const s = "HDG " + PD.deg3(m.hdg);
    K.text5(g, s, cx - Math.round(K.text5w(s) / 2), cy + r + 7, TXT);
    lamp(g, cx - 14, cy - r - 13, m.auto, GREEN, "AUTO");
    void now;
  }

  /* ---- the radar: our blip flashing in the middle, contacts where they lie, north up ---- */
  function radar(g, S, ui, cx, cy, r, now) {
    const m = S.me, scale = C.RADAR[S.radar], reach = B.radarMax(m);
    g.drawImage(K.get("scope:" + r, () => {
      const c = K.mk(r * 2 + 10, r * 2 + 10), q = c.getContext("2d"), o = r + 5;
      K.disc(q, o, o, r + 4, r + 4, "#2a3240"); K.disc(q, o, o, r + 3, r + 3, "#4a5668"); K.disc(q, o, o, r, r, "#04140c");
      for (let y = o - r; y <= o + r; y++) for (let x = o - r; x <= o + r; x++) if (Math.hypot(x - o, y - o) < r && K.bayer(x, y) > 0.84) K.px(q, x, y, "#062016");
      /* range rings */
      for (const f of [0.25, 0.5, 0.75]) K.ring(q, o, o, Math.round(r * f), "#0d3a22", 1);
      return c;
    }), cx - r - 5, cy - r - 5);
    /* where the radar stops reaching */
    if (reach < scale) { const rr = Math.round(r * reach / scale); for (let i = 0; i < 64; i++) { const a = i / 64 * PD.TAU; K.px(g, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, AMBER); } }
    /* the sweep, and its fading trail */
    const sw = (now / 1000 * 1.6) % PD.TAU;
    for (let i = 0; i < 6; i++) { const a = sw - i * 0.05; K.line(g, cx, cy, cx + PD.hx(a) * (r - 1), cy + PD.hy(a) * (r - 1), i === 0 ? "#3cf08a" : K.mix("#0a5a2e", "#04140c", i / 6)); }
    const k = r / scale;
    const blip = (x, y, col, big) => { const dx = (x - m.x) * k, dy = (y - m.y) * k; if (dx * dx + dy * dy > (r - 2) * (r - 2)) return; K.rect(g, cx + dx - (big ? 1 : 0), cy + dy - (big ? 1 : 0), big ? 3 : 2, big ? 3 : 2, col); };
    for (const u of S.u) {
      if (!u.alive || u.cls === "helo" || u.side === "ours" && !u.convoy && u.cls !== "patrol") continue;
      if (u.side !== "ours" && !(u.seenBy === "radar" && E.known(S, u))) continue;
      const col = ui.aids.labels ? (u.side === "wolf" ? "#ff8a62" : u.side === "neutral" ? "#e9e4d8" : "#7fd8ff") : PHOS;
      blip(u.x, u.y, col, C.SHIPS[u.cls].len > 90);
      if (u.id === m.tgt) { const dx = (u.x - m.x) * k, dy = (u.y - m.y) * k; if (dx * dx + dy * dy < r * r) K.ring(g, cx + dx, cy + dy, 4, "#ffd36a", 1); }
    }
    for (const q of S.msl) { if (Math.floor(now / 150) % 2) blip(q.x, q.y, q.side === "ours" ? "#fff2b0" : "#ff6a4a", false); }
    /* the heading line, and us, flashing; steady if something is right alongside (1987) */
    K.line(g, cx, cy, cx + PD.hx(m.hdg) * (r - 2), cy + PD.hy(m.hdg) * (r - 2), "#1d6a3e");
    const close = S.u.some(u => u.alive && u.cls !== "helo" && PD.dist(u.x, u.y, m.x, m.y) < 0.3);
    if (close || Math.floor(now / 400) % 2) K.rect(g, cx - 1, cy - 1, 3, 3, "#d8ffe8");
    const s = (scale < 10 ? scale.toFixed(1) : scale) + " NM";
    K.text3(g, s, cx + r - K.text3w(s) - 2, cy + r + 2, TXT);
    K.text3(g, "R", cx - r, cy + r + 2, DIM);
  }

  /* ---- speed, engines, fuel, the foils, the throttle ---- */
  function gauges(g, S, x, y, w, h, now) {
    const m = S.me, k = C.BOATS[m.key];
    plate(g, x, y, w, h);
    const cx = Math.round(x + w / 2), r = Math.max(14, Math.min(26, Math.floor(w / 2) - 6)), cy = y + r + 10;
    /* the knots dial */
    for (let i = 0; i <= 10; i++) { const a = (-120 + i * 24) * PD.DEG, big = i % 2 === 0; K.line(g, cx + Math.sin(a) * (r - (big ? 4 : 2)), cy - Math.cos(a) * (r - (big ? 4 : 2)), cx + Math.sin(a) * r, cy - Math.cos(a) * r, big ? TXT : "#5c6470"); }
    const na = (-120 + PD.clamp(m.spd / 50, 0, 1) * 240) * PD.DEG;
    K.line(g, cx, cy, cx + Math.sin(na) * (r - 3), cy - Math.cos(na) * (r - 3), "#ffd36a");
    K.disc(g, cx, cy, 1.5, 1.5, BRASS);
    const kn = Math.round(m.spd) + " KN";
    K.text5(g, kn, cx - Math.round(K.text5w(kn) / 2), cy + 6, TXT);
    let yy = cy + 16;
    /* the foils */
    const fs = { hull: "HULLBORNE", up: "TAKING OFF", foil: "FOILBORNE", down: "SETTLING" }[m.foil];
    K.text3(g, fs, cx - Math.round(K.text3w(fs) / 2), yy, m.foil === "foil" ? GREEN : m.foil === "hull" ? DIM : "#ffd36a");
    yy += 9;
    /* the throttle's notches */
    const top = B.topNotch(m), nw = 6 * 7;
    for (let i = 0; i <= 5; i++) { const nx = cx - Math.round(nw / 2) + i * 7; K.rect(g, nx, yy, 5, 6, i <= m.thr ? (i > top ? RED : "#ffd36a") : "#232a33"); K.text3(g, String(i), nx + 1, yy + 8, i === m.thr ? TXT : "#4a5260"); }
    yy += 18;
    /* engines (RPM) and fuel, as bars */
    const bar = (label, v, warn) => {
      K.text3(g, label, x + 5, yy, DIM);
      const bx = x + 26, bw = w - 32;
      K.rect(g, bx, yy, bw, 5, INK);
      K.rect(g, bx + 1, yy + 1, Math.round((bw - 2) * PD.clamp(v, 0, 1)), 3, v < warn ? RED : v < warn * 2 ? AMBER : GREEN);
      yy += 9;
    };
    bar("RPM", m.spd / k.notch[5], 0);
    bar("FUEL", m.fuel, 0.12);
    void now;
  }

  /* ---- the damage report ---- */
  function damage(g, S, x, y, w, h, now) {
    const m = S.me, k = C.BOATS[m.key];
    plate(g, x, y, w, h, "DAMAGE");
    /* side-on: the boat, and her systems' lamps */
    const sw = w - 12, sp = A.sprite(A.modelOf(m.key, false), 8, A.sizeFor(Math.min(140, sw * 0.8)), "day");
    const sx = x + Math.round((w - sp.width) / 2), sy = y + 10;
    g.globalAlpha = 0.75; g.drawImage(sp, sx, sy); g.globalAlpha = 1;
    const sys = [["gun", "CANNON"], ["radar", "RADAR"], ["chaff", "CHAFF"], ["msl", "MISSILES"], ["fuel", "FUEL"], ["eng", "ENGINES"]];
    let yy = sy + sp.height + 3;
    const colW = Math.floor((w - 8) / 2);
    sys.forEach(([s, n], i) => { const lx = x + 5 + (i % 2) * colW, ly = yy + Math.floor(i / 2) * 9; lvlMark(g, lx, ly, m.dmg[s]); K.text3(g, n, lx + 12, ly, m.dmg[s] ? LVL[m.dmg[s]][1] : DIM); });
    yy += 30;
    /* from above: the six compartments, bow to the right */
    const hw = w - 16, hh = Math.max(12, Math.min(20, y + h - yy - 12)), hx = x + 8, hy = yy;
    if (hh > 8) {
      const holed = B.holed(m), crit = k.crit;
      for (let i = 0; i < 6; i++) {
        const s = C.HULL[i], lv = m.dmg[s], cx0 = hx + Math.round(i * hw / 6), cx1 = hx + Math.round((i + 1) * hw / 6) - 1;
        const taper = i === 5 ? 0.35 : 0;
        const col = lv === 2 ? RED : lv === 1 ? AMBER : "#2d5a3c";
        for (let xx = cx0; xx <= cx1; xx++) { const t = i === 5 ? (xx - cx0) / (cx1 - cx0) : 0, inset = Math.round(hh * taper * t * 1.2); K.rect(g, xx, hy + inset, 1, hh - inset * 2, col); }
        if (lv === 1) for (let xx = cx0; xx <= cx1; xx += 3) K.rect(g, xx, hy + 1, 1, hh - 2, "#7a5a20");
        if (lv === 2) { K.line(g, cx0 + 1, hy + 2, cx1 - 1, hy + hh - 3, INK); K.line(g, cx1 - 1, hy + 2, cx0 + 1, hy + hh - 3, INK); }
        K.rect(g, cx1, hy, 1, hh, INK);
      }
      const msg = holed >= crit ? (m.foil === "foil" ? "HOLED: STAY ON THE FOILS" : "SINKING") : holed ? `${holed} OF ${crit} HOLED` : "HULL SOUND";
      K.text3(g, msg, x + 5, hy + hh + 3, holed >= crit ? RED : holed ? AMBER : DIM);
    }
    void now;
  }
})();
