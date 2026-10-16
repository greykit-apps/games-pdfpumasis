/* PDF Pumasis -- how the Empire's boats, the merchants and our own cutters
 * behave.
 *
 * Each has an order (u.ai.st):
 *   route    sail a list of points, then stop, loop or leave (escaped)
 *   flee     run for a point at full speed, and are gone when they reach it
 *   patrol   go back and forth between two points
 *   hunt     come for us (or the ship we escort) and fight
 *   passive  a truce: patrol, and fight only when provoked (the Gauntlet)
 *   escort   our cutters: go for the nearest enemy we know of
 * A Wolf boat on route, flee or patrol that finds us within its radar comes
 * hunting, unless its orders are to run. Missile boats fire from range and
 * close only when their missiles are gone; gunboats close. They never use
 * chaff (1987). */
"use strict";
(() => {
  const C = PD.C, W = PD.Weapons, A = PD.AI = {};

  /* who a Wolf boat would rather shoot: us, or the ship we escort if it is nearer */
  function prey(S, u) {
    let best = S.me.sunk ? null : S.me, bd = best ? PD.dist(u.x, u.y, S.me.x, S.me.y) : 1e9;
    for (const v of S.u) if (v.alive && v.side === "ours" && v.cls !== "helo") { const d = PD.dist(u.x, u.y, v.x, v.y) * (v.cls === "patrol" ? 1.4 : 0.9); if (d < bd) { bd = d; best = v; } }
    return best;
  }
  const at = (u, p, r = 0.6) => PD.dist(u.x, u.y, p.x, p.y) < r;

  A.step = (S, u, evs) => {
    const ai = u.ai, k = C.SHIPS[u.cls];
    if (!u.alive || u.cls === "helo" || ai.st === "player") return;
    /* a Wolf boat that finds us comes for us, unless it is running or under truce */
    if (u.side === "wolf" && (ai.st === "route" || ai.st === "patrol") && !ai.noHunt) {
      const d = PD.dist(u.x, u.y, S.me.x, S.me.y);
      if (d < (ai.sense || C.WOLF_RADAR) || ai.alert) { ai.st = "hunt"; evs.push({ t: "contactHunts", id: u.id }); }
    }
    if (ai.st === "passive" && S.provoked) ai.st = "hunt";
    if (ai.st === "route" || ai.st === "flee") {
      const p = ai.route[ai.wi];
      if (!p) return;
      u.ordHdg = PD.angTo(u.x, u.y, p.x, p.y); u.ordSpd = ai.st === "flee" ? k.top * 0.92 : (ai.spd || k.cruise);
      if (at(u, p, ai.st === "flee" ? 1.2 : 0.8)) {
        ai.wi++;
        if (ai.wi >= ai.route.length) {
          if (ai.loop) ai.wi = 0;
          else if (ai.leave) { u.alive = false; u.gone = true; evs.push({ t: "escaped", id: u.id, cls: u.cls, side: u.side }); }
          else { u.ordSpd = 0; ai.done = true; }
        }
      }
      /* running boats still shoot back at what comes close */
      if (u.side === "wolf" && ai.st === "flee") fight(S, u, evs, true);
      return;
    }
    if (ai.st === "patrol" || ai.st === "passive") {
      const p = ai.route[ai.wi % ai.route.length];
      u.ordHdg = PD.angTo(u.x, u.y, p.x, p.y); u.ordSpd = ai.spd || k.cruise * 0.7;
      if (at(u, p, 1)) ai.wi++;
      return;
    }
    if (ai.st === "hunt") return fight(S, u, evs, false);
    if (ai.st === "escort") {
      let best = null, bd = 1e9;
      for (const v of S.u) if (v.alive && v.side === "wolf" && v.seenT !== undefined && S.t - v.seenT < 30) { const d = PD.dist(u.x, u.y, v.x, v.y); if (d < bd) { bd = d; best = v; } }
      if (best && bd < 25) { u.ordHdg = PD.angTo(u.x, u.y, best.x, best.y); u.ordSpd = bd < 1.5 ? 8 : k.top; W.enemyGun(S, u, best, evs); }
      else if (ai.home) { u.ordHdg = PD.angTo(u.x, u.y, ai.home.x, ai.home.y); u.ordSpd = at(u, ai.home, 2) ? 0 : k.cruise; }
    }
  };

  /* close or stand off, and shoot */
  function fight(S, u, evs, running) {
    const k = C.SHIPS[u.cls], t = prey(S, u);
    if (!t) { u.ordSpd = k.cruise * 0.5; return; }
    const d = PD.dist(u.x, u.y, t.x, t.y), brg = PD.angTo(u.x, u.y, t.x, t.y);
    if (!running) {
      const mk = k.msl && u.mslLeft > 0 ? C.MSL[k.msl[0]] : null;
      /* missile boats hold at most of their missiles' reach; gunboats close to their guns', weaving */
      const want = mk ? mk.range * 0.6 : k.gun ? k.gun[0] * 0.6 : 0.5;
      if (d > want) { u.ordHdg = brg; u.ordSpd = k.top; }
      else { u.ordHdg = PD.normAng(brg + (u.id % 2 ? 1 : -1) * 70 * PD.DEG); u.ordSpd = k.top * 0.8; }
    }
    if (d < C.WOLF_RADAR || u.ai.alert) {
      if (!W.enemyMissile(S, u, t, evs) && k.gun) W.enemyGun(S, u, t, evs);
      else if (k.gun && d < k.gun[0]) W.enemyGun(S, u, t, evs);
    }
  }
})();
