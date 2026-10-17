/* PDF Pumasis -- boot, title, the loop, and everything between.
 *
 * The greykit.games boot (the canon @gk-title block, STANDARD.md §3) while
 * the first ships are traced, then the game's own title: the Mission 0 demo
 * behind it, the bot at the helm, the name, the menu (§6's items and keys,
 * read by the block's own key lookup), the credit. Then a mission. The
 * engine runs at fifty steps a second (or forty, or sixty: Settings),
 * whatever the screen's rate; time compression makes each step longer,
 * never more of them. */
"use strict";
(() => {
  const E = PD.Engine, C = PD.C, K = PD.K, UI = PD.UI, R = PD.Render, HUD = PD.HUD, SFX = PD.SFX, I = PD.Input, W = PD.Weapons, M = PD.Missions, esc = PD.esc, $ = id => document.getElementById(id);
  const game = PD.game = { mode: "boot", S: null, demo: null, demoMem: null, ui: { view: "bridge", cursor: null, mapZoom: 0, circles: true, aids: {} }, step: 20, acc: 0, last: 0, lastCustom: null };

  /* ---- sound on and off (STANDARD.md §8) ---- */
  const readMuted = () => { try { return globalThis.localStorage.getItem(PD.KEY_MUTED) === "1"; } catch (e) { return false; } };
  SFX.muted = readMuted();
  game.toggleMute = () => {
    SFX.unlock();
    SFX.setMuted(!SFX.muted);
    try { globalThis.localStorage.setItem("pdfpumasis_muted_v1", SFX.muted ? "1" : "0"); } catch (e) { /* no storage */ }
    syncSound();
    if (!SFX.muted) { SFX.play("menu"); if (game.mode === "title" && !SMALL.matches) SFX.startTune(); }
    if (game.mode === "play") HUD.toast(SFX.muted ? "Sound off" : "Sound on", "", 1200);
  };
  function syncSound() { const b = $("snd"); if (b) { b.setAttribute("aria-pressed", String(!SFX.muted)); b.classList.toggle("muted", SFX.muted); } }
  const SMALL = matchMedia("(max-width: 759px), (max-height: 479px)");
  game.applySpeed = () => { game.step = 1000 / (PD.SPEEDS[PD.prefs.speed] || PD.SPEEDS.classic)[1]; };
  game.applyLook = () => { $("stage").classList.toggle("scan", !!PD.prefs.scanlines); };
  game.syncAids = () => { for (const [k] of PD.AID_LIST) game.ui.aids[k] = PD.aid(k); };

  /* ---- the title ---- */
  function titleCfg() {
    const saved = PD.loadGame(), rec = PD.record(), n = Object.keys(rec.best).length;
    return {
      name: "PDF Pumasis",
      primary: saved ? "resume" : "new",
      items: [
        saved && { act: "resume", label: "Resume mission", key: "R", meta: saved.S.name },
        { act: "new", label: "New mission", key: "N", meta: n ? `${n} of 8 flown` : "start with Battle Training" },
        { act: "custom", label: "Custom mission", key: "C", meta: "" },
        { act: "record", label: "Service record", key: "O", meta: "" },
        "gap",
        { act: "settings", label: "Settings", key: "S" },
        { act: "help", label: "Help", key: "?" },
        { act: "about", label: "About", key: "A" },
      ],
    };
  }
  function titleHTML(cfg) {
    const items = cfg.items.filter(Boolean), gap = items.indexOf("gap");
    const main = items.slice(0, gap), util = items.slice(gap + 1);
    let i = 0;
    const btn = (it, big) => `<button data-act="${it.act}" class="pr${it.act === cfg.primary ? " dflt" : ""}" style="--i:${i++}"><kbd>${esc(it.key)}</kbd><span class="lbl">${esc(it.label)}</span>` +
      (big && it.meta ? `<span class="meta">${esc(it.meta)}</span>` : "") + "</button>";
    return `<div class="pd-title">
      <canvas class="pd-scene" aria-hidden="true"></canvas><div class="pd-shade" aria-hidden="true"></div>
      <main>
        <h1 class="pd-mark" aria-label="${esc(cfg.name)}"><span class="puma">PDF</span><span class="svc">Pumasis</span></h1>
        <p class="pd-sub"><span>Pumacity Defense Force ·</span> <span>a hydrofoil missile boat ·</span> <span>eight missions</span></p>
        <nav class="pd-menu" aria-label="Main menu">${main.map(it => btn(it, true)).join("")}<div class="util">${util.map(it => btn(it, false)).join("")}</div></nav>
        <p class="pd-touch">She is sailed with a keyboard or a gamepad: touch alone will not steer her.</p>
      </main>
      <footer class="pd-foot"><span class="gk-credit">${UI.CREDIT}</span></footer>
    </div>`;
  }
  function openTitle() {
    game.mode = "title";
    const el = $("title");
    el.innerHTML = titleHTML(titleCfg());
    el.hidden = false;
    $("game").hidden = true;
    document.body.classList.add("on-title");
    sizeScene();
    if (!game.demo) newDemo();
  }
  function sizeScene() {
    const cv = document.querySelector("#title .pd-scene");
    if (!cv) return;
    const k = Math.max(2, Math.round(innerHeight / 300));
    cv.width = Math.ceil(innerWidth / k); cv.height = Math.ceil(innerHeight / k);
  }
  /* Mission 0: the demo, the bot at the helm; never saved */
  function newDemo() {
    const D = game.demo = E.newMission(Math.random() < 0.5 ? 2 : 3, { seed: 1 + Math.floor(Math.random() * 1e6) });
    D.t = D.t0 = 18.4 * 3600; D.limit = 3600 * 3;
    game.demoMem = PD.Bot.make(); game.demoMem.tcWish = 2;
  }
  function revealTitle(print = true) {
    const t = document.querySelector("#title .pd-title");
    if (!t) return;
    if (print) t.classList.add("pd-print");
    const b = t.querySelector(".pd-menu .dflt") || t.querySelector(".pd-menu button");
    if (b) b.focus({ preventScroll: true });
  }
  game.refreshTitle = () => { if (game.mode !== "title") return; openTitle(); revealTitle(false); };
  game.toTitle = () => {
    UI.close(true);
    game.S = null;
    SFX.stopLoops();
    I.clear(); HUD.clear(); PD.FX.clear();
    openTitle(); revealTitle();
    if (!SMALL.matches) SFX.startTune();
  };
  function titleAct(a) {
    SFX.unlock();
    if (a === "resume") return resume();
    if (a === "new") return UI.missions();
    if (a === "custom") return UI.custom();
    if (a === "record") return UI.record();
    if (a === "settings") return UI.settings();
    if (a === "help") return UI.help();
    if (a === "about") return UI.about();
  }
  function titleKey(ev) {
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "Enter" || k === " " || k === "Tab" || k === "Shift") return;
    const menu = document.querySelector("#title .pd-menu"), hit = menu && titleKeyButton(menu, k);
    if (hit) { ev.preventDefault(); titleAct(hit.dataset.act); return; }
    const row = (k === "ArrowLeft" || k === "ArrowRight") && document.activeElement && document.activeElement.closest(".pd-menu .util");
    if (row) {
      const bs = [...row.querySelectorAll("button")], i = bs.indexOf(document.activeElement);
      ev.preventDefault(); bs[(i + (k === "ArrowRight" ? 1 : -1) + bs.length) % bs.length].focus(); return;
    }
    if (menu) titleArrow(menu, ev);
  }

  /* ---- a mission ---- */
  const seed = () => 1 + Math.floor(Math.random() * 2 ** 30);
  game.start = (id, custom) => {
    PD.clearGame();
    game.lastCustom = custom || null;
    const S = E.newMission(id, { seed: custom && custom.seed ? custom.seed : seed() });
    if (custom && custom.hour !== undefined) { const d = custom.hour * 3600 - S.t0; S.t += d; S.t0 += d; }
    startPlay(S, true);
  };
  function startPlay(S, fresh) {
    UI.close(true);
    game.S = S; game.mode = "play";
    SFX.stopTune();
    $("title").hidden = true; $("title").innerHTML = "";
    document.body.classList.remove("on-title");
    $("game").hidden = false;
    I.clear(); HUD.clear(); PD.FX.clear(); R.splashes = [];
    const u = game.ui;
    u.view = "bridge"; u.glasses = false; u.cursor = { x: S.me.x, y: S.me.y }; u.mapZoom = 0; u.mapAt = null;
    game.syncAids(); fit();
    R.init($("screen"));
    game.acc = 0;
    if (fresh) { toast(`Mission ${S.mission}: ${S.name}`, "", 3000, "Command"); toast(M.get(S.mission).goal, "", 4200, "Command"); }
    else toast("Back on station", "", 2000, "Command");
    game.coach = fresh && S.mission === 1;
    hints();
  }
  function resume() { const g = PD.loadGame(); if (!g) return; startPlay(g.S, false); game.pause(); }
  game.pause = () => { if (game.mode !== "play" || UI.sheet) return; I.clear(); checkpoint(); UI.pause(); };
  game.unpause = () => { game.acc = 0; game.last = performance.now(); };
  game.leave = () => { checkpoint(true); game.toTitle(); };
  game.quit = () => { const S = game.S; if (!S) return; E.tick(S, { acts: [{ a: "quit" }] }); };
  function checkpoint(force) {
    const S = game.S;
    if (!S || game.mode !== "play" || S.phase === "over") return;
    if (PD.prefs.resume || force) PD.saveGame(S);
  }
  function finish() {
    const S = game.S;
    SFX.stopLoops();
    PD.clearGame();
    game.mode = "over";
    HUD.end(null);
    UI.debrief(S);
  }
  game.setView = v => { game.ui.view = v; if (v === "map" && !game.ui.cursor) game.ui.cursor = { x: game.S.me.x, y: game.S.me.y }; SFX.play("menu"); hints(); };

  /* ---- what happened this step: sounds, and the crew's word ---- */
  const toast = (t, tone, ms, who) => HUD.toast(t, tone, ms, who);
  const SAY = {
    noTarget: ["No target selected", "amber", "Weapons"], noShells: ["No shells left", "amber", "Weapons"], outOfRange: ["Target out of range", "amber", "Weapons"],
    tooClose: ["Too close for a missile to lock on", "amber", "Weapons"], noMissiles: ["No missiles left", "amber", "Weapons"], cantTrack: ["The radar can't guide another missile yet", "amber", "Weapons"],
    noMissileLock: ["A missile can't lock onto a missile: use the gun", "amber", "Weapons"], toRear: ["The gun can't bear on a target astern", "amber", "Weapons"], ourSide: ["That one is on our side", "amber", "Weapons"],
    gunMisfire: ["The gun misfired: it's damaged", "amber", "Weapons"], mslMisfire: ["A damaged missile misfired", "amber", "Weapons"], chaffMisfire: ["A chaff round misfired", "amber", "Weapons"],
    gunGone: ["The gun is destroyed", "red", "Weapons"], mslGone: ["The missiles are out of action", "red", "Weapons"], chaffGone: ["The chaff launcher is out of action", "red", "Weapons"], noChaff: ["No chaff left", "amber", "Weapons"],
    theyMissed: ["Their missile missed us", "green", "Radar"], weMissed: ["Our missile missed", "amber", "Weapons"], collided: ["We've collided with another vessel!", "red", "Helm"],
    engines: ["The engines won't give more than 3", "amber", "Engines"], noContacts: ["Nothing on the radar yet: get under way and watch the scope", "amber", "Radar"], noCraft: ["Nothing answers to that key in this mission", "amber", "Command"],
    notYet: ["She sails once we reach her", "amber", "Command"], already: ["We already have her on film", "", "Camera"],
  };
  const clsName = id => { const u = W.unit(game.S, id); return u ? (game.ui.aids.labels || u.side === "ours" ? C.SHIPS[u.cls].name : "contact") : "contact"; };
  function slow() { if (game.ui.aids.autoSlow && game.S.tcReq > 0) game.S.tcReq = 0; }
  function events(S, evs) {
    R.events(S, evs, performance.now());
    const m = S.me;
    for (const e of evs) {
      switch (e.t) {
        case "say": { const s = SAY[e.k]; if (s) toast(s[0], s[1], 2400, s[2]); if (e.k === "weMissed" || e.k === "theyMissed") SFX.play("splash", 0.5); else SFX.play("thunk"); break; }
        case "contact": SFX.play("sighted"); toast(`${game.ui.aids.labels ? (e.side === "wolf" ? "Wolf " : e.side === "neutral" ? "Merchant, " : "") : ""}contact, bearing ${PD.deg3(e.brg)}, ${PD.nm(e.d)} miles${e.by === "helo" ? ": from a Kestrel" : ""}`, "", 2600, "Radar"); slow(); break;
        case "launch":
          if (e.ours) { SFX.play("launch"); toast(`${e.kind} away`, "", 1800, "Weapons"); }
          else { SFX.play("launch", 0.6); SFX.play("lock"); toast(e.at === "me" ? "Missile launch! It's coming for us" : "Missile launch at the ship we escort!", "red", 3000, "Radar"); slow(); }
          break;
        case "gun": SFX.play("gun"); break;
        case "chaff": SFX.play("chaff"); toast("Chaff away", "", 1400, "Weapons"); break;
        case "splash": SFX.play("splash", 0.4); break;
        case "shellHit": SFX.play("shellHit", 0.7); break;
        case "mslHit": SFX.play("boom", e.ours ? 0.9 : 0.6); if (e.ours) toast(`Hit! The ${clsName(e.id)}`, "green", 2200, "Weapons"); break;
        case "hit": if (e.by === "ours" && e.side === "wolf") { /* the splashes say it */ } else if (e.side === "ours" && e.cls !== "patrol") { toast(`The ${C.SHIPS[e.cls].name} has been hit`, "red", 2400, "Radar"); } break;
        case "sunk":
          SFX.play("boom"); setTimeout(() => SFX.play("sunk"), 600);
          if (e.side === "wolf") toast(`${game.ui.aids.labels ? C.SHIPS[e.cls].name + " " + e.name : "Enemy"} sunk`, "green", 2800, "Lookout");
          else if (e.side === "neutral") toast(`Unarmed merchant ${e.name} sunk`, "red", 3600, "Lookout");
          else toast(`The ${C.SHIPS[e.cls].name} ${e.name} is sinking`, "red", 3600, "Lookout");
          break;
        case "escaped": toast(e.side === "wolf" ? "One of them got away" : "A ship reached port", "amber", 2600, "Radar"); break;
        case "hitUs": SFX.play("hitUs"); HUD.flash(); toast("We have been hit!", "red", 2600, "Damage control"); break;
        case "shellHitUs": SFX.play("shellHit"); HUD.flash(); break;
        case "shellNear": SFX.play("shellNear", 0.6); break;
        case "underFire": toast("Enemy vessels are firing at us", "red", 2600, "Lookout"); slow(); break;
        case "sec": {
          const n = C.SECTIONS.find(q => q[0] === e.s)[1];
          if (C.HULL.includes(e.s)) { if (e.now === 2) toast(`${n} holed`, "red", 2600, "Damage control"); }
          else toast(e.now === 2 ? `${n}: out of action` : `${n} damaged`, e.now === 2 ? "red" : "amber", 2600, "Damage control");
          break;
        }
        case "foilOnly": SFX.play("warn"); toast("Holed! Keep her up on her foils, or she goes down", "red", 5000, "Damage control"); break;
        case "decoyed": SFX.play("thunk"); toast("The chaff drew it off", "green", 2400, "Radar"); break;
        case "mslShot": SFX.play("boom", 0.5); toast("The gun shot it down!", "green", 2400, "Weapons"); break;
        case "mslDown": toast("Their defences shot our missile down", "amber", 2400, "Weapons"); break;
        case "photo": SFX.play("photo"); toast(`Photographed: the ${W.unit(S, e.id).name}${e.arms ? ". Her deck cargo is guns!" : ""} (${e.n} of 8)`, "green", 3200, "Camera"); break;
        case "provoked": SFX.play("warn"); toast(e.close ? "We came too close: the truce is broken. The whole fleet is coming!" : "The truce is broken: the whole fleet is coming!", "red", 4200, "Command"); break;
        case "takeoff": SFX.play("takeoff"); toast("Lifting onto the foils", "", 1600, "Helm"); break;
        case "foilborne": toast("Foilborne", "", 1200, "Helm"); break;
        case "hullborne": toast("Hullborne", "", 1200, "Helm"); break;
        case "fuelLow": SFX.play("warn"); toast("Fuel low", "amber", 3000, "Engines"); break;
        case "fuelOut": toast("Out of fuel", "red", 3600, "Engines"); break;
        case "depth": toast("Shoal water: the sounder stopped us", "amber", 2400, "Helm"); break;
        case "edge": toast("The edge of the operations area", "amber", 2200, "Helm"); break;
        case "autoOff": toast("Autopilot off: manual steering", "", 1600, "Helm"); break;
        case "course": if (e.craft) { toast(`New course set${e.craft ? "" : ""}`, "", 1400, "Command"); } else toast("Course set: autopilot on", "", 1600, "Helm"); break;
        case "arrived": toast("On the mark: holding the course", "", 1600, "Helm"); break;
        case "tcDrop": break;
        case "goal": {
          const G = { joined: ["The Sable Dawn is with us: steer her from the map (9)", "green"], someEscaped: ["Some of them escaped", "amber"], wargsAway: ["The Wargs got away", "amber"] };
          if (G[e.k]) toast(G[e.k][0], G[e.k][1], 4200, "Command");
          break;
        }
        case "over": SFX.play(e.ok ? "won" : "over"); HUD.end(e.ok ? "Objective complete" : { sunk: "We have been sunk", time: "Time is up", fuel: "Out of fuel", quit: "Mission ended", escaped: "They got away", convoyLost: "Our ship is lost", cargoSunk: "A merchant is sunk" }[e.why] || "Mission over", "", e.ok ? "ok" : "danger"); break;
      }
    }
    void m;
  }
  /* the sounds that go on */
  function loops(S) {
    if (SFX.muted || !SFX.ctx) return;
    const m = S.me, up = m.foil === "foil" || m.foil === "up", k = C.BOATS[m.key], f = m.spd / k.notch[5];
    SFX.loop("turbine", up && !m.sunk ? 0.4 + f * 0.6 : 0, f);
    SFX.loop("diesel", !up && !m.sunk && m.fuel > 0 ? 0.35 + m.spd / k.hull * 0.5 : 0, m.spd / k.hull);
    SFX.loop("sea", 0.3 + f * 0.7, f);
  }

  /* ---- the key strip: what matters now, five keys at most ---- */
  const SEP = ' <span class="sep"></span> ';
  function hints() {
    const S = game.S;
    if (!S) { HUD.hint(null); return; }
    const m = S.me, inc = E.incoming(S).length;
    if (!game.ui.aids.hints && !inc) { HUD.hint(null); return; }
    const pad = I.device === "pad";
    const k = (keys, w) => keys.map(x => `<kbd>${x}</kbd>`).join("") + " " + w;
    let lead = "", tone = "", list;
    const drill = !inc && game.ui.aids.hints && coaching(S);
    if (drill && game.ui.view !== "map") [lead, list] = drill(k, pad);
    else if (inc && game.ui.aids.hints) { lead = "Missile coming"; tone = "danger"; list = pad ? [k(["pad:L-stick"], "turn across it"), k(["pad:Back+A"], "chaff")] : [k([",", "."], "turn across it"), k(["7"], "chaff"), k(["Enter"], "fire it")]; }
    else if (game.ui.view === "map") list = pad ? [k(["pad:L-stick"], "cursor"), k(["pad:A"], "set course"), k(["pad:LB", "pad:RB"], "craft"), k(["pad:Y"], "bridge")] : [k(["←", "→", "↑", "↓"], "cursor"), k(["Enter"], "set course"), k(["6", "7", "8", "9"], "craft"), k(["1"], "to <kbd>5</kbd> speed"), k(["V"], "bridge")];
    else if (m.mode === "aim") list = pad ? [k(["pad:L-stick"], "lay the gun"), k(["pad:A"], "fire"), k(["pad:X"], "next target"), k(["pad:B"], "maneuver")] : [k(["←", "→", "↑", "↓"], "lay the gun"), k(["Enter"], "fire"), k(["T"], "next target"), k(["6", "7", "8"], "weapon"), k(["Space"], "maneuver")];
    else list = pad ? [k(["pad:L-stick"], "steer"), k(["pad:dU", "pad:dD"], "speed"), k(["pad:X"], "target"), k(["pad:A"], "fire"), k(["pad:B"], "aim"), k(["pad:Y"], "map")] : [k(["←", "→"], "steer"), k(["↑", "↓"], "speed"), k(["T"], "target"), k(["Enter"], "fire"), k(["Space"], "aim"), k(["G"], "glasses"), k(["V"], "map")];
    HUD.hint((lead ? `<b class="hl">${lead}</b>${SEP}` : "") + list.join(SEP) + `${SEP}<span class="more"><kbd>?</kbd> all keys</span>`, tone);
  }

  /* Battle Training's first target, walked through on the key strip: find her, the glasses, aim, fire.
   * It stands down at the first hit, or the first time she is sunk some other way */
  function coaching(S) {
    if (S.mission !== 1 || !game.coach) return null;
    const m = S.me, st = S.stats;
    if (st.shellHits || st.mslHits || st.sunk.length) {
      game.coach = false;
      toast("That's the drill: find her, the glasses, aim, fire. The other nine are yours", "green", 4800, "Command");
      return null;
    }
    const t = W.tgt(S);
    return (k, pad) => {
      if (!t) {
        if (!E.contacts(S).length) return ["Training", m.thr < 3 ? [k([pad ? "pad:dU" : "3"], "up onto the foils"), "then watch the radar for a contact"] : ["Watch the radar: the target will show as a blip"]];
        return ["Training · 1 of 3", [k([pad ? "pad:X" : "T"], "put the contact in the glasses")]];
      }
      const d = PD.dist(m.x, m.y, t.x, t.y);
      if (m.weapon !== "gun") return ["Training · 2 of 3", [k(pad ? ["pad:LB", "pad:RB"] : ["6"], "the 76mm gun")]];
      if (m.mode !== "aim") return ["Training · 2 of 3", [k([pad ? "pad:B" : "Space"], "aim the gun")]];
      if (d > C.GUN.range) return ["Training · 3 of 3", [k(pad ? ["pad:L-stick"] : [",", "."], "steer for her"), "the gun reaches ten miles: IN RANGE lights"]];
      return ["Training · 3 of 3", [k(pad ? ["pad:L-stick"] : ["←", "→", "↑", "↓"], "lay the cross a little ahead of her"), k([pad ? "pad:A" : "Enter"], "fire")]];
    };
  }

  /* ---- the loop ---- */
  function step() {
    const S = game.S;
    const cmd = I.cmd(S, game.ui, game.step);
    const evs = E.tick(S, cmd);
    events(S, evs);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(100, now - game.last); game.last = now;
    if (game.mode === "title" || game.mode === "play" || game.mode === "over") {
      const fresh = I.pollPad();
      if (UI.sheet || game.mode !== "play" || document.querySelector(".pd-ask")) menuPad(fresh);
      else for (const a of fresh) { konamiStep("pad", a); padAct(a); }
    }
    if (game.mode === "title") { titleFrame(dt, now); return; }
    if (!game.S || (game.mode !== "play" && game.mode !== "over")) return;
    const S = game.S;
    if (game.mode === "play") {
      if (!UI.sheet && S.phase === "sea") {
        game.acc += dt;
        let n = 0;
        while (game.acc >= game.step && n++ < 6) { game.acc -= game.step; step(); if (S.phase !== "sea") break; }
        if (n >= 6) game.acc = 0;
        PD.ShipArt.budget = 2;
      }
      if (S.phase === "over" && game.mode === "play") { game.mode = "over"; setTimeout(finish, 2400); }
      loops(S);
    }
    R.draw(S, game.ui, now, dt / 1000);
    HUD.draw(S, game.ui);
    if (game.mode === "play" && (now - (game.hintAt || 0)) > 400) { game.hintAt = now; hints(); }
  }
  let titleAcc = 0;
  function titleFrame(dt, now) {
    const cv = document.querySelector("#title .pd-scene");
    if (!cv || (UI.sheet && UI.sheet.el.classList.contains("full"))) return;
    const D = game.demo;
    titleAcc += dt;
    let n = 0;
    while (titleAcc >= 20 && n++ < 3) { titleAcc -= 20; E.tick(D, PD.Bot.cmd(D, game.demoMem)); }
    if (n >= 3) titleAcc = 0;
    PD.ShipArt.budget = 3;
    if (D.phase !== "sea" || E.elapsed(D) > 2.5 * 3600) newDemo();
    PD.FX.step(dt / 1000);
    R.title(cv, D, now);
  }

  /* ---- the Konami code: up up down down left right left right B A ---- */
  const KONAMI = { keys: ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"],
    pad: ["thrU", "thrU", "thrD", "thrD", "radarIn", "radarOut", "radarIn", "radarOut", "mode", "fire"] };
  const konamiAt = { keys: 0, pad: 0 };
  function konamiStep(src, x) {
    const seq = KONAMI[src], i = konamiAt[src];
    konamiAt[src] = x === seq[i] ? i + 1 : x === seq[0] ? (i === 2 ? 2 : 1) : 0;
    if (konamiAt[src] < seq.length) return;
    konamiAt.keys = konamiAt.pad = 0;
    if (!game.S || !E.konami(game.S)) return;
    SFX.play("won");
    toast("Konami code: magazines full, fuel topped up, and nothing can touch her", "green", 4000, "Command");
  }

  /* ---- the orders the keys give ---- */
  function act(a, ev) {
    const S = game.S, m = S.me, u = game.ui, map = u.view === "map", shift = ev && ev.shiftKey;
    const push = o => I.push(o);
    switch (a) {
      case "hL": case "hR": if (!ev || !ev.repeat) I.tapHelm(a === "hL" ? -1 : 1); break;
      case "aL": case "aR": if (!map && m.mode !== "aim" && (!ev || !ev.repeat)) I.tapHelm(a === "aL" ? -1 : 1); break;
      case "aU": case "aD": if (!map && m.mode !== "aim") push({ a: "thr", v: PD.clamp(m.thr + (a === "aU" ? 1 : -1), 0, 5) }); break;
      case "thrU": case "thrD": if (map && S.sel) { const su = E.selUnit(S); if (su) push({ a: "notch", v: PD.clamp((su.notch || 0) + (a === "thrU" ? 1 : -1), 0, 5) }); } else push({ a: "thr", v: PD.clamp(m.thr + (a === "thrU" ? 1 : -1), 0, 5) }); break;
      case "n0": case "n1": case "n2": case "n3": case "n4": case "n5": { const v = +a[1]; if (map && S.sel) push({ a: "notch", v }); else push({ a: "thr", v }); break; }
      case "w6": case "w7": case "w8": case "w9": {
        const n = +a[1];
        if (map) push({ a: "sel", v: n - 6 });
        else push({ a: "weapon", v: n === 6 ? "gun" : n === 7 ? "chaff" : "msl" });
        break;
      }
      case "wPrev": case "wNext": {
        if (map) { const L = [0, 1, 2, 3].filter(v => v === 0 || (v === 3 ? E.convoy(S) : E.helos(S)[v - 1])); push({ a: "sel", v: L[(L.indexOf(S.sel) + (a === "wNext" ? 1 : L.length - 1)) % L.length] }); }
        else { const L = ["gun", "chaff", "msl"]; push({ a: "weapon", v: L[(L.indexOf(m.weapon) + (a === "wNext" ? 1 : 2)) % 3] }); }
        break;
      }
      case "chaffNow": push({ a: "weapon", v: "chaff" }); push({ a: "fire" }); push({ a: "weapon", v: m.weapon === "chaff" ? "gun" : m.weapon }); break;
      case "mode": push({ a: "mode" }); break;
      case "fire":
        if (map) { if (u.cursor) push({ a: "dest", x: u.cursor.x, y: u.cursor.y, add: shift && game.ui.aids.route }); }
        else if (m.weapon !== "gun" || m.mode !== "aim") push({ a: "fire" });
        else if (!ev || !ev.repeat) push({ a: "fire" });
        break;
      case "view": game.setView(map ? "bridge" : "map"); break;
      case "next": push({ a: "next", back: shift }); break;
      case "prev": push({ a: "next", back: true }); break;
      case "radar": push({ a: "radar", d: shift ? 1 : -1 }); break;
      case "radarIn": push({ a: "radar", d: -1 }); break;
      case "radarOut": push({ a: "radar", d: 1 }); break;
      case "glasses": if (!map) { u.glasses = !(u.glasses || m.mode === "aim"); if (!u.glasses && m.mode === "aim") push({ a: "mode" }); SFX.play("menu"); } break;
      case "circles": if (map) { u.circles = !u.circles; SFX.play("menu"); } break;
      case "zoom": if (map) { u.mapZoom = (u.mapZoom + (shift ? PD.OpsMap.ZOOMS.length - 1 : 1)) % PD.OpsMap.ZOOMS.length; u.mapAt = null; SFX.play("menu"); } break;
      case "tcU": push({ a: "tc", d: 1 }); break;
      case "tcD": push({ a: "tc", d: -1 }); break;
      case "tc1": push({ a: "tc", v: 0 }); break;
      case "pause": game.pause(); break;
      case "quit": if (shift) { I.clear(); checkpoint(); UI.ask("End the mission here? It is scored as it stands.", "End the mission").then(y => { game.unpause(); if (y) game.quit(); }); } break;
      case "aids": PD.flipAids(); game.syncAids(); toast(PD.prefs.aids === "field" ? "Field: the modern aids (L for Classic)" : "Classic: as 1987 played (L for Field)", "", 2400, "Command"); hints(); break;
      case "help": UI.help(3, () => game.unpause()); break;
    }
  }
  /* a pad's buttons mean what the view needs */
  function padAct(a) {
    const S = game.S;
    if (a === "fire" && game.ui.view !== "map" && S.me.weapon === "gun" && S.me.mode === "aim") return; /* held: I.cmd fires */
    act(a, null);
  }
  /* in a menu, a pad works it as the keys do */
  function menuPad(fresh) {
    const send = key => (document.activeElement || document.body).dispatchEvent(new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }));
    for (const b of I.padBtns) {
      if (b === 0) { const f = document.activeElement; if (f && f !== document.body && f.click) f.click(); }
      else if (b === 1 || (b === 9 && UI.sheet && game.mode === "play")) send("Escape");
      else if (b >= 12 && b <= 15) send(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"][b - 12]);
      else if ((b === 4 || b === 5) && UI.sheet && UI.sheet.tabs) UI.sheet.tabs(UI.sheet.tabAt() + (b === 5 ? 1 : -1));
    }
    void fresh;
  }

  /* ---- keys ---- */
  document.addEventListener("keydown", ev => {
    SFX.unlock();
    if (game.mode === "title" && !SFX.tune && !SMALL.matches) SFX.startTune();
    if (ev.key === "Shift") I.held.add("shift");
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (UI.sheet) { UI.key(ev); return; }
    if (document.querySelector(".pd-ask")) return;
    const k = ev.key.length === 1 ? ev.key.toLowerCase() : ev.key;
    if (k === "m" && !(ev.target.closest && ev.target.closest("input"))) { ev.preventDefault(); game.toggleMute(); return; }
    if (game.mode === "title") { titleKey(ev); return; }
    if (game.mode !== "play") return;
    /* no function key is ours: the browser keeps them all */
    if (/^F\d+$/.test(ev.code)) return;
    let a = I.actionFor(ev.code);
    if (!a && (ev.key === "+" || ev.key === "=")) a = "tcU";
    if (!a && ev.key === "?") { ev.preventDefault(); UI.help(3, () => game.unpause()); return; }
    if (a) ev.preventDefault();
    if (!ev.repeat) konamiStep("keys", ev.code);
    if (!a) return;
    I.down(ev, a);
    const rep = ["tcU", "tcD", "aU", "aD"];
    if (ev.repeat && !rep.includes(a) && !(a === "fire")) return;
    if (ev.repeat && (a === "aU" || a === "aD") && game.S.me.mode === "aim") return;
    act(a, ev);
  });
  document.addEventListener("keyup", ev => { if (ev.key === "Shift") I.held.delete("shift"); I.up(ev); });
  addEventListener("blur", () => { I.clear(); if (game.mode === "play") game.pause(); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { checkpoint(); if (game.mode === "play") game.pause(); } });
  addEventListener("pagehide", () => checkpoint());
  document.addEventListener("pointerdown", () => { SFX.unlock(); if (game.mode === "title" && !SFX.tune && !SMALL.matches) SFX.startTune(); }, true);
  document.addEventListener("pointerover", ev => {
    if (ev.pointerType !== "mouse") return;
    const b = ev.target.closest && ev.target.closest("button:not(:disabled), summary");
    if (!b || b === document.activeElement || !b.closest(".pd-sheet, #title") || b.closest(".sh-head")) return;
    const a = document.activeElement;
    if (a && a.matches("input")) return;
    if (document.querySelector(".pd-ask")) return;
    b.focus({ preventScroll: true });
  });
  $("title").addEventListener("click", ev => { const b = ev.target.closest("[data-act]"); if (b) titleAct(b.dataset.act); });
  $("snd").addEventListener("click", () => game.toggleMute());
  $("pausebtn").addEventListener("click", () => game.pause());
  $("helpbtn").addEventListener("click", () => { if (game.mode === "play" && !UI.sheet) { I.clear(); UI.help(3, () => game.unpause()); } });
  $("screen").addEventListener("contextmenu", ev => ev.preventDefault());
  /* the mouse, with Keys and mouse: a ship clicked goes in the glasses; the glasses clicked lay the gun; the map clicked sets a course */
  const toCanvas = ev => { const cv = $("screen"), r = cv.getBoundingClientRect(); return [(ev.clientX - r.left) / r.width * cv.width, (ev.clientY - r.top) / r.height * cv.height]; };
  $("screen").addEventListener("click", ev => {
    const S = game.S; if (!S || game.mode !== "play" || UI.sheet || !R.last) return;
    const [px, py] = toCanvas(ev);
    if (game.ui.view === "map" && R.last.map) {
      const p = R.last.map.toW(px, py);
      const hit = E.contacts(S).map(u => ({ u, d: PD.dist(u.x, u.y, p.x, p.y) })).sort((a, b) => a.d - b.d)[0];
      if (hit && hit.d * R.last.map.k < 6) { I.push({ a: "tgt", id: hit.u.id }); return; }
      game.ui.cursor = { x: p.x, y: p.y };
      if (PD.modern()) I.push({ a: "dest", x: p.x, y: p.y, add: ev.shiftKey && game.ui.aids.route });
      return;
    }
    const L = R.last.L, bi = R.last.bino;
    if (L && bi && bi.ppn && px >= L.bino.x && px <= L.bino.x + L.bino.w && py >= L.bino.y && py <= L.bino.y + L.bino.h) {
      if (PD.modern()) { S.me.aim.a = (px - bi.cx) / bi.ppn; S.me.aim.r = (bi.hz - 6 - py) / bi.rScale; if (S.me.mode !== "aim") I.push({ a: "mode" }); }
      return;
    }
    if (R.last.view) {
      const d = R.last.view.drawn.filter(q => { const u = W.unit(S, q.id); return u && E.known(S, u); }).sort((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
      if (d && Math.abs(d.x - px) < Math.max(10, d.px * 0.7)) I.push({ a: "tgt", id: d.id });
    }
  });
  $("screen").addEventListener("wheel", ev => {
    if (!game.S || game.ui.view !== "map" || !R.last || !R.last.map) return;
    ev.preventDefault();
    const u = game.ui, [px, py] = toCanvas(ev), p = R.last.map.toW(px, py);
    u.mapZoom = PD.clamp(u.mapZoom + (ev.deltaY < 0 ? 1 : -1), 0, PD.OpsMap.ZOOMS.length - 1);
    u.mapAt = u.mapZoom ? p : null;
  }, { passive: false });

  /* ---- the stage: the whole window, about 360 pixels high, square pixels; and never narrower than the
   * console needs (480), whole pixels if a smaller whole number allows, a fraction only if none does ---- */
  const MIN_W = 480;
  const scaleK = () => {
    const kk = innerHeight / 360, k = kk >= 1.5 ? Math.round(kk) : Math.max(1, kk);
    if (innerWidth / k >= MIN_W) return k;
    const f = Math.floor(kk);
    return f >= 1.5 && innerWidth / f >= MIN_W ? f : Math.max(1, innerWidth / MIN_W);
  };
  function fit() {
    const k = scaleK();
    K.VW = Math.ceil(innerWidth / k); K.VH = Math.ceil(innerHeight / k);
    const cv = $("screen");
    cv.width = K.VW; cv.height = K.VH;
    const st = $("stage");
    st.style.width = K.VW * k + "px"; st.style.height = K.VH * k + "px";
    if (R.g) R.init(cv);
  }
  addEventListener("resize", () => { fit(); sizeScene(); });

  /* ---- boot ---- */
  function boot() {
    game.applySpeed(); game.applyLook(); game.syncAids(); syncSound();
    injectTitleCSS();     /* the boot's; the title and the sheets are css/pdfpumasis.css */
    fit();
    const q = new URLSearchParams(location.search);
    const run = SMALL.matches || q.has("play") ? { finish: async () => {}, cancel() {} } : runBoot({ lines: [bootReloadLine(), "lowering the foils"] });
    /* the boot is on screen: now the slow part, tracing the first ships */
    setTimeout(() => {
      R.init($("screen"));
      HUD.build();
      for (const cls of ["lupa1", "cur", "pumasis+"]) for (const b of [4, 8, 12]) PD.ShipArt.sprite(cls, b, 24, "dusk");
      if (q.has("play")) {
        /* debug: ?play=<mission>&seed=<n>&hour=<h>&view=map&near=<nm>&tgt=1&aim=1&foil=1&pause=1 */
        const S = E.newMission(+q.get("play") || 1, { seed: +(q.get("seed") || 1) });
        if (q.has("hour")) { const d = (+q.get("hour")) * 3600 - S.t0; S.t += d; S.t0 += d; }
        const foe = S.u.filter(u => u.side === "wolf")[0] || (S.droneQ && S.droneQ.length ? (S.u.push(M.drone(S, S.droneQ.shift(), S.me)), S.u[S.u.length - 1]) : null);
        if (q.has("near") && foe) { const r = +q.get("near"), b = S.me.hdg + 0.2; Object.assign(foe, { x: S.me.x + PD.hx(b) * r, y: S.me.y + PD.hy(b) * r }); }
        if (q.has("foil")) Object.assign(S.me, { foil: "foil", spd: 40, thr: 4 });
        E.sense(S);
        startPlay(S, true);
        if (q.has("view")) game.ui.view = q.get("view");
        if (q.has("tgt") && foe) { S.me.tgt = foe.id; foe.seenT = S.t; foe.everSeen = true; }
        if (q.has("aim")) S.me.mode = "aim";
        if (q.has("pause")) game.pause();
      } else {
        openTitle();
        const saved = PD.loadGame();
        run.finish(["the Pumasis is on station", saved ? "a mission in progress" : "eight missions"]).then(() => {
          revealTitle(!q.has("shot"));
          const sheet = q.get("sheet");
          if (sheet && UI[sheet]) UI[sheet]();
        });
      }
      game.last = performance.now();
      requestAnimationFrame(frame);
    }, 60);
  }
  boot();
})();
