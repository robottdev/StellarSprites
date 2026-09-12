import {
  Color, SpriteTexture, SS_Random, clamp, clamp01, mixColor, hash2,
  unityRandomInt, unityRandomFloat,
} from "./core.js";
import { fillPolygon, fillRect, fillDisc, fillEllipse, drawLine } from "./raster.js";
import {
  n01, makeLight, lambert, specular, rimLight, perturbNormal, stampGlow, heatColor,
} from "./lighting.js";
import { Perlin, QualityMode } from "./libnoise.js";

export const ShipType = { Fighter: 0, Fighter2: 1, Hauler: 2, Saucer: 3 };

/**
 * Hull cross-sections (half-width vs length). Designed, not random —
 * 0 needle, 1 dart, 2 diamond, 3 cargo tube, 4 wide-body, 5 stealth arrow, 6 blunt dropship.
 */
const HULL_PROFILES = [
  [
    { t: 0.00, hw: 0.07 },
    { t: 0.14, hw: 0.28 },
    { t: 0.40, hw: 0.44 },
    { t: 0.72, hw: 0.40 },
    { t: 1.00, hw: 0.32 },
  ],
  [
    { t: 0.00, hw: 0.10 },
    { t: 0.16, hw: 0.34 },
    { t: 0.48, hw: 0.50 },
    { t: 0.80, hw: 0.42 },
    { t: 1.00, hw: 0.30 },
  ],
  [
    { t: 0.00, hw: 0.14 },
    { t: 0.18, hw: 0.56 },
    { t: 0.40, hw: 0.86 },
    { t: 0.68, hw: 0.54 },
    { t: 1.00, hw: 0.34 },
  ],
  [
    { t: 0.00, hw: 0.46 },
    { t: 0.08, hw: 0.78 },
    { t: 0.22, hw: 0.90 },
    { t: 0.78, hw: 0.92 },
    { t: 1.00, hw: 0.72 },
  ],
  [
    { t: 0.00, hw: 0.26 },
    { t: 0.12, hw: 0.70 },
    { t: 0.32, hw: 1.00 },
    { t: 0.70, hw: 0.94 },
    { t: 1.00, hw: 0.56 },
  ],
  [
    { t: 0.00, hw: 0.08 },
    { t: 0.22, hw: 0.34 },
    { t: 0.55, hw: 0.68 },
    { t: 0.82, hw: 0.76 },
    { t: 1.00, hw: 0.46 },
  ],
  [
    { t: 0.00, hw: 0.52 },
    { t: 0.10, hw: 0.86 },
    { t: 0.38, hw: 1.00 },
    { t: 0.74, hw: 0.88 },
    { t: 1.00, hw: 0.64 },
  ],
];

/**
 * Curated loadouts. Seed picks a kit; sliders only nudge size.
 * wing: 0 delta, 1 lambda, 2 clipped, 3 stub, 4 canard+delta, 5 sponson, 6 forward-sweep, 7 blend
 * engine: 0 twin, 1 triple, 2 fat, 3 quad, 4 twin+wing
 * weapon: 0 wing pods, 1 nose, 2 turrets, 3 nose+wing, 4 none
 */
const KITS = [
  [
    { hull: 0, wing: 0, engine: 0, weapon: 0, midW: 17, span: 86, len: 182 },
    { hull: 1, wing: 1, engine: 1, weapon: 1, midW: 18, span: 72, len: 170 },
    { hull: 2, wing: 2, engine: 0, weapon: 0, midW: 22, span: 78, len: 158 },
    { hull: 5, wing: 6, engine: 0, weapon: 3, midW: 16, span: 84, len: 176 },
  ],
  [
    { hull: 2, wing: 0, engine: 3, weapon: 2, midW: 24, span: 80, len: 168 },
    { hull: 1, wing: 4, engine: 1, weapon: 3, midW: 20, span: 74, len: 174 },
    { hull: 5, wing: 0, engine: 3, weapon: 0, midW: 19, span: 88, len: 180 },
    { hull: 6, wing: 1, engine: 0, weapon: 2, midW: 26, span: 70, len: 156 },
  ],
  [
    { hull: 3, wing: 5, engine: 2, weapon: 4, midW: 28, span: 42, len: 164 },
    { hull: 3, wing: 3, engine: 0, weapon: 1, midW: 26, span: 48, len: 170 },
    { hull: 6, wing: 5, engine: 2, weapon: 4, midW: 30, span: 40, len: 152 },
    { hull: 3, wing: 3, engine: 1, weapon: 4, midW: 27, span: 52, len: 160 },
  ],
  [
    { hull: 4, wing: 0, engine: 3, weapon: 2, midW: 32, span: 70, len: 178 },
    { hull: 4, wing: 7, engine: 2, weapon: 4, midW: 34, span: 54, len: 168 },
    { hull: 4, wing: 1, engine: 1, weapon: 0, midW: 30, span: 76, len: 184 },
    { hull: 6, wing: 7, engine: 3, weapon: 2, midW: 33, span: 48, len: 158 },
  ],
];

function pickI(random, n) {
  if (n <= 1) return 0;
  return random.range(0, n);
}

function pickFrom(random, list) {
  return list[pickI(random, list.length)];
}

function lerpPt(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function inset(pts, amt) {
  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p.x;
    cy += p.y;
  }
  cx /= pts.length;
  cy /= pts.length;
  return pts.map((p) => {
    const dx = cx - p.x;
    const dy = cy - p.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x + (dx / len) * amt, y: p.y + (dy / len) * amt };
  });
}

function widthAt(profile, t, midW) {
  const u = clamp01(t);
  const last = profile[profile.length - 1];
  if (u <= profile[0].t) return profile[0].hw * midW;
  if (u >= last.t) return last.hw * midW;
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i];
    const b = profile[i + 1];
    if (u >= a.t && u <= b.t) {
      const k = (u - a.t) / Math.max(1e-6, b.t - a.t);
      return (a.hw + (b.hw - a.hw) * k) * midW;
    }
  }
  return midW;
}

function hullBands(profile, cx, yNose, yStern, midW) {
  const bands = [];
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i];
    const b = profile[i + 1];
    const ya = yNose + (yStern - yNose) * a.t;
    const yb = yNose + (yStern - yNose) * b.t;
    const wa = Math.max(2.5, a.hw * midW);
    const wb = Math.max(2.5, b.hw * midW);
    bands.push({
      pts: [
        { x: cx - wa, y: ya },
        { x: cx + wa, y: ya },
        { x: cx + wb, y: yb },
        { x: cx - wb, y: yb },
      ],
      ya,
      yb,
      wa,
      wb,
    });
  }
  return bands;
}

function notchAft(band, cx, cleftW, cleftH) {
  const { ya, yb, wa, wb } = band;
  const cw = Math.min(cleftW, Math.max(6, wb - 3));
  const ch = Math.min(cleftH, Math.max(10, (yb - ya) * 0.78));
  const yNotch = yb - ch;
  band.pts = [
    { x: cx - wa, y: ya },
    { x: cx + wa, y: ya },
    { x: cx + wb, y: yb },
    { x: cx + cw, y: yb },
    { x: cx + cw, y: yNotch },
    { x: cx - cw, y: yNotch },
    { x: cx - cw, y: yb },
    { x: cx - wb, y: yb },
  ];
  band.notch = { cw, ch, yNotch, yb };
}

function wingPair(kind, cx, yNose, len, span, profile, midW) {
  const pieces = [];
  const tips = [];
  const hw = (t) => widthAt(profile, t, midW);

  const push = (pts, cargo = false) => {
    pieces.push({ pts, cargo });
    let far = pts[0];
    let best = 0;
    for (const p of pts) {
      const d = Math.abs(p.x - cx);
      if (d >= best) {
        best = d;
        far = p;
      }
    }
    const root = pts.reduce((a, p) => (Math.abs(p.x - cx) < Math.abs(a.x - cx) ? p : a), pts[0]);
    const yTrail = Math.max(...pts.map((p) => p.y));
    tips.push({ x: far.x, y: far.y, yTrail, xRoot: root.x });
  };

  const addTrap = (sign, yLead, yTip, yTrail, extra = 0, chordScale = 1) => {
    const tL = clamp01((yLead - yNose) / len);
    const tT = clamp01((yTip - yNose) / len);
    const tR = clamp01((yTrail - yNose) / len);
    const xRootL = cx + sign * (hw(tL) - 1.2);
    const xRootR = cx + sign * (hw(tR) - 1.2);
    const xTip = cx + sign * (hw(tT) + span * chordScale + extra);
    push([
      { x: xRootL, y: yLead },
      { x: xTip, y: yTip },
      { x: xTip - sign * Math.max(7, span * 0.12), y: yTrail },
      { x: xRootR, y: yTrail },
    ]);
  };

  if (kind === 0) {
    addTrap(-1, yNose + len * 0.26, yNose + len * 0.70, yNose + len * 0.86);
    addTrap(1, yNose + len * 0.26, yNose + len * 0.70, yNose + len * 0.86);
  } else if (kind === 1) {
    for (const sign of [-1, 1]) {
      const y0 = yNose + len * 0.30;
      const y1 = yNose + len * 0.52;
      const y2 = yNose + len * 0.88;
      const t0 = (y0 - yNose) / len;
      const t1 = (y1 - yNose) / len;
      const t2 = (y2 - yNose) / len;
      push([
        { x: cx + sign * (hw(t0) - 1), y: y0 },
        { x: cx + sign * (hw(t1) + span * 0.42), y: y1 },
        { x: cx + sign * (hw(t1) + span * 0.98), y: y2 - 8 },
        { x: cx + sign * (hw(t2) + span * 0.72), y: y2 },
        { x: cx + sign * (hw(t2) - 1), y: y2 },
      ]);
    }
  } else if (kind === 2) {
    addTrap(-1, yNose + len * 0.22, yNose + len * 0.44, yNose + len * 0.64, 0, 0.82);
    addTrap(1, yNose + len * 0.22, yNose + len * 0.44, yNose + len * 0.64, 0, 0.82);
  } else if (kind === 3) {
    addTrap(-1, yNose + len * 0.42, yNose + len * 0.52, yNose + len * 0.68, -span * 0.18, 0.55);
    addTrap(1, yNose + len * 0.42, yNose + len * 0.52, yNose + len * 0.68, -span * 0.18, 0.55);
  } else if (kind === 4) {
    addTrap(-1, yNose + len * 0.10, yNose + len * 0.18, yNose + len * 0.30, -span * 0.36, 0.40);
    addTrap(1, yNose + len * 0.10, yNose + len * 0.18, yNose + len * 0.30, -span * 0.36, 0.40);
    addTrap(-1, yNose + len * 0.34, yNose + len * 0.72, yNose + len * 0.88);
    addTrap(1, yNose + len * 0.34, yNose + len * 0.72, yNose + len * 0.88);
  } else if (kind === 5) {
    const y0 = yNose + len * 0.34;
    const y1 = yNose + len * 0.86;
    const t0 = (y0 - yNose) / len;
    const t1 = (y1 - yNose) / len;
    const pod = Math.max(18, span * 0.62);
    for (const sign of [-1, 1]) {
      const xInner0 = cx + sign * (hw(t0) - 1);
      const xInner1 = cx + sign * (hw(t1) - 1);
      const xOuter = cx + sign * (hw((t0 + t1) * 0.5) + pod);
      push([
        { x: xInner0, y: y0 },
        { x: xOuter, y: y0 + 3 },
        { x: xOuter, y: y1 - 3 },
        { x: xInner1, y: y1 },
      ], true);
    }
  } else if (kind === 6) {
    for (const sign of [-1, 1]) {
      const yLead = yNose + len * 0.44;
      const yTipL = yNose + len * 0.22;
      const yTipT = yNose + len * 0.48;
      const yTrail = yNose + len * 0.74;
      const tL = (yLead - yNose) / len;
      const tT = (yTrail - yNose) / len;
      push([
        { x: cx + sign * (hw(tL) - 1), y: yLead },
        { x: cx + sign * (hw(tL) + span * 0.96), y: yTipL },
        { x: cx + sign * (hw(tT) + span * 0.82), y: yTipT },
        { x: cx + sign * (hw(tT) - 1), y: yTrail },
      ]);
    }
  } else {
    addTrap(-1, yNose + len * 0.18, yNose + len * 0.48, yNose + len * 0.78, -span * 0.12, 0.62);
    addTrap(1, yNose + len * 0.18, yNose + len * 0.48, yNose + len * 0.78, -span * 0.12, 0.62);
  }
  return { pieces, tips };
}

function seam(tex, a, b, color) {
  drawLine(tex, a.x, a.y, b.x, b.y, color, 1);
}

function paintWings(tex, pieces, fill, panel, seamCol) {
  for (const w of pieces) fillPolygon(tex, w.pts, fill);
  for (const w of pieces) {
    const pts = w.pts;
    const rootLead = pts[0];
    const tip = pts[1];
    const trailTip = pts[pts.length - 2];
    const rootTrail = pts[pts.length - 1];
    fillPolygon(tex, [
      rootLead,
      tip,
      lerpPt(tip, trailTip, 0.08),
      lerpPt(rootLead, rootTrail, 0.12),
    ], mixColor(fill, new Color(0.78, 0.8, 0.82, 1), 0.16));
    if (w.cargo) {
      seam(tex, lerpPt(rootLead, rootTrail, 0.34), lerpPt(tip, trailTip, 0.34), seamCol);
      seam(tex, lerpPt(rootLead, rootTrail, 0.66), lerpPt(tip, trailTip, 0.66), seamCol);
    } else {
      const flap = [
        lerpPt(rootTrail, trailTip, 0.16),
        lerpPt(rootTrail, trailTip, 0.84),
        lerpPt(lerpPt(rootTrail, trailTip, 0.84), lerpPt(rootLead, tip, 0.84), 0.14),
        lerpPt(lerpPt(rootTrail, trailTip, 0.16), lerpPt(rootLead, tip, 0.16), 0.14),
      ];
      fillPolygon(tex, flap, mixColor(fill, panel, 0.28));
      seam(tex, flap[0], flap[1], seamCol);
    }
  }
}

function paintHull(tex, bands, shell, panel, seamCol) {
  bands.forEach((b, i) => {
    fillPolygon(tex, b.pts, i % 2 === 0 ? shell : mixColor(shell, panel, 0.16));
  });
  bands.forEach((b, i) => {
    if (b.notch) return;
    fillPolygon(tex, inset(b.pts, 3.2), i % 2 === 0 ? mixColor(shell, panel, 0.14) : panel);
  });
  for (let i = 1; i < bands.length; i++) {
    const b = bands[i];
    seam(tex, { x: b.pts[0].x + 2, y: b.ya }, { x: b.pts[1].x - 2, y: b.ya }, seamCol);
  }
}

function spine(tex, cx, y0, y1, w, col) {
  fillPolygon(tex, [
    { x: cx, y: y0 },
    { x: cx + w, y: y0 + 10 },
    { x: cx + w * 0.65, y: y1 },
    { x: cx - w * 0.65, y: y1 },
    { x: cx - w, y: y0 + 10 },
  ], col);
}

function hatch(tex, x, y, w, h, col) {
  fillRect(tex, x, y, w, h, col);
  fillRect(tex, x + 1, y + 1, Math.max(1, w - 2), Math.max(1, h - 2), mixColor(col, new Color(0.85, 0.86, 0.88, 1), 0.08));
}

function canopy(tex, cx, y, w, h, glass, frame) {
  const pts = [
    { x: cx, y },
    { x: cx + w * 0.58, y: y + h * 0.26 },
    { x: cx + w * 0.40, y: y + h },
    { x: cx - w * 0.40, y: y + h },
    { x: cx - w * 0.58, y: y + h * 0.26 },
  ];
  fillPolygon(tex, pts, frame);
  fillPolygon(tex, inset(pts, 1.7), glass);
  fillPolygon(tex, [
    { x: cx - w * 0.30, y: y + h * 0.20 },
    { x: cx - w * 0.06, y: y + h * 0.16 },
    { x: cx + w * 0.02, y: y + h * 0.70 },
    { x: cx - w * 0.22, y: y + h * 0.76 },
  ], mixColor(glass, new Color(0.55, 0.72, 0.88, 1), 0.42));
}

function fillNotch(tex, band, cx, mech) {
  const n = band.notch;
  if (!n) return;
  fillPolygon(tex, [
    { x: cx - n.cw, y: n.yNotch },
    { x: cx + n.cw, y: n.yNotch },
    { x: cx + n.cw, y: n.yb + 1 },
    { x: cx - n.cw, y: n.yb + 1 },
  ], mech);
  fillRect(tex, cx - n.cw + 1, n.yNotch - 2, n.cw * 2 - 2, 3, mixColor(mech, new Color(0.55, 0.56, 0.58, 1), 0.28));
}

function engineBell(tex, cx, cy, rx, ry, glow, ion, ring) {
  fillEllipse(tex, cx, cy, rx + 1.6, ry + 1.2, ring);
  fillEllipse(tex, cx, cy, rx, ry, new Color(0.11, 0.11, 0.12, 1));
  fillEllipse(tex, cx, cy, rx * 0.80, ry * 0.80, new Color(0.04, 0.04, 0.05, 1));
  if (ion) {
    fillEllipse(tex, cx, cy, rx * 0.48, ry * 0.48, new Color(0.18, 0.42, 0.82, 1));
    fillEllipse(tex, cx, cy, rx * 0.26, ry * 0.26, new Color(0.55, 0.84, 1, 1));
    fillEllipse(tex, cx, cy, rx * 0.12, ry * 0.12, new Color(0.94, 0.98, 1, 1));
    glow.push({ x: cx, y: cy + ry * 0.1, r: Math.max(rx, ry) * 1.15, ion: true });
  } else {
    fillEllipse(tex, cx, cy, rx * 0.48, ry * 0.48, new Color(0.52, 0.24, 0.07, 1));
    fillEllipse(tex, cx, cy, rx * 0.26, ry * 0.26, new Color(1, 0.76, 0.36, 1));
    fillEllipse(tex, cx, cy, rx * 0.12, ry * 0.12, new Color(1, 0.95, 0.86, 1));
    glow.push({ x: cx, y: cy + ry * 0.1, r: Math.max(rx, ry) * 1.15, ion: false });
  }
}

function placeEngines(tex, kind, cx, yBay, yStern, midW, glow, tips, ion, mech) {
  const y = yBay + Math.max(8, (yStern - yBay) * 0.52);
  const ring = mixColor(mech, new Color(0.42, 0.43, 0.45, 1), 0.4);
  if (kind === 0) {
    engineBell(tex, cx - 9, y, 7.2, 8.4, glow, ion, ring);
    engineBell(tex, cx + 9, y, 7.2, 8.4, glow, ion, ring);
  } else if (kind === 1) {
    engineBell(tex, cx, y - 1, 8.0, 9.2, glow, ion, ring);
    engineBell(tex, cx - 14, y + 3, 5.6, 6.8, glow, ion, ring);
    engineBell(tex, cx + 14, y + 3, 5.6, 6.8, glow, ion, ring);
  } else if (kind === 2) {
    engineBell(tex, cx, y, Math.max(11, midW * 0.48), 8.2, glow, ion, ring);
  } else if (kind === 3) {
    engineBell(tex, cx - 15, y, 5.6, 6.8, glow, ion, ring);
    engineBell(tex, cx + 15, y, 5.6, 6.8, glow, ion, ring);
    engineBell(tex, cx - 5.5, y + 4, 5.0, 6.2, glow, ion, ring);
    engineBell(tex, cx + 5.5, y + 4, 5.0, 6.2, glow, ion, ring);
  } else {
    engineBell(tex, cx - 7, y + 1, 5.8, 6.8, glow, ion, ring);
    engineBell(tex, cx + 7, y + 1, 5.8, 6.8, glow, ion, ring);
    for (const tip of tips) {
      engineBell(tex, (tip.xRoot + tip.x) * 0.55, tip.yTrail - 3, 5.2, 6.0, glow, ion, ring);
    }
  }
}

function weaponPod(tex, x, y, fill, forward) {
  const h = forward ? 13 : 15;
  const y0 = forward ? y - h * 0.45 : y - 2;
  fillPolygon(tex, [
    { x: x - 3.4, y: y0 },
    { x: x + 3.4, y: y0 },
    { x: x + 2.8, y: y0 + h },
    { x: x - 2.8, y: y0 + h },
  ], mixColor(fill, new Color(0.36, 0.37, 0.4, 1), 0.22));
  fillEllipse(tex, x, forward ? y0 + 1.2 : y0 + h - 1.2, 1.1, 1.3, new Color(0.1, 0.1, 0.11, 1));
}

function placeWeapons(tex, kind, cx, yNose, tips, fill) {
  const pts = [];
  if (kind === 4) return pts;
  if ((kind === 0 || kind === 3) && tips.length) {
    for (const tip of tips) {
      const x = tip.xRoot + (tip.x - tip.xRoot) * 0.62;
      const y = tip.yTrail * 0.55 + tip.y * 0.45;
      weaponPod(tex, x, y, fill, true);
      pts.push({ x: x - cx, y });
    }
  }
  if (kind === 1 || kind === 3) {
    weaponPod(tex, cx - 6.5, yNose + 22, fill, true);
    weaponPod(tex, cx + 6.5, yNose + 22, fill, true);
    pts.push({ x: 0, y: yNose });
  }
  if (kind === 2) {
    weaponPod(tex, cx - 15, yNose + 44, fill, false);
    weaponPod(tex, cx + 15, yNose + 44, fill, false);
    pts.push({ x: -15, y: yNose + 44 }, { x: 15, y: yNose + 44 });
  }
  return pts;
}

function intakes(tex, cx, y, hw, fill) {
  for (const s of [-1, 1]) {
    fillPolygon(tex, [
      { x: cx + s * (hw - 1), y },
      { x: cx + s * (hw + 6), y: y + 3 },
      { x: cx + s * (hw + 5), y: y + 13 },
      { x: cx + s * (hw - 1), y: y + 11 },
    ], mixColor(fill, new Color(0.18, 0.18, 0.2, 1), 0.55));
    fillRect(tex, cx + s * (hw + 1) - (s < 0 ? 3 : 0), y + 5, 3, 5, new Color(0.08, 0.08, 0.09, 1));
  }
}

function rcs(tex, x, y) {
  fillDisc(tex, x, y, 1.6, new Color(0.22, 0.22, 0.24, 1));
  fillDisc(tex, x, y, 0.8, new Color(0.08, 0.08, 0.09, 1));
}

function hazardBand(tex, x, y, w, h, yellow) {
  fillRect(tex, x, y, w, h, new Color(0.12, 0.12, 0.12, 1));
  const stripe = 4;
  for (let i = -h; i < w + h; i += stripe * 2) {
    fillPolygon(tex, [
      { x: x + i, y },
      { x: x + i + stripe, y },
      { x: x + i + stripe - h, y: y + h },
      { x: x + i - h, y: y + h },
    ], yellow);
  }
}

function paintFlash(tex, cx, y, w, h, color) {
  fillPolygon(tex, [
    { x: cx, y },
    { x: cx - w * 0.55, y: y + h },
    { x: cx + w * 0.55, y: y + h },
  ], color);
}

function cleftForEngine(kind, midW) {
  if (kind === 2) return { w: Math.max(15, midW * 0.62), h: 24 };
  if (kind === 1) return { w: 24, h: 26 };
  if (kind === 3) return { w: 28, h: 24 };
  if (kind === 4) return { w: 18, h: 20 };
  return { w: 20, h: 24 };
}

function nearClear(tex, x, y, rad) {
  for (let d = 1; d <= rad; d++) {
    if (
      tex.isClear(x - d, y) || tex.isClear(x + d, y) ||
      tex.isClear(x, y - d) || tex.isClear(x, y + d)
    ) {
      return (rad + 1 - d) / rad;
    }
  }
  return 0;
}

function shadeRealistic(tex, opts) {
  const { seed, cx, yNose, yStern, midW, span, profile, colorDetail, glow } = opts;
  const grain = new Perlin(0.048, 2.0, 0.4, 3, seed + 17, QualityMode.Low);
  const wear = new Perlin(0.02, 2.0, 0.5, 3, seed + 7, QualityMode.Low);
  const key = makeLight(180, 0.62);
  const fillL = makeLight(28, 0.38);
  const wearAmt = clamp(0.05 + colorDetail * 0.7, 0.05, 0.18);
  const len = Math.max(8, yStern - yNose);
  const out = new Float32Array(tex.data);
  const w = tex.width;
  const h = tex.height;
  const dirtCol = new Color(0.16, 0.15, 0.14, 1);
  const bareMetal = new Color(0.72, 0.74, 0.76, 1);
  const heatBlue = new Color(0.22, 0.34, 0.5, 1);
  const heatBrown = new Color(0.42, 0.22, 0.12, 1);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (x + y * w) * 4;
      if (tex.data[i + 3] < 0.05) continue;
      const r = tex.data[i];
      const g = tex.data[i + 1];
      const b = tex.data[i + 2];
      const lum = r + g + b;
      const emissive = lum > 1.45 && (g > 0.4 || b > 0.4);
      const isGlass = !emissive && b > r * 1.15 && b > 0.16 && lum < 1.7;
      const isMech = !emissive && !isGlass && lum < 0.72;

      const dx = x - cx;
      const t = clamp01((y - yNose) / len);
      const hullW = Math.max(3, widthAt(profile, t, midW));
      const onHull = Math.abs(dx) <= hullW + 0.85;

      let nx;
      let ny;
      let nz;
      if (onHull) {
        const u = clamp(dx / hullW, -1, 1);
        const z = Math.sqrt(Math.max(0.04, 1 - u * u));
        nx = u * 1.02;
        ny = 0.06;
        nz = 0.32 + 0.68 * z;
      } else {
        const wingT = clamp01((Math.abs(dx) - hullW) / Math.max(12, span));
        nx = Math.sign(dx || 1) * (0.10 + 0.42 * wingT);
        ny = 0.12;
        nz = 0.98 - 0.32 * wingT;
      }

      const g1 = n01(grain, x, y, 0);
      const gW = n01(wear, x, y, 0);
      const nlen = Math.hypot(nx, ny, nz) || 1;
      const n0 = { nx: nx / nlen, ny: ny / nlen, nz: nz / nlen, r2: 0 };
      const n = perturbNormal(n0, (g1 - 0.5) * 0.05, (gW - 0.5) * 0.04, isGlass ? 0.12 : 0.32);

      let albedo = new Color(r, g, b, 1);
      albedo = mixColor(albedo, dirtCol, (1 - gW) * wearAmt * 0.08);
      const edge = nearClear(tex, x, y, 3);
      if (!isGlass) albedo = mixColor(albedo, bareMetal, edge * 0.08);
      let ao = edge * 0.42;
      if (!onHull && Math.abs(dx) < hullW + 8) {
        ao = Math.max(ao, (1 - clamp01((Math.abs(dx) - hullW) / 8)) * 0.26);
      }
      albedo = mixColor(albedo, dirtCol, ao * 0.16);

      if (glow && glow.length) {
        let dMin = 1e9;
        let ionNear = false;
        for (const gl of glow) {
          const d = (x - gl.x) * (x - gl.x) + (y - gl.y) * (y - gl.y);
          if (d < dMin) {
            dMin = d;
            ionNear = !!gl.ion;
          }
        }
        const heat = Math.exp(-dMin / 280);
        if (!isGlass) albedo = mixColor(albedo, ionNear ? heatBlue : heatBrown, heat * 0.28);
      }

      const metallic = emissive ? 0.04 : (isGlass ? 0.92 : (isMech ? 0.38 : (onHull ? 0.68 : 0.52)));
      const roughness = isGlass
        ? 0.08
        : clamp(0.26 + wearAmt * 0.28 + (isMech ? 0.18 : 0) + (1 - gW) * 0.08, 0.16, 0.62);
      const keyAmt = lambert(n, key, 0.08, 0.14);
      const fillAmt = lambert(n, fillL, 0, 0.2) * 0.2;
      let lightAmt = (keyAmt * 1.18 + fillAmt) * (1 - ao * 0.42);
      if (onHull && !isGlass) {
        const ridge = Math.pow(Math.max(0, 1 - Math.abs(dx) / hullW), 1.55);
        lightAmt += ridge * 0.18 * (1 - roughness);
        lightAmt *= 0.52 + 0.48 * Math.sqrt(Math.max(0.05, 1 - (dx / hullW) * (dx / hullW)));
      } else if (!isGlass) {
        lightAmt *= 0.88;
      }

      const specK = specular(n, key, isGlass ? 64 : 20 + (1 - roughness) * 40, (isGlass ? 0.55 : 0.12 + metallic * 0.26) * (1.05 - roughness));
      const fres = 0.04 + 0.9 * Math.pow(1 - clamp01(n.nz), 5);
      const rim = rimLight(n, key, 2.8) * (isGlass ? 0.22 : 0.04 + fres * 0.08);
      const diffuse = albedo.mul((1 - metallic * 0.28) * lightAmt);
      const specCol = mixColor(new Color(1, 0.97, 0.92, 1), albedo, metallic * 0.35);
      let lit = new Color(
        clamp01(diffuse.r + specCol.r * specK * (0.32 + fres) + rim * 0.48),
        clamp01(diffuse.g + specCol.g * specK * (0.32 + fres) + rim * 0.56),
        clamp01(diffuse.b + specCol.b * specK * (0.32 + fres) + rim * 0.78),
        1
      );

      if (emissive) {
        const hot = heatColor(clamp01(lum / 3));
        lit = mixColor(lit, hot, 0.22);
        lit = new Color(
          clamp01(lit.r * 0.28 + r * 0.88),
          clamp01(lit.g * 0.28 + g * 0.88),
          clamp01(lit.b * 0.28 + b * 0.88),
          1
        );
      }

      if (isGlass) {
        lit = mixColor(new Color(r, g, b, 1), lit, 0.45);
      }

      if (!emissive && !isGlass && hash2(x, y, seed) > 0.997 && metallic > 0.5 && lightAmt > 0.5) {
        lit = mixColor(lit, Color.white, 0.22);
      }

      out[i] = lit.r;
      out[i + 1] = lit.g;
      out[i + 2] = lit.b;
    }
  }
  tex.data.set(out);
}

export function generateShip(params) {
  const { seed, shipType, bodyDetail, wingDetail, colors, colorDetail } = params;
  const width = 256;
  const height = 256;
  const random = new SS_Random(seed);
  const tex = new SpriteTexture(width, height);
  const cx = width / 2;
  const cy = height / 2;

  const type = shipType | 0;
  const kit = pickFrom(random, KITS[type] || KITS[0]);
  const hullKind = kit.hull;
  const wingKind = kit.wing;
  const engineKind = kit.engine;
  const weaponKind = kit.weapon;
  const ion = type <= 1 ? random.range(0, 1) > 0.22 : random.range(0, 1) > 0.78;

  const bodyNudge = 0.94 + clamp(bodyDetail, 0, 0.12) * 1.1;
  const wingNudge = 0.94 + clamp(wingDetail, 0, 0.14) * 0.9;
  const midW = kit.midW * bodyNudge;
  const span = kit.span * wingNudge;
  const len = kit.len + (random.range(0, 1) - 0.5) * 6;

  const yNose = cy - len * 0.50;
  const yStern = cy + len * 0.46;
  const profile = HULL_PROFILES[hullKind];

  const hull = colors[0] || new Color(0.72, 0.74, 0.76, 1);
  const accent = colors[1] || new Color(0.78, 0.16, 0.12, 1);
  const shell = mixColor(new Color(0.62, 0.64, 0.66, 1), hull, 0.5);
  const wingFill = mixColor(shell, new Color(0.48, 0.50, 0.53, 1), 0.38);
  const panel = mixColor(shell, new Color(0.50, 0.52, 0.54, 1), 0.4);
  const wingPanel = mixColor(wingFill, new Color(0.42, 0.44, 0.47, 1), 0.3);
  const mark = mixColor(accent, new Color(0.78, 0.58, 0.12, 1), type === 2 ? 0.5 : 0.06);
  const glass = new Color(0.08, 0.14, 0.22, 1);
  const frame = mixColor(shell, new Color(0.28, 0.3, 0.33, 1), 0.4);
  const seamCol = mixColor(shell, new Color(0.38, 0.39, 0.41, 1), 0.42);
  const mech = mixColor(shell, new Color(0.34, 0.35, 0.37, 1), 0.48);

  const { pieces: wingGeom, tips } = wingPair(wingKind, cx, yNose, len, span, profile, midW);
  paintWings(tex, wingGeom, wingFill, wingPanel, seamCol);

  const bands = hullBands(profile, cx, yNose, yStern, midW);
  const cleft = cleftForEngine(engineKind, midW);
  notchAft(bands[bands.length - 1], cx, cleft.w, cleft.h);
  paintHull(tex, bands, shell, panel, seamCol);

  spine(tex, cx, yNose + len * 0.16, yNose + len * 0.72, Math.max(3.2, widthAt(profile, 0.3, midW) * 0.18), mixColor(shell, new Color(0.82, 0.84, 0.86, 1), 0.28));

  const hwMid = widthAt(profile, 0.42, midW);
  hatch(tex, cx - 6, yNose + len * 0.50, 5, 8, mixColor(shell, panel, 0.5));
  hatch(tex, cx + 1, yNose + len * 0.60, 4, 6, mixColor(shell, panel, 0.5));
  if (type !== 2) intakes(tex, cx, yNose + len * 0.40, hwMid, mech);
  if (type === 2) {
    const doorW = Math.max(10, hwMid * 0.7);
    fillRect(tex, cx - doorW, yNose + len * 0.68, doorW * 2, 10, mixColor(shell, mech, 0.22));
    seam(tex, { x: cx, y: yNose + len * 0.68 }, { x: cx, y: yNose + len * 0.68 + 10 }, seamCol);
  }

  if (type === 2) {
    hazardBand(tex, cx - hwMid + 3, yNose + len * 0.52, Math.max(10, hwMid * 1.45), 6, mark);
  } else {
    paintFlash(tex, cx, yNose + len * 0.08, Math.max(4.5, widthAt(profile, 0.10, midW) * 0.62), 8, mark);
  }

  canopy(
    tex,
    cx,
    yNose + len * (type === 2 ? 0.12 : 0.16),
    Math.max(6.5, widthAt(profile, 0.22, midW) * 0.58),
    type === 3 ? 24 : (type === 2 ? 16 : 20),
    glass,
    frame
  );

  rcs(tex, cx - hwMid + 2, yNose + len * 0.30);
  rcs(tex, cx + hwMid - 2, yNose + len * 0.30);
  rcs(tex, cx - widthAt(profile, 0.82, midW) + 3, yStern - 20);
  rcs(tex, cx + widthAt(profile, 0.82, midW) - 3, yStern - 20);

  const glow = [];
  fillNotch(tex, bands[bands.length - 1], cx, mech);
  const yBay = bands[bands.length - 1].notch.yNotch;
  placeEngines(tex, engineKind, cx, yBay, yStern, midW, glow, tips, ion, mech);
  const weaponPts = placeWeapons(tex, weaponKind, cx, yNose, tips, mech);

  shadeRealistic(tex, {
    seed, cx, yNose, yStern, midW, span, profile,
    colorDetail: colorDetail || 0.08,
    glow,
  });

  for (const gl of glow) {
    if (gl.ion) {
      stampGlow(tex, gl.x, gl.y, gl.r * 2.0, new Color(0.35, 0.65, 1, 0.2));
      stampGlow(tex, gl.x, gl.y, gl.r * 1.0, new Color(0.75, 0.9, 1, 0.18));
    } else {
      stampGlow(tex, gl.x, gl.y, gl.r * 2.0, new Color(1, 0.5, 0.16, 0.2));
      stampGlow(tex, gl.x, gl.y, gl.r * 1.0, new Color(1, 0.82, 0.45, 0.16));
    }
  }

  return {
    texture: tex,
    enginePoints: glow.map((gl) => ({ x: gl.x - cx, y: gl.y - cy })),
    weaponPoints: weaponPts,
    width,
    height,
    modules: { hullKind, wingKind, engineKind, weaponKind, ion, kit },
  };
}

export function randomizeShip(state) {
  const next = { ...state };
  if (!next.customSeed) next.seed = unityRandomInt(0, 100000000);
  if (!next.customShipType) next.shipType = unityRandomInt(0, 4);
  if (!next.customScale) next.scale = unityRandomFloat(1, 2);
  if (!next.customColors) {
    next.colors = [
      new Color(0.62 + unityRandomFloat(0, 0.18), 0.64 + unityRandomFloat(0, 0.16), 0.66 + unityRandomFloat(0, 0.14), 1),
      new Color(unityRandomFloat(0.55, 0.9), unityRandomFloat(0.1, 0.4), unityRandomFloat(0.06, 0.2), 1),
    ];
  }
  if (!next.customColorDetail) next.colorDetail = unityRandomFloat(0.04, 0.10);
  if (!next.customBodyDetail) next.bodyDetail = unityRandomFloat(0.02, 0.06);
  if (!next.customWingDetail) next.wingDetail = unityRandomFloat(0.04, 0.08);
  return next;
}
