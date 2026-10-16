/* PDF Pumasis -- the play screen: the bridge or the operations map (V).
 *
 * The bridge is 1987's: the sea over the bow across the top, the glasses
 * set into it with the target close up, and the console beneath. The map
 * is the whole of the mission's waters. And the title's backdrop: the
 * Mission 0 demo, the bot at the helm, seen from astern. */
"use strict";
(() => {
  const K = PD.K, C = PD.C, E = PD.Engine, W = PD.Weapons, V = PD.View, FX = PD.FX, R = PD.Render = { cv: null, g: null, last: null, splashes: [], shake: 0 };
  const INK = "#05070a";
  R.init = cv => { R.cv = cv; R.g = cv.getContext("2d"); R.g.imageSmoothingEnabled = false; };
  /* where things sit on the bridge, for this size of window */
  R.layout = (Wd, Ht) => {
    const sf = R.safe || { t: 26, b: 14 };
    const panelH = PD.clamp(Math.round(Ht * 0.37), 118, 158), pb = Ht - Math.max(0, sf.b - 2), py = pb - panelH;
    /* the glasses, when they are up, fill most of the view over the bow; G or aiming the gun raises them */
    const by = sf.t + 10, bh = Math.max(80, py - by - 12);
    return { seaBot: py, hz: Math.round(py * 0.47 + 8), panel: { x: 0, y: py, w: Wd, h: panelH }, bino: { x: 14, y: by, w: Wd - 28, h: bh } };
  };

  R.draw = (S, ui, now, dt) => {
    const g = R.g, Wd = R.cv.width, Ht = R.cv.height;
    FX.emit(S, dt, S.me);
    FX.step(dt);
    if (S.me.tgt !== null) R.lastTgt = S.me.tgt;
    g.save();
    if (R.shake > 0.3 && PD.prefs.shake) g.translate(Math.round((Math.random() - 0.5) * R.shake), Math.round((Math.random() - 0.5) * R.shake));
    R.shake *= Math.pow(0.03, dt);
    g.fillStyle = INK; g.fillRect(-8, -8, Wd + 16, Ht + 16);
    if (ui.view === "map") { const sf = R.safe || { t: 26, b: 14 }; const r = { x: 0, y: sf.t, w: Wd, h: Ht - sf.t - Math.max(10, sf.b) - 12 }; R.last = { map: PD.OpsMap.draw(g, S, ui, r, now), r }; foot(g, S, ui, r); }
    else bridge(g, S, ui, now, Wd, Ht);
    g.restore();
  };

  /* ---- the bridge ---- */
  function bridge(g, S, ui, now, Wd, Ht) {
    const m = S.me, L = R.layout(Wd, Ht), key = V.lightKey(S.t), up = m.foil === "foil" || m.foil === "up";
    const bob = Math.round(Math.sin(now / (up ? 900 : 650)) * (up ? 1 : 2) + (m.foil === "up" ? -2 : 0));
    const fov = 72 * PD.DEG, f = (Wd / 2) / Math.tan(fov / 2), eyeH = up ? 13 : 10.5;
    const hz = L.hz + bob;
    const v = V.draw(g, { x: m.x, y: m.y, eyeH, brg: m.hdg, fov, W: Wd, top: 0, bot: L.seaBot, hz, t: S.t, S, own: null, now, aids: ui.aids });
    /* the bow and the gun, from the mast */
    const bow = V.bow(m, Wd, L.seaBot, f, L.hz, key);
    g.drawImage(bow, 0, 0);
    const t = W.tgt(S), th = t ? PD.angDiff(m.hdg, PD.angTo(m.x, m.y, t.x, t.y)) : 0;
    /* the bow camera's picture comes out mirrored, so the turret turns the other way in it */
    g.drawImage(V.turret(m, Wd, L.seaBot, f, L.hz, key, -th), 0, 0);
    /* the target, bracketed; in Field, every contact labelled */
    for (const d of v.drawn) {
      const u = W.unit(S, d.id); if (!u) continue;
      const isT = m.tgt === d.id, known = E.known(S, u);
      if (isT) bracket(g, d.x, (d.top + d.wl) / 2, Math.max(5, d.px * 0.6), Math.max(4, (d.wl - d.top) * 0.6 + 3), "#ffd36a");
      else if (ui.aids.labels && known && u.side !== "ours") { const s = C.SHIPS[u.cls].name.toUpperCase(); K.text3(g, s, Math.round(d.x - K.text3w(s) / 2), Math.round(d.top - 9), u.side === "wolf" ? "#ff9a72" : "#e9e4d8", INK); }
    }
    /* the glasses: G raises and lowers them; aiming the gun raises them */
    const bi = ui.glasses || m.mode === "aim" ? V.bino(g, S, L.bino, ui, now) : null;
    /* the Field aid: missiles coming, where from and how soon */
    if (ui.aids.threats) threats(g, S, v, Wd, L, now);
    R.last = { view: v, bino: bi, L };
    PD.Panel.draw(g, S, ui, L.panel, now);
  }
  function threats(g, S, v, Wd, L, now) {
    const m = S.me;
    for (const q of E.incoming(S)) {
      const d = PD.dist(m.x, m.y, q.x, q.y), b = PD.angTo(m.x, m.y, q.x, q.y), rel = PD.angDiff(m.hdg, b), tti = d / (q.spd * PD.KN);
      const inView = Math.abs(rel) < 36 * PD.DEG;
      const x = inView ? Math.round(v.toX(b)) : rel < 0 ? 10 : Wd - 10, y = L.hz - 22;
      const col = Math.floor(now / 200) % 2 ? "#ff6a4a" : "#ffb070";
      if (inView) K.poly(g, [[x, y + 8], [x - 5, y], [x + 5, y]], col);
      else K.poly(g, rel < 0 ? [[x - 6, y], [x + 2, y - 6], [x + 2, y + 6]] : [[x + 6, y], [x - 2, y - 6], [x - 2, y + 6]], col);
      const s = `MISSILE ${PD.nm(d)} NM ${Math.ceil(tti)}S`, tx = PD.clamp(x - K.text3w(s) / 2, 4, Wd - K.text3w(s) - 4);
      K.text3(g, s, Math.round(tx), y - 9, col, INK);
      const across = Math.abs(Math.sin(PD.angDiff(q.hdg, m.hdg)));
      if (d < 1.6 && d > 0.5 && !q.decoy) { const c = across > 0.7 ? "CHAFF NOW" : "TURN ACROSS IT, THEN CHAFF"; K.text5(g, c, Math.round(Wd / 2 - K.text5w(c) / 2), L.seaBot - 18, col, INK); }
      else if (d < 5 && across < 0.6) { const c = "TURN 90 DEGREES TO IT"; K.text5(g, c, Math.round(Wd / 2 - K.text5w(c) / 2), L.seaBot - 18, "#ffb070", INK); }
    }
  }
  function bracket(g, x, y, w, h, col) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    const L = Math.max(3, Math.round(Math.min(w, h) / 2));
    for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { K.rect(g, x + sx * w - (sx > 0 ? L - 1 : 0), y + sy * h, L, 1, col); K.rect(g, x + sx * w, y + sy * h - (sy > 0 ? L - 1 : 0), 1, L, col); }
  }

  /* ---- the map's foot: the selected craft, its knots, the clock (1987) ---- */
  function foot(g, S, ui, r) {
    const y = r.y + r.h + 1, Wd = R.cv.width;
    K.rect(g, 0, y, Wd, 11, "#0b1018"); K.rect(g, 0, y, Wd, 1, "#2a3442");
    const u = E.selUnit(S), name = S.sel === 0 ? "HYDROFOIL" : u ? (u.cls === "helo" ? "HELICOPTER " + u.n : "CONVOY") : "NONE SELECTED";
    const kn = S.sel === 0 ? S.me.spd : u ? u.spd : 0;
    const notch = S.sel === 0 ? S.me.thr : u ? u.notch : 0;
    const parts = [[name, "#ffd36a"], ["KNOTS " + Math.round(kn), "#e9e4d8"], ["SETTING " + notch, "#e9e4d8"], ["TIME NOW " + C.timeStr(S.t), "#e9e4d8"], ["ENDS " + C.timeStr(S.t0 + S.limit), "#e9e4d8"]];
    let x = 8;
    for (const [s, c] of parts) { K.text5(g, s, x, y + 3, c); x += K.text5w(s) + 14; }
    void ui;
  }

  /* ---- what happened, as pictures ---- */
  R.events = (S, evs, now) => {
    const m = S.me, t = W.tgt(S);
    for (const e of evs) {
      switch (e.t) {
        case "splash": FX.splash(e.x, e.y); if (t && !t.mk) R.splashes.push(Object.assign(rel(m, t, e.x, e.y), { id: t.id, hit: false, at: now })); break;
        case "shellHit": FX.shellHit(e.x, e.y); break;
        /* a hit that sinks her is the sinking's to show */
        case "mslHit": { const u = W.unit(S, e.id); if (u && u.alive) FX.mslHit(u); } break;
        case "sunk": { const u = W.unit(S, e.id); if (u) { FX.sunk(u, S.t); if (e.id === R.lastTgt) R.watch = e.id; } } break;
        case "hitUs": R.shake = Math.max(R.shake, 10); break;
        case "shellHitUs": R.shake = Math.max(R.shake, 5); break;
        case "gun": R.shake = Math.max(R.shake, 1.2); break;
      }
    }
    R.splashes = R.splashes.filter(s => now - s.at < 2000);
  };
  /* the target just sunk, still in the glasses until another is chosen or she is under */
  R.watched = S => {
    if (S.me.tgt !== null && S.me.tgt !== R.watch) R.watch = null;
    if (R.watch === null || R.watch === undefined) return null;
    const u = W.unit(S, R.watch);
    if (!u || u.gone || u.alive) { R.watch = null; return null; }
    return u;
  };
  /* a point as an offset from the target, across and along our line of sight */
  function rel(m, t, x, y) { const los = PD.angTo(m.x, m.y, t.x, t.y), ax = PD.hx(los), ay = PD.hy(los), ex = x - t.x, ey = y - t.y; return { r: ex * ax + ey * ay, a: ex * -ay + ey * ax }; }

  /* ---- the title's backdrop: the Mission 0 demo, from astern of the boat ---- */
  R.title = (cv, D, now) => {
    const g = cv.getContext("2d"), Wd = cv.width, Ht = cv.height, m = D.me;
    g.imageSmoothingEnabled = false;
    const side = -0.42, back = 0.07, ex = m.x - PD.hx(m.hdg) * back + PD.hx(m.hdg + Math.PI / 2) * back * side, ey = m.y - PD.hy(m.hdg) * back + PD.hy(m.hdg + Math.PI / 2) * back * side;
    const brg = PD.normAng(m.hdg + 0.02);
    V.draw(g, { x: ex, y: ey, eyeH: 11, brg, fov: 54 * PD.DEG, W: Wd, top: 0, bot: Ht, hz: Math.round(Ht * 0.5), t: D.t, S: D, own: null, ownShip: m, now, aids: {} });
  };
})();
