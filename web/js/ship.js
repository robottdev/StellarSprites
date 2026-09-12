import {
  Color, SpriteTexture, SS_Random, clamp, clamp01, mixColor, outline,
  unityRandomInt, unityRandomFloat,
} from "./core.js";
import { fillPolygon, drawPolygon, fillRect, fillDisc, drawLine } from "./raster.js";
import { stampGlow } from "./lighting.js";

export const ShipType = { Fighter: 0, Fighter2: 1, Hauler: 2, Saucer: 3 };

const INK = new Color(0.08, 0.09, 0.11, 1);
const ENGINE = new Color(0.18, 0.86, 0.92, 1);
const ENGINE_HI = new Color(0.78, 0.98, 1, 1);
const ENGINE_CORE = new Color(0.06, 0.32, 0.38, 1);

const HULL_PROFILES = [
  [
    { t: 0.00, hw: 0.08 },
    { t: 0.12, hw: 0.36 },
    { t: 0.32, hw: 0.52 },
    { t: 0.54, hw: 0.64 },
    { t: 0.72, hw: 0.70 },
    { t: 1.00, hw: 0.44 },
  ],
  [
    { t: 0.00, hw: 0.06 },
    { t: 0.16, hw: 0.26 },
    { t: 0.40, hw: 0.40 },
    { t: 0.66, hw: 0.48 },
    { t: 1.00, hw: 0.34 },
  ],
  [
    { t: 0.00, hw: 0.14 },
    { t: 0.16, hw: 0.54 },
    { t: 0.40, hw: 0.82 },
    { t: 0.64, hw: 0.58 },
    { t: 1.00, hw: 0.36 },
  ],
  [
    { t: 0.00, hw: 0.40 },
    { t: 0.08, hw: 0.74 },
    { t: 0.24, hw: 0.86 },
    { t: 0.70, hw: 0.92 },
    { t: 1.00, hw: 0.62 },
  ],
  [
    { t: 0.00, hw: 0.22 },
    { t: 0.10, hw: 0.60 },
    { t: 0.28, hw: 0.94 },
    { t: 0.52, hw: 1.00 },
    { t: 0.74, hw: 0.90 },
    { t: 1.00, hw: 0.52 },
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
  const cw = Math.min(cleftW, Math.max(6, wb - 4));
  const ch = Math.min(cleftH, Math.max(10, (yb - ya) * 0.7));
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

  const addWing = (sign, yLead, yTip, yTrail, extra = 0, chordScale = 1) => {
    const tL = clamp01((yLead - yNose) / len);
    const tT = clamp01((yTip - yNose) / len);
    const tR = clamp01((yTrail - yNose) / len);
    const xRootL = cx + sign * (hw(tL) - 1.5);
    const xRootR = cx + sign * (hw(tR) - 1.5);
    const xTip = cx + sign * (hw(tT) + span * chordScale + extra);
    const pts = [
      { x: xRootL, y: yLead },
      { x: xTip, y: yTip },
      { x: xTip - sign * Math.max(8, span * 0.14), y: yTrail },
      { x: xRootR, y: yTrail },
    ];
    pieces.push({ pts, cargo: false });
    tips.push({ x: xTip, y: yTip, yTrail, xRoot: xRootR });
  };

  if (kind === 0) {
    addWing(-1, yNose + len * 0.28, yNose + len * 0.68, yNose + len * 0.84);
    addWing(1, yNose + len * 0.28, yNose + len * 0.68, yNose + len * 0.84);
  } else if (kind === 1) {
    addWing(-1, yNose + len * 0.36, yNose + len * 0.84, yNose + len * 0.94, span * 0.1);
    addWing(1, yNose + len * 0.36, yNose + len * 0.84, yNose + len * 0.94, span * 0.1);
  } else if (kind === 2) {
    addWing(-1, yNose + len * 0.26, yNose + len * 0.46, yNose + len * 0.66, 0, 0.84);
    addWing(1, yNose + len * 0.26, yNose + len * 0.46, yNose + len * 0.66, 0, 0.84);
  } else if (kind === 3) {
    addWing(-1, yNose + len * 0.40, yNose + len * 0.50, yNose + len * 0.66, -span * 0.22, 0.58);
    addWing(1, yNose + len * 0.40, yNose + len * 0.50, yNose + len * 0.66, -span * 0.22, 0.58);
  } else if (kind === 4) {
    addWing(-1, yNose + len * 0.10, yNose + len * 0.20, yNose + len * 0.32, -span * 0.38, 0.42);
    addWing(1, yNose + len * 0.10, yNose + len * 0.20, yNose + len * 0.32, -span * 0.38, 0.42);
    addWing(-1, yNose + len * 0.34, yNose + len * 0.70, yNose + len * 0.86);
    addWing(1, yNose + len * 0.34, yNose + len * 0.70, yNose + len * 0.86);
  } else {
    const y0 = yNose + len * 0.42;
    const y1 = yNose + len * 0.80;
    const t0 = (y0 - yNose) / len;
    const t1 = (y1 - yNose) / len;
    const pod = Math.max(14, span * 0.36);
    for (const sign of [-1, 1]) {
      const x0 = cx + sign * (hw(t0) - 1);
      const x1 = cx + sign * (hw(t1) - 1);
      const xo = cx + sign * (hw((t0 + t1) * 0.5) + pod);
      const pts = [
        { x: x0, y: y0 },
        { x: xo, y: y0 + 5 },
        { x: xo, y: y1 - 5 },
        { x: x1, y: y1 },
      ];
      pieces.push({ pts, cargo: true });
      tips.push({ x: xo, y: (y0 + y1) * 0.4, yTrail: y1, xRoot: x1 });
    }
  }
  return { pieces, tips };
}

function innerWing(pts) {
  const [rootLead, tip, trailTip, rootTrail] = pts;
  return [
    lerpPt(rootLead, rootTrail, 0.08),
    lerpPt(rootLead, tip, 0.40),
    lerpPt(rootTrail, trailTip, 0.36),
    lerpPt(rootTrail, rootLead, 0.08),
  ];
}

function paintWings(tex, pieces, fill, panel, ink) {
  for (const w of pieces) fillPolygon(tex, w.pts, fill);
  for (const w of pieces) {
    const [rootLead, tip, trailTip, rootTrail] = w.pts;
    const lead = [
      rootLead,
      tip,
      lerpPt(tip, trailTip, 0.10),
      lerpPt(rootLead, rootTrail, 0.14),
    ];
    fillPolygon(tex, lead, mixColor(fill, ink, 0.12));
  }
  for (const w of pieces) {
    fillPolygon(tex, innerWing(w.pts), panel);
    drawPolygon(tex, innerWing(w.pts), ink, 1);
  }
  for (const w of pieces) {
    if (w.cargo) {
      const [a, b, c, d] = w.pts;
      drawLine(tex, lerpPt(a, d, 0.33).x, lerpPt(a, d, 0.33).y, lerpPt(b, c, 0.33).x, lerpPt(b, c, 0.33).y, ink, 1);
      drawLine(tex, lerpPt(a, d, 0.66).x, lerpPt(a, d, 0.66).y, lerpPt(b, c, 0.66).x, lerpPt(b, c, 0.66).y, ink, 1);
    } else {
      const [rootLead, tip, trailTip, rootTrail] = w.pts;
      drawLine(tex, lerpPt(rootLead, rootTrail, 0.55).x, lerpPt(rootLead, rootTrail, 0.55).y, lerpPt(tip, trailTip, 0.45).x, lerpPt(tip, trailTip, 0.45).y, ink, 1);
      const flap = [
        lerpPt(rootTrail, trailTip, 0.22),
        lerpPt(rootTrail, trailTip, 0.78),
        lerpPt(lerpPt(rootTrail, trailTip, 0.78), lerpPt(rootLead, tip, 0.78), 0.16),
        lerpPt(lerpPt(rootTrail, trailTip, 0.22), lerpPt(rootLead, tip, 0.22), 0.16),
      ];
      fillPolygon(tex, flap, mixColor(fill, panel, 0.35));
      drawPolygon(tex, flap, ink, 1);
    }
  }
  for (const w of pieces) drawPolygon(tex, w.pts, ink, 1);
}

function paintHull(tex, bands, shell, panel, ink) {
  bands.forEach((b, i) => {
    const fill = i % 2 === 0 ? shell : mixColor(shell, panel, 0.22);
    fillPolygon(tex, b.pts, fill);
  });
  bands.forEach((b, i) => {
    if (b.notch) return;
    fillPolygon(tex, inset(b.pts, 3.2), i % 2 === 0 ? panel : mixColor(panel, shell, 0.2));
  });
  for (const b of bands) drawPolygon(tex, b.pts, ink, 1);
}

function chevron(tex, cx, y, w, h, color) {
  const pts = [
    { x: cx, y },
    { x: cx - w, y: y + h },
    { x: cx - w * 0.32, y: y + h },
    { x: cx, y: y + h * 0.38 },
    { x: cx + w * 0.32, y: y + h },
    { x: cx + w, y: y + h },
  ];
  fillPolygon(tex, pts, color);
  drawPolygon(tex, pts, INK, 1);
}

function ventralDiamond(tex, cx, y, w, h) {
  const pts = [
    { x: cx, y },
    { x: cx + w, y: y + h * 0.42 },
    { x: cx, y: y + h },
    { x: cx - w, y: y + h * 0.42 },
  ];
  fillPolygon(tex, pts, ENGINE);
  fillPolygon(tex, inset(pts, 2.2), ENGINE_HI);
  drawPolygon(tex, pts, INK, 1);
}

function cockpit(tex, cx, y, w, h, glass) {
  const pts = [
    { x: cx, y },
    { x: cx + w, y: y + h * 0.48 },
    { x: cx, y: y + h },
    { x: cx - w, y: y + h * 0.48 },
  ];
  fillPolygon(tex, pts, glass);
  drawPolygon(tex, pts, INK, 1);
}

function engineNozzle(tex, cx, yTop, w, h, glow) {
  const pts = [
    { x: cx - w * 0.5, y: yTop },
    { x: cx + w * 0.5, y: yTop },
    { x: cx + w * 0.36, y: yTop + h },
    { x: cx - w * 0.36, y: yTop + h },
  ];
  fillPolygon(tex, pts, ENGINE);
  fillPolygon(tex, inset(pts, 2.2), ENGINE_HI);
  fillRect(tex, cx - w * 0.16, yTop + h - 5, Math.max(2, w * 0.32), 4, ENGINE_CORE);
  drawPolygon(tex, pts, INK, 1);
  glow.push({ x: cx, y: yTop + h - 1, r: w * 0.75 });
}

function placeEngines(tex, kind, cx, yBay, yStern, midW, glow, tips) {
  const h = Math.max(14, yStern - yBay + 8);
  if (kind === 0) {
    engineNozzle(tex, cx - 10, yBay, 13, h, glow);
    engineNozzle(tex, cx + 10, yBay, 13, h, glow);
  } else if (kind === 1) {
    engineNozzle(tex, cx, yBay - 1, 15, h + 2, glow);
    engineNozzle(tex, cx - 15, yBay + 4, 10, h - 2, glow);
    engineNozzle(tex, cx + 15, yBay + 4, 10, h - 2, glow);
  } else if (kind === 2) {
    engineNozzle(tex, cx, yBay, Math.max(26, midW * 1.2), h - 1, glow);
  } else if (kind === 3) {
    engineNozzle(tex, cx - 17, yBay + 1, 11, h - 1, glow);
    engineNozzle(tex, cx + 17, yBay + 1, 11, h - 1, glow);
    engineNozzle(tex, cx - 6, yBay + 4, 9, h - 3, glow);
    engineNozzle(tex, cx + 6, yBay + 4, 9, h - 3, glow);
  } else {
    engineNozzle(tex, cx, yBay + 2, 12, h - 2, glow);
    for (const tip of tips) {
      const x = (tip.xRoot + tip.x) * 0.5;
      engineNozzle(tex, x, tip.yTrail - 4, 10, 14, glow);
    }
  }
}

function gunBarrel(tex, x, y, len, fill) {
  fillDisc(tex, x, y, 3.1, fill);
  const w = 2.6;
  const pts = [
    { x: x - w, y },
    { x: x + w, y },
    { x: x + w * 0.55, y: y - len },
    { x: x - w * 0.55, y: y - len },
  ];
  fillPolygon(tex, pts, fill);
  drawPolygon(tex, pts, INK, 1);
}

function placeWeapons(tex, kind, cx, yNose, tips, fill) {
  const pts = [];
  if (kind === 4) return pts;
  if ((kind === 0 || kind === 3) && tips.length) {
    for (const tip of tips) {
      gunBarrel(tex, tip.x, tip.y + 3, 17, fill);
      pts.push({ x: tip.x - cx, y: tip.y });
    }
  }
  if (kind === 1 || kind === 3) {
    gunBarrel(tex, cx - 5, yNose + 10, 17, fill);
    gunBarrel(tex, cx + 5, yNose + 10, 17, fill);
    pts.push({ x: 0, y: yNose });
  }
  if (kind === 2) {
    gunBarrel(tex, cx - 18, yNose + 38, 15, fill);
    gunBarrel(tex, cx + 18, yNose + 38, 15, fill);
    pts.push({ x: -18, y: yNose + 38 }, { x: 18, y: yNose + 38 });
  }
  return pts;
}

function cleftForEngine(kind, midW) {
  if (kind === 2) return { w: Math.max(15, midW * 0.62), h: 20 };
  if (kind === 1) return { w: 24, h: 22 };
  if (kind === 3) return { w: 28, h: 20 };
  if (kind === 4) return { w: 14, h: 16 };
  return { w: 20, h: 20 };
}

export function generateShip(params) {
  const { seed, shipType, bodyDetail, wingDetail, colors, colorDetail } = params;
  const width = 256;
  const height = 256;
  const random = new SS_Random(seed);
  const tex = new SpriteTexture(width, height);
  const cx = width / 2;
  const cy = height / 2;

  const hullChoices = { 0: [0, 1, 2], 1: [2, 0, 3], 2: [3, 4, 2], 3: [4, 3, 2] };
  const wingChoices = { 0: [0, 1, 2], 1: [0, 4, 2], 2: [3, 5, 2], 3: [0, 4, 1] };
  const engineChoices = { 0: [0, 1], 1: [1, 3, 0], 2: [2, 0, 4], 3: [3, 2, 1] };
  const weaponChoices = { 0: [0, 1, 3], 1: [3, 2, 0], 2: [1, 4, 2], 3: [2, 0, 4] };

  const type = shipType | 0;
  const hullKind = pickFrom(random, hullChoices[type] || hullChoices[0]);
  const wingKind = pickFrom(random, wingChoices[type] || wingChoices[0]);
  const engineKind = pickFrom(random, engineChoices[type] || engineChoices[0]);
  const weaponKind = pickFrom(random, weaponChoices[type] || weaponChoices[0]);

  let midW = 16 + bodyDetail * 130 + (type === 3 ? 10 : 0) + (type === 2 ? 7 : 0);
  let span = 54 + wingDetail * 380 + (type === 0 ? 10 : 0);
  if (type === 2) span *= 0.62;
  if (type === 3) span += 8;
  let len = 170 + (type === 3 ? 14 : 0) - (type === 2 ? 8 : 0);
  len += (random.range(0, 1) - 0.5) * 10;

  const yNose = cy - len * 0.50;
  const yStern = cy + len * 0.46;
  const profile = HULL_PROFILES[hullKind];

  const hull = colors[0] || new Color(0.86, 0.88, 0.9, 1);
  const accent = colors[1] || new Color(0.86, 0.22, 0.22, 1);
  const shell = mixColor(new Color(0.90, 0.92, 0.94, 1), hull, 0.38);
  const wingFill = mixColor(shell, new Color(0.64, 0.68, 0.72, 1), 0.48);
  const panelMix = clamp(0.42 + colorDetail * 1.8, 0.35, 0.75);
  const panel = mixColor(shell, new Color(0.48, 0.52, 0.56, 1), panelMix);
  const wingPanel = mixColor(wingFill, new Color(0.38, 0.42, 0.46, 1), 0.55);
  const mark = mixColor(accent, new Color(0.86, 0.16, 0.16, 1), 0.2);
  const glass = mixColor(new Color(0.40, 0.50, 0.58, 1), hull, 0.22);

  const { pieces: wingGeom, tips } = wingPair(wingKind, cx, yNose, len, span, profile, midW);
  paintWings(tex, wingGeom, wingFill, wingPanel, INK);

  const bands = hullBands(profile, cx, yNose, yStern, midW);
  const cleft = cleftForEngine(engineKind, midW);
  notchAft(bands[bands.length - 1], cx, cleft.w, cleft.h);
  paintHull(tex, bands, shell, panel, INK);

  const chevT = 0.11;
  const chevW = Math.max(6, Math.min(14, widthAt(profile, chevT, midW) * 0.92));
  fillRect(tex, cx - 2, yNose + 6, 4, 10, mark);
  chevron(tex, cx, yNose + len * chevT, chevW, 13, mark);

  cockpit(tex, cx, yNose + len * 0.22, Math.max(5, widthAt(profile, 0.28, midW) * 0.44), 16, glass);

  ventralDiamond(
    tex,
    cx,
    yNose + len * 0.56,
    Math.max(6, widthAt(profile, 0.66, midW) * 0.40),
    24 + (engineKind === 2 ? 4 : 0)
  );

  const greebles = 2 + Math.round(colorDetail * 28);
  for (let i = 0; i < greebles; i++) {
    const t = 0.34 + i * 0.09;
    if (t > 0.78) break;
    const y = yNose + len * t;
    const hw = widthAt(profile, t, midW);
    const box = (x0) => {
      const pts = [
        { x: x0, y },
        { x: x0 + 6, y },
        { x: x0 + 6, y: y + 5 },
        { x: x0, y: y + 5 },
      ];
      fillPolygon(tex, pts, panel);
      drawPolygon(tex, pts, INK, 1);
    };
    box(cx - hw + 3);
    box(cx + hw - 9);
  }

  if (hullKind >= 3) {
    fillDisc(tex, cx - 7, yNose + len * 0.46, 2.4, panel);
    fillDisc(tex, cx + 7, yNose + len * 0.46, 2.4, panel);
  }

  const glow = [];
  const yBay = bands[bands.length - 1].notch.yNotch;
  placeEngines(tex, engineKind, cx, yBay, yStern, midW, glow, tips);
  const weaponPts = placeWeapons(tex, weaponKind, cx, yNose, tips, shell);

  outline(tex, INK);
  for (const g of glow) {
    stampGlow(tex, g.x, g.y + 2, g.r * 1.5, new Color(0.18, 0.82, 0.92, 0.26));
  }

  return {
    texture: tex,
    enginePoints: glow.map((g) => ({ x: g.x - cx, y: g.y - cy })),
    weaponPoints: weaponPts,
    width,
    height,
    modules: { hullKind, wingKind, engineKind, weaponKind },
  };
}

export function randomizeShip(state) {
  const next = { ...state };
  if (!next.customSeed) next.seed = unityRandomInt(0, 100000000);
  if (!next.customShipType) next.shipType = unityRandomInt(0, 4);
  if (!next.customScale) next.scale = unityRandomFloat(1, 2);
  if (!next.customColors) {
    next.colors = [
      new Color(0.82 + unityRandomFloat(0, 0.12), 0.84 + unityRandomFloat(0, 0.1), 0.86 + unityRandomFloat(0, 0.1), 1),
      new Color(unityRandomFloat(0.7, 1), unityRandomFloat(0.12, 0.45), unityRandomFloat(0.12, 0.4), 1),
    ];
  }
  if (!next.customColorDetail) next.colorDetail = unityRandomFloat(0.01, 0.1);
  if (!next.customBodyDetail) next.bodyDetail = unityRandomFloat(0.01, 0.1);
  if (!next.customWingDetail) next.wingDetail = unityRandomFloat(0.01, 0.1);
  return next;
}
