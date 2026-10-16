/* PDF Pumasis -- the settings, a mission left to come back to, the service
 * record, and nothing else. Every key begins pdfpumasis_ (greykit.games
 * STANDARD.md §5), so Settings can forget them by that prefix and leave the
 * rest of greykit.com alone (§2). */
"use strict";
(() => {
  const KEY_PREFS = "pdfpumasis_prefs_v1", KEY_GAME = "pdfpumasis_game_v1", KEY_RECORD = "pdfpumasis_record_v1";
  PD.KEY_MUTED = "pdfpumasis_muted_v1";

  /* ---- the aids: Classic is 1987, Field is a modern helping hand. None of them changes the fight ---- */
  PD.AID_LIST = [
    ["labels", "Contact labels", "What each contact is, and whose: in the glasses, over the bow, on the radar and the map. Classic: tell them by their shapes."],
    ["lead", "Gun lead mark", "A green mark in the glasses where the shells must go to meet a moving target."],
    ["gunDial", "Gun bearing dial", "A dial in the glasses: where the gun points against the bow, and its blind arc astern."],
    ["threats", "Missile warnings", "Where a missile coming at you is, how soon it arrives, and when to turn across it and fire chaff."],
    ["rings", "Weapon rings", "How far the gun and the missiles reach, on the map."],
    ["goal", "Objective marks", "Where the mission wants you, on the map."],
    ["fuel", "Fuel range", "How far the fuel goes at this speed, on the map."],
    ["route", "Waypoints", "Shift with Enter or a click adds a leg to the autopilot's course. Classic: one course at a time."],
    ["autoSlow", "Slow for news", "Time compression drops to 1x for a new contact or a missile in the air."],
    ["hints", "Key hints", "The keys that matter now, along the bottom."],
  ];
  PD.AIDS = { field: {}, classic: {} };
  for (const [k] of PD.AID_LIST) { PD.AIDS.field[k] = true; PD.AIDS.classic[k] = false; }

  const CALM = typeof matchMedia === "function" ? matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };
  PD.calm = () => CALM.matches;
  PD.STEER = { classic: "Keys", modern: "Keys and mouse" };
  PD.SPEEDS = { classic: ["Normal", 50], relaxed: ["Relaxed", 40], brisk: ["Brisk", 60] };
  PD.prefs = Object.assign({ aids: "classic", over: {}, steer: "classic", speed: "classic", scanlines: false, shake: !CALM.matches, asked: false, resume: true }, PD.store.get(KEY_PREFS, {}));
  if (!PD.AIDS[PD.prefs.aids]) PD.prefs.aids = "classic";
  if (!PD.STEER[PD.prefs.steer]) PD.prefs.steer = "classic";
  PD.modern = () => PD.prefs.steer === "modern";
  PD.savePrefs = () => PD.store.set(KEY_PREFS, PD.prefs);
  PD.aid = name => { const o = PD.prefs.over[name]; return o === undefined ? !!PD.AIDS[PD.prefs.aids][name] : !!o; };
  PD.setAids = set => { PD.prefs.aids = set; PD.prefs.over = {}; PD.savePrefs(); };
  /* L at sea: the other set, and the aids you set on your own kept as you set them */
  PD.flipAids = () => { PD.prefs.aids = PD.prefs.aids === "field" ? "classic" : "field"; PD.savePrefs(); };
  PD.setAid = (name, on) => { if (on === !!PD.AIDS[PD.prefs.aids][name]) delete PD.prefs.over[name]; else PD.prefs.over[name] = on; PD.savePrefs(); };
  PD.aidsLabel = () => (PD.prefs.aids === "field" ? "Field" : "Classic") + (Object.keys(PD.prefs.over).length ? ", adjusted" : "");

  /* ---- a mission left in the middle ---- */
  PD.loadGame = () => { const g = PD.store.get(KEY_GAME, null); return g && g.S && g.S.v === 1 ? g : null; };
  PD.saveGame = S => PD.store.set(KEY_GAME, { S, at: Date.now() });
  PD.clearGame = () => PD.store.del(KEY_GAME);

  /* ---- the service record: each mission's best, and the last ten flown ---- */
  PD.record = () => { const r = PD.store.get(KEY_RECORD, null); return r && r.best ? r : { best: {}, log: [] }; };
  PD.addRecord = (S, sc) => {
    const r = PD.record(), e = { m: S.mission, total: sc.total, rank: sc.rank, rankI: sc.rankI, ok: !!(S.end && S.end.ok), why: S.end ? S.end.why : "", aids: PD.prefs.aids, code: !!S.cheated, at: Date.now() };
    const b = r.best[S.mission], better = !b || (e.code === b.code ? e.total > b.total : !e.code);
    if (better) r.best[S.mission] = e;
    r.log = [e].concat(r.log).slice(0, 10);
    PD.store.set(KEY_RECORD, r);
    return better;
  };

  /* ---- Forget everything (STANDARD.md §2): this game's keys, by prefix ---- */
  PD.forgetEverything = () => {
    for (const area of ["localStorage", "sessionStorage"]) {
      try {
        const s = globalThis[area];
        for (let i = s.length - 1; i >= 0; i--) { const k = s.key(i); if (k && k.startsWith("pdfpumasis")) s.removeItem(k); }
      } catch (e) { /* no storage */ }
    }
    location.reload();
  };
})();
