/* PDF Pumasis -- the coast: Pumacity's waters and the Wolf Empire's, one
 * chart for every mission.
 *
 * Pumacity's harbour opens off the Tawny Coast, the mainland across the top.
 * South of it the Tawny Keys, a chain of reef islets, make the PDF's
 * training range. Cape Claw runs south from the mainland, and the Claw
 * Strait parts it from Lupenmark, the Wolf Empire's coast to the east. The
 * Vargrin Gulf cuts into Lupenmark from the Ember Sea, the open water to the
 * south-west; the Sable Republic, neutral, holds its southern shore and the
 * free port at its head.
 *
 * Miles: x east 0..320, y south 0..240. Off the chart is land. Each mission
 * sails a window of it (js/engine/missions.js). */
"use strict";
(() => {
  const Co = PD.Coast = {};
  Co.W = 320; Co.H = 240;

  const oct = (cx, cy, r, sq = 1) => Array.from({ length: 9 }, (_, i) => { const a = i / 9 * PD.TAU + cx * 0.37; const k = 0.82 + 0.18 * Math.sin(i * 2.1 + cy); return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * sq]; });
  Co.LANDS = [
    { id: "tawny", name: "Tawny Coast", side: "ours", pts: [[0, 0], [250, 0], [250, 12], [236, 16], [218, 15], [204, 19], [196, 26], [192, 36], [189, 50], [187, 64], [186, 80], [185, 96], [182, 110], [177, 121], [171, 122],
      [167, 114], [164, 100], [162, 84], [159, 66], [155, 50], [150, 38], [142, 30], [128, 27], [112, 25], [100, 27], [96, 25], [93, 18], [87, 17], [83, 23], [78, 26], [62, 24], [46, 27], [30, 25], [14, 27], [0, 26]] },
    { id: "lupen", name: "Lupenmark", side: "wolf", pts: [[224, 30], [260, 27], [320, 24], [320, 132], [300, 138], [278, 144], [256, 152], [236, 160], [220, 166], [212, 163], [209, 150], [207, 134], [206, 118],
      [207, 100], [209, 82], [210, 66], [212, 50], [216, 38]] },
    { id: "sable", name: "Sable Republic", side: "neutral", pts: [[216, 184], [236, 178], [258, 170], [282, 162], [306, 156], [320, 154], [320, 240], [212, 240], [208, 224], [206, 206], [209, 192]] },
    /* the Tawny Keys */
    ...[[40, 64, 2.5], [56, 70, 3], [70, 62, 2], [84, 73, 3.5], [100, 66, 2.5], [116, 74, 3], [132, 68, 2], [146, 76, 2.5]].map(([x, y, r], i) => ({ id: "key" + i, name: "Tawny Keys", side: "ours", key: true, pts: oct(x, y, r, 0.8) })),
    /* the Ember Sea's islands, and Fang Rock in the strait */
    { id: "cairn", name: "Cairn Isle", side: "ours", pts: oct(60, 150, 6, 0.7) },
    { id: "ash", name: "Ash Isle", side: "ours", pts: oct(120, 196, 5, 0.8) },
    { id: "gull", name: "Gull Isle", side: "ours", pts: oct(30, 212, 4, 0.9) },
    { id: "brand", name: "Brand Isle", side: "ours", pts: oct(150, 140, 3, 0.8) },
    { id: "fang", name: "Fang Rock", side: "wolf", pts: oct(198, 74, 1.4, 1) },
  ];
  for (const L of Co.LANDS) { const xs = L.pts.map(p => p[0]), ys = L.pts.map(p => p[1]); L.bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }

  /* the places that carry names on the chart */
  Co.PLACES = [
    { id: "pumacity", name: "Pumacity", x: 90, y: 17, side: "ours", port: true },
    { id: "kessrin", name: "Kessrin", x: 207.5, y: 104, side: "wolf", port: true },
    { id: "vargrin", name: "Vargrin", x: 262, y: 150, side: "wolf", port: true },
    { id: "sable", name: "Port Sable", x: 312, y: 154, side: "neutral", port: true },
    { id: "tyr", name: "Tyr Roads", x: 211.5, y: 150, side: "wolf", port: true },
  ];
  Co.WATERS = [
    { name: "TAWNY KEYS", x: 92, y: 84 }, { name: "CLAW STRAIT", x: 198, y: 58, v: true }, { name: "EMBER SEA", x: 90, y: 168 },
    { name: "VARGRIN GULF", x: 262, y: 164 }, { name: "NORTHERN REACH", x: 270, y: 19 },
  ];
  Co.place = id => Co.PLACES.find(p => p.id === id);

  /* ---- is it land? ---- */
  function inPoly(pts, x, y) {
    let c = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  Co.land = (x, y) => {
    if (x < 0 || y < 0 || x > Co.W || y > Co.H) return true;
    for (const L of Co.LANDS) if (x >= L.bb[0] && x <= L.bb[2] && y >= L.bb[1] && y <= L.bb[3] && inPoly(L.pts, x, y)) return L;
    return null;
  };
  /* land within r miles: the point and a ring round it */
  Co.near = (x, y, r) => {
    if (Co.land(x, y)) return true;
    for (let i = 0; i < 8; i++) { const a = i / 8 * PD.TAU; if (Co.land(x + Math.cos(a) * r, y + Math.sin(a) * r) || Co.land(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5)) return true; }
    return false;
  };
  /* how far along a bearing to the first land, up to max miles, in steps */
  Co.rayLand = (x, y, brg, max = 30, step = 0.25) => {
    const dx = PD.hx(brg), dy = PD.hy(brg);
    for (let d = step; d <= max; d += d < 4 ? step : step * 3) { const L = Co.land(x + dx * d, y + dy * d); if (L) return { d, L: L === true ? null : L }; }
    return null;
  };
  /* the clear heading nearest the one wanted, looking ahead look miles: what a boat steers to stay off the rocks */
  Co.clear = (x, y, want, look = 3) => {
    const ok = a => !Co.rayLand(x, y, a, look, 0.4);
    if (ok(want)) return want;
    for (let k = 1; k <= 12; k++) for (const s of [1, -1]) { const a = PD.normAng(want + s * k * 15 * PD.DEG); if (ok(a)) return a; }
    return PD.normAng(want + Math.PI);
  };
  /* the nearest water to a point (a spawn that fell on a rock) */
  Co.water = (x, y) => {
    if (!Co.near(x, y, 0.6)) return { x, y };
    for (let r = 0.5; r < 20; r += 0.5) for (let i = 0; i < 16; i++) { const a = i / 16 * PD.TAU, px = x + Math.cos(a) * r, py = y + Math.sin(a) * r; if (!Co.near(px, py, 0.6)) return { x: px, y: py }; }
    return { x, y };
  };
})();
