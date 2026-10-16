#!/usr/bin/env node
/*
 * PDF Pumasis, played headless by the bot (js/engine/bot.js).
 *
 *   node tools/sim-check.js [--seeds N] [--verbose] [--mission N]
 *
 * Fails if a mission starts anyone on land or its goal cannot be reached by
 * water, if the gun's solution misses a target on a steady course, if chaff
 * at a mile does no better than chaff at five, if a step throws or leaves a
 * number that is not one, if the bot cannot win a mission on any seed, if
 * sinking a merchant does not end Surveillance, if breaking the truce does
 * not bring the Gauntlet's fleet, if a mission played twice from the same
 * seed and orders comes out different, or if one saved and loaded half way
 * differs from one that was not.
 */
"use strict";
const { load } = require("./lib.js");
const PD = load(), C = PD.C, E = PD.Engine, Co = PD.Coast, W = PD.Weapons, M = PD.Missions, Bot = PD.Bot;
const args = process.argv.slice(2);
const seeds = +(args[args.indexOf("--seeds") + 1] || 2) || 2;
const only = args.includes("--mission") ? +args[args.indexOf("--mission") + 1] : 0;
const verbose = args.includes("--verbose");
let fail = 0;
const bad = msg => { console.log("FAIL " + msg); fail++; };
const ok = msg => console.log("ok   " + msg);

/* ---- the chart: everyone on water, the goal reachable ---- */
{
  const CELL = 0.5, NX = Math.ceil(Co.W / CELL), NY = Math.ceil(Co.H / CELL);
  const wet = new Uint8Array(NX * NY);
  for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) wet[j * NX + i] = Co.near((i + 0.5) * CELL, (j + 0.5) * CELL, 0.3) ? 0 : 1;
  const reach = (x, y, win) => {
    const seen = new Uint8Array(NX * NY), q = [], i0 = Math.floor(x / CELL), j0 = Math.floor(y / CELL);
    q.push(j0 * NX + i0); seen[j0 * NX + i0] = 1;
    while (q.length) { const c = q.pop(), i = c % NX, j = (c - i) / NX; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + a, jj = j + b; if (ii < 0 || jj < 0 || ii >= NX || jj >= NY) continue; const px = (ii + 0.5) * CELL, py = (jj + 0.5) * CELL; if (px < win[0] || py < win[1] || px > win[2] || py > win[3]) continue; const n = jj * NX + ii; if (!seen[n] && wet[n]) { seen[n] = 1; q.push(n); } } }
    return (px, py) => seen[Math.floor(py / CELL) * NX + Math.floor(px / CELL)] === 1;
  };
  for (const mi of M.LIST) {
    const S = E.newMission(mi.id, { seed: 3 }), m = S.me;
    if (Co.near(m.x, m.y, 0.3)) bad(`chart: mission ${mi.id} starts our boat on land`);
    for (const u of S.u) if (u.cls !== "helo" && Co.near(u.x, u.y, 0.15)) bad(`chart: mission ${mi.id}: ${u.name} (${u.cls}) starts on land at ${u.x.toFixed(1)},${u.y.toFixed(1)}`);
    const R = reach(m.x, m.y, S.win);
    const goals = mi.exit ? [[200, mi.exit.y + 0.5]] : mi.dest ? [[mi.dest.x0 + 0.5, (mi.dest.y0 + mi.dest.y1) / 2]] : mi.supply ? [[mi.supply.x, mi.supply.y], [mi.out.x - 1, 178]] : [];
    for (const [gx, gy] of goals) if (!R(gx, gy)) bad(`chart: mission ${mi.id}: ${gx},${gy} cannot be reached by water`);
    for (const u of S.u) if (u.alive && u.cls !== "helo" && !R(u.x, u.y)) bad(`chart: mission ${mi.id}: ${u.name} cannot be reached by water`);
  }
  ok(`chart: ${Co.LANDS.length} lands, ${M.LIST.length} missions checked`);
}

/* ---- the gun: laying the lead on a target that holds its course, the shells hit ---- */
{
  const r = PD.mulberry(11);
  let shots = 0, hits = 0;
  for (let i = 0; i < 200; i++) {
    const S = E.newMission(1, { seed: 500 + i }), m = S.me;
    S.u = []; S.droneQ = [];
    Object.assign(m, { x: 92, y: 80, spd: 0, thr: 0, hdg: r() * PD.TAU }); m.ordHdg = m.hdg;
    const d = 1 + r() * (C.GUN.eff - 1), b = m.hdg + (r() - 0.5) * 2.4;
    const t = M.unit(S, { cls: PD.pick(r, ["cur", "lupa1", "warg"]), x: m.x + PD.hx(b) * d, y: m.y + PD.hy(b) * d, ai: { st: "route", route: [] } });
    t.hdg = t.ordHdg = r() * PD.TAU; t.spd = t.ordSpd = r() * 30; t.hp = 99; t.ai.st = "player";
    S.u.push(t); m.tgt = t.id; m.weapon = "gun"; m.mode = "aim";
    const L = W.lead(S, t); m.aim.a = L.a; m.aim.r = L.r;
    const before = S.stats.shellHits;
    E.tick(S, { acts: [{ a: "fire" }] });
    for (let k = 0; k < 2000 && S.shells.length; k++) E.tick(S, {});
    shots++; if (S.stats.shellHits > before) hits++;
  }
  (hits / shots >= 0.8 ? ok : bad)(`gun: the solution hits ${hits} of ${shots} shots`);
}

/* ---- chaff: best at a mile, crossing ---- */
{
  const p1 = W.decoyP(1, 1), p5 = W.decoyP(5, 1), p0 = W.decoyP(0.1, 1), pHead = W.decoyP(1, 0);
  (p1 > p5 * 3 && p1 > p0 && p1 > pHead ? ok : bad)(`chaff: at a mile crossing ${p1.toFixed(2)}, at five ${p5.toFixed(2)}, too late ${p0.toFixed(2)}, head on ${pHead.toFixed(2)}`);
}

/* ---- the bot plays ---- */
const finite = (o, path = "S", depth = 0) => {
  if (depth > 6 || o === null) return null;
  if (typeof o === "number") return isFinite(o) ? null : path;
  if (typeof o !== "object") return null;
  for (const k of Object.keys(o)) { const r = finite(o[k], path + "." + k, depth + 1); if (r) return r; }
  return null;
};
const hash = S => { const s = JSON.stringify([S.t, S.me, S.u.map(u => [u.x, u.y, u.hp, u.alive]), S.msl.length, S.stats]); let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
function play(id, seed, { record = null, replay = null, saveAt = -1, steps = 400000 } = {}) {
  let S = E.newMission(id, { seed });
  const mem = Bot.make(), log = [];
  let n = 0;
  for (; n < steps && S.phase === "sea"; n++) {
    const cmd = replay ? (replay[n] || {}) : Bot.cmd(S, mem);
    if (record) record.push(JSON.parse(JSON.stringify(cmd)));
    if (n === saveAt) S = JSON.parse(JSON.stringify(S));
    if (replay && cmd.aimSet) { S.me.aim.a = cmd.aimSet[0]; S.me.aim.r = cmd.aimSet[1]; }
    if (record && !replay) cmd.aimSet = [S.me.aim.a, S.me.aim.r], record[record.length - 1].aimSet = cmd.aimSet;
    E.tick(S, cmd);
    if (n % 500 === 0) { const f = finite(S); if (f) throw new Error(`${f} is not a number at step ${n}`); }
  }
  return { S, n };
}
for (const mi of M.LIST) {
  if (only && mi.id !== only) continue;
  let wins = 0;
  const lines = [];
  for (let s = 1; s <= seeds; s++) {
    try {
      const { S, n } = play(mi.id, s * 7919);
      const sc = S.score || E.score(S);
      if (S.end && S.end.ok) wins++;
      lines.push(`seed ${s}: ${S.end ? S.end.why : "unfinished"} after ${C.hm(E.elapsed(S))} (${n} steps), ${S.stats.sunk.length} sunk, ${S.stats.hitsUs} hits on us, holed ${PD.Boats.holed(S.me)}, fuel ${Math.round(S.me.fuel * 100)}%, ${sc.total} pts, ${sc.rank}`);
    } catch (e) { bad(`mission ${mi.id} seed ${s}: ${e.stack.split("\n").slice(0, 3).join(" | ")}`); }
  }
  (wins ? ok : bad)(`mission ${mi.id} ${mi.name}: the bot won ${wins} of ${seeds}`);
  if (verbose || !wins) for (const l of lines) console.log("       " + l);
}

/* ---- Surveillance: a merchant sunk ends it ---- */
{
  const S = E.newMission(7, { seed: 5 }), c = S.u.find(u => u.photo !== undefined);
  W.hurt(S, c, 99, [], "ours");
  E.tick(S, {});
  (S.phase === "over" && S.end.why === "cargoSunk" ? ok : bad)(`surveillance: a merchant sunk ends the mission (${S.end && S.end.why})`);
}
/* ---- the Gauntlet: a shot at the truce brings the fleet ---- */
{
  const S = E.newMission(8, { seed: 5 }), w = S.u.find(u => u.side === "wolf");
  S.me.x = w.x - 4; S.me.y = w.y; S.me.tgt = w.id; S.me.weapon = "gun";
  E.tick(S, { acts: [{ a: "fire" }] });
  for (let k = 0; k < 50; k++) E.tick(S, {});
  const hunting = S.u.filter(u => u.side === "wolf" && u.ai.st === "hunt").length, all = S.u.filter(u => u.side === "wolf").length;
  (S.provoked && hunting === all ? ok : bad)(`gauntlet: one shot, and ${hunting} of ${all} Wolf boats come`);
}
/* ---- the same orders, the same mission; saved and loaded half way, the same again ---- */
{
  const rec = [];
  const a = play(3, 4242, { record: rec, steps: 30000 });
  const b = play(3, 4242, { replay: rec, steps: rec.length });
  const c = play(3, 4242, { replay: rec, steps: rec.length, saveAt: Math.floor(rec.length / 2) });
  const ha = hash(a.S), hb = hash(b.S), hc = hash(c.S);
  (ha === hb ? ok : bad)(`replay: ${rec.length} steps, hash ${ha.toString(16)} ${ha === hb ? "matches" : "differs: " + hb.toString(16)}`);
  (ha === hc ? ok : bad)(`save and load half way: ${ha === hc ? "the same" : "differs"}`);
}
console.log(fail ? `${fail} failed` : "all good");
process.exit(fail ? 1 : 0);
