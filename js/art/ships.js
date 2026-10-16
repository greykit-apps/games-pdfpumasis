/* PDF Pumasis -- the ships, as models, and their pictures.
 *
 * Every class is built from a hull (a prism tapering to the stem and the
 * stern, red below the waterline), deckhouses, masts, radars, guns and
 * launchers. ShipArt.sprite traces one at the angle off its bow it is seen
 * from (seventeen bins from bow-on to stern-on; the other side is the same
 * picture mirrored), at a length in pixels, in a light, and keeps it.
 *
 * Ours wear the Pumacity Defense Force's pale blue-grey with a tawny
 * stripe, and our hydrofoils have two pictures: down in the water, and up on
 * their foils with the hull clear of it. The Wolf Empire's boats are
 * gunmetal with red at the bow; merchants are black, rust and white. */
"use strict";
(() => {
  const K = PD.K, Mo = PD.Model, A = PD.ShipArt = {};
  const { B, Cy, Pr, Sp } = Mo;
  Object.assign(Mo.RAMP, {
    pdf: ["#e2e8ee", "#b9c4cf", "#8d9aa8", "#626e7c", "#3c4552"],
    pdfDk: ["#a9b5c2", "#83909f", "#5f6b79", "#414b57", "#272e37"],
    stripe: ["#ffd79a", "#f0ad5c", "#c98232", "#8f5a1e", "#573510"],
    gun: ["#9aa4b0", "#6f7984", "#4f5761", "#353b43", "#1f2328"],
    wolfGrey: ["#8f949b", "#6b7077", "#4d5157", "#35383d", "#202226"],
    cred: ["#e88470", "#c0503c", "#923626", "#62231a", "#3a140e"], cblue: ["#86a8d8", "#5a7fb6", "#3e5c8c", "#2a3f62", "#18253a"],
    cgreen: ["#8ec48a", "#5f9a5c", "#437242", "#2d4e2d", "#1a2e1a"], corange: ["#f4b46a", "#d98a3c", "#a8652a", "#734419", "#45280e"],
    rotor: ["#4a4f58", "#383c44", "#2a2d33", "#1d1f24", "#121316"],
  });

  /* a hull's outline in plan: the stem at +L/2, a transom stern at -L/2 */
  function plan(L, Bm, o = {}) {
    const h = Bm / 2, bow = o.bow || 0.3, stern = o.stern || 0.2, tr = o.transom === undefined ? 0.7 : o.transom, fine = o.fine || 0.4;
    const P = [[0, L / 2], [h * fine, L / 2 - L * bow * 0.3], [h * 0.9, L / 2 - L * bow * 0.75], [h, L / 2 - L * bow],
      [h, -L / 2 + L * stern], [h * 0.92, -L / 2 + L * stern * 0.4], [h * tr, -L / 2]];
    return P.concat(P.slice(1).reverse().map(([x, z]) => [-x, z]));
  }
  /* the hull: below the boot-topping its bottom colour, above it the hull's, the deck on top; lift raises it all */
  function hull(P, L, Bm, F, hc, o = {}) {
    const pts = plan(L, Bm, o), D = o.draft || 1.6, y0 = o.lift || 0, wl = 0.3 + y0;
    P.push(Pr(pts, -D + y0, F + y0, hc, (p, n) => n[1] > 0.5 ? (o.deck || "pdfDk") : p[1] < wl ? (o.bottom || "redlead") : o.stripe && Math.abs(p[1] - (F + y0 - 0.55)) < 0.22 ? o.stripe : o.bow && p[2] > L / 2 - L * 0.12 && o.bowCol ? o.bowCol : hc));
    return pts;
  }
  const house = (P, x, z0, z1, y0, y1, m, win = 0, ws = 1.2) => P.push(B([-x, y0, z0], [x, y1, z1], m, (p, n) => {
    if (n[1] > 0.5) return m;
    if (win && n[2] > 0.5 && p[1] > y1 - 0.9 && p[1] < y1 - 0.3) return (Math.abs(p[0]) % ws) < ws * 0.62 ? "glass" : m;
    if (win > 1 && Math.abs(n[0]) > 0.5 && p[1] > y1 - 0.9 && p[1] < y1 - 0.3) return (Math.abs(p[2]) % ws) < ws * 0.55 ? "glass" : m;
    return m;
  }));
  const mast = (P, z, y0, h, m = "gun", r = 0.32) => { P.push(Cy("y", [0, z], r, [y0, y0 + h], m)); P.push(B([-1.2, y0 + h * 0.7, z - 0.18], [1.2, y0 + h * 0.7 + 0.3, z + 0.18], m)); };
  const radome = (P, z, y, r) => P.push(Sp([0, y, z], r, "chalk", y - 0.1));
  const radar = (P, z, y, w) => P.push(B([-w, y, z - 0.18], [w, y + 0.5, z + 0.18], "gun"));
  /* a gun turret: a dome or a box, and the barrel along the bow */
  const turret = (P, z, y, r, len, m = "gun", dir = 1, dome = true) => {
    const n = P.length;
    if (dome) P.push(Sp([0, y, z], r, m, y)); else P.push(B([-r, y, z - r], [r, y + r * 0.9, z + r], m));
    P.push(Cy("z", [0, y + r * 0.5], r * 0.16, dir > 0 ? [z, z + r + len] : [z - r - len, z], "black"));
    for (let i = n; i < P.length; i++) P[i].tag = "turret";
  };
  const twin = (P, z, y, dir = 1, s = 1) => { P.push(Cy("y", [0, z], 0.7 * s, [y, y + 0.6 * s], "gun")); for (const x of [-0.25 * s, 0.25 * s]) P.push(Cy("z", [x, y + 0.45 * s], 0.07 * s, dir > 0 ? [z, z + 2.2 * s] : [z - 2.2 * s, z], "black")); };
  /* missile launchers: boxes or tubes, angled up to the bow */
  const canisters = (P, z, y, x, n, m = "gun", len = 4, r = 0.45) => { for (let i = 0; i < n; i++) for (const s of [-1, 1]) P.push(Cy("z", [s * (x + i * r * 2.1), y + r + i * 0.05], r, [z - len / 2, z + len / 2], m)); };
  const boxes = (P, z, y, x, w, h, len, m = "wolfGrey") => { for (const s of [-1, 1]) P.push(B([s * x - w, y, z - len / 2], [s * x + w, y + h, z + len / 2], m, (p, n) => n[2] > 0.5 ? "black" : m)); };
  /* a hydrofoil's struts and foils, under a hull lifted lift metres */
  const foils = (P, L, lift, fz, az, ax) => {
    P.push(B([-0.18, -1.4, fz - 0.5], [0.18, lift, fz + 0.5], "gun"));
    P.push(B([-1.8, -1.5, fz - 0.6], [1.8, -1.25, fz + 0.6], "gun"));
    for (const s of [-1, 1]) { P.push(B([s * ax - 0.18, -1.4, az - 0.6], [s * ax + 0.18, lift + 0.2, az + 0.6], "gun")); }
    P.push(B([-ax - 0.6, -1.55, az - 0.8], [ax + 0.6, -1.25, az + 0.8], "gun"));
    void L;
  };

  /* ---- the classes (metres) ---- */
  const BUILD = {
    /* ours: the PHM-1 Pumasis */
    pumasis: up => {
      const P = [], L = 40, Bm = 8.6, F = 2.6, lift = up ? 2.6 : 0;
      hull(P, L, Bm, F, "pdf", { lift, stripe: "stripe", bottom: up ? "pdf" : "redlead", deck: "pdfDk", bow: 0.34, fine: 0.32 });
      if (up) foils(P, L, lift + 0.2, 14, -9, 3.6);
      const y = F + lift;
      house(P, 3.2, -6, 7, y, y + 2.4, "pdf", 2, 1.1);
      house(P, 2.4, 2, 7, y + 2.4, y + 3.8, "pdf", 1, 0.9);
      mast(P, 0, y + 2.4, 5.2); radome(P, 0.3, y + 6.8, 0.8); radar(P, 0, y + 5.4, 1.1);
      turret(P, 12.5, y, 1.25, 3.2, "pdf");
      canisters(P, -14, y + 0.2, 1.2, 2, "pdfDk", 4.2, 0.42);
      P.push(B([-0.9, y, -10], [0.9, y + 1.6, -7], "pdfDk"));
      return P;
    },
    lynx: up => {
      const P = [], L = 26, Bm = 7, F = 2.2, lift = up ? 2 : 0;
      hull(P, L, Bm, F, "pdf", { lift, stripe: "stripe", bottom: up ? "pdf" : "redlead", deck: "pdfDk", bow: 0.36 });
      if (up) foils(P, L, lift + 0.2, 8.5, -5.5, 2.9);
      const y = F + lift;
      house(P, 2.6, -3, 5, y, y + 2.2, "pdf", 2, 1.0);
      mast(P, 1, y + 2.2, 4); radar(P, 1, y + 4.6, 0.9);
      turret(P, 8.5, y, 1.1, 2.8, "pdf");
      boxes(P, -8.5, y, 1.5, 0.55, 0.9, 3.4, "pdfDk");
      return P;
    },
    ocelot: up => {
      const P = [], L = 23, Bm = 7, F = 1.9, lift = up ? 1.9 : 0;
      hull(P, L, Bm, F, "pdf", { lift, stripe: "stripe", bottom: up ? "pdf" : "redlead", deck: "pdfDk", bow: 0.38, transom: 0.8 });
      if (up) foils(P, L, lift + 0.2, 7.5, -4.5, 2.8);
      const y = F + lift;
      house(P, 2.2, -2, 4, y, y + 1.8, "pdf", 2, 0.9);
      mast(P, 0.5, y + 1.8, 3.2); radar(P, 0.5, y + 3.7, 0.8);
      turret(P, 7.5, y, 1.05, 2.6, "pdf");
      canisters(P, -7.5, y + 0.1, 1.5, 1, "pdfDk", 3.6, 0.5);
      return P;
    },
    patrol: () => {
      const P = [], L = 40, Bm = 7.6, F = 2.8;
      hull(P, L, Bm, F, "white", { stripe: "stripe", deck: "pdfDk" });
      house(P, 2.8, -6, 6, F, F + 2.4, "white", 2); house(P, 2, 0, 5, F + 2.4, F + 3.6, "white", 1);
      mast(P, 1, F + 3.6, 4.5); radar(P, 1, F + 7.3, 1);
      twin(P, 12, F, 1, 1.2);
      return P;
    },
    /* the Wolf Empire's */
    cur: () => {
      const P = [], L = 38, Bm = 7, F = 2.6;
      hull(P, L, Bm, F, "wolfGrey", { bowCol: "wolfRed", bow: 0.3, deck: "greyDk" });
      house(P, 2.6, -5, 6, F, F + 2.4, "wolfGrey", 2); house(P, 1.8, 0, 5, F + 2.4, F + 3.4, "wolfGrey", 1);
      mast(P, 0.5, F + 3.4, 4); radar(P, 0.5, F + 6.6, 0.9);
      twin(P, 11, F, 1, 1.1); twin(P, -12, F, -1, 1.1);
      return P;
    },
    jackal: () => {
      const P = [], L = 23, Bm = 5, F = 1.9;
      hull(P, L, Bm, F, "wolfGrey", { bowCol: "wolfRed", deck: "greyDk", bow: 0.34 });
      house(P, 1.8, -2, 4, F, F + 2.1, "wolfGrey", 2);
      mast(P, 1, F + 2.1, 3); twin(P, 7, F, 1, 0.8); twin(P, -7, F, -1, 0.8);
      return P;
    },
    whelp: () => {
      const P = [], L = 27, Bm = 6.2, F = 1.8;
      hull(P, L, Bm, F, "wolfGrey", { bowCol: "wolfRed", deck: "greyDk", bow: 0.36 });
      house(P, 1.8, 0, 6, F, F + 1.9, "wolfGrey", 2);
      mast(P, 2, F + 1.9, 3); radar(P, 2, F + 4.3, 0.7);
      twin(P, 9.5, F, 1, 0.9);
      for (const s of [-1, 1]) { P.push(Cy("z", [s * 2.1, F + 1.0], 0.75, [-9, -2], "wolfGrey")); P.push(B([s * 2.1 - 0.8, F, -9], [s * 2.1 + 0.8, F + 0.6, -2], "wolfGrey")); }
      return P;
    },
    lupa1: () => {
      const P = [], L = 39, Bm = 7.6, F = 2.4;
      hull(P, L, Bm, F, "wolfGrey", { bowCol: "wolfRed", deck: "greyDk", bow: 0.32 });
      house(P, 2.2, -1, 8, F, F + 2.2, "wolfGrey", 2); house(P, 1.4, 3, 7, F + 2.2, F + 3.1, "wolfGrey", 1);
      mast(P, 4, F + 3.1, 3.6); radar(P, 4, F + 6, 1); P.push(Cy("y", [0, 1], 0.6, [F + 2.2, F + 3.8], "wolfGrey"));
      twin(P, 14, F, 1, 1); twin(P, -15, F, -1, 1);
      boxes(P, -3, F, 2.6, 0.75, 1.5, 7, "wolfGrey"); boxes(P, -8.5, F, 2.6, 0.75, 1.5, 7, "wolfGrey");
      return P;
    },
    lupa2: () => {
      const P = [], L = 39, Bm = 7.6, F = 2.4;
      hull(P, L, Bm, F, "wolfGrey", { bowCol: "wolfRed", deck: "greyDk", bow: 0.32 });
      house(P, 2.2, -1, 8, F, F + 2.2, "wolfGrey", 2); house(P, 1.4, 3, 7, F + 2.2, F + 3.1, "wolfGrey", 1);
      mast(P, 4, F + 3.1, 3.6); radar(P, 4, F + 6, 1);
      twin(P, 14, F, 1, 1); twin(P, -15, F, -1, 1);
      canisters(P, -6, F + 0.3, 2.4, 2, "wolfGrey", 8, 0.62);
      return P;
    },
    warg: () => {
      const P = [], L = 60, Bm = 12.6, F = 3.4;
      hull(P, L, Bm, F, "wolfGrey", { bowCol: "wolfRed", deck: "greyDk", bow: 0.3, fine: 0.35 });
      house(P, 4.4, -12, 12, F, F + 3, "wolfGrey", 2); house(P, 3.2, -6, 9, F + 3, F + 5.4, "wolfGrey", 2); house(P, 2, 2, 7, F + 5.4, F + 6.8, "wolfGrey", 1);
      P.push(Pr([[-2.4, 0], [2.4, 0], [1.8, -4], [-1.8, -4]], F + 5.4, F + 9.6, "wolfGrey"));
      radome(P, -2, F + 10.4, 1.4); mast(P, 4, F + 6.8, 4); radar(P, 4, F + 10.4, 1.4);
      boxes(P, 16, F, 3, 1, 1.6, 6, "wolfGrey");
      turret(P, -21, F, 1.4, 3.6, "wolfGrey", -1, false);
      return P;
    },
    fenrir: () => {
      const P = [], L = 62, Bm = 9.3, F = 3.4;
      hull(P, L, Bm, F, "wolfGrey", { bowCol: "wolfRed", deck: "greyDk", bow: 0.32, fine: 0.35 });
      house(P, 3.6, -10, 13, F, F + 2.8, "wolfGrey", 2); house(P, 2.8, 4, 12, F + 2.8, F + 5.2, "wolfGrey", 2);
      mast(P, 6, F + 5.2, 6); radar(P, 6, F + 10, 1.5); radome(P, 8, F + 11.6, 0.8);
      P.push(Cy("y", [0, -3], 1.2, [F + 2.8, F + 6], "wolfGrey"));
      turret(P, 20, F, 1.6, 3.8, "wolfGrey");
      canisters(P, -12, F + 0.3, 1.6, 2, "wolfGrey", 5, 0.55);
      twin(P, -24, F, -1, 1.2);
      return P;
    },
    coyoteA: () => {
      const P = [], L = 37, Bm = 6.9, F = 2.4;
      hull(P, L, Bm, F, "wolfGrey", { bowCol: "wolfRed", deck: "greyDk", bow: 0.34 });
      house(P, 2.4, -4, 7, F, F + 2.4, "wolfGrey", 2); mast(P, 2, F + 2.4, 4); radar(P, 2, F + 5.6, 1);
      twin(P, 12, F, 1, 1); canisters(P, -11, F + 0.2, 1.6, 1, "wolfGrey", 5, 0.55);
      return P;
    },
    coyoteB: () => {
      const P = [], L = 37, Bm = 6.9, F = 2.4;
      hull(P, L, Bm, F, "wolfGrey", { bowCol: "wolfRed", deck: "greyDk", bow: 0.34 });
      house(P, 2.4, -4, 7, F, F + 2.4, "wolfGrey", 2); mast(P, 2, F + 2.4, 4); radar(P, 2, F + 5.6, 1);
      turret(P, 11.5, F, 1.3, 3.2, "wolfGrey");
      return P;
    },
    /* merchants */
    cargo: () => {
      const P = [], L = 120, Bm = 17, F = 5;
      hull(P, L, Bm, F, "hull", { deck: "deck", bow: 0.26, fine: 0.45, transom: 0.6 });
      house(P, 7, -50, -36, F, F + 3, "white", 2, 1.6); house(P, 6, -48, -38, F + 3, F + 6, "white", 2, 1.6); house(P, 4.5, -45, -40, F + 6, F + 8, "white", 1, 1.4);
      P.push(Cy("y", [0, -50], 2, [F + 3, F + 11], "black"));
      for (const z of [-22, 0, 22, 40]) { P.push(B([-6, F, z - 7], [6, F + 1, z + 7], "canvas")); }
      for (const z of [-11, 11, 31]) { P.push(Cy("y", [0, z], 0.35, [F, F + 12], "buff")); P.push(Cy("z", [0, F + 9], 0.2, [z - 9, z], "buff")); }
      return P;
    },
    star: () => {
      const P = [], L = 180, Bm = 26, F = 6;
      hull(P, L, Bm, F, "cblue", { deck: "deck", bow: 0.22, fine: 0.5, transom: 0.7, stripe: "stripe" });
      house(P, 11, -78, -64, F, F + 4, "white", 2, 1.6); house(P, 10, -76, -66, F + 4, F + 12, "white", 2, 1.6); house(P, 12.5, -74, -70, F + 12, F + 14, "white", 1, 1.6);
      P.push(Cy("y", [0, -82], 2.4, [F + 4, F + 14], "white"));
      const cols = ["cred", "cblue", "cgreen", "corange", "chalk", "cred", "corange", "cgreen"];
      let i = 0;
      for (let z = -58; z < 70; z += 13) { const h = 2 + ((z * 7) % 3 + 3) % 3; for (const x of [-8.5, 0, 8.5]) P.push(B([x - 4.1, F, z], [x + 4.1, F + h * 2.6, z + 12], cols[(i++) % cols.length])); }
      return P;
    },
    supply: () => {
      const P = [], L = 150, Bm = 22, F = 6;
      hull(P, L, Bm, F, "pdf", { deck: "deck", stripe: "stripe", bow: 0.26, fine: 0.45 });
      house(P, 10, -66, -48, F, F + 4, "pdf", 2, 1.6); house(P, 9, -62, -50, F + 4, F + 10, "pdf", 2, 1.6);
      P.push(Cy("y", [0, -66], 2.2, [F + 4, F + 13], "pdfDk"));
      for (const z of [-20, 10, 40]) { P.push(B([-8, F, z - 1], [8, F + 9, z + 1], "pdfDk")); P.push(B([-0.5, F, z - 1], [0.5, F + 13, z + 1], "pdfDk")); }
      house(P, 7, 58, 68, F, F + 5, "pdf", 1);
      return P;
    },
    /* the Kestrel helicopter, nose to +z */
    helo: () => {
      const P = [];
      P.push(Sp([0, 2, 3], 1.6, "pdf")); P.push(B([-1.4, 0.6, -2], [1.4, 3.2, 3], "pdf")); P.push(Cy("z", [0, 2.3], 0.45, [-10, -2], "pdf"));
      P.push(B([-0.1, 2, -10.5], [0.1, 4, -9], "pdfDk")); P.push(Cy("y", [0, 0], 0.15, [3.2, 3.8], "gun"));
      P.push(Cy("y", [0, 0.5], 7, [3.8, 3.95], "rotor", (p) => (Math.abs(p[0]) < 0.25 || Math.abs(p[2] - 0.5) < 0.25) ? "rotor" : null));
      P.push(B([-1.6, 0, -0.5], [-1.4, 0.4, 2.5], "gun")); P.push(B([1.4, 0, -0.5], [1.6, 0.4, 2.5], "gun"));
      return P;
    },
  };
  /* where each model's parts are cached, and its size: length, and the masthead; "pumasis+" is up on its foils */
  const MODELS = {};
  A.model = cls => MODELS[cls] || (MODELS[cls] = (() => { const up = cls.endsWith("+"), base = up ? cls.slice(0, -1) : cls, parts = BUILD[base](up), bb = Mo.bounds(parts); return { parts, bb, len: bb[1][2] - bb[0][2], top: bb[1][1] }; })());
  A.CLASSES = Object.keys(BUILD);
  A.has3d = cls => !!BUILD[cls.replace(/\+$/, "")];

  /* ---- the pictures ---- */
  A.SIZES = [8, 10, 12, 15, 19, 24, 30, 37, 46, 58, 72, 90, 112, 140, 175, 219, 274];
  A.BINS = 16;                                   /* 17 bins, 0 bow-on to 16 stern-on */
  A.EL = 0.06;
  A.sizeFor = px => A.SIZES.reduce((a, b) => Math.abs(b - px) < Math.abs(a - px) ? b : a);
  A.binOf = aob => { let a = PD.angDiff(0, aob); const mirror = a < 0; a = Math.abs(a); return { bin: Math.round(a / Math.PI * A.BINS), mirror }; };
  A.key = (cls, bin, size, light, el) => `ship:${cls}:${bin}:${size}:${light}:${el || 0}`;
  A.has = (cls, bin, size, light, el) => K.cache.has(A.key(cls, bin, size, light, el));
  /* the traced picture: c.ox, c.oy is where the waterline amidships falls; el, how far above the water we look from (radians) */
  A.sprite = (cls, bin, size, light = "day", el = 0) => K.get(A.key(cls, bin, size, light, el), () => {
    const M = A.model(cls), s = size / M.len, th = bin / A.BINS * Math.PI, e = el ? el : A.EL;
    const v = [Math.cos(e) * Math.sin(th), Math.sin(e), Math.cos(e) * Math.cos(th)];
    const cam0 = Mo.ortho(v, s, 0, 0, [0, 0, 0], 0, 0);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const X of [M.bb[0][0], M.bb[1][0]]) for (const Y of [M.bb[0][1], M.bb[1][1]]) for (const Z of [M.bb[0][2], M.bb[1][2]]) { const q = cam0.proj([X, Y, Z]); x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
    const W = Math.ceil(x1 - x0) + 4, H = Math.ceil(y1 - y0) + 4, cx = -x0 + 2, cy = -y0 + 2;
    const cam = Mo.ortho(v, s, W, H, [0, 0, 0], cx, cy);
    const c = Mo.trace(M.parts, W, H, cam, Mo.LIGHTS[light] || Mo.LIGHTS.day);
    if (size >= 30) K.outline(c, light === "night" ? "#05070c" : "#141a24");
    c.ox = cx; c.oy = cy; c.top = M.top * s; c.s = s;
    return c;
  });
  A.spriteM = (cls, bin, size, light = "day", el = 0) => K.get(A.key(cls, bin, size, light, el) + ":m", () => {
    const o = A.sprite(cls, bin, size, light, el), m = K.flip(o);
    m.ox = o.width - o.ox; m.oy = o.oy; m.top = o.top; m.s = o.s;
    return m;
  });
  /* a picture at the size wanted, or the nearest already traced while it is traced (budget: n a frame) */
  A.budget = 0;
  A.get = (cls, aob, px, light, el = 0) => {
    const { bin, mirror } = A.binOf(aob), size = A.sizeFor(px);
    const f = mirror ? A.spriteM : A.sprite;
    if (A.has(cls, bin, size, light, el) || A.budget > 0) { if (!A.has(cls, bin, size, light, el)) A.budget--; return { c: f(cls, bin, size, light, el), k: px / size }; }
    let best = null;
    for (const z of A.SIZES) if (A.has(cls, bin, z, light, el) && (!best || Math.abs(z - size) < Math.abs(best - size))) best = z;
    if (best) return { c: f(cls, bin, best, light, el), k: px / best };
    A.budget--; return { c: f(cls, bin, Math.min(size, 24), light, el), k: px / Math.min(size, 24) };
  };
  /* the model a unit is drawn with: our hydrofoils up on their foils or down */
  A.modelOf = (cls, foil) => (cls === "pumasis" || cls === "lynx" || cls === "ocelot") && foil ? cls + "+" : cls;
})();
