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

function seam(tex, a, b, color) {
  drawLine(tex, a.x, a.y, b.x, b.y, color, 1);
}

function paintWings(tex, pieces, fill, panel, seamCol) {
  for (const w of pieces) fillPolygon(tex, w.pts, fill);
  for (const w of pieces) {
    const [rootLead, tip, trailTip, rootTrail] = w.pts;
    fillPolygon(tex, [
      rootLead,
      tip,
      lerpPt(tip, trailTip, 0.08),
      lerpPt(rootLead, rootTrail, 0.12),
    ], mixColor(fill, new Color(0.22, 0.23, 0.25, 1), 0.18));
  }
  for (const w of pieces) {
    fillPolygon(tex, innerWing(w.pts), mixColor(fill, panel, 0.28));
  }
  for (const w of pieces) {
    if (w.cargo) {
      const [a, b, c, d] = w.pts;
      seam(tex, lerpPt(a, d, 0.33), lerpPt(b, c, 0.33), seamCol);
      seam(tex, lerpPt(a, d, 0.66), lerpPt(b, c, 0.66), seamCol);
    } else {
      const [rootLead, tip, trailTip, rootTrail] = w.pts;
      seam(tex, lerpPt(rootLead, rootTrail, 0.55), lerpPt(tip, trailTip, 0.45), seamCol);
      const flap = [
        lerpPt(rootTrail, trailTip, 0.22),
        lerpPt(rootTrail, trailTip, 0.78),
        lerpPt(lerpPt(rootTrail, trailTip, 0.78), lerpPt(rootLead, tip, 0.78), 0.16),
        lerpPt(lerpPt(rootTrail, trailTip, 0.22), lerpPt(rootLead, tip, 0.22), 0.16),
      ];
      fillPolygon(tex, flap, mixColor(fill, panel, 0.4));
    }
  }
}

function paintHull(tex, bands, shell, panel, seamCol) {
  bands.forEach((b, i) => {
    fillPolygon(tex, b.pts, i % 2 === 0 ? shell : mixColor(shell, panel, 0.18));
  });
  bands.forEach((b, i) => {
    if (b.notch) return;
    fillPolygon(tex, inset(b.pts, 3.4), i % 2 === 0 ? panel : mixColor(panel, shell, 0.25));
  });
  for (const b of bands) {
    const pts = b.pts;
    for (let i = 0; i < pts.length; i++) seam(tex, pts[i], pts[(i + 1) % pts.length], seamCol);
  }
}

function chevron(tex, cx, y, w, h, color) {
  fillPolygon(tex, [
    { x: cx, y },
    { x: cx - w, y: y + h },
    { x: cx - w * 0.32, y: y + h },
    { x: cx, y: y + h * 0.38 },
    { x: cx + w * 0.32, y: y + h },
    { x: cx + w, y: y + h },
  ], color);
}

function radiator(tex, cx, y, w, h, metal) {
  const pts = [
    { x: cx, y },
    { x: cx + w, y: y + h * 0.42 },
    { x: cx, y: y + h },
    { x: cx - w, y: y + h * 0.42 },
  ];
  fillPolygon(tex, pts, mixColor(metal, new Color(0.3, 0.32, 0.34, 1), 0.35));
  fillPolygon(tex, inset(pts, 2.4), mixColor(metal, new Color(0.26, 0.28, 0.3, 1), 0.4));
}

function cockpit(tex, cx, y, w, h, glass) {
  fillPolygon(tex, [
    { x: cx, y },
    { x: cx + w, y: y + h * 0.48 },
    { x: cx, y: y + h },
    { x: cx - w, y: y + h * 0.48 },
  ], glass);
}

function engineBell(tex, cx, cy, rx, ry, glow) {
  const ceramic = new Color(0.16, 0.15, 0.14, 1);
  const soot = new Color(0.07, 0.07, 0.08, 1);
  fillEllipse(tex, cx, cy, rx, ry, ceramic);
  fillEllipse(tex, cx, cy, rx * 0.78, ry * 0.78, soot);
  fillEllipse(tex, cx, cy, rx * 0.48, ry * 0.48, new Color(0.55, 0.28, 0.08, 1));
  fillEllipse(tex, cx, cy, rx * 0.28, ry * 0.28, new Color(1, 0.82, 0.45, 1));
  fillEllipse(tex, cx, cy, rx * 0.14, ry * 0.14, new Color(0.85, 0.95, 1, 1));
  glow.push({ x: cx, y: cy + ry * 0.15, r: Math.max(rx, ry) * 1.15 });
}

function placeEngines(tex, kind, cx, yBay, yStern, midW, glow, tips) {
  const y = yBay + Math.max(8, (yStern - yBay) * 0.55);
  if (kind === 0) {
    engineBell(tex, cx - 11, y, 8, 10, glow);
    engineBell(tex, cx + 11, y, 8, 10, glow);
  } else if (kind === 1) {
    engineBell(tex, cx, y, 9, 11, glow);
    engineBell(tex, cx - 16, y + 3, 6.5, 8, glow);
    engineBell(tex, cx + 16, y + 3, 6.5, 8, glow);
  } else if (kind === 2) {
    engineBell(tex, cx, y, Math.max(14, midW * 0.7), 9, glow);
  } else if (kind === 3) {
    engineBell(tex, cx - 17, y, 6.5, 8, glow);
    engineBell(tex, cx + 17, y, 6.5, 8, glow);
    engineBell(tex, cx - 6, y + 3, 5.5, 7, glow);
    engineBell(tex, cx + 6, y + 3, 5.5, 7, glow);
  } else {
    engineBell(tex, cx, y + 2, 7, 8, glow);
    for (const tip of tips) {
      engineBell(tex, (tip.xRoot + tip.x) * 0.5, tip.yTrail - 2, 6, 7, glow);
    }
  }
}

function gunBarrel(tex, x, y, len, fill) {
  fillDisc(tex, x, y, 3.2, mixColor(fill, new Color(0.18, 0.18, 0.2, 1), 0.35));
  fillRect(tex, x - 1.6, y - len, 3.2, len, mixColor(fill, new Color(0.2, 0.2, 0.22, 1), 0.25));
  fillRect(tex, x - 0.7, y - len - 1, 1.4, 4, new Color(0.08, 0.08, 0.09, 1));
}

function placeWeapons(tex, kind, cx, yNose, tips, fill) {
  const pts = [];
  if (kind === 4) return pts;
  if ((kind === 0 || kind === 3) && tips.length) {
    for (const tip of tips) {
      gunBarrel(tex, tip.x, tip.y + 3, 16, fill);
      pts.push({ x: tip.x - cx, y: tip.y });
    }
  }
  if (kind === 1 || kind === 3) {
    gunBarrel(tex, cx - 5, yNose + 10, 16, fill);
    gunBarrel(tex, cx + 5, yNose + 10, 16, fill);
    pts.push({ x: 0, y: yNose });
  }
  if (kind === 2) {
    gunBarrel(tex, cx - 18, yNose + 38, 14, fill);
    gunBarrel(tex, cx + 18, yNose + 38, 14, fill);
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
  const grain = new Perlin(0.09, 2.05, 0.45, 4, seed + 17, QualityMode.Low);
  const fine = new Perlin(0.22, 2.15, 0.4, 3, seed + 41, QualityMode.Low);
  const wear = new Perlin(0.028, 2.0, 0.52, 4, seed + 7, QualityMode.Low);
  const scratch = new Perlin(0.55, 2.2, 0.35, 2, seed + 63, QualityMode.Low);
  const key = makeLight(180, 0.58);
  const fillL = makeLight(28, 0.42);
  const wearAmt = clamp(0.12 + colorDetail * 1.4, 0.12, 0.4);
  const len = Math.max(8, yStern - yNose);
  const out = new Float32Array(tex.data);
  const w = tex.width;
  const h = tex.height;
  const dirtCol = new Color(0.1, 0.09, 0.08, 1);
  const bareMetal = new Color(0.62, 0.64, 0.66, 1);
  const heatBlue = new Color(0.22, 0.32, 0.48, 1);
  const heatBrown = new Color(0.42, 0.22, 0.1, 1);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (x + y * w) * 4;
      if (tex.data[i + 3] < 0.05) continue;
      let r = tex.data[i];
      let g = tex.data[i + 1];
      let b = tex.data[i + 2];
      const emissive = g > 0.42 && b > 0.35 && r > 0.35 && (r + g + b) > 1.4;

      const dx = x - cx;
      const t = clamp01((y - yNose) / len);
      const hullW = Math.max(3, widthAt(profile, t, midW));
      const onHull = Math.abs(dx) <= hullW + 0.85;

      let nx;
      let ny;
      let nz;
      let height;
      if (onHull) {
        const u = clamp(dx / hullW, -1, 1);
        const z = Math.sqrt(Math.max(0.03, 1 - u * u));
        height = 0.42 + 0.58 * z;
        nx = u * 1.05;
        ny = 0.08;
        nz = 0.28 + 0.72 * z;
      } else {
        const wingT = clamp01((Math.abs(dx) - hullW) / Math.max(12, span));
        height = 0.16 + 0.16 * (1 - wingT);
        nx = Math.sign(dx || 1) * (0.12 + 0.55 * wingT);
        ny = 0.18;
        nz = 0.96 - 0.42 * wingT;
      }

      const g1 = n01(grain, x, y, 0);
      const g2 = n01(fine, x, y, 0);
      const gW = n01(wear, x, y, 0);
      const gS = n01(scratch, x * 0.15, y, 0);
      const seam = r < 0.2 && g < 0.2 && b < 0.2 && !emissive;
      if (seam) height -= 0.08;

      const nlen = Math.hypot(nx, ny, nz) || 1;
      const n0 = { nx: nx / nlen, ny: ny / nlen, nz: nz / nlen, r2: 0 };
      const bump = (g1 - 0.5) * 0.12 + (g2 - 0.5) * 0.05 + (seam ? -0.15 : 0);
      const n = perturbNormal(n0, bump, bump * 0.35 + (gS - 0.5) * 0.08, 0.55);

      let albedo = new Color(r, g, b, 1);
      albedo = mixColor(albedo, albedo.mul(0.97 + g1 * 0.05), 0.08);
      albedo = mixColor(albedo, dirtCol, (1 - gW) * wearAmt * 0.1);
      if (onHull) {
        const aniso = Math.abs(gS - 0.5) * 0.1;
        albedo = mixColor(albedo, bareMetal, aniso * wearAmt);
      }
      const edge = nearClear(tex, x, y, 4);
      albedo = mixColor(albedo, bareMetal, edge * 0.28);
      let ao = edge * 0.48;
      if (!onHull && Math.abs(dx) < hullW + 8) {
        ao = Math.max(ao, (1 - clamp01((Math.abs(dx) - hullW) / 8)) * 0.32);
      }
      albedo = mixColor(albedo, dirtCol, ao * 0.28);

      if (glow && glow.length) {
        let dMin = 1e9;
        for (const gl of glow) {
          const d = (x - gl.x) * (x - gl.x) + (y - gl.y) * (y - gl.y);
          if (d < dMin) dMin = d;
        }
        const heat = Math.exp(-dMin / 220);
        albedo = mixColor(albedo, heatBrown, heat * 0.38);
        albedo = mixColor(albedo, heatBlue, heat * heat * 0.22);
      }

      const metallic = emissive ? 0.05 : (onHull ? 0.58 : 0.42);
      const roughness = clamp(0.34 + wearAmt * 0.4 + (1 - gW) * 0.16 - (onHull ? 0.04 : 0) + (seam ? 0.12 : 0), 0.18, 0.82);

      const keyAmt = lambert(n, key, 0.05, 0.12);
      const fillAmt = lambert(n, fillL, 0, 0.25) * 0.2;
      let lightAmt = (keyAmt * 1.12 + fillAmt) * (1 - ao * 0.55);
      if (onHull) {
        const ridge = Math.pow(Math.max(0, 1 - Math.abs(dx) / hullW), 1.7);
        lightAmt += ridge * 0.16 * (1 - roughness);
        lightAmt *= 0.72 + 0.28 * Math.sqrt(Math.max(0.05, 1 - (dx / hullW) * (dx / hullW)));
      }

      const specPow = 16 + (1 - roughness) * 48;
      const specK = specular(n, key, specPow, (0.12 + metallic * 0.32) * (1.05 - roughness));
      const fres = 0.04 + 0.92 * Math.pow(1 - clamp01(n.nz), 5);
      const env = clamp01(0.12 + n.nx * 0.28 + n.nz * 0.45);
      const rim = rimLight(n, key, 2.8) * (0.08 + fres * 0.2);

      const diffuse = albedo.mul((1 - metallic * 0.32) * lightAmt);
      const specCol = mixColor(new Color(1, 0.96, 0.9, 1), albedo, metallic * 0.45);
      let lit = new Color(
        clamp01(diffuse.r + specCol.r * specK * (0.35 + fres) + env * fres * 0.07 + rim * 0.55),
        clamp01(diffuse.g + specCol.g * specK * (0.35 + fres) + env * fres * 0.08 + rim * 0.62),
        clamp01(diffuse.b + specCol.b * specK * (0.35 + fres) + env * fres * 0.12 + rim * 0.85),
        1
      );

      if (emissive) {
        const core = 0.55 + 0.45 * g2;
        const hot = heatColor(clamp01((r + g + b) / 3));
        lit = mixColor(lit, hot, 0.35);
        lit = new Color(
          clamp01(lit.r * 0.35 + r * core + specK * 0.2),
          clamp01(lit.g * 0.35 + g * core + specK * 0.15),
          clamp01(lit.b * 0.35 + b * core + specK * 0.25),
          1
        );
      }

      const sparkle = hash2(x, y, seed);
      if (!emissive && sparkle > 0.992 && metallic > 0.5 && lightAmt > 0.4) {
        lit = mixColor(lit, Color.white, 0.35);
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

  const hull = colors[0] || new Color(0.55, 0.56, 0.58, 1);
  const accent = colors[1] || new Color(0.62, 0.12, 0.1, 1);
  const shell = mixColor(new Color(0.4, 0.42, 0.44, 1), hull, 0.42);
  const wingFill = mixColor(shell, new Color(0.32, 0.34, 0.36, 1), 0.35);
  const panelMix = clamp(0.28 + colorDetail * 1.6, 0.25, 0.65);
  const panel = mixColor(shell, new Color(0.36, 0.38, 0.4, 1), panelMix * 0.7);
  const wingPanel = mixColor(wingFill, new Color(0.28, 0.3, 0.32, 1), 0.32);
  const mark = mixColor(accent, new Color(0.45, 0.08, 0.07, 1), 0.35);
  const glass = mixColor(new Color(0.1, 0.14, 0.18, 1), hull, 0.18);
  const seamCol = mixColor(shell, new Color(0.22, 0.23, 0.24, 1), 0.55);

  const { pieces: wingGeom, tips } = wingPair(wingKind, cx, yNose, len, span, profile, midW);
  paintWings(tex, wingGeom, wingFill, wingPanel, seamCol);

  const bands = hullBands(profile, cx, yNose, yStern, midW);
  const cleft = cleftForEngine(engineKind, midW);
  notchAft(bands[bands.length - 1], cx, cleft.w, cleft.h);
  paintHull(tex, bands, shell, panel, seamCol);

  const chevT = 0.11;
  const chevW = Math.max(6, Math.min(14, widthAt(profile, chevT, midW) * 0.92));
  fillRect(tex, cx - 1.5, yNose + 6, 3, 11, mark);
  chevron(tex, cx, yNose + len * chevT, chevW, 13, mark);
  cockpit(tex, cx, yNose + len * 0.22, Math.max(5, widthAt(profile, 0.28, midW) * 0.44), 16, glass);
  radiator(tex, cx, yNose + len * 0.56, Math.max(6, widthAt(profile, 0.66, midW) * 0.4), 22, shell);

  const greebles = 3 + Math.round(colorDetail * 32);
  for (let i = 0; i < greebles; i++) {
    const tg = 0.32 + i * 0.08;
    if (tg > 0.78) break;
    const y = yNose + len * tg;
    const hw = widthAt(profile, tg, midW);
    const boxCol = mixColor(panel, new Color(0.22, 0.23, 0.24, 1), 0.35);
    fillRect(tex, cx - hw + 3, y, 6, 5, boxCol);
    fillRect(tex, cx + hw - 9, y, 6, 5, boxCol);
  }

  if (hullKind >= 3) {
    fillDisc(tex, cx - 7, yNose + len * 0.46, 2.2, mixColor(panel, glass, 0.4));
    fillDisc(tex, cx + 7, yNose + len * 0.46, 2.2, mixColor(panel, glass, 0.4));
  }

  const glow = [];
  const yBay = bands[bands.length - 1].notch.yNotch;
  placeEngines(tex, engineKind, cx, yBay, yStern, midW, glow, tips);
  const weaponPts = placeWeapons(tex, weaponKind, cx, yNose, tips, shell);

  shadeRealistic(tex, {
    seed, cx, yNose, yStern, midW, span, profile,
    colorDetail: colorDetail || 0.08,
    glow,
  });

  for (const gl of glow) {
    stampGlow(tex, gl.x, gl.y, gl.r * 2.2, new Color(1, 0.55, 0.18, 0.22));
    stampGlow(tex, gl.x, gl.y, gl.r * 1.15, new Color(0.55, 0.82, 1, 0.18));
  }

  return {
    texture: tex,
    enginePoints: glow.map((gl) => ({ x: gl.x - cx, y: gl.y - cy })),
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
      new Color(0.42 + unityRandomFloat(0, 0.22), 0.44 + unityRandomFloat(0, 0.2), 0.46 + unityRandomFloat(0, 0.18), 1),
      new Color(unityRandomFloat(0.45, 0.85), unityRandomFloat(0.08, 0.28), unityRandomFloat(0.06, 0.22), 1),
    ];
  }
  if (!next.customColorDetail) next.colorDetail = unityRandomFloat(0.04, 0.16);
  if (!next.customBodyDetail) next.bodyDetail = unityRandomFloat(0.01, 0.1);
  if (!next.customWingDetail) next.wingDetail = unityRandomFloat(0.01, 0.1);
  return next;
}
