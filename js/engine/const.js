/* PDF Pumasis -- every number the sea is made of.
 *
 * The 1987 game's manual and its spotter cards give the classes, the
 * weapons, the ranks and how a mission is scored; they do not give the
 * speeds per throttle notch, the ammunition, the fuel burn or the time each
 * mission allows. Those are ours, marked UNCERTAIN, to be tuned in play.
 *
 * Our boats are the Pumacity Defense Force's; the Wolf Empire's classes
 * stand where the 1987 cards had the Soviet-built ones. The weapons keep
 * their own names. */
"use strict";
(() => {
  const C = PD.C = {};

  /* ---- the clock ---- */
  C.TC = [1, 2, 4, 8, 16, 32, 64, 128];   /* time compression; doubled and halved with + and - */
  C.TC_FIRE = 3;                          /* index of 8x: what anything in the air holds it to (1987) */
  C.STEP = 0.02;                          /* seconds of game time in a step at 1x */
  C.timeStr = t => { const m = Math.floor(t / 60) % 1440; return String(Math.floor(m / 60)).padStart(2, "0") + String(m % 60).padStart(2, "0"); };
  C.hm = s => { s = Math.max(0, Math.round(s / 60)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  /* the light, 0 black night to 1 noon, from the hour (06:00 dawn, 18:30 dusk) */
  C.light = t => { const h = (t / 3600) % 24; return PD.clamp(Math.sin((h - 6.2) / 12.6 * Math.PI) * 1.3 + 0.08, 0, 1); };
  C.sun = t => { const h = (t / 3600) % 24; return Math.sin((h - 6.2) / 12.6 * Math.PI); };

  /* ---- our boats: three PDF hydrofoils, one fixed for each mission ----
   * notch: speed for throttle 0..5, knots. hull: the fastest she runs hullborne; she lifts onto the foils above it.
   * crit: heavily damaged hull compartments she floats with hullborne (1987: 4, 3, 2).
   * burn: hours of fuel at full foilborne and at hullborne cruising. All UNCERTAIN but crit. */
  C.BOATS = {
    pumasis: { name: "Pumasis", cls: "PHM-1 Pumasis", nation: "PDF", notch: [0, 6, 12, 30, 40, 48], hull: 12, lift: 22, turn: [3.2, 5.0], crit: 4,
      msl: "harpoon", mslN: 8, shells: 400, chaff: 12, fuelH: [13, 42], len: 40, note: "Six watertight compartments: four may be holed before she sinks." },
    lynx: { name: "Lynx", cls: "Lynx", nation: "PDF", notch: [0, 6, 12, 28, 38, 46], hull: 12, lift: 21, turn: [3.0, 4.8], crit: 3,
      msl: "gabriel", mslN: 6, shells: 300, chaff: 10, fuelH: [11, 36], len: 26, note: "Shorter-ranged Gabriel missiles, harder-hitting and surer." },
    ocelot: { name: "Ocelot", cls: "Ocelot", nation: "PDF", notch: [0, 6, 10, 30, 40, 50], hull: 10, lift: 20, turn: [3.4, 5.6], crit: 2,
      msl: "exocet", mslN: 4, shells: 250, chaff: 8, fuelH: [10, 32], len: 23, note: "The smallest: fast, and two holed compartments sink her." },
  };
  C.TAKEOFF = 24;          /* seconds on the foils' climb; a hard turn makes it longer. UNCERTAIN */
  C.LANDING = 10;
  C.ACCEL = [0.35, 1.1];   /* knots a second, hullborne and foilborne. UNCERTAIN */

  /* the twelve sections of the damage report: six hull compartments, then the systems */
  C.SECTIONS = [
    ["h1", "Compartment 1"], ["h2", "Compartment 2"], ["h3", "Compartment 3"], ["h4", "Compartment 4"], ["h5", "Compartment 5"], ["h6", "Compartment 6"],
    ["gun", "Cannon"], ["radar", "Radar"], ["chaff", "Chaff"], ["msl", "Missiles"], ["fuel", "Fuel tanks"], ["eng", "Engines"],
  ];
  C.HULL = ["h1", "h2", "h3", "h4", "h5", "h6"];

  /* ---- the weapons ----
   * range nm, speed knots, dmg in hit points, p: the chance a lock that is not decoyed hits. */
  C.MSL = {
    harpoon: { name: "Harpoon", range: 40, min: 2, spd: 560, dmg: 4, p: 0.9 },
    gabriel: { name: "Gabriel", range: 22, min: 1.5, spd: 600, dmg: 5, p: 0.94 },
    exocet: { name: "Exocet", range: 38, min: 2, spd: 580, dmg: 4, p: 0.9 },
    /* the Wolf Empire's: the Howler (short and long), the Bite */
    howler: { name: "Howler", range: 22, min: 1.5, spd: 600, dmg: 2, p: 0.7, enemy: true },
    howlerL: { name: "Howler-L", range: 44, min: 1.5, spd: 600, dmg: 2, p: 0.7, enemy: true },
    bite: { name: "Bite", range: 60, min: 2, spd: 560, dmg: 2, p: 0.72, enemy: true },
  };
  C.MSL_TRACK = 2;          /* our missiles the radar can guide at once (1987: RADAR CANNOT TRACK MORE MISSILES) */
  C.GUN = { range: 10, eff: 6, rate: 1.5, spd: 1500, spread: 0.012, hitR: 0.03, dmg: 0.6, arcAft: 150 * PD.DEG };
  /* shell flight: knots, so 6 nm takes about 14 seconds. UNCERTAIN */
  C.CHAFF = { life: 90, best: 1.0, width: 0.8 };   /* nm: best distance of the incoming missile when fired */

  /* ---- the classes on the water ----
   * len m, cruise and top knots, hp, guns [range nm, shots a second, chance a shot hits us], msl [kind, count] */
  C.SHIPS = {
    /* the Wolf Empire */
    cur: { name: "Cur", side: "wolf", len: 38, cruise: 15, top: 27, hp: 2, gun: [2, 0.6, 0.05], msl: null, note: "Patrol boat: twin 40mm, no missiles.", pts: 1 },
    jackal: { name: "Jackal", side: "wolf", len: 23, cruise: 16, top: 30, hp: 1.4, gun: [1.2, 0.8, 0.04], msl: null, note: "Small patrol craft: heavy machine guns only.", pts: 1 },
    whelp: { name: "Whelp", side: "wolf", len: 27, cruise: 30, top: 40, hp: 1.6, gun: [1.5, 0.6, 0.04], msl: ["howler", 2], note: "Fast attack craft: two Howlers.", pts: 2 },
    lupa1: { name: "Lupa I", side: "wolf", len: 39, cruise: 30, top: 38, hp: 3, gun: [2, 0.8, 0.05], msl: ["howler", 4], note: "Missile boat: four Howlers, twin 30mm.", pts: 2 },
    lupa2: { name: "Lupa II", side: "wolf", len: 39, cruise: 30, top: 40, hp: 3, gun: [2, 0.8, 0.05], msl: ["howlerL", 4], note: "Missile boat: four long-range Howlers.", pts: 3 },
    warg: { name: "Warg", side: "wolf", len: 60, cruise: 15, top: 34, hp: 5, gun: [4, 0.4, 0.07], msl: ["howlerL", 4], sam: true, note: "Corvette: 57mm, four long Howlers, anti-missile.", pts: 4 },
    fenrir: { name: "Fenrir", side: "wolf", len: 62, cruise: 14, top: 32, hp: 6, gun: [6, 0.5, 0.08], msl: ["bite", 4], note: "Corvette: 76mm, four Bites that reach 60 miles.", pts: 4 },
    coyoteA: { name: "Coyote", side: "wolf", len: 37, cruise: 16, top: 41, hp: 3, gun: [2.5, 0.6, 0.05], msl: ["bite", 2], note: "Fast patrol boat: 40mm and two Bites.", pts: 3 },
    coyoteB: { name: "Coyote (gun)", side: "wolf", len: 37, cruise: 16, top: 41, hp: 3, gun: [6, 0.5, 0.07], msl: null, note: "Fast patrol boat, the gun fit: one 76mm.", pts: 2 },
    /* everyone else */
    cargo: { name: "Cargo ship", side: "neutral", len: 120, cruise: 8, top: 15, hp: 6, gun: null, msl: null, note: "Merchant, unarmed.", pts: 0 },
    runner: { name: "Cargo ship", side: "neutral", len: 120, cruise: 8, top: 15, hp: 6, gun: null, msl: null, note: "Merchant, unarmed.", pts: 0, arms: true },
    star: { name: "Container ship", side: "ours", len: 180, cruise: 20, top: 33, hp: 9, gun: null, msl: null, note: "Fast container ship.", pts: 0 },
    supply: { name: "Supply ship", side: "ours", len: 150, cruise: 16, top: 22, hp: 9, gun: null, msl: null, note: "Fleet supply ship.", pts: 0 },
    patrol: { name: "PDF cutter", side: "ours", len: 40, cruise: 18, top: 28, hp: 3, gun: [3, 0.6, 0.12], msl: null, note: "Pumacity Defense Force cutter.", pts: 0 },
  };
  C.HELO = { name: "Kestrel", notch: [0, 40, 70, 100, 130, 145], spot: 14 };
  C.CONVOY_NOTCH = { star: [0, 8, 14, 20, 26, 33], supply: [0, 6, 10, 14, 18, 22] };

  /* ---- sensors ---- */
  C.RADAR = [2.5, 5, 10, 20, 40];         /* the scope's scales, miles */
  C.RADAR_MAX = [40, 20, 10];             /* how far it reaches: whole, light damage, heavy (1987) */
  C.EYE = 9;                              /* miles a lookout spots a ship by day, a big one further */
  C.WOLF_RADAR = 24;                      /* how far the Empire's boats find us. UNCERTAIN */
  C.PHOTO = 1500 * PD.FT_NM;
  C.TRUCE = 1.2;                          /* miles: closer to a Wolf boat under truce is a provocation. UNCERTAIN */              /* 1987: within 1500 feet, the target in the glasses */

  /* ---- ranks ---- */
  C.RANKS = ["Deck Mopper", "Ensign", "Lieutenant", "Commander", "Captain", "Commodore", "Rear Admiral", "Admiral"];
  C.rankIdx = n => C.RANKS.indexOf(n);
})();
