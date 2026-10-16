/* PDF Pumasis -- keys and pads, turned into orders for the next step.
 *
 * The keys are 1987's, with two changes: no function keys anywhere (the
 * C64's F1 F3 F5 F7 are 6 7 8 9, as the Apple II card had them), and the
 * arrows do what its I J K M did, since M is sound in every greykit game.
 * The arrows are the joystick: in Maneuver mode left and right steer and
 * up and down move the throttle a notch; in Aiming mode (Space) they lay
 * the gun in the glasses; on the map they move the cursor. Comma and period
 * steer whatever the mode. A held helm swings the course at the same rate
 * in real time whatever the time compression. */
"use strict";
(() => {
  const I = PD.Input = { held: new Set(), queue: [], pad: new Set(), padPrev: new Set(), stick: null, rstick: null, device: "keys", heldT: {}, tapD: 0 };
  const BIND = {
    ArrowUp: "aU", ArrowDown: "aD", ArrowLeft: "aL", ArrowRight: "aR",
    Comma: "hL", Period: "hR",
    Digit0: "n0", Digit1: "n1", Digit2: "n2", Digit3: "n3", Digit4: "n4", Digit5: "n5",
    Numpad0: "n0", Numpad1: "n1", Numpad2: "n2", Numpad3: "n3", Numpad4: "n4", Numpad5: "n5",
    Digit6: "w6", Digit7: "w7", Digit8: "w8", Digit9: "w9", Numpad6: "w6", Numpad7: "w7", Numpad8: "w8", Numpad9: "w9",
    Space: "mode", Enter: "fire", NumpadEnter: "fire",
    KeyV: "view", Tab: "view", KeyT: "next", KeyR: "radar", KeyD: "circles", KeyZ: "zoom", KeyG: "glasses",
    Equal: "tcU", NumpadAdd: "tcU", Minus: "tcD", NumpadSubtract: "tcD", KeyN: "tc1",
    KeyP: "pause", Escape: "pause", KeyQ: "quit", KeyL: "aids",
  };
  I.BIND = BIND;
  I.actionFor = code => BIND[code] || null;
  I.clear = () => { I.held.clear(); I.pad.clear(); I.queue.length = 0; I.stick = null; I.rstick = null; I.heldT = {}; };

  /* ---- the key caps: one face for every key, the arrows drawn, the letters as this keyboard has them ---- */
  const CODE = { "[": "BracketLeft", "]": "BracketRight", ",": "Comma", ".": "Period" };
  const layout = new Map();
  if (navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { m.forEach((v, k) => layout.set(k, v)); }).catch(() => {});
  const ARROW = { up: 0, right: 90, down: 180, left: 270 };
  const arrow = (d, word) => `<svg class="kb-ar" viewBox="0 0 10 10" width="10" height="10" aria-hidden="true"${ARROW[d] ? ` style="transform:rotate(${ARROW[d]}deg)"` : ""}><path d="M5 9V1.8M1.8 5L5 1.8 8.2 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="square"/></svg><span class="sr">${word}</span>`;
  const GLYPH = { "←": "left", "→": "right", "↑": "up", "↓": "down" };
  const PADNAME = { dU: ["D-pad", "up"], dD: ["D-pad", "down"], dL: ["D-pad", "left"], dR: ["D-pad", "right"] };
  I.cap = name => {
    if (name.startsWith("pad:")) return name.slice(4).split("+").map(p => {
      const d = PADNAME[p];
      return d ? `<kbd class="pad">${d[0]} ${arrow(d[1], d[1])}</kbd>` : `<kbd class="pad${p.length === 1 ? " face" : ""}">${p}</kbd>`;
    }).join('<span class="kb-plus">+</span>');
    const d = GLYPH[name] || (ARROW[name] !== undefined ? name : null);
    if (d) return `<kbd class="ar">${arrow(d, d + " arrow")}</kbd>`;
    const code = /^[A-Z]$/.test(name) ? "Key" + name : CODE[name], here = code && layout.get(code);
    return `<kbd class="k">${here && here.length === 1 ? here.toUpperCase() : name}</kbd>`;
  };
  I.caps = html => html.replace(/<kbd>([^<]{1,16})<\/kbd>/g, (m, k) => I.cap(k));
  I.push = a => I.queue.push(a);
  I.down = (ev, a) => { I.device = "keys"; I.held.add(a); if (!ev.repeat) I.heldT[a] = performance.now(); };
  I.up = ev => { const a = BIND[ev.code]; if (a) { I.held.delete(a); delete I.heldT[a]; } };
  const on = a => I.held.has(a) || I.pad.has(a);
  const heldFor = a => I.heldT[a] ? performance.now() - I.heldT[a] : 0;

  /* the continuous part of the orders, for one step of stepMs real milliseconds */
  I.cmd = (S, ui, stepMs) => {
    const c = { dHdg: 0, aim: { da: 0, dr: 0 }, fireHeld: false, acts: I.queue.splice(0) };
    const sec = stepMs / 1000, fast = I.held.has("shift") ? 2.5 : 1, m = S.me, bridge = ui.view !== "map", aiming = m.mode === "aim";
    /* the helm: comma and period always; the arrows in Maneuver mode on the bridge; the left stick likewise */
    let h = 0;
    if (on("hL") || (bridge && !aiming && on("aL"))) h -= 1;
    if (on("hR") || (bridge && !aiming && on("aR"))) h += 1;
    if (I.stick && Math.abs(I.stick.x) > 0.3 && bridge && !aiming) h += I.stick.x;
    const helmKey = ["hL", "hR", "aL", "aR"].find(k => on(k));
    if (h && (!helmKey || heldFor(helmKey) > 200 || I.stick)) c.dHdg = h * 20 * PD.DEG * sec * fast;
    c.dHdg += I.tapD; I.tapD = 0;
    /* the gun's aim in the glasses */
    if (bridge && aiming) {
      if (on("aL")) c.aim.da -= 1; if (on("aR")) c.aim.da += 1;
      if (on("aU")) c.aim.dr += 1; if (on("aD")) c.aim.dr -= 1;
      if (I.stick) { c.aim.da += I.stick.x; c.aim.dr -= I.stick.y; }
    }
    if (bridge && I.rstick) { c.aim.da += I.rstick.x; c.aim.dr -= I.rstick.y; }
    c.aim.da *= fast; c.aim.dr *= fast;
    if (bridge && aiming && m.weapon === "gun" && on("fire")) c.fireHeld = true;
    /* the map's cursor: miles a real second, by the zoom */
    if (!bridge && ui.cursor) {
      let cx = 0, cy = 0;
      if (on("aL")) cx -= 1; if (on("aR")) cx += 1; if (on("aU")) cy -= 1; if (on("aD")) cy += 1;
      const st = I.stick || I.rstick; if (st) { cx += st.x; cy += st.y; }
      const span = (S.win[2] - S.win[0]) / PD.OpsMap.ZOOMS[ui.mapZoom || 0];
      ui.cursor.x = PD.clamp(ui.cursor.x + cx * span * 0.22 * sec * fast, S.win[0], S.win[2]);
      ui.cursor.y = PD.clamp(ui.cursor.y + cy * span * 0.22 * sec * fast, S.win[1], S.win[3]);
    }
    return c;
  };
  /* a tap of the helm: five degrees at once, before the hold takes over */
  I.tapHelm = d => { I.tapD += d * 5 * PD.DEG; };

  /* ---- gamepads (the standard mapping) ----
   * A fire (on the map: set the course), B Maneuver or Aiming, X the next target, Y bridge or map; the bumpers
   * the weapon (on the map, the craft); the triggers time; the d-pad the throttle and the radar's scale; the left
   * stick steers or aims, the right stick aims; Start pauses. Back held is a second layer: X the target before,
   * LB the aids, LT back to 1x, Start help. */
  const PAD = ["fire", "mode", "next", "view", "wPrev", "wNext", "tcD", "tcU", null, "pause", null, null, "thrU", "thrD", "radarIn", "radarOut"];
  const PAD_MOD = { 2: "prev", 4: "aids", 6: "tc1", 9: "help", 0: "chaffNow" };
  I.rawPrev = new Set(); I.padBtns = []; I.modUsed = false;
  I.pollPad = () => {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const raw = new Set();
    let sx = 0, sy = 0, rx = 0, ry = 0;
    for (const p of pads) {
      if (!p) continue;
      p.buttons.forEach((b, i) => { if (b && b.pressed) raw.add(i); });
      sx = p.axes[0] || 0; sy = p.axes[1] || 0; rx = p.axes[2] || 0; ry = p.axes[3] || 0;
    }
    const mod = raw.has(8), now = new Set();
    for (const i of raw) { const a = mod ? PAD_MOD[i] : PAD[i]; if (a) { now.add(a); if (mod) I.modUsed = true; } }
    I.pad = new Set(raw.has(0) && !mod ? ["fire"] : []);
    I.stick = Math.hypot(sx, sy) > 0.3 ? { x: sx, y: sy } : null;
    I.rstick = Math.hypot(rx, ry) > 0.25 ? { x: rx, y: ry } : null;
    I.padBtns = [...raw].filter(i => !I.rawPrev.has(i));
    I.rawPrev = raw;
    const fresh = [...now].filter(a => !I.padPrev.has(a));
    if (fresh.length || raw.size || I.stick || I.rstick) I.device = "pad";
    I.padPrev = now;
    return fresh;
  };
})();
