/* PDF Pumasis -- a captain for the machine: it plays every mission headless
 * for tools/sim-check.js, and the Mission 0 demo behind the title.
 *
 * It sees what a player could: contacts on the radar and from the Kestrels,
 * the class of a ship in the glasses. It throws chaff at a missile a mile
 * out and turns across its path; it fires a missile at what is worth one
 * and walks the gun onto the rest, laying the lead as the corrector bars
 * ask; and it sails each mission's errand. It never touches the Empire's
 * truce in the Gauntlet. It writes its aim straight into the state, which
 * a player does with the keys. */
"use strict";
(() => {
  const C = PD.C, E = PD.Engine, W = PD.Weapons, M = PD.Missions, Bot = PD.Bot = {};
  const P = (x, y) => ({ x, y });
  const PATH = {
    4: [P(202, 60), P(203, 96), P(199, 132), P(196, 199)],
    8: [P(214, 176), P(240, 170), P(270, 160), P(296, 152), P(309, 151)],
  };

  Bot.make = () => ({ chaffed: {}, fired: {}, wp: 0, set: false, tcWish: 6 });

  Bot.cmd = (S, mem) => {
    const m = S.me, acts = [], cmd = { dHdg: 0, acts, fireHeld: false };
    if (S.phase !== "sea" || m.sunk) return cmd;
    const mi = M.get(S.mission);
    let goal = null, thr = 5;
    /* ---- the errand ---- */
    if (!mem.set) {
      mem.set = true;
      const hs = E.helos(S);
      if (S.mission === 6) { acts.push({ a: "sel", v: 3 }, { a: "notch", v: 4 }, { a: "dest", x: 198, y: 170 }); if (hs[0]) acts.push({ a: "sel", v: 1 }, { a: "dest", x: 70, y: 120 }); if (hs[1]) acts.push({ a: "sel", v: 2 }, { a: "dest", x: 70, y: 96 }); acts.push({ a: "sel", v: 0 }); }
      if (S.mission === 5 && hs[0]) acts.push({ a: "sel", v: 1 }, { a: "dest", x: 112, y: 112 }, { a: "sel", v: 0 });
      if (S.mission === 7) { if (hs[0]) acts.push({ a: "sel", v: 1 }, { a: "dest", x: 150, y: 130 }); if (hs[1]) acts.push({ a: "sel", v: 2 }, { a: "dest", x: 150, y: 190 }); acts.push({ a: "sel", v: 0 }); }
      if (S.mission === 4 && hs[0]) acts.push({ a: "sel", v: 1 }, { a: "dest", x: 202, y: 110 }, { a: "sel", v: 0 });
      if (S.mission === 8 && hs[0]) acts.push({ a: "sel", v: 1 }, { a: "dest", x: 300, y: 152 }, { a: "sel", v: 0 });
    }
    const contacts = E.contacts(S).filter(u => u.alive);
    const hostile = contacts.filter(u => W.hostile(S, u) || (u.side === "wolf" && S.mission !== 8));
    const near = (list, p = m) => list.slice().sort((a, b) => PD.dist(p.x, p.y, a.x, a.y) - PD.dist(p.x, p.y, b.x, b.y))[0] || null;
    const c = E.convoy(S);
    if (PATH[S.mission] && !(S.mission === 8 && S.joined)) {
      const path = PATH[S.mission]; while (mem.wp < path.length - 1 && PD.dist(m.x, m.y, path[mem.wp].x, path[mem.wp].y) < 3) mem.wp++;
      goal = path[mem.wp];
    }
    if (S.mission === 8 && S.joined && c) {
      if (!mem.out) { mem.out = true; acts.push({ a: "sel", v: 3 }, { a: "notch", v: 4 }, { a: "dest", x: 240, y: 171 }); acts.push({ a: "sel", v: 0 }); }
      if (!c.dest && c.x > 230) acts.push({ a: "sel", v: 3 }, { a: "dest", x: 193, y: 178 }, { a: "sel", v: 0 });
      goal = P(c.x - 1.5, c.y + 1.2); thr = PD.dist(m.x, m.y, goal.x, goal.y) > 2 ? 4 : 2;
    }
    if (S.mission === 6 && c) {
      const t = near(hostile, c);
      goal = t && PD.dist(c.x, c.y, t.x, t.y) < 30 ? P((c.x + t.x) / 2, (c.y + t.y) / 2) : P(c.x + 3, c.y + 2);
      thr = PD.dist(m.x, m.y, goal.x, goal.y) > 4 ? 4 : 2;
      if (!c.dest) acts.push({ a: "sel", v: 3 }, { a: "dest", x: 198, y: 170 }, { a: "sel", v: 0 });
    }
    if (S.mission === 7) {
      const todo = S.u.filter(u => u.alive && u.photo === 0 && E.known(S, u));
      const t = near(todo);
      if (t) { goal = P(t.x, t.y); if (PD.dist(m.x, m.y, t.x, t.y) < 2 && m.tgt !== t.id) acts.push({ a: "tgt", id: t.id }); thr = PD.dist(m.x, m.y, t.x, t.y) < 1 ? 2 : 5; }
      else {
        const hs = E.helos(S), pts = [P(130, 120), P(180, 120), P(180, 200), P(130, 200), P(160, 160)];
        hs.forEach((h, i) => { if (!h.dest) { const p = pts[(mem.hp = (mem.hp || 0) + 1 + i) % pts.length]; acts.push({ a: "sel", v: i + 1 }, { a: "dest", x: p.x, y: p.y }, { a: "sel", v: 0 }); } });
        if (!goal) goal = P(165, 160);
      }
    }
    /* ---- the fight ---- */
    let shooting = false;
    if (S.mission !== 8 || S.provoked) {
      const pool = S.mission === 5 ? hostile.filter(u => u.cls === "warg").concat(hostile.filter(u => PD.dist(m.x, m.y, u.x, u.y) < 8)) : hostile;
      const t = near(pool.length ? pool : hostile);
      if (t) {
        const d = PD.dist(m.x, m.y, t.x, t.y), k = C.MSL[C.BOATS[m.key].msl];
        const inAir = S.msl.some(q => q.side === "ours" && q.tgt === t.id);
        if (m.ammo.msl > 0 && d > k.min + 0.5 && d < k.range * 0.85 && !inAir && t.hp > 1.2 && (mem.fired[t.id] || 0) < 2 && S.msl.filter(q => q.side === "ours").length < C.MSL_TRACK) {
          if (m.tgt !== t.id) acts.push({ a: "tgt", id: t.id });
          if (m.weapon !== "msl") acts.push({ a: "weapon", v: "msl" });
          acts.push({ a: "fire" }); mem.fired[t.id] = (mem.fired[t.id] || 0) + 1; shooting = true;
        } else if (d < C.GUN.eff + 1 && m.ammo.shells > 0) {
          if (m.tgt !== t.id) acts.push({ a: "tgt", id: t.id });
          if (m.weapon !== "gun") acts.push({ a: "weapon", v: "gun" });
          if (m.mode !== "aim") acts.push({ a: "mode" });
          if (m.tgt === t.id) { const L = W.lead(S, t); m.aim.a = L.a; m.aim.r = L.r; cmd.fireHeld = true; }
          shooting = true;
        }
        if (!goal || S.mission === 1 || S.mission === 2 || S.mission === 3 || S.mission === 5) {
          /* close to gun range, and then circle */
          goal = d > 4 ? P(t.x, t.y) : P(m.x + PD.hx(PD.angTo(t.x, t.y, m.x, m.y) + 1.2) * 3, m.y + PD.hy(PD.angTo(t.x, t.y, m.x, m.y) + 1.2) * 3);
        }
      }
    }
    if (!goal) {
      const w = S.win, mid = S.mission === 3 ? P(176, 134) : S.mission === 5 ? P(110, 130) : P((w[0] + w[2]) / 2, (w[1] + w[3]) / 2);
      goal = mem.roam && PD.dist(m.x, m.y, mem.roam.x, mem.roam.y) > 3 ? mem.roam : (mem.roam = P(PD.clamp(mid.x + (PD.rand(mem.r || (mem.r = { rs: S.seed })) - 0.5) * 40, w[0] + 6, w[2] - 6), PD.clamp(mid.y + (PD.rand(mem.r) - 0.5) * 40, w[1] + 6, w[3] - 6)));
    }
    /* the truce: give its boats room */
    if (S.mission === 8 && !S.provoked) {
      const pz = near(S.u.filter(u => u.alive && u.side === "wolf"));
      if (pz && PD.dist(m.x, m.y, pz.x, pz.y) < 3.2) { const a = PD.angTo(pz.x, pz.y, m.x, m.y); goal = P(m.x + PD.hx(a) * 2 + (goal ? (goal.x - m.x) * 0.05 : 0), m.y + PD.hy(a) * 2 + (goal ? (goal.y - m.y) * 0.05 : 0)); }
    }
    /* ---- a missile coming: chaff at a mile, and across its path ---- */
    const inc = E.incoming(S).sort((a, b) => PD.dist(m.x, m.y, a.x, a.y) - PD.dist(m.x, m.y, b.x, b.y))[0];
    if (inc) {
      const d = PD.dist(m.x, m.y, inc.x, inc.y), across = PD.normAng(inc.hdg + (PD.angDiff(inc.hdg, m.hdg) > 0 ? 1 : -1) * Math.PI / 2);
      if (d < 4) { goal = P(m.x + PD.hx(across) * 3, m.y + PD.hy(across) * 3); thr = 5; }
      if (d < 1.25 && d > 0.5 && !mem.chaffed[inc.id] && m.ammo.chaff > 0) { mem.chaffed[inc.id] = 1; acts.push({ a: "weapon", v: "chaff" }, { a: "fire" }); if (!shooting) acts.push({ a: "weapon", v: "gun" }); }
    }
    /* steer for the goal: the autopilot, kept fresh */
    if (goal && (!m.auto || !m.route.length || PD.dist(m.route[0].x, m.route[0].y, goal.x, goal.y) > 1.5)) acts.push({ a: "sel", v: 0 }, { a: "dest", x: goal.x, y: goal.y });
    if (m.thr !== thr) acts.push({ a: "thr", v: thr });
    /* time: fast when nothing is near */
    const busy = hostile.some(u => PD.dist(m.x, m.y, u.x, u.y) < 30) || E.inFlight(S);
    const want = busy ? 1 : mem.tcWish;
    if (S.tcReq !== want) acts.push({ a: "tc", v: want });
    return cmd;
  };
})();
