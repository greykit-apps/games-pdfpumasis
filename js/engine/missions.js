/* PDF Pumasis -- the eight missions, as in 1987, set on Pumacity's coast.
 *
 * Every mission is open from the first; each is played alone and scored
 * alone, on its own scale up to its own highest rank, and the highest needs
 * the main objective done. A mission names its boat, the window of the chart
 * it is sailed in, the hour, the time it allows, who is out there and what
 * they are doing, and what counts.
 *
 * The 1987 originals: Battle Training, Graduation Exercise, Terrorist
 * Attack, A Better Part of Valor, Search for Terrorists, Supply Convoy,
 * Surveillance Mission, Jihad. Their times and forces are ours (UNCERTAIN). */
"use strict";
(() => {
  const C = PD.C, Co = PD.Coast, M = PD.Missions = {};
  const H = 3600;
  const NAMES = ["Grimtooth", "Ashmaw", "Rendfang", "Gorehowl", "Blackpelt", "Nightjaw", "Scarhide", "Bonegnaw", "Frostfang", "Ironmaw", "Duskhunter", "Greyback",
    "Bloodmoon", "Snarl", "Ravager", "Stalker", "Ripjaw", "Hollowfang", "Coldeye", "Thornpelt", "Wolfsbane", "Packmaster", "Vargr", "Skoll", "Hati", "Fenhowl", "Murk", "Bleakwind"];
  const CARGO = ["Aldbury", "Marisol", "Cape Orrin", "Northwind", "Halvard", "Selkie", "Tamsin Rose", "Old Harbour", "Brightwater", "Calloway"];
  const P = (x, y) => ({ x, y });

  M.LIST = [
    { id: 1, name: "Battle Training", where: "The Tawny Keys range", boat: "pumasis", hour: 9, limit: 1.5 * H, win: [20, 28, 165, 120],
      start: [92, 40, 180], helos: [], max: 2, W: { obj: 1000, sunk: 100, dmg: 50, min: 4, surv: 20 },
      brief: "Ten simulated enemies, one at a time. Find each on the radar, put it in the glasses, and sink it.",
      goal: "Sink all ten targets",
      units: () => [], drones: { n: 10, kinds: ["cur", "lupa1", "cur", "lupa1", "warg", "cur", "lupa1", "lupa1", "cur", "warg"], at: [4, 6], all: false } },
    { id: 2, name: "Graduation Exercise", where: "The Tawny Keys range", boat: "pumasis", hour: 13, limit: 1.5 * H, win: [20, 28, 165, 120],
      start: [92, 40, 180], helos: [], max: 2, W: { obj: 1000, sunk: 100, dmg: 50, min: 4, surv: 20 },
      brief: "The same ten targets, all at once. Speed counts more than staying unscratched.",
      goal: "Sink all ten targets",
      units: () => [], drones: { n: 10, kinds: ["cur", "lupa1", "cur", "lupa1", "warg", "cur", "lupa1", "lupa1", "cur", "warg"], at: [9, 24], all: true } },
    { id: 3, name: "Raider Strike", where: "Off Cape Claw", boat: "lynx", hour: 5.5, limit: 3 * H, win: [128, 28, 236, 168],
      start: [190, 142, 330], helos: [], max: 3, W: { obj: 2000, sunk: 200, dmg: 100, min: 2, surv: 50 },
      brief: "Wolf raiders have shelled the cape's towns and are running for Lupenmark in four groups. Catch them before they reach Wolf waters. Two PDF cutters are coming down from the Keys.",
      goal: "Sink every raider before it escapes",
      units: r => {
        const g = (cls, x, y, route) => ({ cls, x, y, ai: { st: "flee", route, leave: true } });
        const toK = [P(166, 118), P(178, 132), P(196, 124), P(204, 106)], toT = [P(166, 118), P(176, 134), P(200, 144), P(206, 151)];
        return [g("lupa1", 150, 52, toK), g("cur", 151, 55, toK),
          g("jackal", 153, 66, toT), g("jackal", 154, 69, toT), g("cur", 152, 71, toT),
          g("lupa2", 155, 82, toK), g("cur", 156, 85, toK),
          ...(r() < 0.5 ? [g("lupa1", 157, 96, toT), g("jackal", 158, 99, toT)] : [g("lupa1", 157, 96, toT)]),
          { cls: "patrol", x: 144, y: 40, ai: { st: "escort", home: P(160, 90) } }, { cls: "patrol", x: 148, y: 43, ai: { st: "escort", home: P(156, 100) } }];
      } },
    { id: 4, name: "The Better Part of Valor", where: "The Claw Strait, at night", boat: "pumasis", hour: 22, limit: 6 * H, win: [176, 24, 250, 200],
      start: [201, 30, 180], helos: [[199, 28]], max: 3, W: { obj: 3000, sunk: 100, dmg: 50, min: 1, surv: 200 }, exit: { y: 196 },
      brief: "Run the Claw Strait, north to south, past Kessrin and the Wolf boats that guard it, and out to the south. Getting through whole counts far more than what you sink.",
      goal: "Leave the south edge of the chart, as whole as you can",
      units: r => {
        const pat = (cls, a, b) => ({ cls, x: a.x, y: a.y, ai: { st: "patrol", route: [a, b], sense: 14 } });
        return [pat("whelp", P(200, 50), P(203, 78)), pat("whelp", P(204, 62), P(199, 88)), pat("lupa1", P(198, 92), P(202, 118)), pat("lupa1", P(201, 110), P(197, 132)),
          pat("fenrir", P(203, 100), P(203, 120)), pat("whelp", P(192, 140), P(205, 156)), pat("whelp", P(206, 150), P(190, 170)), pat(r() < 0.5 ? "fenrir" : "lupa2", P(196, 176), P(212, 180))];
      } },
    { id: 5, name: "Search for the Raiders", where: "The Ember Sea", boat: "ocelot", hour: 16, limit: 6 * H, win: [0, 60, 200, 240],
      start: [58, 98, 135], helos: [[60, 96]], max: 4, W: { obj: 3000, sunk: 300, dmg: 100, min: 2, surv: 50 },
      brief: "Two Warg corvettes are running south together through the Ember Sea, past a Wolf patrol line. Merchants are out too: pick the pair out by their course, and sink both before they escape south.",
      goal: "Sink both Wargs before they leave the south edge",
      units: r => {
        const x0 = 104 + r() * 16, route = [P(x0, 96), P(x0 - 6 - r() * 10, 150), P(x0 - 14 + r() * 8, 238)];
        const line = [];
        for (let i = 0; i < 6; i++) { const x = 30 + i * 26 + r() * 6, y = 152 + r() * 10; line.push({ cls: i % 2 ? "lupa2" : "lupa1", x, y, ai: { st: "patrol", route: [P(x - 10, y), P(x + 10, y + 3)], sense: 16 } }); }
        const cargo = [];
        for (let i = 0; i < 4; i++) { const sx = 20 + r() * 150, sy = 90 + r() * 120, ex = r() < 0.5 ? 196 : 4, ey = 80 + r() * 140; cargo.push({ cls: "cargo", x: sx, y: sy, ai: { st: "route", route: [P(ex, ey)], spd: 9 + r() * 4 } }); }
        return [{ cls: "warg", x: x0, y: 88, ai: { st: "flee", route, leave: true }, target: true }, { cls: "warg", x: x0 + 0.8, y: 87, ai: { st: "flee", route: route.map(p => P(p.x + 0.8, p.y)), leave: true }, target: true }, ...line, ...cargo];
      } },
    { id: 6, name: "Supply Convoy", where: "The Ember Sea", boat: "pumasis", hour: 6, limit: 12 * H, win: [0, 60, 200, 200],
      start: [14, 104, 90], helos: [[12, 100], [12, 108]], max: 7, W: { obj: 5000, sunk: 200, dmg: 100, min: 2, surv: 100 },
      convoy: { cls: "star", x: 10, y: 104, name: "Tawny Star" }, dest: { x0: 196, y0: 147, y1: 200 },
      brief: "Bring the fast container ship Tawny Star across the Ember Sea to the southern third of the east edge. Coyote boats are out to stop her. Steer her and both Kestrels from the map. Watch your fuel: setting 2 goes far.",
      goal: "Bring the Tawny Star to the east edge, south of the cape",
      units: r => {
        const out = [];
        const spots = [P(60, 120), P(96, 150), P(120, 110), P(150, 170), P(170, 130), P(84, 190)];
        spots.forEach((p, i) => out.push({ cls: i % 2 ? "coyoteB" : "coyoteA", x: p.x + r() * 8 - 4, y: p.y + r() * 8 - 4, ai: { st: "patrol", route: [P(p.x - 12, p.y), P(p.x + 12, p.y + 6)], sense: 20 } }));
        return out;
      } },
    { id: 7, name: "Surveillance", where: "Off Lupenmark", boat: "pumasis", hour: 8, limit: 14 * H, win: [100, 88, 215, 232],
      start: [118, 98, 135], helos: [[116, 96], [120, 96]], max: 6, W: { obj: 5000, sunk: 300, dmg: 150, min: 1, surv: 100 },
      brief: "Eight merchants are making for Wolf ports, and one is running arms. Photograph all eight: come within 1,500 feet with her in the glasses. Sink one and the mission is over. Lupa boats shadow them.",
      goal: "Photograph all eight merchants",
      units: r => {
        const ports = [P(206, 104), P(207, 146), P(212, 174)], out = [];
        const arms = Math.floor(r() * 8);
        for (let i = 0; i < 8; i++) { const x = 110 + r() * 80, y = 104 + r() * 120, p = PD.pick(r, ports); out.push({ cls: i === arms ? "runner" : "cargo", x, y, ai: { st: "route", route: [p], spd: 5 + r() * 3 }, photo: true }); }
        for (let i = 0; i < 4; i++) { const x = 130 + r() * 60, y = 110 + r() * 100; out.push({ cls: "lupa2", x, y, ai: { st: "patrol", route: [P(x, y), P(x + 14 - r() * 28, y + 14 - r() * 28)], sense: 15 } }); }
        return out;
      } },
    { id: 8, name: "The Gauntlet", where: "The Vargrin Gulf", boat: "pumasis", hour: 18, limit: 48 * H, win: [176, 120, 320, 200],
      start: [184, 176, 80], helos: [[184, 172], [184, 180]], max: 7, W: { obj: 5000, sunk: 500, dmg: 250, min: 1, surv: 200 },
      supply: { cls: "supply", x: 311, y: 151, name: "Sable Dawn" }, out: { x: 196 },
      brief: "Run the Vargrin Gulf to Port Sable, meet the supply ship Sable Dawn, and see her out to the Ember Sea. The Wolf fleet in the gulf is under truce: it leaves you be unless you fire on it or come too close. Then all of it comes.",
      goal: "Bring the Sable Dawn out of the gulf",
      units: r => {
        const out = [];
        const lanes = [[P(222, 170), P(250, 164)], [P(240, 162), P(270, 156)], [P(264, 154), P(296, 148)], [P(286, 150), P(306, 146)], [P(230, 168), P(214, 176)], [P(276, 154), P(252, 160)], [P(298, 147), P(272, 155)]];
        lanes.forEach((ln, i) => out.push({ cls: i < 4 ? "lupa1" : "lupa2", x: ln[0].x, y: ln[0].y, ai: { st: "passive", route: ln, spd: 8 + r() * 6 } }));
        out.push({ cls: "fenrir", x: 262, y: 152, ai: { st: "passive", route: [P(262, 154), P(256, 158)], spd: 4 } });
        return out;
      } },
  ];
  M.get = id => M.LIST.find(m => m.id === +id) || M.LIST[0];

  /* a fresh unit */
  M.unit = (S, o) => {
    const k = C.SHIPS[o.cls], w = Co.water(o.x, o.y);
    const name = o.name || (k.side === "wolf" ? NAMES[(S.nameI++) % NAMES.length] : k.side === "neutral" ? CARGO[(S.cargoI++) % CARGO.length] : "PDF " + ["Talon", "Brightclaw", "Sundance", "Amber"][(S.ourI++) % 4]);
    const ai = Object.assign({ st: "route", route: [], wi: 0 }, o.ai || {});
    const hdg = o.hdg !== undefined ? o.hdg : ai.route && ai.route[0] ? PD.angTo(w.x, w.y, ai.route[0].x, ai.route[0].y) : 0;
    return { id: S.nextId++, cls: o.cls, side: k.side, name, x: w.x, y: w.y, hdg, ordHdg: hdg, spd: ai.st === "passive" ? 6 : k.cruise * 0.8, ordSpd: k.cruise,
      hp: k.hp, alive: true, hit: false, ai, mslLeft: k.msl ? k.msl[1] : 0, target: !!o.target, photo: o.photo ? 0 : undefined };
  };

  /* the ten training targets: where the next one comes from */
  M.drone = (S, cls, near) => {
    const r = () => PD.rand(S), D = M.get(S.mission).drones;
    for (let k = 0; k < 40; k++) {
      const a = r() * PD.TAU, d = D.at[0] + r() * (D.at[1] - D.at[0]), x = S.me.x + Math.cos(a) * d, y = S.me.y + Math.sin(a) * d;
      const w = S.win;
      if (x < w[0] + 2 || y < w[1] + 2 || x > w[2] - 2 || y > w[3] - 2 || Co.near(x, y, 0.8)) continue;
      return M.unit(S, { cls, x, y, ai: { st: "hunt", alert: true }, hdg: PD.angTo(x, y, S.me.x, S.me.y) });
    }
    return M.unit(S, { cls, x: near.x, y: near.y + 5, ai: { st: "hunt", alert: true } });
  };
})();
