/* PDF Pumasis -- how everything on the water moves: our hydrofoil on and off
 * her foils, the ships, the helicopters.
 *
 * The throttle has six notches. Below the hull speed she runs hullborne,
 * low and slow; ask for more and she comes up to it, then climbs onto her
 * foils (half a minute, longer in a hard turn) and runs at forty-odd knots
 * with her hull clear of the water. Take the throttle back and she settles.
 * Foilborne, more of her hull is out where a hit finds it, but a holed hull
 * keeps her up: she only sinks when she comes down off the foils (1987).
 * Fuel goes faster on the foils, and faster again from a holed tank. She
 * cannot run aground: the depth sounder stops her short (the DEPTH lamp). */
"use strict";
(() => {
  const C = PD.C, Co = PD.Coast, B = PD.Boats = {};

  B.make = (key, x, y, hdg) => {
    const k = C.BOATS[key], dmg = {};
    for (const [s] of C.SECTIONS) dmg[s] = 0;
    return { key, name: k.name, x, y, hdg, ordHdg: hdg, spd: 0, thr: 0, foil: "hull", foilT: 0, fuel: 1, dmg, auto: false, route: [],
      ammo: { shells: k.shells, msl: k.mslN, chaff: k.chaff }, weapon: "gun", mode: "steer", tgt: null, aim: { a: 0, r: 0 }, gunCd: 0, depth: false, sunk: false, foilOnly: false };
  };
  /* the damage report, read */
  B.lvl = (m, s) => m.dmg[s] || 0;
  B.holed = m => C.HULL.filter(s => m.dmg[s] >= 2).length;
  B.radarMax = m => C.RADAR_MAX[B.lvl(m, "radar")];
  /* the top speed the engines allow now */
  B.topNotch = m => B.lvl(m, "eng") >= 2 ? 3 : 5;
  B.target = m => {
    const k = C.BOATS[m.key];
    let v = k.notch[Math.min(m.thr, B.topNotch(m))];
    if (B.lvl(m, "eng") === 1) v = Math.min(v, k.notch[5] * 0.78);
    if (B.lvl(m, "eng") >= 2) v = Math.min(v, k.notch[5] * 0.55);
    if (m.fuel <= 0) v = 0;
    return v;
  };

  /* one step for our boat: dt seconds; dHdg the helm this step. Returns events. */
  B.step = (S, m, dt, dHdg, evs) => {
    const k = C.BOATS[m.key], want = B.target(m), turnHard = Math.abs(PD.angDiff(m.hdg, m.ordHdg)) > 20 * PD.DEG;
    /* the helm: manual steering takes her off the autopilot */
    if (dHdg) { if (m.auto) { m.auto = false; m.route = []; evs.push({ t: "autoOff" }); } m.ordHdg = PD.normAng(m.ordHdg + dHdg); }
    if (m.auto && m.route.length) {
      const p = m.route[0], d = PD.dist(m.x, m.y, p.x, p.y);
      if (d < Math.max(0.3, m.spd * PD.KN * dt * 2)) { m.route.shift(); if (!m.route.length) { m.auto = false; evs.push({ t: "arrived" }); } }
      else m.ordHdg = Co.clear(m.x, m.y, PD.angTo(m.x, m.y, p.x, p.y), Math.min(3, d));
    }
    /* the foils */
    if (m.foil === "hull") {
      if (want > k.hull && m.spd >= k.hull - 0.6 && !(B.lvl(m, "eng") >= 2 && m.wasDown)) { m.foil = "up"; m.foilT = 0; evs.push({ t: "takeoff" }); }
    } else if (m.foil === "up") {
      m.foilT += dt * (turnHard ? 0.55 : 1);
      if (want <= k.hull) { m.foil = "hull"; }
      else if (m.foilT >= C.TAKEOFF) { m.foil = "foil"; m.spd = Math.max(m.spd, k.lift); evs.push({ t: "foilborne" }); }
    } else if (m.foil === "foil") {
      if (want < k.lift - 2) { m.foil = "down"; m.foilT = 0; }
    } else if (m.foil === "down") {
      m.foilT += dt * (turnHard ? 1.6 : 1);
      if (want >= k.lift) m.foil = "foil";
      else if (m.foilT >= C.LANDING) { m.foil = "hull"; m.spd = Math.min(m.spd, k.hull); m.wasDown = true; evs.push({ t: "hullborne" }); }
    }
    /* speed toward what the notch and the foils allow */
    const cap = m.foil === "foil" ? want : m.foil === "up" ? k.hull + (k.lift - k.hull) * Math.min(1, m.foilT / C.TAKEOFF) : m.foil === "down" ? Math.max(k.hull, k.lift - (k.lift - k.hull) * m.foilT / C.LANDING) : Math.min(want, k.hull);
    const acc = (m.foil === "foil" ? C.ACCEL[1] : C.ACCEL[0]) * dt;
    m.spd = m.spd < cap ? Math.min(cap, m.spd + acc) : Math.max(cap, m.spd - acc * 1.6);
    /* the helm swings her at the rate the foils allow */
    const rate = (m.foil === "foil" ? k.turn[1] : m.foil === "hull" ? k.turn[0] : k.turn[0] * 0.6) * PD.DEG * dt;
    m.hdg = PD.turnToward(m.hdg, m.ordHdg, rate);
    /* fuel */
    const fk = [1, 1.5, 2.2][B.lvl(m, "fuel")];
    const burn = m.foil === "foil" || m.foil === "up" ? (0.55 + 0.45 * m.spd / k.notch[5]) / (k.fuelH[0] * 3600) : (0.25 + 0.75 * m.spd / k.hull) / (k.fuelH[1] * 3600);
    if (m.fuel > 0) { const was = m.fuel; m.fuel = Math.max(0, m.fuel - burn * fk * dt); if (was > 0.15 && m.fuel <= 0.15) evs.push({ t: "fuelLow" }); if (m.fuel <= 0) evs.push({ t: "fuelOut" }); }
    /* the move, unless the sounder stops her short of the rocks or the edge of the operations area */
    const d = m.spd * PD.KN * dt, nx = m.x + PD.hx(m.hdg) * d, ny = m.y + PD.hy(m.hdg) * d;
    const ahead = Co.rayLand(m.x, m.y, m.hdg, 1.4, 0.2);
    m.depth = !!ahead;
    const win = S.win, outside = nx < win[0] || ny < win[1] || nx > win[2] || ny > win[3];
    if ((ahead && ahead.d < 0.35) || Co.near(nx, ny, 0.2)) { m.spd = Math.min(m.spd, 3); if (!S.depthSaid || S.t - S.depthSaid > 30) { S.depthSaid = S.t; evs.push({ t: "depth" }); } return; }
    if (outside && !S.exitOk) { m.spd = Math.min(m.spd, 4); if (!S.edgeSaid || S.t - S.edgeSaid > 30) { S.edgeSaid = S.t; evs.push({ t: "edge" }); } m.x = PD.clamp(nx, win[0], win[2]); m.y = PD.clamp(ny, win[1], win[3]); return; }
    m.x = nx; m.y = ny;
  };

  /* ---- a ship, a helicopter: toward its ordered heading and speed ---- */
  B.unitStep = (S, u, dt) => {
    if (u.cls === "helo") {
      const sp = C.HELO.notch[u.notch] * PD.KN * dt;
      if (u.dest) { const d = PD.dist(u.x, u.y, u.dest.x, u.dest.y); u.hdg = PD.angTo(u.x, u.y, u.dest.x, u.dest.y); if (d <= sp) { u.x = u.dest.x; u.y = u.dest.y; u.dest = null; u.spd = 0; } else { u.x += PD.hx(u.hdg) * sp; u.y += PD.hy(u.hdg) * sp; u.spd = C.HELO.notch[u.notch]; } }
      else u.spd = 0;
      return;
    }
    const k = C.SHIPS[u.cls], big = k.len > 90;
    /* the wheel: a little boat turns fast, a merchant slowly */
    if (S.t >= (u.clearT || 0)) { u.clearT = S.t + 3; u.steer = u.spd > 1 ? Co.clear(u.x, u.y, u.ordHdg, big ? 4 : 2.5) : u.ordHdg; }
    const rate = (big ? 1.2 : k.len > 50 ? 2.6 : 4) * PD.DEG * dt;
    u.hdg = PD.turnToward(u.hdg, u.steer === undefined ? u.ordHdg : u.steer, rate);
    const acc = (big ? 0.12 : 0.6) * dt;
    u.spd = u.spd < u.ordSpd ? Math.min(u.ordSpd, u.spd + acc) : Math.max(u.ordSpd, u.spd - acc * 1.5);
    const d = u.spd * PD.KN * dt, nx = u.x + PD.hx(u.hdg) * d, ny = u.y + PD.hy(u.hdg) * d;
    if (Co.near(nx, ny, big ? 0.35 : 0.2)) { u.spd *= 0.5; u.clearT = 0; return; }
    u.x = nx; u.y = ny;
  };
})();
