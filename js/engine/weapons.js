/* PDF Pumasis -- the 76mm, the missiles, the chaff, and what the Empire
 * shoots back.
 *
 * The gun's fire control holds the sight on the target, but a shell takes
 * seconds to get there: you lead a moving ship yourself, walking the shells
 * in by the aim-corrector bars round the glasses (1987). The aim is an
 * offset from where the target is now: across the line of sight, and along
 * it (over or short). A Harpoon (a Gabriel, an Exocet) flies at whatever
 * ship is in the glasses when it is fired, and needs no help. Chaff seduces
 * an incoming missile best when it is about a mile out and you are running
 * across its path: too soon and it locks on again, too late and it has no
 * room to turn. */
"use strict";
(() => {
  const C = PD.C, B = PD.Boats, W = PD.Weapons = {};

  W.unit = (S, id) => S.u.find(u => u.id === id) || null;
  W.missile = (S, id) => S.msl.find(m => m.id === id) || null;
  /* the target in the glasses: a ship, or a missile coming in */
  W.tgt = S => { const id = S.me.tgt; if (id === null) return null; const u = W.unit(S, id); if (u) return u.alive ? u : null; const m = W.missile(S, id); return m || null; };
  W.hostile = (S, u) => u.side === "wolf" ? (u.ai.st !== "passive" || S.provoked) : false;

  /* ---- the gun's solution: where the target will be when a shell fired now arrives ---- */
  W.flight = d => d / (C.GUN.spd * PD.KN);
  /* lead: { a, r } in miles, across and along the line of sight, that would hit a target on a steady course */
  W.lead = (S, t) => {
    const m = S.me, d = PD.dist(m.x, m.y, t.x, t.y), los = PD.angTo(m.x, m.y, t.x, t.y);
    const vx = PD.hx(t.hdg) * t.spd * PD.KN, vy = PD.hy(t.hdg) * t.spd * PD.KN;
    let T = W.flight(d), px = t.x, py = t.y;
    for (let i = 0; i < 3; i++) { px = t.x + vx * T; py = t.y + vy * T; T = W.flight(PD.dist(m.x, m.y, px, py)); }
    const ex = px - t.x, ey = py - t.y, ax = PD.hx(los), ay = PD.hy(los);
    return { r: ex * ax + ey * ay, a: ex * -ay + ey * ax, T, d };
  };
  /* the aim point: target now plus the offset */
  W.aimPoint = (S, t) => {
    const m = S.me, los = PD.angTo(m.x, m.y, t.x, t.y), ax = PD.hx(los), ay = PD.hy(los);
    return { x: t.x + ax * m.aim.r - ay * m.aim.a, y: t.y + ay * m.aim.r + ax * m.aim.a };
  };
  /* how big a ship is to a shell, miles round its middle */
  W.hitR = u => C.GUN.hitR + (u.cls && C.SHIPS[u.cls] ? C.SHIPS[u.cls].len / 1852 * 0.45 : 0);
  /* the aim-corrector bars: which way the sight should move; [-1|0|1 across, -1|0|1 range] */
  W.bars = (S, t) => {
    if (!t || !t.spd) return [0, 0];
    const L = W.lead(S, t), tol = W.hitR(t) * 0.7;
    return [Math.abs(L.a - S.me.aim.a) > tol ? Math.sign(L.a - S.me.aim.a) : 0, Math.abs(L.r - S.me.aim.r) > tol * 2 ? Math.sign(L.r - S.me.aim.r) : 0];
  };

  /* ---- firing ---- */
  W.fire = (S, evs) => {
    const m = S.me, w = m.weapon;
    if (w === "chaff") return W.chaff(S, evs);
    const t = W.tgt(S);
    if (!t) { evs.push({ t: "say", k: "noTarget" }); return; }
    if (t.side === "ours") { evs.push({ t: "say", k: "ourSide" }); return; }
    if (w === "gun") return gun(S, t, evs);
    if (w === "msl") return missile(S, t, evs);
  };
  function gun(S, t, evs) {
    const m = S.me, lv = B.lvl(m, "gun");
    if (m.gunCd > 0) return;
    if (lv >= 2) { evs.push({ t: "say", k: "gunGone" }); return; }
    if (m.ammo.shells <= 0) { evs.push({ t: "say", k: "noShells" }); return; }
    const d = PD.dist(m.x, m.y, t.x, t.y), rel = Math.abs(PD.angDiff(m.hdg, PD.angTo(m.x, m.y, t.x, t.y)));
    if (d > C.GUN.range) { evs.push({ t: "say", k: "outOfRange" }); return; }
    if (rel > C.GUN.arcAft) { evs.push({ t: "say", k: "toRear" }); return; }
    m.gunCd = 1 / C.GUN.rate;
    m.ammo.shells--; S.stats.shells++;
    if (lv === 1 && PD.rand(S) < 0.3) { evs.push({ t: "say", k: "gunMisfire" }); return; }
    evs.push({ t: "gun" });
    W.provoke(S, t, evs);
    /* a missile in the glasses: the gun's last chance at it */
    if (t.mk) { if (d < 3 && PD.rand(S) < 0.07) { t.dead = true; evs.push({ t: "mslShot", id: t.id }); } return; }
    const p = W.aimPoint(S, t), sp = C.GUN.spread * (0.4 + d / 6);
    S.shells.push({ x: p.x + PD.gauss(() => PD.rand(S)) * sp, y: p.y + PD.gauss(() => PD.rand(S)) * sp, at: S.t + W.flight(PD.dist(m.x, m.y, p.x, p.y)), side: "ours" });
  }
  function missile(S, t, evs) {
    const m = S.me, k = C.MSL[C.BOATS[m.key].msl], lv = B.lvl(m, "msl");
    if (t.mk) { evs.push({ t: "say", k: "noMissileLock" }); return; }
    if (lv >= 2) { evs.push({ t: "say", k: "mslGone" }); return; }
    if (m.ammo.msl <= 0) { evs.push({ t: "say", k: "noMissiles" }); return; }
    const d = PD.dist(m.x, m.y, t.x, t.y);
    if (d > k.range) { evs.push({ t: "say", k: "outOfRange" }); return; }
    if (d < k.min) { evs.push({ t: "say", k: "tooClose" }); return; }
    const ours = S.msl.filter(q => q.side === "ours").length;
    if (ours >= C.MSL_TRACK) { evs.push({ t: "say", k: "cantTrack" }); return; }
    if (m.mslCd > 0) return;
    m.mslCd = 2.5;
    m.ammo.msl--; S.stats.fired++;
    if (lv === 1 && PD.rand(S) < 0.3) { evs.push({ t: "say", k: "mslMisfire" }); return; }
    W.launch(S, "ours", C.BOATS[m.key].msl, m.x, m.y, PD.angTo(m.x, m.y, t.x, t.y), t.id);
    W.provoke(S, t, evs);
    evs.push({ t: "launch", ours: true, kind: k.name });
  }
  W.launch = (S, side, kind, x, y, hdg, tgt, from = null) => {
    const k = C.MSL[kind];
    const q = { id: S.nextId++, mk: true, side, kind, x, y, hdg, spd: k.spd, tgt, from, born: S.t, run: 0, will: PD.rand(S) < k.p, decoy: null, chaffed: false };
    S.msl.push(q);
    return q;
  };
  /* any shot near a ship of the Empire's in a truce ends the truce (the Gauntlet) */
  W.provoke = (S, t, evs) => { if (!S.provoked && t && t.side === "wolf" && t.ai && t.ai.st === "passive") { S.provoked = true; evs.push({ t: "provoked" }); } };

  W.chaff = (S, evs) => {
    const m = S.me, lv = B.lvl(m, "chaff");
    if (lv >= 2) { evs.push({ t: "say", k: "chaffGone" }); return; }
    if (m.ammo.chaff <= 0) { evs.push({ t: "say", k: "noChaff" }); return; }
    if (m.chaffCd > 0) return;
    m.chaffCd = 2;
    m.ammo.chaff--;
    if (lv === 1 && PD.rand(S) < 0.3) { evs.push({ t: "say", k: "chaffMisfire" }); return; }
    const c = { x: m.x, y: m.y, at: S.t };
    S.chaff.push(c);
    evs.push({ t: "chaff" });
    /* each missile coming at us: seduced or not, decided now */
    for (const q of S.msl) {
      if (q.side === "ours" || q.tgt !== "me" || q.decoy) continue;
      const d = PD.dist(q.x, q.y, m.x, m.y), across = Math.abs(Math.sin(PD.angDiff(q.hdg, m.hdg)));
      const fd = Math.exp(-Math.pow((d - C.CHAFF.best) / C.CHAFF.width, 2)), p = d < 0.2 ? 0 : fd * (0.4 + 0.6 * across) * 0.96;
      if (PD.rand(S) < p) { q.decoy = { x: c.x, y: c.y }; }
    }
  };
  W.decoyP = (d, across) => d < 0.2 ? 0 : Math.exp(-Math.pow((d - C.CHAFF.best) / C.CHAFF.width, 2)) * (0.4 + 0.6 * across) * 0.96;

  /* ---- damage to us: a section or two, more often the hull when she is up on her foils ---- */
  W.hurtUs = (S, n, heavy, evs) => {
    const m = S.me, foil = m.foil === "foil" || m.foil === "up";
    for (let i = 0; i < n; i++) {
      const pool = [];
      for (const [s] of C.SECTIONS) if (m.dmg[s] < 2) { const w = C.HULL.includes(s) ? (foil ? 1.6 : 0.8) : 1; pool.push([s, w]); }
      if (!pool.length) break;
      let r = PD.rand(S) * pool.reduce((a, p) => a + p[1], 0), s = pool[0][0];
      for (const [k, w] of pool) { r -= w; if (r <= 0) { s = k; break; } }
      const was = m.dmg[s];
      m.dmg[s] = Math.min(2, m.dmg[s] + (heavy && i === 0 ? 2 : 1));
      evs.push({ t: "sec", s, was, now: m.dmg[s] });
    }
  };
  /* damage to a ship */
  W.hurt = (S, u, dmg, evs, by) => {
    if (!u.alive || u.cls === "helo") return;
    u.hp -= dmg; u.hit = true;
    if (u.side === "wolf" && u.ai.st === "passive" && by === "ours") { S.provoked = true; evs.push({ t: "provoked" }); }
    if (u.ai) u.ai.alert = true;
    if (u.hp <= 0) {
      u.alive = false; u.sinkT = S.t; u.spd = Math.min(u.spd, 3); u.ordSpd = 0;
      evs.push({ t: "sunk", id: u.id, cls: u.cls, side: u.side, name: u.name, by });
      if (by === "ours" && u.side === "wolf") S.stats.sunk.push({ cls: u.cls, name: u.name, t: S.t });
    } else evs.push({ t: "hit", id: u.id, cls: u.cls, side: u.side, by });
  };

  /* ---- what is in the air, one step ---- */
  W.step = (S, dt, evs) => {
    const m = S.me;
    if (m.gunCd > 0) m.gunCd -= dt; if (m.mslCd > 0) m.mslCd -= dt; if (m.chaffCd > 0) m.chaffCd -= dt;
    /* shells land */
    for (const sh of S.shells) {
      if (S.t < sh.at) continue;
      sh.done = true;
      if (sh.side === "ours") {
        let hit = null, best = 1e9;
        for (const u of S.u) { if (!u.alive || u.cls === "helo" || u.side === "ours") continue; const d = PD.dist(u.x, u.y, sh.x, sh.y); if (d < W.hitR(u) && d < best) { best = d; hit = u; } }
        if (hit) { S.stats.shellHits++; W.hurt(S, hit, C.GUN.dmg, evs, "ours"); evs.push({ t: "shellHit", x: sh.x, y: sh.y, id: hit.id }); }
        else evs.push({ t: "splash", x: sh.x, y: sh.y });
      }
    }
    S.shells = S.shells.filter(s => !s.done);
    /* missiles fly */
    for (const q of S.msl) {
      if (q.dead) continue;
      const k = C.MSL[q.kind], step = q.spd * PD.KN * dt;
      let tx, ty, tgt = null;
      if (q.decoy) { tx = q.decoy.x; ty = q.decoy.y; }
      else if (q.tgt === "me") { tgt = m; tx = m.x; ty = m.y; }
      else { tgt = W.unit(S, q.tgt); if (!tgt || !tgt.alive) { tgt = null; } else { tx = tgt.x; ty = tgt.y; } }
      if (tx === undefined) { tx = q.x + PD.hx(q.hdg); ty = q.y + PD.hy(q.hdg); }
      const d = PD.dist(q.x, q.y, tx, ty);
      q.hdg = d > 0.001 ? PD.turnToward(q.hdg, PD.angTo(q.x, q.y, tx, ty), (q.run > 0.3 ? 40 : 10) * PD.DEG * dt) : q.hdg;
      const ox = q.x, oy = q.y;
      q.x += PD.hx(q.hdg) * step; q.y += PD.hy(q.hdg) * step; q.run += step;
      /* a Warg's missiles at ours, inside three miles */
      if (q.side === "ours" && tgt && C.SHIPS[tgt.cls] && C.SHIPS[tgt.cls].sam && !q.samTried && d < 3) { q.samTried = true; if (PD.rand(S) < 0.3) { q.dead = true; evs.push({ t: "mslDown", ours: true }); continue; } }
      /* arrival, tested along the path it flew this step */
      if (tgt && PD.segDist(tx, ty, ox, oy, q.x, q.y) < 0.05) {
        q.dead = true;
        if (q.tgt === "me") {
          if (q.will && !q.decoy) { evs.push({ t: "hitUs", kind: q.kind }); S.stats.hitsUs++; W.hurtUs(S, k.dmg, true, evs); }
          else evs.push({ t: "say", k: "theyMissed" });
        } else if (q.will) { if (q.side === "ours") S.stats.mslHits++; W.hurt(S, tgt, k.dmg, evs, q.side); evs.push({ t: "mslHit", id: tgt.id, ours: q.side === "ours" }); }
        else { evs.push({ t: q.side === "ours" ? "say" : "mslMiss", k: "weMissed", id: tgt.id }); }
        continue;
      }
      if (q.decoy && PD.dist(q.x, q.y, q.decoy.x, q.decoy.y) < 0.08) { q.dead = true; evs.push({ t: "decoyed" }); continue; }
      if (q.run > k.range * 1.15) { q.dead = true; if (q.side === "ours") evs.push({ t: "say", k: "weMissed" }); }
    }
    S.msl = S.msl.filter(q => !q.dead);
    S.chaff = S.chaff.filter(c => S.t - c.at < C.CHAFF.life);
  };

  /* ---- the Empire's fire ---- */
  W.enemyGun = (S, u, target, evs) => {
    const k = C.SHIPS[u.cls], d = PD.dist(u.x, u.y, target.x, target.y);
    if (!k.gun || d > k.gun[0]) return;
    if (S.t < (u.gunT || 0)) return;
    u.gunT = S.t + 1 / k.gun[1];
    const p = k.gun[2] * (1 - d / k.gun[0] * 0.6) * (target === S.me && S.me.foil === "foil" ? 0.7 : 1);
    if (target === S.me) {
      if (!S.underFire || S.t - S.underFire > 60) evs.push({ t: "underFire" });
      S.underFire = S.t;
      if (PD.rand(S) < p) { evs.push({ t: "shellHitUs" }); W.hurtUs(S, 1, false, evs); }
      else if (PD.rand(S) < 0.3) evs.push({ t: "shellNear" });
    } else if (PD.rand(S) < p * 1.4) W.hurt(S, target, 0.5, evs, u.side);
  };
  W.enemyMissile = (S, u, target, evs) => {
    const k = C.SHIPS[u.cls];
    if (!k.msl || u.mslLeft <= 0 || S.t < (u.mslT || 0)) return false;
    const mk = C.MSL[k.msl[0]], tx = target === S.me ? S.me : target, d = PD.dist(u.x, u.y, tx.x, tx.y);
    if (d > mk.range * 0.85 || d < mk.min) return false;
    /* no more than two of one boat's in the air */
    if (S.msl.filter(q => q.from === u.id).length >= 2) return false;
    u.mslLeft--; u.mslT = S.t + 50 + PD.rand(S) * 50;
    W.launch(S, u.side, k.msl[0], u.x, u.y, PD.angTo(u.x, u.y, tx.x, tx.y), target === S.me ? "me" : target.id, u.id);
    evs.push({ t: "launch", ours: false, at: target === S.me ? "me" : target.id, from: u.id });
    return true;
  };
})();
