/* PDF Pumasis -- the HUD: the little that is not on the console.
 *
 * Top left, the two views (V) and the mission; top right, pause, help and
 * sound, then the clock (now,
 * when the mission ends, how long is left) and the time compression, amber
 * with the reason when something in the air is holding it at 8x. Over the
 * console, the crew's reports, each with the PDF crest; along the foot, the
 * key strip. Written to the page only when it has changed. */
"use strict";
(() => {
  const C = PD.C, E = PD.Engine, esc = PD.esc;
  const HUD = PD.HUD = { el: null, toasts: [], last: {}, built: false };
  const $ = id => document.getElementById(id);
  const set = (el, k, v, f) => { if (HUD.last[k] !== v) { HUD.last[k] = v; f(el, v); } };

  HUD.build = () => {
    const el = HUD.el = $("hud");
    el.innerHTML = `
      <nav class="hp" id="h-tabs" aria-label="Views"><button data-v="bridge"><kbd>V</kbd>Bridge</button><button data-v="map"><kbd>V</kbd>Map</button><div class="hm"></div></nav>
      <div class="h-right"><div class="hp" id="h-clock"><div class="hc-time">0000</div><div class="hc-ends">Ends <b>0000</b>, <b class="left">0:00</b> left</div><div class="hc-tc"><span class="lbl">Time</span><b>1x</b><span class="why"></span></div></div></div>
      <div class="h-low"><div class="h-toasts"></div></div>
      <div class="hp h-hint" hidden></div>
      <div class="hp h-end" hidden></div>
      <div class="h-flash"></div>`;
    /* the pause, help and sound buttons stand just left of the clock, however wide it grows */
    const corner = $("corner"); if (corner) el.querySelector(".h-right").prepend(corner);
    el.querySelector("#h-tabs").addEventListener("click", ev => { const b = ev.target.closest("[data-v]"); if (b && PD.game.setView) PD.game.setView(b.dataset.v); });
    HUD.last = {};
    HUD.built = true;
  };

  /* who speaks: the crew member each report comes from */
  HUD.toast = (text, tone = "", ms = 2800, who = "") => {
    const box = HUD.el && HUD.el.querySelector(".h-toasts");
    if (!box) return;
    if (HUD.toasts.some(t => t.text === text && t.until > performance.now())) return;
    const d = document.createElement("div");
    d.className = "hp h-toast " + tone;
    d.innerHTML = `<img src="${PD.Puma.crestURL(24)}" alt="" width="24" height="24"><span>${who ? `<span class="who">${esc(who)}</span><br>` : ""}${esc(text)}</span>`;
    box.appendChild(d);
    HUD.toasts.push({ text, d, until: performance.now() + ms });
    while (HUD.toasts.length > 3) HUD.toasts.shift().d.remove();
    const live = $(tone === "red" ? "alert" : "live"); if (live) live.textContent = (who ? who + ": " : "") + text;
  };
  HUD.flash = () => { const f = HUD.el && HUD.el.querySelector(".h-flash"); if (!f) return; f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); };
  HUD.hint = (html, tone = "") => { const h = HUD.el.querySelector(".h-hint"); if (!html) { h.hidden = true; HUD.hintNow = ""; return; } if (HUD.hintNow !== tone + html) { HUD.hintNow = tone + html; h.innerHTML = PD.Input.caps(html); h.className = "hp h-hint" + (tone ? " " + tone : ""); } h.hidden = false; };
  HUD.end = (title, sub, tone) => { const e = HUD.el.querySelector(".h-end"); if (!title) { e.hidden = true; return; } e.dataset.tone = tone; e.innerHTML = `<b>${esc(title)}</b><span>${esc(sub || "")}</span>`; e.hidden = false; };
  HUD.clear = () => { HUD.toasts.forEach(t => t.d.remove()); HUD.toasts = []; if (HUD.el) { HUD.end(null); HUD.hint(null); } HUD.last = {}; };

  /* the part of the play screen the panels leave clear, in the canvas's pixels */
  function safe() {
    const cv = $("screen"), k = cv.getBoundingClientRect().width / cv.width || 1, R = PD.Render;
    const top = Math.ceil(Math.max(HUD.el.querySelector("#h-tabs").getBoundingClientRect().bottom, HUD.el.querySelector("#h-clock").getBoundingClientRect().bottom) / k) + 2;
    const hint = HUD.el.querySelector(".h-hint");
    let bot = 4;
    if (hint && !hint.hidden) { const r = hint.getBoundingClientRect(); if (r.height) bot = Math.ceil((innerHeight - r.top) / k) + 2; }
    R.safe = { t: top, b: bot, k };
    /* the crew's reports sit just over the console */
    const L = R.layout(cv.width, cv.height), low = HUD.el.querySelector(".h-low");
    low.style.bottom = (PD.game.ui.view === "map" ? (bot + 16) * k : (cv.height - L.panel.y + 6) * k) + "px";
  }
  const WHY = { inFlight: "something in the air" };
  HUD.draw = (S, ui) => {
    if (!HUD.built) HUD.build();
    const el = HUD.el, now = performance.now();
    HUD.toasts = HUD.toasts.filter(t => { if (t.until > now) return true; t.d.remove(); return false; });
    if (now - (HUD.safeAt || 0) > 250) { HUD.safeAt = now; safe(); describe(S, ui); }
    set(el.querySelector("#h-tabs"), "tabs", ui.view, e => { for (const b of e.querySelectorAll("button")) b.setAttribute("aria-current", String(b.dataset.v === ui.view)); });
    set(el.querySelector(".hm"), "mname", S.name + (S.konami ? "!" : "") + PD.aidsLabel(), e => { e.innerHTML = `${esc(S.name)} <span>· ${esc(PD.aidsLabel())}</span>${S.konami ? '<span class="flag">Code</span>' : ""}`; });
    set(el.querySelector(".hc-time"), "time", C.timeStr(S.t), (e, v) => { e.textContent = v; });
    const left = E.left(S);
    set(el.querySelector(".hc-ends"), "ends", C.timeStr(S.t0 + S.limit) + C.hm(left), e => { const b = e.querySelectorAll("b"); b[0].textContent = C.timeStr(S.t0 + S.limit); b[1].textContent = C.hm(left); e.classList.toggle("low", left < S.limit * 0.15); });
    const req = C.TC[S.tcReq], tcNow = E.tcNow(S), held = tcNow < req;
    set(el.querySelector(".hc-tc"), "tc", `${tcNow}:${req}`, e => { e.classList.toggle("held", held); e.querySelector("b").textContent = tcNow + "x"; e.querySelector(".why").textContent = held ? `${WHY.inFlight}: not ${req}x` : ""; });
  };
  /* what the screen shows, in words, for a screen reader */
  function describe(S, ui) {
    const m = S.me, n = E.contacts(S).length, t = PD.Weapons.tgt(S);
    const what = ui.view === "map" ? "Operations map" : `Bridge, heading ${PD.deg3(m.hdg)}, ${Math.round(m.spd)} knots`;
    const s = `${what}. ${n ? n + " contact" + (n > 1 ? "s" : "") : "No contacts"}.${t ? ` Target ${PD.nm(PD.dist(m.x, m.y, t.x, t.y))} miles, bearing ${PD.deg3(PD.angTo(m.x, m.y, t.x, t.y))}.` : ""}`;
    if (HUD.desc !== s) { HUD.desc = s; $("screen").setAttribute("aria-label", "PDF Pumasis: " + s); }
  }
})();
