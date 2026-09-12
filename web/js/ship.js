import { Perlin, QualityMode } from "./libnoise.js";
import {
  Color, SpriteTexture, SS_Random, clamp, clamp01, mixColor, outline,
  unityRandomInt, unityRandomFloat,
} from "./core.js";
import { fillPolygon, drawLine, fillRect, fillDisc, fillEllipse } from "./raster.js";
import { stampGlow } from "./lighting.js";

export const ShipType = { Fighter: 0, Fighter2: 1, Hauler: 2, Saucer: 3 };

const HULL = Color.magenta;

function metalize(base) {
  const grey = new Color(0.55, 0.58, 0.62, 1);
  return mixColor(grey, base, 0.42);
}

function filled(tex, x, y) {
  if (!tex.inBounds(x, y)) return false;
  return tex.data[tex.index(x, y) + 3] > 0.05;
}

function addPoly(tex, pts) {
  fillPolygon(tex, pts, HULL);
}

function hullBand(x0, x1, cy, halfFn, steps = 28) {
  const top = [];
  const bot = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const hw = Math.max(2, halfFn(t));
    top.push({ x, y: cy - hw });
    bot.push({ x, y: cy + hw });
  }
  return [...top, ...bot.reverse()];
}

function paintHull(tex, colors, seed, colorDetail) {
  const w = tex.width;
  const h = tex.height;
  const hull = metalize(colors[0] || Color.grey);
  const accent = colors[1] || new Color(0.95, 0.45, 0.12, 1);
  const panel = new Perlin(Math.max(0.015, colorDetail * 0.35), 2, 0.45, 3, seed, QualityMode.Low);
  const seam = Math.max(7, Math.round(10 - colorDetail * 40));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!filled(tex, x, y)) continue;
      let y0 = y;
      let y1 = y;
      while (y0 > 0 && filled(tex, x, y0 - 1)) y0--;
      while (y1 < h - 1 && filled(tex, x, y1 + 1)) y1++;
      const mid = (y0 + y1) * 0.5;
      const hw = Math.max(1, (y1 - y0) * 0.5);
      const oy = (y - mid) / hw;
      const ridge = Math.pow(1 - Math.min(1, Math.abs(oy)), 0.65);
      const topBias = clamp(mid - y, -hw, hw) / hw;
      const grain = clamp01((panel.getValue(x * 0.08, y * 0.08, 0) + 1) * 0.5);
      let shade = 0.38 + 0.5 * ridge + 0.12 * topBias + (grain - 0.5) * 0.08;

      const stripe = Math.abs(oy) > 0.42 && Math.abs(oy) < 0.68;
      let col = stripe ? mixColor(hull, accent, 0.78) : hull;
      if (Math.abs(oy) < 0.18) col = mixColor(col, Color.white, 0.14 * ridge);
      if (x % seam === 0) shade *= 0.72;
      if (Math.abs(oy) > 0.88) shade *= 0.78;

      col = new Color(
        clamp01(col.r * shade),
        clamp01(col.g * shade),
        clamp01(col.b * shade * 1.02),
        1
      );
      tex.setPixel(x, y, col);
    }
  }
}

function seamLine(tex, x0, y0, x1, y1) {
  drawLine(tex, x0, y0, x1, y1, new Color(0.1, 0.11, 0.13, 1), 1);
}

function paintWindow(tex, x, y) {
  const glass = new Color(0.55, 0.85, 1, 1);
  const hi = new Color(0.92, 0.97, 1, 1);
  fillRect(tex, x, y, 3, 2, glass);
  tex.setPixel(x, y, hi);
  stampGlow(tex, x + 1, y, 2.2, new Color(0.35, 0.7, 1, 0.45));
}

function paintTurret(tex, x, y, r, towardX = 1) {
  const rim = new Color(0.18, 0.2, 0.22, 1);
  const face = new Color(0.42, 0.45, 0.48, 1);
  fillDisc(tex, x, y, r + 0.6, rim);
  fillDisc(tex, x, y, r - 0.4, face);
  fillDisc(tex, x, y, Math.max(1.2, r * 0.35), new Color(0.12, 0.12, 0.14, 1));
  const bx = x + towardX * (r + 1);
  fillRect(tex, Math.min(x, bx), y - 1, Math.abs(bx - x) + 4, 3, rim);
}

function paintEngine(tex, x, y, r, engines) {
  fillDisc(tex, x, y, r + 1.2, new Color(0.16, 0.17, 0.2, 1));
  fillDisc(tex, x, y, r - 0.2, new Color(0.04, 0.04, 0.05, 1));
  fillDisc(tex, x, y, Math.max(1.2, r * 0.45), new Color(1, 0.55, 0.12, 1));
  fillDisc(tex, x, y, Math.max(0.8, r * 0.18), new Color(1, 0.92, 0.7, 1));
  engines.push({ x, y, r });
}

function glowEngines(tex, engines) {
  for (const e of engines) {
    stampGlow(tex, e.x - e.r * 0.6, e.y, e.r * 2.4, new Color(1, 0.4, 0.08, 0.4));
    stampGlow(tex, e.x, e.y, e.r * 1.1, new Color(1, 0.75, 0.3, 0.55));
  }
}

function buildInterceptor(tex, cx, cy, random, bodyDetail, wingDetail) {
  const len = 168;
  const x0 = cx - len * 0.5 + 8;
  const x1 = cx + len * 0.5 - 8;
  const midW = 11 + bodyDetail * 28;
  const wing = 52 + wingDetail * 140;
  const sweep = 22 + random.range(0, 12);

  addPoly(tex, hullBand(x0, x1, cy, (t) => {
    if (t < 0.14) return midW * (1.05 + t);
    if (t > 0.78) return Math.max(4.5, midW * (1.1 - (t - 0.78) * 2.2));
    return midW * (1.05 + Math.sin(t * Math.PI) * 0.12);
  }));

  const wr = x0 + len * 0.22;
  const wf = x0 + len * 0.58;
  const wt = x0 + len * 0.42 + sweep;
  addPoly(tex, [
    { x: wr, y: cy - midW + 2 },
    { x: wt - 10, y: cy - wing * 0.55 },
    { x: wt, y: cy - wing },
    { x: wf, y: cy - wing * 0.22 },
    { x: wf - 12, y: cy - midW },
  ]);
  addPoly(tex, [
    { x: wr, y: cy + midW - 2 },
    { x: wt - 10, y: cy + wing * 0.55 },
    { x: wt, y: cy + wing },
    { x: wf, y: cy + wing * 0.22 },
    { x: wf - 12, y: cy + midW },
  ]);

  addPoly(tex, [
    { x: x1 - 10, y: cy - 7 },
    { x: x1 + 18, y: cy - 5 },
    { x: x1 + 18, y: cy - 2 },
    { x: x1 - 4, y: cy - 2 },
  ]);
  addPoly(tex, [
    { x: x1 - 10, y: cy + 7 },
    { x: x1 + 18, y: cy + 5 },
    { x: x1 + 18, y: cy + 2 },
    { x: x1 - 4, y: cy + 2 },
  ]);
  fillRect(tex, x1 - 4, cy - 2, 28, 5, HULL);
  fillEllipse(tex, x0 + 14, cy - midW - 2, 12, 7, HULL);
  fillEllipse(tex, x0 + 14, cy + midW + 2, 12, 7, HULL);

  return {
    engines: [
      { x: x0 + 8, y: cy - midW - 2, r: 6.2 },
      { x: x0 + 8, y: cy + midW + 2, r: 6.2 },
    ],
    turrets: [{ x: x1 - 36, y: cy, r: 4.6 }],
    windows: [
      { x: x1 - 24, y: cy - 1 },
      { x: x1 - 30, y: cy - 1 },
    ],
    seams: [
      [wr + 8, cy - midW, wr + 8, cy + midW],
      [wf - 14, cy - midW, wf - 14, cy + midW],
      [wt - 4, cy - wing + 6, wr + 10, cy - midW],
      [wt - 4, cy + wing - 6, wr + 10, cy + midW],
    ],
  };
}

function buildGunship(tex, cx, cy, random, bodyDetail, wingDetail) {
  const len = 176;
  const x0 = cx - len * 0.48;
  const x1 = cx + len * 0.48;
  const midW = 16 + bodyDetail * 36;
  const pod = 14 + wingDetail * 90;

  addPoly(tex, hullBand(x0, x1, cy, (t) => {
    if (t < 0.12) return midW * 0.95;
    if (t > 0.8) return midW * (0.85 + (1 - t));
    return midW * 1.05;
  }));

  fillEllipse(tex, x0 + 78, cy - midW - pod * 0.35, 36, 11 + pod * 0.12, HULL);
  fillEllipse(tex, x0 + 78, cy + midW + pod * 0.35, 36, 11 + pod * 0.12, HULL);
  fillRect(tex, x0 + 46, cy - midW - pod * 0.55, 28, 8, HULL);
  fillRect(tex, x0 + 46, cy + midW + pod * 0.55 - 8, 28, 8, HULL);
  fillRect(tex, x1 - 6, cy - 8, 20, 16, HULL);
  fillEllipse(tex, x0 + 16, cy, 14, midW + 2, HULL);

  return {
    engines: [
      { x: x0 + 4, y: cy, r: 7 },
      { x: x0 + 10, y: cy - midW - 1, r: 5.4 },
      { x: x0 + 10, y: cy + midW + 1, r: 5.4 },
    ],
    turrets: [
      { x: cx - 4, y: cy, r: 6 },
      { x: x0 + 96, y: cy - midW - pod * 0.35, r: 4 },
      { x: x0 + 96, y: cy + midW + pod * 0.35, r: 4 },
    ],
    windows: [
      { x: x1 - 20, y: cy - 1 },
      { x: x1 - 26, y: cy - 1 },
      { x: x1 - 32, y: cy - 1 },
    ],
    seams: [
      [x0 + 40, cy - midW, x0 + 40, cy + midW],
      [cx + 6, cy - midW, cx + 6, cy + midW],
      [x1 - 28, cy - midW + 2, x1 - 28, cy + midW - 2],
    ],
  };
}

function buildHauler(tex, cx, cy, random, bodyDetail, wingDetail) {
  const len = 188;
  const x0 = cx - len * 0.5 + 10;
  const x1 = cx + len * 0.5 - 10;
  const hold = 26 + bodyDetail * 55;
  const tank = 10 + wingDetail * 70;

  addPoly(tex, hullBand(x0 + 28, x1 - 22, cy, () => hold));
  addPoly(tex, hullBand(x1 - 30, x1 + 12, cy, (t) => Math.max(6, 12 * (1 - t * 0.45))));
  addPoly(tex, hullBand(x0, x0 + 36, cy, (t) => 9 + t * 8));
  fillEllipse(tex, x0 + 84, cy - hold - tank * 0.2, 34, 9 + tank * 0.06, HULL);
  fillEllipse(tex, x0 + 84, cy + hold + tank * 0.2, 34, 9 + tank * 0.06, HULL);
  fillRect(tex, x0 + 4, cy - hold - 4, 22, 10, HULL);
  fillRect(tex, x0 + 4, cy + hold - 6, 22, 10, HULL);

  return {
    engines: [
      { x: x0 + 4, y: cy - hold, r: 6.5 },
      { x: x0 + 4, y: cy + hold, r: 6.5 },
    ],
    turrets: [{ x: x1 - 6, y: cy, r: 4.2 }],
    windows: [
      { x: x1 - 18, y: cy - 1 },
      { x: x1 - 24, y: cy - 1 },
      { x: cx - 16, y: cy - 1 },
      { x: cx - 8, y: cy - 1 },
      { x: cx, y: cy - 1 },
      { x: cx + 8, y: cy - 1 },
      { x: cx + 16, y: cy - 1 },
    ],
    seams: [
      [x0 + 40, cy - hold, x0 + 40, cy + hold],
      [cx + 10, cy - hold, cx + 10, cy + hold],
      [x1 - 26, cy - 11, x1 - 26, cy + 11],
    ],
  };
}

function buildCarrier(tex, cx, cy, random, bodyDetail, wingDetail) {
  const rx = 108;
  const ry = 44 + wingDetail * 120 + bodyDetail * 40;
  fillEllipse(tex, cx - 8, cy, rx, ry, HULL);
  addPoly(tex, hullBand(cx + rx * 0.2, cx + rx + 22, cy, (t) => Math.max(7, ry * 0.42 * (1 - t * 0.45))));
  addPoly(tex, [
    { x: cx - rx * 0.15, y: cy - ry * 0.38 },
    { x: cx + rx * 0.4, y: cy - ry * 0.2 },
    { x: cx + rx * 0.4, y: cy + ry * 0.2 },
    { x: cx - rx * 0.15, y: cy + ry * 0.38 },
  ]);
  fillRect(tex, cx - rx + 10, cy - 8, rx * 0.95, 16, HULL);

  const nEng = 5;
  const engines = [];
  for (let i = 0; i < nEng; i++) {
    const t = i / (nEng - 1) - 0.5;
    engines.push({ x: cx - rx + 10, y: cy + t * ry * 1.25, r: 5.6 });
  }

  return {
    engines,
    turrets: [
      { x: cx - 8, y: cy - ry * 0.58, r: 5 },
      { x: cx - 8, y: cy + ry * 0.58, r: 5 },
      { x: cx + rx * 0.38, y: cy, r: 5.5 },
    ],
    windows: Array.from({ length: 10 }, (_, i) => ({ x: cx - 36 + i * 8, y: cy - 1 })),
    seams: [
      [cx - rx * 0.35, cy - ry * 0.72, cx + rx * 0.25, cy - ry * 0.32],
      [cx - rx * 0.35, cy + ry * 0.72, cx + rx * 0.25, cy + ry * 0.32],
      [cx - 18, cy - 9, cx + rx * 0.45, cy - 9],
      [cx - 18, cy + 9, cx + rx * 0.45, cy + 9],
    ],
  };
}

export function generateShip(params) {
  const { seed, shipType, bodyDetail, wingDetail, colors, colorDetail } = params;
  const width = 256;
  const height = 256;
  const random = new SS_Random(seed);
  const tex = new SpriteTexture(width, height);
  const cx = width / 2;
  const cy = height / 2;

  let layout;
  if (shipType === ShipType.Fighter) layout = buildInterceptor(tex, cx, cy, random, bodyDetail, wingDetail);
  else if (shipType === ShipType.Fighter2) layout = buildGunship(tex, cx, cy, random, bodyDetail, wingDetail);
  else if (shipType === ShipType.Hauler) layout = buildHauler(tex, cx, cy, random, bodyDetail, wingDetail);
  else layout = buildCarrier(tex, cx, cy, random, bodyDetail, wingDetail);

  paintHull(tex, colors || [Color.grey, Color.red], seed, colorDetail || 0.05);

  for (const s of layout.seams || []) seamLine(tex, s[0], s[1], s[2], s[3]);
  for (const w of layout.windows || []) paintWindow(tex, w.x | 0, w.y | 0);
  for (const t of layout.turrets || []) paintTurret(tex, t.x | 0, t.y | 0, t.r);
  const engines = [];
  for (const e of layout.engines || []) paintEngine(tex, e.x | 0, e.y | 0, e.r, engines);

  outline(tex, Color.black);
  glowEngines(tex, engines);

  const enginePoints = engines.map((e) => ({ x: e.x - cx, y: e.y - cy }));
  const weaponPoints = (layout.turrets || []).map((t) => ({ x: t.x - cx, y: t.y - cy }));
  return { texture: tex, enginePoints, weaponPoints, width, height };
}

export function randomizeShip(state) {
  const next = { ...state };
  if (!next.customSeed) next.seed = unityRandomInt(0, 100000000);
  if (!next.customShipType) next.shipType = unityRandomInt(0, 4);
  if (!next.customScale) next.scale = unityRandomFloat(1, 2);
  if (!next.customColors) {
    next.colors = [
      mixColor(Color.grey, new Color(unityRandomFloat(0.4, 0.85), unityRandomFloat(0.4, 0.85), unityRandomFloat(0.45, 0.9), 1), 0.35),
      new Color(unityRandomFloat(0.35, 1), unityRandomFloat(0.15, 0.7), unityRandomFloat(0.05, 0.45), 1),
    ];
  }
  if (!next.customColorDetail) next.colorDetail = unityRandomFloat(0.01, 0.1);
  if (!next.customBodyDetail) next.bodyDetail = unityRandomFloat(0.01, 0.1);
  if (!next.customWingDetail) next.wingDetail = unityRandomFloat(0.01, 0.1);
  return next;
}
