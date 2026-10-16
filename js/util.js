/* PDF Pumasis -- the namespace and the small helpers everything shares.
 *
 * DOM-free: tools/sim-check.js loads this file, and the engine, under node.
 * Nothing here may read the clock or Math.random: the engine's dice are
 * PD.rand(S), so a mission is the same mission every time it is sailed from
 * the same seed and the same orders.
 *
 * The sea is one plane in nautical miles: x east, y south (down the chart),
 * headings in radians from north, growing clockwise. Speeds are knots, time
 * is game seconds. */
"use strict";
var PD = globalThis.PD || {};
globalThis.PD = PD;

/* mulberry32, stepping the state it is handed: S.rs in a game */
PD.rand = o => {
  let t = (o.rs = (o.rs + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/* a private stream, for the art's noise */
PD.mulberry = seed => { const o = { rs: seed | 0 }; return () => PD.rand(o); };
PD.ri = (r, n) => Math.floor(r() * n);
PD.pick = (r, a) => a[Math.floor(r() * a.length)];
/* a normal-ish number, mean 0, about 1 wide: three dice summed */
PD.gauss = r => (r() + r() + r() - 1.5) * 2;

PD.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
PD.lerp = (a, b, t) => a + (b - a) * t;

/* ---- units ---- */
PD.KN = 1 / 3600;                   /* nautical miles a second at one knot */
PD.FT_NM = 1 / 6076;                /* nautical miles in a foot */
PD.DEG = Math.PI / 180;

/* ---- headings: 0 is north, up the chart, growing clockwise ---- */
PD.TAU = Math.PI * 2;
PD.hx = a => Math.sin(a);
PD.hy = a => -Math.cos(a);
PD.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
PD.angTo = (ax, ay, bx, by) => PD.normAng(Math.atan2(bx - ax, -(by - ay)));
PD.angDiff = (a, b) => { let d = (b - a) % PD.TAU; if (d > Math.PI) d -= PD.TAU; else if (d < -Math.PI) d += PD.TAU; return d; };
PD.normAng = a => ((a % PD.TAU) + PD.TAU) % PD.TAU;
PD.turnToward = (a, b, rate) => { const d = PD.angDiff(a, b); return PD.normAng(a + PD.clamp(d, -rate, rate)); };
/* a heading or bearing in whole degrees, 000 to 359 */
PD.deg3 = a => String(Math.round(PD.normAng(a) / PD.DEG) % 360).padStart(3, "0");
/* the nearest distance from point p to the segment a-b */
PD.segDist = (px, py, ax, ay, bx, by) => {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? PD.clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0;
  return Math.hypot(px - ax - dx * t, py - ay - dy * t);
};

PD.esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
PD.num = n => Number(Math.round(n)).toLocaleString("en-US");
/* a range in miles, to a tenth below ten */
PD.nm = d => d < 10 ? d.toFixed(1) : String(Math.round(d));

/* localStorage, tolerant of a private window or none at all */
PD.store = {
  get(k, d = null) { try { const v = globalThis.localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { globalThis.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* no storage */ } },
  del(k) { try { globalThis.localStorage.removeItem(k); } catch (e) { /* no storage */ } },
};
