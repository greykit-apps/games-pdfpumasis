/* PDF Pumasis -- a mission: the state, one step of it, and its end.
 *
 * E.newMission(id, { seed }) makes the whole state S, plain JSON: it is
 * also the save. E.tick(S, cmd) runs one step of C.STEP game seconds times
 * the time compression, and returns what happened as events, for the sounds
 * and the crew's reports. The step is longer at higher compression, never
 * more of them; anything in the air holds compression to 8x (1987).
 *
 * cmd: { dHdg, aim: { da, dr }, fireHeld, acts: [ { a, ... } ] }
 *   thr v · weapon v · fire · mode · next · tgt id · radar d · tc d|v ·
 *   sel v · dest x y add · notch v · quit */
"use strict";
(() => {
  const C = PD.C, Co = PD.Coast, B = PD.Boats, W = PD.Weapons, AI = PD.AI, M = PD.Missions, E = PD.Engine = {};

  E.newMission = (id, o = {}) => {
    const mi = M.get(id), seed = (o.seed || 1) | 0;
    const S = { v: 1, mission: mi.id, name: mi.name, seed, rs: seed, t: mi.hour * 3600, t0: mi.hour * 3600, limit: mi.limit, phase: "sea", end: null,
      win: mi.win.slice(), exitOk: !!mi.exit, tcReq: 0, radar: 3, sel: 0, cursor: null, nextId: 1, nameI: seed % 7, cargoI: seed % 5, ourI: 0,
      u: [], msl: [], shells: [], chaff: [], provoked: false, konami: false, cheated: false, log: [], said: {},
      stats: { sunk: [], fired: 0, mslHits: 0, shells: 0, shellHits: 0, hitsUs: 0, photos: 0, maxTc: 0 }, droneN: 0, droneAt: 0, met: false };
    const [x, y, h] = mi.start;
    S.me = B.make(mi.boat, x, y, h * PD.DEG);
    S.me.thr = 3;
    const r = () => PD.rand(S);
    for (const o2 of mi.units(r)) S.u.push(M.unit(S, o2));
    mi.helos.forEach(([hx, hy], i) => S.u.push({ id: S.nextId++, cls: "helo", side: "ours", name: "Kestrel " + (i + 1), x: hx, y: hy, hdg: 0, spd: 0, notch: 4, dest: null, alive: true, ai: { st: "player" }, n: i + 1 }));
    if (mi.convoy) { const c = M.unit(S, Object.assign({ ai: { st: "player" } }, mi.convoy)); c.notch = 3; c.hdg = c.ordHdg = 90 * PD.DEG; c.convoy = true; S.u.push(c); }
    if (mi.supply) { const c = M.unit(S, Object.assign({ ai: { st: "route", route: [] } }, mi.supply)); c.spd = c.ordSpd = 0; c.notch = 4; c.waiting = true; S.u.push(c); }
    if (mi.drones) { S.droneQ = mi.drones.kinds.slice(0, mi.drones.n); if (mi.drones.all) while (S.droneQ.length) S.u.push(M.drone(S, S.droneQ.shift(), S.me)); }
    E.sense(S);
    return S;
  };

  /* ---- helpers the shell reads ---- */
  E.elapsed = S => S.t - S.t0;
  E.left = S => Math.max(0, S.limit - (S.t - S.t0));
  E.inFlight = S => S.msl.length > 0 || S.shells.length > 0;
  E.tcIdx = S => Math.min(S.tcReq, E.inFlight(S) ? C.TC_FIRE : C.TC.length - 1);
  E.tcNow = S => C.TC[E.tcIdx(S)];
  E.convoy = S => S.u.find(u => u.convoy) || null;
  E.helos = S => S.u.filter(u => u.cls === "helo");
  /* the craft the map's orders go to: 0 our boat, 1 and 2 the Kestrels, 3 the ship we escort */
  E.selUnit = S => S.sel === 0 ? null : S.sel === 3 ? E.convoy(S) : E.helos(S)[S.sel - 1] || null;
  /* what we know is there: on our radar, or seen by a Kestrel, lately */
  E.known = (S, u) => u.alive && u.seenT !== undefined && S.t - u.seenT < 4 && u.cls !== "helo";
  E.contacts = S => S.u.filter(u => u.side !== "ours" && E.known(S, u));
  E.incoming = S => S.msl.filter(q => q.side !== "ours" && q.tgt === "me");
  E.radarRange = (S, brgRel) => B.radarMax(S.me) * (0.72 + 0.28 * Math.abs(Math.cos(brgRel)));
  E.say = (S, k, gap = 20) => { if (S.said[k] !== undefined && S.t - S.said[k] < gap) return false; S.said[k] = S.t; return true; };

  /* ---- what our radar and the Kestrels see ---- */
  E.sense = (S, evs = []) => {
    const m = S.me, helos = E.helos(S);
    for (const u of S.u) {
      if (!u.alive || u.cls === "helo") continue;
      if (u.side === "ours") { u.seenT = S.t; continue; }
      const d = PD.dist(m.x, m.y, u.x, u.y), rel = PD.angDiff(m.hdg, PD.angTo(m.x, m.y, u.x, u.y));
      let seen = d < E.radarRange(S, rel) ? "radar" : null;
      if (!seen) for (const h of helos) if (PD.dist(h.x, h.y, u.x, u.y) < C.HELO.spot) { seen = "helo"; break; }
      if (seen) {
        if (!u.everSeen) { u.everSeen = true; if (S.t > S.t0 + 1) evs.push({ t: "contact", id: u.id, side: u.side, by: seen, d, brg: PD.angTo(m.x, m.y, u.x, u.y) }); }
        u.seenT = S.t; u.seenBy = seen;
      }
    }
  };

  /* ---- one step ---- */
  E.tick = (S, cmd = {}) => {
    const evs = [];
    if (S.phase !== "sea") return evs;
    const m = S.me;
    for (const a of cmd.acts || []) order(S, a, evs);
    if (S.phase !== "sea") return evs;
    const tc = E.tcNow(S), dt = C.STEP * tc;
    S.stats.maxTc = Math.max(S.stats.maxTc, tc);
    S.t += dt;
    /* the gun's aim, moved by the stick or the keys in aiming mode */
    const t = W.tgt(S);
    if (cmd.aim && t && !t.mk && (cmd.aim.da || cmd.aim.dr)) {
      const d = PD.dist(m.x, m.y, t.x, t.y), step = C.STEP;
      m.aim.a = PD.clamp(m.aim.a + cmd.aim.da * Math.max(0.15, d * 0.03) * step, -Math.max(0.6, d * 0.12), Math.max(0.6, d * 0.12));
      m.aim.r = PD.clamp(m.aim.r + cmd.aim.dr * Math.max(0.25, d * 0.06) * step, -Math.max(1, d * 0.3), Math.max(1, d * 0.3));
    }
    if (cmd.fireHeld && m.weapon === "gun" && m.mode === "aim") W.fire(S, evs);
    /* our boat */
    if (!m.sunk) B.step(S, m, dt, cmd.dHdg || 0, evs);
    /* everyone else */
    for (const u of S.u) {
      if (!u.alive) continue;
      if (u.convoy || (u.cls !== "helo" && u.ai.st === "player")) steerConvoy(S, u);
      if (u.cls !== "helo") AI.step(S, u, evs);
      B.unitStep(S, u, dt);
    }
    /* the sinking go down; the escaped are gone */
    for (const u of S.u) if (!u.alive && u.sinkT !== undefined && S.t - u.sinkT > 90) u.gone = true;
    W.step(S, dt, evs);
    if (S.t >= (S.senseT || 0)) { S.senseT = S.t + 0.5; E.sense(S, evs); }
    collide(S, evs);
    photos(S, evs);
    drones(S);
    /* the target in the glasses, gone */
    if (m.tgt !== null && !W.tgt(S)) { m.tgt = null; m.aim = { a: 0, r: 0 }; }
    /* anything fired at us drops the clock to 8x (1987) */
    for (const e of evs) if ((e.t === "launch" && !e.ours) || e.t === "underFire") { if (S.tcReq > C.TC_FIRE) { S.tcReq = C.TC_FIRE; evs.push({ t: "tcDrop" }); } }
    if (S.konami) { for (const [s] of C.SECTIONS) m.dmg[s] = 0; }
    /* sunk: holed past what she floats with, once she is down off her foils */
    const holed = B.holed(m), crit = C.BOATS[m.key].crit;
    if (holed >= crit && !m.sunk) {
      if (m.foil === "foil" || m.foil === "up") { if (!m.foilOnly) { m.foilOnly = true; evs.push({ t: "foilOnly" }); } }
      else { m.sunk = true; m.spd = 0; evs.push({ t: "weSink" }); return over(S, evs, "sunk", false); }
    }
    /* the truce: come too close to a Wolf boat under it and the whole fleet comes (the Gauntlet) */
    if (!S.provoked && S.u.some(u => u.alive && u.ai.st === "passive" && PD.dist(u.x, u.y, m.x, m.y) < C.TRUCE)) { S.provoked = true; evs.push({ t: "provoked", close: true }); }
    goals(S, evs);
    if (S.phase === "sea" && E.left(S) <= 0) over(S, evs, "time", S.met);
    if (S.phase === "sea" && m.fuel <= 0 && m.spd < 0.5) over(S, evs, "fuel", false);
    for (const e of evs) if (e.t === "say" || e.t === "contact" || e.t === "sunk" || e.t === "hitUs" || e.t === "photo") S.log.push({ t: S.t, e: e.t, k: e.k, id: e.id });
    if (S.log.length > 200) S.log.splice(0, S.log.length - 200);
    return evs;
  };

  /* ---- orders ---- */
  function order(S, a, evs) {
    const m = S.me;
    switch (a.a) {
      case "thr": m.thr = PD.clamp(a.v | 0, 0, 5); if (m.thr > B.topNotch(m)) evs.push({ t: "say", k: "engines" }); evs.push({ t: "thr", v: m.thr }); break;
      case "weapon": {
        if (a.v === "msl" && !C.BOATS[m.key].msl) break;
        m.weapon = a.v; evs.push({ t: "weapon", v: a.v }); break;
      }
      case "fire": W.fire(S, evs); break;
      case "mode": m.mode = m.mode === "aim" ? "steer" : "aim"; evs.push({ t: "mode", v: m.mode }); break;
      case "next": nextTarget(S, evs, a.back); break;
      case "tgt": { const u = W.unit(S, a.id); if (u && E.known(S, u)) { m.tgt = u.id; m.aim = { a: 0, r: 0 }; evs.push({ t: "target", id: u.id }); } break; }
      case "radar": S.radar = PD.clamp(S.radar + a.d, 0, C.RADAR.length - 1); evs.push({ t: "radar", v: S.radar }); break;
      case "tc": S.tcReq = a.v !== undefined ? PD.clamp(a.v, 0, C.TC.length - 1) : PD.clamp(S.tcReq + a.d, 0, C.TC.length - 1); evs.push({ t: "tc" }); break;
      case "sel": {
        const ok = a.v === 0 || (a.v === 3 ? !!E.convoy(S) : !!E.helos(S)[a.v - 1]);
        if (ok) { S.sel = a.v; evs.push({ t: "sel", v: a.v }); } else evs.push({ t: "say", k: "noCraft" });
        break;
      }
      case "dest": {
        const p = { x: PD.clamp(a.x, S.win[0], S.win[2]), y: PD.clamp(a.y, S.win[1], S.win[3]) };
        if (S.sel === 0) { if (a.add && m.auto) m.route.push(p); else m.route = [p]; m.auto = true; m.ordHdg = PD.angTo(m.x, m.y, p.x, p.y); evs.push({ t: "course" }); }
        else { const u = E.selUnit(S); if (u) { if (u.waiting) { evs.push({ t: "say", k: "notYet" }); break; } u.dest = p; if (!u.notch) u.notch = 3; evs.push({ t: "course", craft: u.id }); } }
        break;
      }
      case "notch": { const u = E.selUnit(S); if (u) { u.notch = PD.clamp(a.v | 0, 0, 5); evs.push({ t: "notch", craft: u.id, v: u.notch }); } else order(S, { a: "thr", v: a.v }, evs); break; }
      case "quit": over(S, evs, "quit", false); break;
    }
  }
  /* T: the next contact in the glasses, nearest first; an incoming missile close in counts as one */
  function nextTarget(S, evs, back) {
    const m = S.me, list = E.contacts(S).map(u => ({ id: u.id, d: PD.dist(m.x, m.y, u.x, u.y) }))
      .concat(E.incoming(S).filter(q => PD.dist(m.x, m.y, q.x, q.y) < 5).map(q => ({ id: q.id, d: PD.dist(m.x, m.y, q.x, q.y) - 100 })))
      .sort((a, b) => a.d - b.d);
    if (!list.length) { m.tgt = null; evs.push({ t: "say", k: "noContacts" }); return; }
    const i = list.findIndex(c => c.id === m.tgt), n = list.length;
    m.tgt = list[i < 0 ? 0 : (i + (back ? n - 1 : 1)) % n].id;
    m.aim = { a: 0, r: 0 };
    evs.push({ t: "target", id: m.tgt });
  }
  /* the ship we escort, or a Kestrel, sails for its destination at its notch */
  function steerConvoy(S, u) {
    const notch = (C.CONVOY_NOTCH[u.cls] || C.CONVOY_NOTCH.supply)[u.notch || 0];
    if (u.dest) { u.ordHdg = PD.angTo(u.x, u.y, u.dest.x, u.dest.y); u.ordSpd = notch; if (PD.dist(u.x, u.y, u.dest.x, u.dest.y) < 0.5) { u.dest = null; u.ordSpd = 0; } }
    else u.ordSpd = 0;
  }
  function collide(S, evs) {
    const m = S.me;
    if (m.sunk) return;
    for (const u of S.u) {
      if (!u.alive || u.cls === "helo") continue;
      const r = (C.SHIPS[u.cls].len + C.BOATS[m.key].len) / 1852 * 0.5;
      if (PD.dist(m.x, m.y, u.x, u.y) < r) {
        if (S.t - (u.bumpT || -1e9) < 20) continue;
        u.bumpT = S.t;
        evs.push({ t: "say", k: "collided" });
        W.hurtUs(S, 2, false, evs); W.hurt(S, u, 1.5, evs, "ours");
        m.spd *= 0.3;
        const a = PD.angTo(u.x, u.y, m.x, m.y); m.x += PD.hx(a) * r; m.y += PD.hy(a) * r;
      }
    }
  }
  /* Surveillance: within 1,500 feet of a merchant with her in the glasses, and the camera does the rest */
  function photos(S, evs) {
    const m = S.me, t = m.tgt !== null ? W.unit(S, m.tgt) : null;
    if (!t || t.photo === undefined || !t.alive) return;
    if (PD.dist(m.x, m.y, t.x, t.y) > C.PHOTO) return;
    if (t.photo) { if (E.say(S, "already" + t.id, 60)) evs.push({ t: "say", k: "already" }); return; }
    t.photo = 1; S.stats.photos++;
    evs.push({ t: "photo", id: t.id, arms: !!C.SHIPS[t.cls].arms, n: S.stats.photos });
  }
  /* Battle Training: the next target comes when the last is down */
  function drones(S) {
    if (!S.droneQ || !S.droneQ.length) return;
    if (S.u.some(u => u.alive && u.side === "wolf")) { S.droneAt = S.t + 20; return; }
    if (S.t < S.droneAt) return;
    S.u.push(M.drone(S, S.droneQ.shift(), S.me));
  }

  /* ---- what counts, mission by mission ---- */
  function goals(S, evs) {
    if (S.phase !== "sea") return;
    const mi = M.get(S.mission), wolves = S.u.filter(u => u.side === "wolf");
    const live = wolves.filter(u => u.alive), m = S.me;
    switch (S.mission) {
      case 1: case 2:
        if (!live.length && (!S.droneQ || !S.droneQ.length)) { S.met = true; evs.push({ t: "goal", k: "allSunk" }); over(S, evs, "goal", true); }
        break;
      case 3: {
        const raiders = wolves;
        if (raiders.every(u => !u.alive)) { S.met = raiders.every(u => !u.gone || u.sinkT !== undefined); evs.push({ t: "goal", k: S.met ? "allRaiders" : "someEscaped" }); over(S, evs, S.met ? "goal" : "escaped", S.met); }
        break;
      }
      case 4:
        if (m.y >= mi.exit.y) { S.met = true; evs.push({ t: "goal", k: "through" }); over(S, evs, "goal", true); }
        break;
      case 5: {
        const tg = S.u.filter(u => u.target);
        if (tg.every(u => !u.alive)) { S.met = tg.every(u => u.sinkT !== undefined); evs.push({ t: "goal", k: S.met ? "bothSunk" : "wargsAway" }); over(S, evs, S.met ? "goal" : "escaped", S.met); }
        break;
      }
      case 6: {
        const c = E.convoy(S);
        if (!c || !c.alive) { evs.push({ t: "goal", k: "convoyLost" }); over(S, evs, "convoyLost", false); break; }
        if (c.x >= mi.dest.x0 && c.y >= mi.dest.y0 && c.y <= mi.dest.y1) { S.met = true; evs.push({ t: "goal", k: "convoyIn" }); over(S, evs, "goal", true); }
        break;
      }
      case 7: {
        const cargo = S.u.filter(u => u.photo !== undefined);
        if (cargo.some(u => !u.alive && u.sinkT !== undefined)) { evs.push({ t: "goal", k: "cargoSunk" }); over(S, evs, "cargoSunk", false); break; }
        if (cargo.every(u => u.photo)) { S.met = true; evs.push({ t: "goal", k: "allPhotos" }); over(S, evs, "goal", true); }
        break;
      }
      case 8: {
        const c = S.u.find(u => u.cls === "supply");
        if (!c || !c.alive) { evs.push({ t: "goal", k: "supplyLost" }); over(S, evs, "convoyLost", false); break; }
        if (c.waiting && PD.dist(m.x, m.y, c.x, c.y) < 3) { c.waiting = false; c.convoy = true; c.ai = { st: "player" }; c.notch = 4; S.joined = true; evs.push({ t: "goal", k: "joined" }); }
        if (!c.waiting && c.x < mi.out.x) { S.met = true; evs.push({ t: "goal", k: "supplyOut" }); over(S, evs, "goal", true); }
        break;
      }
    }
  }
  function over(S, evs, why, ok) {
    if (S.phase !== "sea") return evs;
    S.phase = "over";
    S.end = { why, ok: !!ok, t: S.t };
    S.score = E.score(S);
    evs.push({ t: "over", why, ok: !!ok });
    return evs;
  }

  /* ---- the score, and the rank it earns (1987: main objective, sunk, damaged, time, survival) ---- */
  E.score = S => {
    const mi = M.get(S.mission), w = mi.W, m = S.me;
    const enemies = S.u.filter(u => u.side === "wolf");
    const sunk = S.stats.sunk.length, damaged = enemies.filter(u => u.alive && u.hit).length;
    const ok = !!(S.end && S.end.ok), afloat = !m.sunk && !(S.end && S.end.why === "quit");
    const mins = Math.floor(E.left(S) / 60);
    const surv = (ok || (S.end && S.end.why === "time")) && afloat ? C.SECTIONS.reduce((a, [s]) => a + [1, 0.5, 0][m.dmg[s]], 0) * w.surv : 0;
    const rows = [["Main objective", ok ? w.obj : 0, w.obj], ["Enemies sunk", sunk * w.sunk, w.sunk], ["Enemies damaged", damaged * w.dmg, w.dmg], ["Time bonus", ok ? mins * w.min : 0, w.min], ["Survival bonus", Math.round(surv), w.surv]];
    const total = rows.reduce((a, r) => a + r[1], 0);
    const nEnemy = mi.drones ? mi.drones.n : enemies.length;
    const best = w.obj + nEnemy * w.sunk * (S.mission === 4 || S.mission === 7 || S.mission === 8 ? 0.4 : 1) + 12 * w.surv + (mi.limit / 60) * 0.35 * w.min;
    let rank = Math.floor(PD.clamp(total / best, 0, 1) * mi.max / 0.8);
    rank = Math.min(rank, ok ? mi.max : mi.max - 1);
    /* the total the next rank up needs, if the score alone can earn it */
    const next = Math.max(0, rank) < (ok ? mi.max : mi.max - 1) ? Math.ceil((Math.max(0, rank) + 1) * 0.8 / mi.max * best) : null;
    return { rows, total, rank: C.RANKS[Math.max(0, rank)], rankI: Math.max(0, rank), max: C.RANKS[mi.max], next, code: S.cheated };
  };

  /* the Konami code: magazines full, every section mended, and no damage from here; the score is marked */
  E.konami = S => {
    if (!S || S.phase !== "sea") return false;
    const k = C.BOATS[S.me.key];
    Object.assign(S.me.ammo, { shells: k.shells, msl: k.mslN, chaff: k.chaff });
    S.me.fuel = 1; S.konami = true; S.cheated = true;
    return true;
  };
})();
