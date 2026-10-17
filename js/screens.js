/* PDF Pumasis -- the screens with words on them: flat dark panels over the
 * sea (css/pdfpumasis.css). The missions and their papers, the custom slot,
 * the service record, the pause, the debrief, and Settings, Help and About. */
"use strict";
(() => {
  const esc = PD.esc, C = PD.C, E = PD.Engine, M = PD.Missions, num = PD.num;
  const UI = PD.UI = { sheet: null, aidOpen: false };
  const CREDIT = UI.CREDIT = 'Built by <a href="https://greykit.com/" target="_blank" rel="noopener">greykit.com</a>';
  const ICON_BACK = '<svg class="ic" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M7.5 2 L3.5 6 L7.5 10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';
  /* the red-pencil tick beside the chosen line of a signal (the title, the pause) */
  UI.TICK = '<svg class="tick" viewBox="0 0 24 20" width="22" height="18" aria-hidden="true"><path d="M2.4 10.8 C4.6 12.2 6.6 14.4 8.4 17.4 C11.6 10.6 16.2 5.6 22.2 1.8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>';
  const ICON_X ='<svg class="ic" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M3 3 L9 9 M9 3 L3 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square"/></svg>';

  /* ---- the sheet: a panel of its own over whatever was showing; popup, a window to one side ---- */
  UI.open = (title, { tabs, html, onClick, onClose, onKey, back, tab = 0, wide = false, closable = true, popup = false }) => {
    UI.close(true);
    const el = document.createElement("div");
    el.className = "pd-sheet " + (popup ? "pd-pop" : "full") + (wide ? " wide" : "") + (tabs ? " tabbed" : "");
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    let draw = () => {
      el.innerHTML = '<div class="' + (popup ? "pd-win" : "sh-box") + '"><header class="sh-head">' + (back ? '<button data-back title="Back (Esc)">' + ICON_BACK + "Back</button>" : "") + "<h2>" + esc(title) + "</h2>" +
        (closable && !back && !popup ? '<button data-x title="Close (Esc)">' + ICON_X + "Close</button>" : "") + "</header>" +
        (tabs ? '<div class="sh-tabs" role="tablist" aria-label="' + esc(title) + '">' + tabs.map(([t], i) => '<button role="tab" id="tab-' + i + '" data-tab="' + i + '" aria-selected="' + (i === tab) + '" aria-controls="tabpanel" tabindex="' + (i === tab ? 0 : -1) + '">' + esc(t) + "</button>").join("") + "</div>" : "") +
        '<div class="sh-body"' + (tabs ? ' id="tabpanel" role="tabpanel" aria-labelledby="tab-' + tab + '" tabindex="0"' : "") + '><div class="sh-in">' + PD.Input.caps(tabs ? tabs[tab][1] : html()) + "</div></div></div>";
    };
    /* more below: a fade along the foot while the body has more to scroll to */
    const cue = () => { const b = el.querySelector(".sh-body"), box = b && b.parentNode; if (box) box.classList.toggle("more", b.scrollHeight - b.scrollTop - b.clientHeight > 4); };
    const draw0 = draw;
    draw = () => { draw0(); requestAnimationFrame(cue); };
    draw();
    el.addEventListener("scroll", cue, true);
    const api = { refresh: () => { const b = el.querySelector(".sh-body"), y = b.scrollTop, f = document.activeElement && document.activeElement.dataset; draw(); el.querySelector(".sh-body").scrollTop = y; if (f) for (const k of ["set", "act", "d", "start"]) if (f[k]) { const n = el.querySelector(`[data-${k}="${f[k]}"]`); if (n) n.focus({ preventScroll: true }); } }, close: () => UI.close(), el };
    const setTab = i => { tab = (i + tabs.length) % tabs.length; draw(); el.querySelector('[data-tab="' + tab + '"]').focus(); };
    el.addEventListener("click", ev => {
      if (popup && ev.target === el && closable) return UI.close();
      const b = ev.target.closest("button"); if (!b) return;
      PD.SFX.play("menu");
      if (b.hasAttribute("data-x")) return UI.close();
      if (b.hasAttribute("data-back")) return goBack();
      if (b.dataset.tab !== undefined) return setTab(+b.dataset.tab);
      if (onClick) onClick(b, api, ev);
    });
    el.addEventListener("toggle", ev => { if (ev.target.classList && ev.target.classList.contains("aid-list")) UI.aidOpen = ev.target.open; }, true);
    function goBack() { UI.close(true); back(); }
    document.body.appendChild(el);
    UI.sheet = { el, onClose, onKey, closable, back: back ? goBack : null, tabs: tabs ? setTab : null, tabAt: () => tab };
    for (const id of ["game", "title"]) { const n = document.getElementById(id); if (n) n.inert = true; }
    (el.querySelector("[autofocus]") || el.querySelector(".sh-body .primary") || el.querySelector('[role="tab"][aria-selected="true"]') || el.querySelector(".sh-body button") || el.querySelector("button")).focus({ preventScroll: true });
    return api;
  };
  UI.close = quiet => {
    if (!UI.sheet) return;
    const s = UI.sheet; UI.sheet = null;
    s.el.remove();
    for (const id of ["game", "title"]) { const n = document.getElementById(id); if (n) n.inert = false; }
    if (s.onClose && !quiet) s.onClose();
    if (!quiet && PD.game.mode === "title") PD.game.refreshTitle();
  };
  /* the arrows walk the buttons by where they sit on the screen */
  UI.walk = (root, key) => {
    const d = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[key], a = document.activeElement;
    if (!d || !a || !root.contains(a)) return false;
    const box = n => { const r = n.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, r }; }, o = box(a);
    let best = null, bestS = Infinity;
    for (const n of root.querySelectorAll("button:not(:disabled), summary, input")) {
      if (n === a || n.offsetParent === null || n.getAttribute("role") === "tab" || n.closest(".sh-head")) continue;
      const b = box(n), dx = b.x - o.x, dy = b.y - o.y, along = dx * d[0] + dy * d[1];
      if (along <= (d[0] ? o.r.width : o.r.height) / 4) continue;
      const s = along + Math.abs(d[0] ? dy : dx) * 3;
      if (s < bestS) { bestS = s; best = n; }
    }
    if (!best) return false;
    best.focus({ preventScroll: true }); best.scrollIntoView({ block: "nearest" });
    return true;
  };
  UI.key = ev => {
    const s = UI.sheet;
    if (s.onKey && s.onKey(ev)) return;
    if (ev.key === "Escape") { ev.preventDefault(); if (s.back) s.back(); else if (s.closable) UI.close(); return; }
    if (s.tabs && document.activeElement && document.activeElement.getAttribute("role") === "tab" && (ev.key === "ArrowRight" || ev.key === "ArrowLeft")) { ev.preventDefault(); s.tabs(s.tabAt() + (ev.key === "ArrowRight" ? 1 : -1)); return; }
    const inInput = ev.target.closest && ev.target.closest("input");
    if (ev.key.startsWith("Arrow") && !(inInput && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) && UI.walk(s.el, ev.key)) { ev.preventDefault(); return; }
    if (ev.key === "Tab") {
      const f = [...s.el.querySelectorAll('button:not(:disabled), input, summary, a[href], [tabindex]:not([tabindex="-1"])')].filter(n => n.offsetParent !== null);
      if (!f.length) return;
      ev.preventDefault();
      const i = f.indexOf(document.activeElement), d = ev.shiftKey ? -1 : 1;
      f[i < 0 ? 0 : (i + d + f.length) % f.length].focus();
    }
  };
  /* a question before something that cannot be undone: Cancel has the focus */
  UI.ask = (question, yes, title = yes + "?") => new Promise(resolve => {
    const back = document.activeElement, el = document.createElement("div");
    el.className = "pd-ask";
    el.setAttribute("role", "alertdialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", title);
    el.innerHTML = '<div class="pd-win"><header class="sh-head"><h2>' + esc(title) + '</h2></header><div class="sh-body"><p>' + esc(question) +
      '</p><div class="row end"><button data-no class="primary">Cancel</button><button data-yes class="danger">' + esc(yes) + "</button></div></div></div>";
    const done = v => { document.removeEventListener("keydown", onKey, true); el.remove(); if (back && back.isConnected && back.focus) back.focus({ preventScroll: true }); resolve(v); };
    const onKey = ev => {
      if (ev.key === "Escape") { ev.preventDefault(); ev.stopPropagation(); done(false); return; }
      if (ev.key === "Tab" || ev.key === "ArrowLeft" || ev.key === "ArrowRight") { const bs = [...el.querySelectorAll("button")], i = bs.indexOf(document.activeElement); ev.preventDefault(); bs[(i + (ev.shiftKey || ev.key === "ArrowLeft" ? -1 : 1) + bs.length) % bs.length].focus(); }
      ev.stopPropagation();
    };
    el.addEventListener("click", ev => { if (ev.target === el) return done(false); const b = ev.target.closest("button"); if (b) done(b.hasAttribute("data-yes")); });
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(el);
    el.querySelector("[data-no]").focus();
  });

  const pill = (on, label, act) => `<button data-set="${act}" class="pill${on ? " on" : ""}" aria-pressed="${on}">${label}</button>`;
  const toggle = (act, on, n) => `<button data-set="${act}" role="switch" aria-checked="${on}" aria-label="${esc(n)}" class="pill switch${on ? " on" : ""}">${on ? "On" : "Off"}</button>`;
  const line = (n, note, ctl) => `<tr><td><b>${esc(n)}</b><br><span class="note">${note}</span></td><td class="act">${ctl}</td></tr>`;
  const crest = () => `<img class="crest" src="${PD.Puma.crestURL(48)}" alt="" width="48" height="48">`;
  const hours = h => C.timeStr(h * 3600);

  /* ---- the missions: all eight open from the first, as in 1987 ---- */
  UI.missions = () => {
    const rec = PD.record();
    UI.open("Missions", { wide: true, back: () => PD.game.toTitle(),
      html: () => `<div class="diffs acts">${M.LIST.map(mi => { const b = rec.best[mi.id]; return `<button data-m="${mi.id}"><b><kbd>${mi.id}</kbd>${esc(mi.name)}</b><span>${esc(mi.where)} · ${esc(C.BOATS[mi.boat].name)}</span><span class="meta">${b ? `Best: ${esc(b.rank)}, ${num(b.total)}${b.code ? " · code" : ""}` : `Up to ${esc(C.RANKS[mi.max])}`}</span></button>`; }).join("")}</div>`,
      onKey: ev => { const n = +ev.key; if (n >= 1 && n <= 8) { ev.preventDefault(); UI.close(true); UI.brief(n); return true; } return false; },
      onClick: b => { if (b.dataset.m) { UI.close(true); UI.brief(+b.dataset.m); } },
    });
  };
  /* the mission's waters as the map shows them before anything is sighted: the coast, the boat, the objective */
  const chart = id => {
    const S = E.newMission(id, { seed: 1 }), w = S.win, ww = w[2] - w[0], wh = w[3] - w[1], z = Math.min(240 / ww, 150 / wh);
    const cw = Math.round(ww * z), ch = Math.round(wh * z), c = PD.K.mk(cw, ch), g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    PD.OpsMap.draw(g, S, { aids: { goal: true }, circles: false, mapZoom: 0 }, { x: 0, y: 0, w: cw, h: ch }, 500);
    return `<img class="chart px" src="${c.toDataURL()}" width="${cw * 2}" height="${ch * 2}" alt="Chart of the operating area: our boat is the white arrow${M.get(id).exit || M.get(id).dest || M.get(id).supply || id === 3 || id === 5 ? ", the objective dotted in green" : ""}.">`;
  };
  /* ---- a mission's papers, before you sail ---- */
  UI.brief = (id, custom) => {
    const mi = M.get(id), k = C.BOATS[mi.boat], hs = mi.helos.length, hour = custom && custom.hour !== undefined ? custom.hour : mi.hour;
    let aids = PD.prefs.aids;
    const ask = !PD.prefs.asked, pic = chart(id);
    /* the first time, the choice of aids: Field first, as a first sailing wants the keys on screen */
    const set = (v, n, d) => `<button data-set="aids:${v}" aria-pressed="${aids === v}" class="${aids === v ? "on" : ""}"><b>${n}</b><span>${d}</span></button>`;
    UI.open(`Mission ${mi.id}: ${mi.name}`, { wide: true, back: () => custom ? UI.custom() : UI.missions(),
      html: () => `<div class="report"><div>
        <div class="cap">${crest()}<h3 class="mname">${esc(mi.where)}</h3></div>
        <p class="lede">${esc(mi.brief)}</p>
        <p><b>Objective:</b> ${esc(mi.goal)}.</p>
        ${mi.id === 1 && (ask ? aids === "field" : PD.aid("hints")) ? `<p class="note">New to the bridge? The key strip along the foot walks you through the first target.</p>` : ""}
        <figure class="chart">${pic}</figure></div><div>
        <table class="tally"><tr><td>Your boat</td><td>${esc(k.name)}: 76mm, ${esc(C.MSL[k.msl].name)} ×${k.mslN}, chaff ×${k.chaff}</td></tr>
        <tr><td>Kestrels</td><td>${hs ? hs + " helicopter" + (hs > 1 ? "s" : "") + ", steered from the map" : "none"}</td></tr>
        <tr><td>Sails at</td><td class="num">${hours(hour)}</td></tr><tr><td>Time allowed</td><td class="num">${C.hm(mi.limit)}</td></tr>
        <tr><td>Highest rank</td><td>${esc(C.RANKS[mi.max])}</td></tr></table>
        ${ask ? `<h3>How to play it</h3><div class="diffs two">${set("field", "Field", "Modern aids: contact labels, a gun-lead mark, missile warnings, the keys along the foot.")}${set("classic", "Classic", "As 1987 played: tell ships by their shapes, lead the gun by the corrector bars.")}</div><p class="note"><kbd>L</kbd> switches at sea; Settings sets each aid on its own.</p>` : `<p class="note">${esc(PD.aidsLabel())} aids. <kbd>L</kbd> switches at sea.</p>`}
        </div></div>
        <div class="row end"><button data-act="go" class="primary">Sail</button></div>`,
      onKey: ev => { if (ev.key === "Enter" && !(ev.target.closest && ev.target.closest("button"))) { ev.preventDefault(); go(); return true; } return false; },
      onClick: (b, api) => { const v = b.dataset.set; if (v && v.startsWith("aids:")) { aids = v.slice(5); api.refresh(); return; } if (b.dataset.act === "go") go(); },
    });
    function go() { if (ask) { PD.prefs.asked = true; PD.setAids(aids); } UI.close(true); PD.game.start(id, custom); }
  };
  /* ---- the custom slot: any mission, at any hour, from any seed ---- */
  UI.custom = () => {
    const last = PD.store.get("pdfpumasis_custom_v1", null) || {};
    const c = Object.assign({ m: 1, hour: -1, seed: "" }, last);
    const HOURS = [[-1, "As written"], [6, "Dawn"], [12, "Noon"], [18.5, "Dusk"], [23, "Night"]];
    UI.open("Custom mission", { wide: true, back: () => PD.game.toTitle(),
      html: () => `<h3>Mission</h3><div class="row">${M.LIST.map(mi => pill(c.m === mi.id, mi.id + " " + esc(mi.name), "m:" + mi.id)).join("")}</div>
        <h3>Hour</h3><div class="row">${HOURS.map(([h, n]) => pill(c.hour === h, n, "h:" + h)).join("")}</div>
        <h3>Seed</h3><div class="row"><input id="pd-seed" inputmode="numeric" maxlength="9" placeholder="any" value="${esc(c.seed)}" autocomplete="off"><span class="note">The same seed, the same forces where they were.</span></div>
        <div class="row end"><button data-act="go" class="primary">To the papers</button></div>`,
      onClick: (b, api) => {
        const v = b.dataset.set, seedNow = () => (document.getElementById("pd-seed").value || "").replace(/\D/g, "");
        if (v) { const [k2, x] = v.split(":"); c.seed = seedNow(); if (k2 === "m") c.m = +x; else c.hour = +x; api.refresh(); return; }
        if (b.dataset.act === "go") { c.seed = seedNow(); PD.store.set("pdfpumasis_custom_v1", c); UI.close(true); UI.brief(c.m, { hour: c.hour < 0 ? undefined : c.hour, seed: c.seed ? +c.seed : 0 }); }
      },
    });
  };

  /* ---- the service record ---- */
  UI.record = after => {
    const r = PD.record();
    UI.open("Service record", { wide: true, onClose: after,
      html: () => `<h3>Best in each mission</h3><table class="scores"><tr><th></th><th>Mission</th><th>Rank</th><th class="num">Score</th><th>Aids</th></tr>${M.LIST.map(mi => { const b = r.best[mi.id]; return `<tr><td class="num">${mi.id}</td><td>${esc(mi.name)}</td><td>${b ? esc(b.rank) + (b.ok ? "" : ", objective missed") : "—"}</td><td class="num">${b ? num(b.total) : ""}</td><td>${b ? (b.aids === "field" ? "Field" : "Classic") + (b.code ? " · code" : "") : ""}</td></tr>`; }).join("")}</table>
        <h3>Lately</h3>${r.log.length ? `<table class="tally">${r.log.map(e => `<tr><td>${esc(M.get(e.m).name)}</td><td>${esc(e.rank)}</td><td class="num">${num(e.total)}</td><td class="note">${esc(WHY_SHORT[e.why] || e.why)}</td></tr>`).join("")}</table>` : `<p class="note">No missions sailed yet.</p>`}`,
    });
  };
  const WHY_SHORT = { goal: "objective done", time: "time ran out", sunk: "sunk", fuel: "out of fuel", quit: "quit", escaped: "some escaped", convoyLost: "the ship was lost", cargoSunk: "a merchant sunk" };

  /* ---- pause ---- */
  const KEY_LEGEND = [["V", "bridge or map"], [", .", "steer"], ["0 – 5", "speed"], ["Space", "maneuver or aim"], ["6 7 8", "gun, chaff, missile"], ["T", "next target"], ["Enter", "fire"], ["+ −", "time"]];
  const PAD_LEGEND = [["pad:L-stick", "steer, or aim"], ["pad:dU pad:dD", "speed"], ["pad:B", "maneuver or aim"], ["pad:LB pad:RB", "weapon"], ["pad:X", "next target"], ["pad:A", "fire"], ["pad:Y", "bridge or map"], ["pad:LT pad:RT", "time"]];
  UI.pause = () => {
    const S = PD.game.S;
    UI.open("Paused", { popup: true,
      html: () => `<h3 class="mname">Mission ${S.mission}: ${esc(S.name)}</h3>
        <p class="meta">${C.timeStr(S.t)} · ${C.hm(E.left(S))} left · ${S.stats.sunk.length} sunk</p>
        <div class="col"><button data-act="resume" class="primary">Resume</button>
        <button data-act="settings">Settings</button><button data-act="help">Help</button>
        <button data-act="leave">${PD.prefs.resume ? "Main menu: resume it later" : "Main menu"}</button>
        <button data-act="quit">End the mission</button></div>
        <div class="note keys legend">${(PD.Input.device === "pad" ? PAD_LEGEND : KEY_LEGEND).map(([k2, w]) => `<span class="k">${k2.split(" ").map(x => x === "–" ? '<span class="kb-to">–</span>' : `<kbd>${x}</kbd>`).join(" ")}</span><span>${w}</span>`).join("")}</div>`,
      onClick: async b => {
        const a = b.dataset.act;
        if (a === "resume") UI.close();
        if (a === "settings") { UI.close(true); UI.settings(() => UI.pause()); }
        if (a === "help") { UI.close(true); UI.help(0, () => UI.pause()); }
        if (a === "leave") { if (PD.prefs.resume) { UI.close(true); PD.game.leave(); } else if (await UI.ask("Leave this mission? It will not be kept.", "Leave")) { UI.close(true); PD.clearGame(); PD.game.toTitle(); } }
        if (a === "quit" && await UI.ask("End the mission here? It is scored as it stands.", "End the mission")) { UI.close(true); PD.game.quit(); }
      },
      onClose: () => PD.game.unpause(),
    });
  };

  /* ---- the debrief (1987: objective, sunk, damaged, time, survival; the total; the rank) ---- */
  const WHY = { goal: "Objective complete.", time: "Time is up.", sunk: "We have been sunk.", fuel: "Out of fuel: she lies dead in the water.", quit: "You ended the mission.", escaped: "Some of them got away.", convoyLost: "The ship we were escorting is lost.", cargoSunk: "An unarmed merchant was sunk: the mission is over." };
  /* the one thing most worth doing differently, from what happened */
  const tip = S => {
    const st = S.stats, why = S.end.why;
    if (why === "goal") return "";
    if (!st.fired && !st.shells) return "No shots fired. <kbd>T</kbd> puts a contact in the glasses, <kbd>Space</kbd> aims the gun, <kbd>Enter</kbd> fires.";
    if (why === "sunk" && st.hitsUs) return "Their missiles found us. Fire chaff (<kbd>7</kbd>) when one is about a mile out, running across its path.";
    if (why === "fuel") return "The foils drink fuel. Come down off them (<kbd>2</kbd> or less) for the long runs, and watch the FUEL bar.";
    if (st.shells && !st.shellHits) return "The shells fell wide. In Aiming, lay the cross ahead of a moving ship: the corrector bars show which way. Up is over, down is short.";
    if (st.fired && !st.mslHits) return "The missiles missed. Fire inside their reach, not too close, at whatever is in the glasses.";
    if (why === "time") return "Time ran out. <kbd>+</kbd> compresses time on the long runs; set the autopilot from the map (<kbd>V</kbd>) and let her steer.";
    if (why === "escaped") return "Some got away. Cut them off: on the map (<kbd>V</kbd>), the cursor and <kbd>Enter</kbd> set a course across their path.";
    return "";
  };
  UI.debrief = S => {
    const sc = S.score || E.score(S), mi = M.get(S.mission), best = PD.addRecord(S, sc), ok = S.end && S.end.ok, t = tip(S);
    const further = sc.next != null ? `${num(sc.next - sc.total)} more points for ${esc(C.RANKS[sc.rankI + 1])}.` : sc.rankI >= mi.max ? "The highest rank this mission gives." : `${esc(sc.max)} needs the objective done.`;
    UI.open("Signal from Command", { wide: true, closable: false,
      html: () => `<div class="report"><div>
        <div class="cap${ok ? " stamp" : ""}">${crest()}<h3 class="mname big${ok ? " ok" : S.end.why === "sunk" ? " danger" : ""}">${esc(sc.rank)}</h3></div>
        <p class="meta">Mission ${mi.id}, ${esc(mi.name)}: of a possible ${esc(sc.max)}.${best && sc.total > 0 ? " Your best in this mission." : ""}</p>
        <p class="lede">${esc(WHY[S.end.why] || "")}</p>
        <p class="nextrank">${further}</p>
        ${t ? `<p class="tip"><b>Next time.</b> ${t}</p>` : ""}
        <p class="note">${S.stats.fired} missiles fired, ${S.stats.mslHits} hit. ${num(S.stats.shells)} shells, ${S.stats.shellHits} hits. ${S.stats.hitsUs ? `Hit by ${S.stats.hitsUs} missile${S.stats.hitsUs > 1 ? "s" : ""}.` : ""}${sc.code ? " The code was used." : ""}</p></div>
        <div><table class="tally">${sc.rows.map(([n, v]) => `<tr><td>${esc(n)}</td><td class="num">${num(v)}</td></tr>`).join("")}<tr class="sum"><td>Total</td><td class="num">${num(sc.total)}</td></tr></table></div></div>
        <div class="row end"><button data-act="again" class="primary">Play it again</button><button data-act="missions">Missions</button><button data-act="title">Main menu</button></div>`,
      onKey: ev => { if (ev.key === "Escape") { ev.preventDefault(); UI.close(true); UI.missions(); return true; } return false; },
      onClick: b => {
        const a = b.dataset.act;
        if (a === "again") { UI.close(true); PD.game.start(S.mission, PD.game.lastCustom); }
        if (a === "missions") { UI.close(true); UI.missions(); }
        if (a === "title") { UI.close(true); PD.game.toTitle(); }
      },
    });
  };

  /* ---- Settings (greykit.games STANDARD.md §7: the game's own, Sound, speed, This browser) ---- */
  function showSettings() {
    const sw = (k2, n) => toggle("aidt:" + k2, PD.aid(k2), n);
    UI.open("Settings", { wide: true,
      html: () => { const changed = Object.keys(PD.prefs.over).length, adj = changed ? ", adjusted" : ""; return `
        <h3>Aids</h3>
        <div class="row">${pill(PD.prefs.aids === "classic", "Classic" + (PD.prefs.aids === "classic" ? adj : ""), "aids:classic")}${pill(PD.prefs.aids === "field", "Field" + (PD.prefs.aids === "field" ? adj : ""), "aids:field")}</div>
        <p class="note">Classic plays as 1987 did. Field adds the helps below. <kbd>L</kbd> switches at sea. Aids never change the fight.</p>
        <details class="aid-list"${UI.aidOpen ? " open" : ""}><summary>Set each aid on its own${changed ? ` (${changed} changed)` : ""}</summary>
        <table class="aids">${PD.AID_LIST.map(([k2, n, note]) => line(n, esc(note), sw(k2, n))).join("")}</table></details>
        <h3>Controls</h3>
        <div class="row">${Object.entries(PD.STEER).map(([k2, n]) => pill(PD.prefs.steer === k2, n, "steer:" + k2)).join("")}</div>
        <p class="note">${PD.modern() ? "The keys, and the mouse: click a ship to put it in the glasses, click the glasses to lay the gun, click the map to set a course." : "1987's keys: the arrows are the joystick, <kbd>,</kbd> <kbd>.</kbd> steer, <kbd>Space</kbd> switches Maneuver and Aiming. A gamepad works too."}</p>
        <h3>Look</h3>
        <table class="aids">${line("Scanlines", "Fine dark lines over the screen, like an old television.", toggle("scan", PD.prefs.scanlines, "Scanlines"))}
        ${line("Screen shake", "The screen jolts when she is hit." + (PD.calm() ? " Off to begin with, as this computer asks for less motion." : ""), toggle("shake", PD.prefs.shake, "Screen shake"))}</table>
        <h3>Sound</h3>
        <table class="aids">${line("Sound", "The turbines, the gun, the missiles; the theme on the title. <kbd>M</kbd> switches it anywhere.", toggle("mute", !PD.SFX.muted, "Sound"))}</table>
        <h3>Game speed</h3>
        <div class="row">${Object.entries(PD.SPEEDS).map(([k2, [n]]) => pill(PD.prefs.speed === k2, n, "speed:" + k2)).join("")}</div>
        <p class="note">Relaxed slows the whole game, Brisk quickens it. Time compression works on top.</p>
        <h3>This browser</h3>
        <table class="aids">${line("Resume a mission", "Leave a mission in the middle and come back to it. 1987 had no saves.", toggle("resume", PD.prefs.resume, "Resume a mission"))}</table>
        <div class="row"><button data-set="forget" class="danger">Forget everything</button></div>
        <p class="note">Clears everything PDF Pumasis keeps in this browser: the service record, a mission in progress, and these settings.</p>`; },
      onClick: async (b, api) => {
        const v = b.dataset.set; if (!v) return;
        if (v === "forget") {
          if (await UI.ask("Forget everything PDF Pumasis has saved in this browser: the service record, a mission in progress, and your settings? This cannot be undone.", "Forget everything")) PD.forgetEverything();
          return;
        }
        const [k2, a] = v.split(":");
        if (k2 === "aids") PD.setAids(a);
        else if (k2 === "aidt") PD.setAid(a, !PD.aid(a));
        else if (k2 === "steer") { PD.prefs.steer = a; PD.savePrefs(); }
        else if (k2 === "scan") { PD.prefs.scanlines = !PD.prefs.scanlines; PD.savePrefs(); PD.game.applyLook(); }
        else if (k2 === "shake") { PD.prefs.shake = !PD.prefs.shake; PD.savePrefs(); }
        else if (k2 === "resume") { PD.prefs.resume = !PD.prefs.resume; PD.savePrefs(); }
        else if (k2 === "mute") PD.game.toggleMute();
        else if (k2 === "speed") { PD.prefs.speed = a; PD.savePrefs(); PD.game.applySpeed(); }
        PD.game.syncAids();
        api.refresh();
      },
      onClose: () => { const f = UI.settingsAfter; UI.settingsAfter = null; if (f) f(); },
    });
  }
  UI.settings = after => { UI.settingsAfter = after; showSettings(); };

  /* ---- Help and About ---- */
  const keys = rows => `<table class="keys">${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join("")}</table>`;
  /* the 1987 spotter cards, made playable: each class's shape, beam on and from the bow quarter */
  const shipPic = (cls, bin) => { const c = PD.ShipArt.sprite(PD.ShipArt.modelOf(cls, false), bin, 112, "day"); return c.toDataURL(); };
  const RECOG = ["cur", "jackal", "whelp", "lupa1", "lupa2", "warg", "fenrir", "coyoteA", "coyoteB", "cargo", "patrol"];
  UI.helpTabs = () => [
    ["The boat", `<p><b>A hydrofoil.</b> Below about 12 knots she runs hullborne; set 3 or more and she climbs onto her foils and runs at forty-odd. On the foils more of her hull is exposed to hits, but a holed hull only sinks her once she comes down.</p>
      <p><kbd>1</kbd> to <kbd>5</kbd> set her speed, <kbd>0</kbd> stops her. <kbd>,</kbd> <kbd>.</kbd> steer. On the map, the cursor and <kbd>Enter</kbd> set the autopilot.</p>
      <p><b>Fuel</b> runs out faster on the foils, and out of fuel the mission is lost. <b>The depth sounder</b> stops her short of rocks: the DEPTH lamp.</p>
      <p><b>Kestrels</b> (helicopters) see what the radar cannot. On the map, <kbd>7</kbd> or <kbd>8</kbd> picks one, the cursor and <kbd>Enter</kbd> send it, a number sets its speed.</p>`],
    ["Weapons", `<p><kbd>T</kbd> puts the next contact in the glasses. <kbd>6</kbd> the 76mm, <kbd>7</kbd> chaff, <kbd>8</kbd> missiles. <kbd>Enter</kbd> fires.</p>
      <p><b>The 76mm</b> reaches ten miles, six to good effect. Its shells take time to get there: press <kbd>Space</kbd> for Aiming and lay the cross ahead of a moving ship with the arrows. The white <b>corrector bars</b> round the glasses show which way to move it. Up is over, down is short.</p>
      <p><b>Missiles</b> fly at whatever is in the glasses. Only two at a time; not too close.</p>
      <p><b>Chaff</b> works best when the missile is about a mile out and you are running across its path. Too soon and it finds you again.</p>`],
    ["Recognition", `<p>Classic shows no labels: know them by their shapes.</p><table class="enemy">${RECOG.map(cls => { const k2 = C.SHIPS[cls]; return `<tr><td class="figc"><img class="fig px" src="${shipPic(cls, 8)}" alt="" height="${Math.min(40, PD.ShipArt.sprite(cls, 8, 112, "day").height)}"></td><td><p><b>${esc(k2.name)}</b> · ${k2.len} m · ${k2.top} kn</p><p class="note">${esc(k2.note)}</p></td></tr>`; }).join("")}</table>`],
    ["Keys", keys([["Speed", "<kbd>1</kbd> to <kbd>5</kbd>, <kbd>0</kbd> stop"], ["Steer", "<kbd>,</kbd> <kbd>.</kbd>; in Maneuver mode the arrows too, up and down the speed"], ["Mode", "<kbd>Space</kbd> Maneuver or Aiming; aiming, the arrows lay the gun"],
      ["Weapons", "<kbd>6</kbd> gun, <kbd>7</kbd> chaff, <kbd>8</kbd> missiles; <kbd>Enter</kbd> fire"], ["Target", "<kbd>T</kbd> the next contact, <kbd>Shift</kbd> <kbd>T</kbd> the one before"],
      ["Radar", "<kbd>R</kbd> closer, <kbd>Shift</kbd> <kbd>R</kbd> further"], ["Views", "<kbd>V</kbd> bridge or map, <kbd>G</kbd> the glasses up or down"],
      ["Map", "arrows move the cursor, <kbd>Enter</kbd> sets the course; <kbd>6</kbd> boat, <kbd>7</kbd> <kbd>8</kbd> Kestrels, <kbd>9</kbd> the ship you escort; <kbd>D</kbd> radar circles, <kbd>Z</kbd> zoom"],
      ["Time", "<kbd>+</kbd> <kbd>−</kbd> faster and slower, <kbd>N</kbd> back to 1x"], ["Other", "<kbd>P</kbd> or <kbd>Esc</kbd> pause, <kbd>Shift</kbd> <kbd>Q</kbd> end the mission, <kbd>L</kbd> Classic or Field, <kbd>M</kbd> sound, <kbd>?</kbd> help"],
      ["Gamepad", "<kbd>pad:L-stick</kbd> steer or aim, <kbd>pad:A</kbd> fire, <kbd>pad:B</kbd> mode, <kbd>pad:X</kbd> target, <kbd>pad:Y</kbd> map, <kbd>pad:LB</kbd> <kbd>pad:RB</kbd> weapon, <kbd>pad:dU</kbd> <kbd>pad:dD</kbd> speed, <kbd>pad:LT</kbd> <kbd>pad:RT</kbd> time"]]) +
      `<p class="note">1987's I J K M aiming keys are the arrows here, as M is sound. No function keys are used.</p><p class="gk-credit">${CREDIT}</p>`],
  ];
  UI.help = (tab = 0, after) => UI.open("Help", { wide: true, tab, tabs: UI.helpTabs(), onClose: after });
  UI.aboutHTML = () => `<p><b>PDF Pumasis</b> is a remake of <i>PHM Pegasus</i> (Lucasfilm Games, 1987) for the Commodore 64: a hydrofoil missile boat of the Pumacity Defense Force against the Wolf Empire's navy.</p>
    <p>The boats, the coast and the missions' forces are our own. No Lucasfilm or Electronic Arts code, art, sound or text is used.</p>
    <p class="gk-credit">${CREDIT}</p>`;
  UI.about = after => UI.open("About", { html: UI.aboutHTML, onClose: after });
})();
