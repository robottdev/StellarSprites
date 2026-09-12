import { Perlin, RidgedMultifractal, Voronoi, QualityMode } from "./libnoise.js";
import {
  Color, SpriteTexture, SS_Random, clamp, clamp01, hash2, mergeColors, outline,
  unityRandomInt, unityRandomFloat,
} from "./core.js";
import { fillPolygon, drawPolygon, fillRect } from "./raster.js";
import { stampGlow } from "./lighting.js";

export const ShipType = { Fighter: 0, Fighter2: 1, Hauler: 2, Saucer: 3 };

function shadeEdge(spriteTexture) {
  const w = spriteTexture.width;
  const h = spriteTexture.height;
  const tmp = new Float32Array(spriteTexture.data);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = spriteTexture.getPixel(x, y);
      if (!c.equals(Color.clear) && !c.equals(Color.black)) {
        if (
          spriteTexture.isColor(x - 1, y - 1, Color.black) || spriteTexture.isColor(x, y - 1, Color.black) ||
          spriteTexture.isColor(x + 1, y - 1, Color.black) || spriteTexture.isColor(x - 1, y, Color.black) ||
          spriteTexture.isColor(x + 1, y, Color.black) || spriteTexture.isColor(x - 1, y + 1, Color.black) ||
          spriteTexture.isColor(x, y + 1, Color.black) || spriteTexture.isColor(x + 1, y + 1, Color.black)
        ) {
          c.r *= 0.5;
          c.g *= 0.5;
          c.b *= 0.5;
          const i = (x + y * w) * 4;
          tmp[i] = c.r;
          tmp[i + 1] = c.g;
          tmp[i + 2] = c.b;
          tmp[i + 3] = c.a;
        }
      }
    }
  }
  for (let x = 0; x < w; x++) {
    if (!spriteTexture.isClear(x, 0)) spriteTexture.setPixel(x, 0, Color.black);
    if (!spriteTexture.isClear(x, h - 1)) spriteTexture.setPixel(x, h - 1, Color.black);
  }
  spriteTexture.data.set(tmp);
}

function squashTowardCenter(tex) {
  const centerY = (tex.height / 2) | 0;
  let cntr = 1;
  for (let y = centerY; y < tex.height; y++) {
    for (let x = 0; x < tex.width; x++) {
      const newY = y - cntr;
      tex.setPixel(x, newY, tex.getPixel(x, y));
    }
    cntr += 2;
  }
}

function texturizeShip(seed, spriteTexture, targetColor, tint, highlights, gradientColors, colorDetail, width, height) {
  const perlin = new Perlin(colorDetail, 2, 0.5, 8, seed, QualityMode.Low);
  const highlightVoronoi = new Voronoi(colorDetail * 0.8, 2, seed + 1, false);
  const cx = width / 2;
  const cy = height / 2;

  for (let y = (spriteTexture.height / 2) | 0; y < spriteTexture.height; y++) {
    for (let x = 0; x < spriteTexture.width; x++) {
      if (!spriteTexture.isColor(x, y, targetColor)) continue;
      let pixelNoise = clamp((perlin.getValue(x, y, 0) + 3) * 0.25, 0.45, 1);
      let hullShade = tint.mul(pixelNoise);

      if (highlights) {
        const highlightNoise = clamp((highlightVoronoi.getValue(x, y, 0) + 1) * 0.5, 0, 1);
        const base = highlightNoise <= 0.62 ? gradientColors[0] : gradientColors[1];
        hullShade = base.mul(pixelNoise);
        if ((x & 4) === 0 || (y & 4) === 0) hullShade = hullShade.mul(0.82);
        if ((x & 8) === 0 && (y & 8) === 0) hullShade = hullShade.mul(0.72);
      }

      const cyl = 1 - Math.abs(y - cy) / (height * 0.55);
      hullShade = hullShade.mul(0.68 + 0.42 * clamp(cyl, 0.22, 1));

      let east = 0, west = 0, north = 0, south = 0;
      for (let d = 1; d <= 4; d++) {
        if (spriteTexture.isColor(Math.min(width - 1, x + d), y, Color.black)) east = Math.max(east, (5 - d) / 4);
        if (spriteTexture.isColor(Math.max(0, x - d), y, Color.black)) west = Math.max(west, (5 - d) / 4);
        if (spriteTexture.isColor(x, Math.max(0, y - d), Color.black)) north = Math.max(north, (5 - d) / 4);
        if (spriteTexture.isColor(x, Math.min(height - 1, y + d), Color.black)) south = Math.max(south, (5 - d) / 4);
      }
      hullShade = hullShade.mul(1 + north * 0.28 + west * 0.12);
      hullShade = hullShade.mul(1 - south * 0.32 - east * 0.16);
      if (x > cx) hullShade = hullShade.mul(1.08);

      hullShade.a = 1;
      spriteTexture.setPixel(x, y, hullShade.clamp01());
    }
  }

  for (let y = 0; y < (spriteTexture.height / 2); y++) {
    for (let x = 0; x < spriteTexture.width; x++) {
      if (spriteTexture.isColor(x, y, targetColor)) {
        spriteTexture.setPixel(x, y, spriteTexture.getPixel(x, spriteTexture.height - 1 - y));
      }
    }
  }
}

function decorateShip(tex, enginePoints, weaponPoints = []) {
  const w = tex.width;
  const h = tex.height;
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (tex.isClear(x, y) || tex.isColor(x, y, Color.black)) continue;
      const c = tex.getPixel(x, y);
      const isCockpit = c.b > 0.45 && c.g > 0.45 && c.r < 0.55;
      if (isCockpit) {
        const sheen = clamp01(1 - Math.abs((x - cx) / 7 - 0.15));
        const glass = new Color(0.25 + sheen * 0.55, 0.55 + sheen * 0.35, 0.72 + sheen * 0.28, 1);
        tex.setPixel(x, y, new Color(
          clamp01(c.r * 0.35 + glass.r * 0.65),
          clamp01(c.g * 0.35 + glass.g * 0.65),
          clamp01(c.b * 0.25 + glass.b * 0.75),
          1
        ));
      }
    }
  }
  for (const p of enginePoints) {
    const x = (cx + p.x) | 0;
    const y = (cy + p.y) | 0;
    stampGlow(tex, x - 3, y, 5.5, new Color(1, 0.38, 0.08, 0.42));
    stampGlow(tex, x, y, 3.4, new Color(1, 0.5, 0.12, 0.75));
    stampGlow(tex, x + 1, y, 1.5, new Color(1, 0.88, 0.45, 0.9));
  }
  for (const p of weaponPoints) {
    const x = (cx + p.x) | 0;
    const y = (cy + p.y) | 0;
    stampGlow(tex, x, y, 1.6, new Color(1, 0.85, 0.35, 0.55));
  }
}

function drawFilledOutlined(tex, points) {
  fillPolygon(tex, points, Color.magenta);
  drawPolygon(tex, points, Color.black, 1);
}

function createTerrestrialBody(seed, length, smoothCount, bodyDetail, width, height) {
  const bodyNoise = new Perlin(bodyDetail, 2, 0.5, 8, seed, QualityMode.Medium);
  const step = (width / 16) | 0;
  const center = { x: (width / 2) | 0, y: (height / 2) | 0 };
  const tex = new SpriteTexture(width, height);
  const points = [];
  const tmpPoints = [];
  let x = center.x - ((length / 2) | 0);
  let finished = false;
  while (!finished) {
    let yN = (bodyNoise.getValue(x, 0, 0) + 3) * 0.25;
    yN = clamp(yN, 0.05, 1);
    const y = (yN * (height / 4)) | 0;
    points.push({ x, y: center.y + y });
    tmpPoints.push({ x, y: (center.y - y) - 1 });
    x += step;
    if (x === center.x + ((length / 2) | 0)) x = width - 1;
    else if (x > center.x + ((length / 2) | 0)) finished = true;
  }
  if (points.length) {
    points[0] = { x: points[0].x, y: center.y + 4 };
    tmpPoints[0] = { x: tmpPoints[0].x, y: center.y - 4 };
    points[points.length - 1] = { x: points[points.length - 1].x, y: center.y + 2 };
    tmpPoints[tmpPoints.length - 1] = { x: tmpPoints[tmpPoints.length - 1].x, y: center.y - 2 };
  }
  for (let j = 0; j < smoothCount; j++) {
    for (let i = 0; i < points.length - 1; i++) {
      points[i] = { x: points[i].x, y: ((points[i].y + points[i + 1].y) / 2) | 0 };
    }
    for (let i = 0; i < tmpPoints.length - 1; i++) {
      tmpPoints[i] = { x: tmpPoints[i].x, y: ((tmpPoints[i].y + tmpPoints[i + 1].y) / 2) | 0 };
    }
  }
  for (let i = tmpPoints.length - 1; i >= 0; i--) points.push(tmpPoints[i]);
  drawFilledOutlined(tex, points);
  squashTowardCenter(tex);
  return tex;
}

function createWing(seed, wingLength, thickness, xOffset, wingDetail, random, width, height) {
  const wingFrontNoise = new RidgedMultifractal(wingDetail, 2, 8, seed, QualityMode.Medium);
  const wingBackNoise = new RidgedMultifractal(wingDetail, 2, 8, seed + 1, QualityMode.Medium);
  const step = (wingLength / 8) | 0 || 1;
  let skewDir = -1;
  if (random.range(0, 1) > 0) skewDir = 1;
  const center = { x: (width / 2) | 0, y: (height / 2) | 0 };
  const tex = new SpriteTexture(width, height);
  const pointsTL = [];
  const pointsTR = [];
  const startY = center.y;
  const endY = startY + ((wingLength / 2) | 0) - 1;
  let skewMod = 0;
  for (let y = startY; y <= endY + 1; y += step) {
    let xNf = clamp((wingFrontNoise.getValue(0, y, 0) + 1) * 0.5, 0.05, 1);
    const xf = (xNf * thickness) | 0;
    let xNb = clamp((wingBackNoise.getValue(0, y, 0) + 1) * 0.5, 0.05, 1);
    const xb = (xNb * thickness) | 0;
    pointsTL.push({ x: (center.x - xb) + skewMod, y });
    pointsTR.push({ x: (center.x + xf) + skewMod, y });
    skewMod += skewDir;
  }
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < pointsTL.length - 1; i++) {
      pointsTL[i] = { x: ((pointsTL[i].x + pointsTL[i + 1].x) / 2) | 0, y: pointsTL[i].y };
    }
    for (let i = 0; i < pointsTR.length - 1; i++) {
      pointsTR[i] = { x: ((pointsTR[i].x + pointsTR[i + 1].x) / 2) | 0, y: pointsTR[i].y };
    }
  }
  const points = [...pointsTL, ...pointsTR.slice().reverse()];
  for (let i = 0; i < points.length; i++) {
    let px = xOffset + points[i].x;
    if (px < 1) px = 1;
    if (px > width - 2) px = width - 2;
    points[i] = { x: px, y: points[i].y };
  }
  drawFilledOutlined(tex, points);
  squashTowardCenter(tex);
  return tex;
}

function createProfilePart(seed, length, thickness, xOffset, frequency, remap, minY, width, height, taperEnds) {
  const bodyNoise = new Perlin(frequency, 2, 0.5, 8, seed, QualityMode.Medium);
  const center = { x: (width / 2) | 0, y: (height / 2) | 0 };
  const tex = new SpriteTexture(width, height);
  const points = [];
  const tmpPoints = [];
  let x = xOffset;
  let finished = false;
  while (!finished) {
    let yN = remap(bodyNoise.getValue(x, 0, 0));
    yN = clamp(yN, 0.05, 1);
    let y = (yN * thickness) | 0;
    if (minY && y < minY) y = minY;
    points.push({ x, y: center.y + y });
    tmpPoints.push({ x, y: (center.y - y) - 1 });
    x += 1;
    if (x === width - 1) x = width - 1;
    else if (x > xOffset + length) finished = true;
  }
  if (taperEnds && points.length) {
    points[0] = { x: points[0].x, y: center.y + 2 };
    tmpPoints[0] = { x: tmpPoints[0].x, y: center.y - 2 };
    points[points.length - 1] = { x: points[points.length - 1].x, y: center.y + 2 };
    tmpPoints[tmpPoints.length - 1] = { x: tmpPoints[tmpPoints.length - 1].x, y: center.y - 2 };
  }
  for (let i = tmpPoints.length - 1; i >= 0; i--) points.push(tmpPoints[i]);
  drawFilledOutlined(tex, points);
  return tex;
}

function createWeapon(seed, length, thickness, xOffset, width, height) {
  const center = { x: (width / 2) | 0, y: (height / 2) | 0 };
  const tex = new SpriteTexture(width, height);
  const points = [];
  const tmpPoints = [];
  let x = xOffset;
  let finished = false;
  while (!finished) {
    const y = 1;
    points.push({ x, y: center.y + y });
    tmpPoints.push({ x, y: (center.y - y) - 1 });
    x += 1;
    if (x === width - 1) x = width - 1;
    else if (x > xOffset + length) finished = true;
  }
  for (let i = tmpPoints.length - 1; i >= 0; i--) points.push(tmpPoints[i]);
  drawFilledOutlined(tex, points);
  return tex;
}

function finishPart(seed, tex, tint, highlights, colors, colorDetail, width, height) {
  texturizeShip(seed, tex, Color.magenta, tint, highlights, colors, colorDetail, width, height);
  shadeEdge(tex);
  return tex;
}

export function generateShip(params) {
  const { seed, shipType, bodyDetail, wingDetail, colors, colorDetail } = params;
  const width = 128;
  const height = 128;
  const k = 2;
  const random = new SS_Random(seed);
  const finalTexture = new SpriteTexture(width, height);
  const enginePoints = [];
  const weaponPoints = [];
  const currentSeed = seed;

  const merge = (part, ox, oy) => mergeColors(finalTexture, part, ox, oy);

  if (shipType === ShipType.Fighter) {
    const bodyLengthNoise = new Perlin(0.01, 2, 0.5, 8, currentSeed, QualityMode.Low);
    let bn = clamp((bodyLengthNoise.getValue(10, 0, 0) + 3) * 0.25, 0.5, 1) * width;
    let bodyLength = bn | 0;
    if (bodyLength > width) bodyLength = width;
    let engineOffset = ((width - bodyLength) / 2 | 0) - 2 * k;
    if (engineOffset < 0) engineOffset = 0;

    let e1 = createProfilePart(currentSeed, 4 * k, 8 * k, engineOffset, 0.01, (v) => (v + 1) * 0.5, 0, width, height, false);
    finishPart(currentSeed, e1, Color.red, false, colors, colorDetail, width, height);
    merge(e1, 0, 8 * k);
    merge(e1, 0, -8 * k);
    enginePoints.push({ x: -bodyLength / 2, y: 8 * k }, { x: -bodyLength / 2, y: -8 * k });

    let wp1 = createWeapon(currentSeed, 24 * k, 4 * k, (width / 3) | 0, width, height);
    finishPart(currentSeed, wp1, Color.yellow, false, colors, colorDetail, width, height);
    merge(wp1, 0, 16 * k);
    merge(wp1, 0, -16 * k);
    weaponPoints.push({ x: (width / 3) - 6 * k, y: 16 * k }, { x: (width / 3) - 6 * k, y: -16 * k });

    let w1 = createWing(currentSeed, height, random.rangeEven(12 * k, 24 * k), 0, wingDetail, random, width, height);
    finishPart(currentSeed, w1, Color.white, true, colors, colorDetail, width, height);
    merge(w1, 0, 0);

    let b1 = createTerrestrialBody(currentSeed, bodyLength, 1, bodyDetail, width, height);
    finishPart(currentSeed, b1, Color.white, true, colors, colorDetail, width, height);
    merge(b1, 0, 0);

    let w2 = createWing(currentSeed, 48 * k, 8 * k, ((-bodyLength / 2) * 0.75) | 0, wingDetail, random, width, height);
    finishPart(currentSeed, w2, Color.white, true, colors, colorDetail, width, height);
    merge(w2, 0, 0);

    let c1 = createProfilePart(currentSeed, random.rangeEven(8 * k, 16 * k), 8 * k, width / 2, 0.1, (v) => (v + 3) * 0.25, 0, width, height, true);
    finishPart(currentSeed, c1, Color.cyan, false, colors, colorDetail, width, height);
    merge(c1, 0, 0);

    let w3 = createWing(currentSeed, 32 * k, 8 * k, ((-bodyLength / 2) * 0.65) | 0, wingDetail, random, width, height);
    finishPart(currentSeed, w3, Color.white, true, colors, colorDetail, width, height);
    merge(w3, 0, 0);
  } else if (shipType === ShipType.Fighter2) {
    const bodyLengthNoise = new Perlin(0.01, 2, 0.5, 8, currentSeed, QualityMode.Low);
    let bn = clamp((bodyLengthNoise.getValue(10, 0, 0) + 3) * 0.25, 0.5, 1) * width;
    let bodyLength = bn | 0;
    if (bodyLength > width) bodyLength = width;
    let engineOffset = ((width - bodyLength) / 2 | 0) - 2 * k;
    if (engineOffset < 0) engineOffset = 0;

    let wp1 = createWeapon(currentSeed, 24 * k, 4 * k, (width / 3) | 0, width, height);
    finishPart(currentSeed, wp1, Color.yellow, false, colors, colorDetail, width, height);
    merge(wp1, 0, 24 * k);
    merge(wp1, 0, -24 * k);
    weaponPoints.push({ x: (width / 3) - 6 * k, y: 24 * k }, { x: (width / 3) - 6 * k, y: -24 * k });

    let w1 = createWing(currentSeed, height, random.rangeEven(12 * k, 24 * k), 0, wingDetail, random, width, height);
    finishPart(currentSeed, w1, Color.white, true, colors, colorDetail, width, height);
    merge(w1, 0, 0);

    const tankSpacing = random.rangeEven(8 * k, 16 * k);
    let t1 = createProfilePart(currentSeed, 48 * k, 4 * k, 4 * k, 0.01, (v) => (v + 1) * 0.5, 2, width, height, false);
    finishPart(currentSeed, t1, Color.white, true, colors, colorDetail, width, height);
    merge(t1, 0, tankSpacing);
    merge(t1, 0, -tankSpacing);

    let wp2 = createWeapon(currentSeed, 16 * k, 4 * k, (width / 2) + 8 * k, width, height);
    finishPart(currentSeed, wp2, Color.yellow, false, colors, colorDetail, width, height);
    merge(wp2, 0, 8 * k);
    merge(wp2, 0, -8 * k);
    weaponPoints.push({ x: (width / 2) - 6 * k, y: 8 * k }, { x: (width / 2) - 6 * k, y: -8 * k });

    let b1 = createTerrestrialBody(currentSeed, bodyLength, 1, bodyDetail, width, height);
    finishPart(currentSeed, b1, Color.white, true, colors, colorDetail, width, height);
    merge(b1, 0, 0);

    let e1 = createProfilePart(currentSeed, 4 * k, 8 * k, engineOffset, 0.01, (v) => (v + 1) * 0.5, 0, width, height, false);
    finishPart(currentSeed, e1, Color.red, false, colors, colorDetail, width, height);
    merge(e1, 0, 0);
    enginePoints.push({ x: -bodyLength / 2, y: 0 });

    let c1 = createProfilePart(currentSeed, random.rangeEven(8 * k, 16 * k), 8 * k, width / 2, 0.1, (v) => (v + 3) * 0.25, 0, width, height, true);
    finishPart(currentSeed, c1, Color.cyan, false, colors, colorDetail, width, height);
    merge(c1, 0, 0);

    let w3 = createWing(currentSeed, 32 * k, 8 * k, ((-bodyLength / 2) * 0.65) | 0, wingDetail, random, width, height);
    finishPart(currentSeed, w3, Color.white, true, colors, colorDetail, width, height);
    merge(w3, 0, 0);
  } else if (shipType === ShipType.Hauler) {
    const bodyLength = width;
    let engineOffset = ((width - bodyLength) / 2 | 0) - 2 * k;
    if (engineOffset < 0) engineOffset = 0;

    let e1 = createProfilePart(currentSeed, 4 * k, 8 * k, engineOffset, 0.01, (v) => (v + 1) * 0.5, 0, width, height, false);
    finishPart(currentSeed, e1, Color.red, false, colors, colorDetail, width, height);
    merge(e1, 0, 8 * k);
    merge(e1, 0, -8 * k);
    enginePoints.push({ x: -bodyLength / 2, y: 8 * k }, { x: -bodyLength / 2, y: -8 * k });

    let b1 = createTerrestrialBody(currentSeed, bodyLength, 1, bodyDetail, width, height);
    finishPart(currentSeed, b1, Color.white, true, colors, colorDetail, width, height);
    merge(b1, 0, 0);

    let c1 = createProfilePart(currentSeed, random.rangeEven(8 * k, 16 * k), 8 * k, width / 2, 0.1, (v) => (v + 3) * 0.25, 0, width, height, true);
    finishPart(currentSeed, c1, Color.cyan, false, colors, colorDetail, width, height);
    merge(c1, 0, 0);

    let w3 = createWing(currentSeed, (height * 0.75) | 0, 8 * k, -16 * k, wingDetail, random, width, height);
    finishPart(currentSeed, w3, Color.white, true, colors, colorDetail, width, height);
    merge(w3, 0, 0);
  } else if (shipType === ShipType.Saucer) {
    const bodySize = random.rangeEven((width * 0.75) | 0, width);
    const numBodyPoints = random.rangeEven(6, 32);
    const bodyAngleSteps = 360 / numBodyPoints;
    const bodyPoints = [];
    for (let angle = 0; angle < 360; angle += bodyAngleSteps) {
      bodyPoints.push({
        x: ((width / 2) + Math.cos(angle * Math.PI / 180) * (bodySize * 0.5)) | 0,
        y: ((height / 2) + Math.sin(angle * Math.PI / 180) * (bodySize * 0.5)) | 0,
      });
    }
    const b1 = new SpriteTexture(width, height);
    drawFilledOutlined(b1, bodyPoints);
    finishPart(currentSeed, b1, Color.white, true, colors, colorDetail, width, height);
    merge(b1, 0, 0);

    const tankSpacing = random.rangeEven(8 * k, 16 * k);
    let t1 = createProfilePart(currentSeed, 48 * k, 4 * k, 4 * k, 0.01, (v) => (v + 1) * 0.5, 2, width, height, false);
    finishPart(currentSeed, t1, Color.white, true, colors, colorDetail, width, height);
    merge(t1, 0, tankSpacing);
    merge(t1, 0, -tankSpacing);

    let w2 = createWing(currentSeed, random.rangeEven(width / 2, width), 16 * k, ((-width / 2) * 0.25) | 0, wingDetail, random, width, height);
    finishPart(currentSeed, w2, Color.white, true, colors, colorDetail, width, height);
    merge(w2, 0, 0);

    let c1 = createProfilePart(currentSeed, random.rangeEven(8 * k, 16 * k), 8 * k, width / 2, 0.1, (v) => (v + 3) * 0.25, 0, width, height, true);
    finishPart(currentSeed, c1, Color.cyan, false, colors, colorDetail, width, height);
    merge(c1, 0, 0);
  }

  decorateShip(finalTexture, enginePoints, weaponPoints);
  return { texture: finalTexture, enginePoints, weaponPoints, width, height };
}

function generateBaseTexture(seed, width, height) {
  const noise = new Perlin(0.01, 2, 0.5, 6, seed, QualityMode.Low);
  const tex = new SpriteTexture(width, height);
  const offsetX = (width / 8) | 0;
  const offsetY = (height / 8) | 0;
  for (let y = 0; y < height; y += offsetY) {
    for (let x = 0; x < width; x += offsetX) {
      let n = clamp((noise.getValue(x, y, 0) + 3) * 0.25, 0.48, 1);
      fillRect(tex, x, y, offsetX, offsetY, new Color(n, n, n, 1));
      const current = tex.getPixel(x, y);
      tex.setPixel(x, y, new Color(current.r * n, current.g * n, current.b * n, 1));
      if (offsetX > 4 && offsetY > 4) {
        tex.setPixel(x + 1, y + 1, new Color(n * 0.55, n * 0.55, n * 0.55, 1));
      }
    }
  }
  return tex;
}

function borderProximity(spriteTexture, x, y, dirX, dirY, thickness, width, height) {
  let best = 0;
  for (let d = 1; d <= thickness; d++) {
    const cx = clamp(x + dirX * d, 0, width - 1);
    const cy = clamp(y + dirY * d, 0, height - 1);
    if (spriteTexture.isColor(cx, cy, Color.black)) {
      best = Math.max(best, (thickness + 1 - d) / thickness);
      break;
    }
  }
  return best;
}

function texturizeStation(seed, spriteTexture, targetColor, tint, highlights, gradientColors, colorDetail, baseTexture, width, height) {
  const perlin = new Perlin(0.025, 2, 0.5, 8, seed + 1, QualityMode.Low);
  const highlightVoronoi = new Voronoi(colorDetail, 2, seed + 1, false);
  const shadingThickness = 5;

  for (let y = 0; y < spriteTexture.height / 2; y++) {
    for (let x = 0; x < spriteTexture.width / 2; x++) {
      if (!spriteTexture.isColor(x, y, targetColor)) continue;
      let hullShade = baseTexture.getPixel(x, y);
      let pixelNoise = clamp((perlin.getValue(x, y, 0) + 3) * 0.25, 0.5, 1);
      hullShade = hullShade.mulColor(tint).mul(pixelNoise);
      if (highlights) {
        let highlightNoise = clamp((highlightVoronoi.getValue(x, y, 0) + 1) * 0.5, 0, 1);
        hullShade = (highlightNoise <= 0.72 ? gradientColors[0] : gradientColors[1]).mul(pixelNoise);
        if ((x % 6) === 0 || (y % 6) === 0) hullShade = hullShade.mul(0.86);
      }

      const east = borderProximity(spriteTexture, x, y, 1, 0, shadingThickness, width, height);
      const west = borderProximity(spriteTexture, x, y, -1, 0, shadingThickness, width, height);
      const north = borderProximity(spriteTexture, x, y, 0, -1, shadingThickness, width, height);
      const south = borderProximity(spriteTexture, x, y, 0, 1, shadingThickness, width, height);
      hullShade = hullShade.mul(1 + north * 0.42 + west * 0.12);
      hullShade = hullShade.mul(1 - south * 0.38 - east * 0.1);

      hullShade.a = 1;
      spriteTexture.setPixel(x, y, hullShade.clamp01());
    }
  }

  for (let y = (spriteTexture.height / 2) | 0; y < spriteTexture.height; y++) {
    for (let x = 0; x < spriteTexture.width; x++) {
      if (spriteTexture.isColor(x, y, targetColor)) {
        spriteTexture.setPixel(x, y, spriteTexture.getPixel(x, spriteTexture.height - 1 - y));
      }
    }
  }
  for (let y = 0; y < spriteTexture.height; y++) {
    for (let x = (spriteTexture.width / 2) | 0; x < spriteTexture.width; x++) {
      if (spriteTexture.isColor(x, y, targetColor)) {
        spriteTexture.setPixel(x, y, spriteTexture.getPixel(spriteTexture.width - 1 - x, y));
      }
    }
  }
}

function decorateStation(tex, seed) {
  const w = tex.width;
  const h = tex.height;
  const cx = w / 2;
  const cy = h / 2;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (tex.isClear(x, y) || tex.isColor(x, y, Color.black)) continue;
      const c = tex.getPixel(x, y);
      const ny = (y - cy) / (h * 0.5);
      const nx = (x - cx) / (w * 0.5);
      const lit = 0.78 + 0.28 * clamp01(0.55 - ny * 0.55 - nx * 0.18);
      let r = c.r * lit;
      let g = c.g * lit;
      let b = c.b * lit;

      const nearOutline =
        tex.isColor(x - 1, y, Color.black) || tex.isColor(x + 1, y, Color.black) ||
        tex.isColor(x, y - 1, Color.black) || tex.isColor(x, y + 1, Color.black);
      const windowCell = (x % 5 === 2 && y % 4 === 1);
      if (windowCell && !nearOutline && hash2(x, y, seed) > 0.28) {
        const on = hash2(x + 11, y, seed) > 0.18;
        if (on) {
          const cool = hash2(x, y + 5, seed) > 0.7;
          r = cool ? 0.45 : 1;
          g = cool ? 0.78 : 0.86;
          b = cool ? 1 : 0.42;
        } else {
          r *= 0.35;
          g *= 0.38;
          b *= 0.45;
        }
      }

      tex.setPixel(x, y, new Color(clamp01(r), clamp01(g), clamp01(b), 1));
    }
  }
  stampGlow(tex, cx | 0, cy | 0, 14, new Color(0.45, 0.85, 1, 0.18));
}

export function generateStation(params) {
  const { seed, colors, colorDetail, numberOfPods } = params;
  const width = 256;
  const height = 256;
  const random = new SS_Random(seed);
  const baseTexture = generateBaseTexture(seed, width, height);
  const finalTexture = new SpriteTexture(width, height);
  const podCount = numberOfPods;
  const podSize = 64;
  const step = (360 / podCount) | 0;
  const center = { x: (width / 2) | 0, y: (height / 2) | 0 };
  const podPositions = [];
  for (let a = 0; a < 359; a += step) {
    podPositions.push({
      x: center.x + (Math.cos(a * Math.PI / 180) * 96) | 0,
      y: center.y + (Math.sin(a * Math.PI / 180) * 96) | 0,
    });
  }

  const bmp = new SpriteTexture(width, height);
  const bridgeWidth = random.rangeEven(8, 16);
  const points = [];
  for (let i = 0; i < podPositions.length; i++) {
    const px1 = podPositions[i].x + (Math.cos((i * step - 90) * Math.PI / 180) * bridgeWidth) | 0;
    const py1 = podPositions[i].y + (Math.sin((i * step - 90) * Math.PI / 180) * bridgeWidth) | 0;
    const px2 = podPositions[i].x + (Math.cos((i * step + 90) * Math.PI / 180) * bridgeWidth) | 0;
    const py2 = podPositions[i].y + (Math.sin((i * step + 90) * Math.PI / 180) * bridgeWidth) | 0;
    const cx1 = center.x + (Math.cos((i * step - 90) * Math.PI / 180) * bridgeWidth) | 0;
    const cy1 = center.y + (Math.sin((i * step - 90) * Math.PI / 180) * bridgeWidth) | 0;
    const cx2 = center.x + (Math.cos((i * step + 90) * Math.PI / 180) * bridgeWidth) | 0;
    const cy2 = center.y + (Math.sin((i * step + 90) * Math.PI / 180) * bridgeWidth) | 0;
    points.push({ x: cx1, y: cy1 }, { x: px1, y: py1 }, { x: px2, y: py2 }, { x: cx2, y: cy2 });
    fillPolygon(bmp, points, Color.magenta);
  }

  const numPoints = random.rangeEven(6, 10);
  for (let i = 0; i < podPositions.length; i++) {
    const angleStep = 360 / numPoints;
    const controlPoints = [];
    for (let angle = 0; angle < 360; angle += angleStep) {
      controlPoints.push({
        x: (podPositions[i].x + Math.cos(angle * Math.PI / 180) * (podSize * 0.5)) | 0,
        y: (podPositions[i].y + Math.sin(angle * Math.PI / 180) * (podSize * 0.5)) | 0,
      });
    }
    fillPolygon(bmp, controlPoints, Color.magenta);
    drawPolygon(bmp, controlPoints, Color.black, 1);

    const controlPoints2 = [];
    for (let angle = 0; angle < 360; angle += angleStep) {
      controlPoints2.push({
        x: (podPositions[i].x + Math.cos(angle * Math.PI / 180) * (podSize * 0.4)) | 0,
        y: (podPositions[i].y + Math.sin(angle * Math.PI / 180) * (podSize * 0.4)) | 0,
      });
    }
    drawPolygon(bmp, controlPoints2, Color.black, 5);
    drawPolygon(bmp, controlPoints2, Color.darkCyan, 3);
  }

  const hubSize = random.rangeEven(64, 128);
  const numHubPoints = random.rangeEven(6, 10);
  const hubAngleSteps = 360 / numHubPoints;
  const hubPoints = [];
  for (let angle = 0; angle < 360; angle += hubAngleSteps) {
    hubPoints.push({
      x: (center.x + Math.cos(angle * Math.PI / 180) * (hubSize * 0.5)) | 0,
      y: (center.y + Math.sin(angle * Math.PI / 180) * (hubSize * 0.5)) | 0,
    });
  }
  fillPolygon(bmp, hubPoints, Color.magenta);
  drawPolygon(bmp, hubPoints, Color.black, 1);

  const hubPoints2 = [];
  for (let angle = 0; angle < 360; angle += hubAngleSteps) {
    hubPoints2.push({
      x: (center.x + Math.cos(angle * Math.PI / 180) * (hubSize * 0.4)) | 0,
      y: (center.y + Math.sin(angle * Math.PI / 180) * (hubSize * 0.4)) | 0,
    });
  }
  drawPolygon(bmp, hubPoints2, Color.black, 5);
  drawPolygon(bmp, hubPoints2, Color.darkCyan, 3);

  outline(bmp, Color.black);
  texturizeStation(seed, bmp, Color.magenta, Color.white, true, colors, colorDetail, baseTexture, width, height);
  shadeEdge(bmp);
  decorateStation(bmp, seed);
  mergeColors(finalTexture, bmp, 0, 0);
  return { texture: finalTexture, width, height };
}

export function randomizeShip(state) {
  const next = { ...state };
  if (!next.customSeed) next.seed = unityRandomInt(0, 100000000);
  if (!next.customShipType) next.shipType = unityRandomInt(0, 4);
  if (!next.customScale) next.scale = unityRandomFloat(1, 2);
  if (!next.customColors) {
    next.colors = [Color.grey.clone(), new Color(unityRandomFloat(0, 1), unityRandomFloat(0, 1), unityRandomFloat(0, 1), 1)];
  }
  if (!next.customColorDetail) next.colorDetail = unityRandomFloat(0.01, 0.1);
  if (!next.customBodyDetail) next.bodyDetail = unityRandomFloat(0.01, 0.1);
  if (!next.customWingDetail) next.wingDetail = unityRandomFloat(0.01, 0.1);
  return next;
}

export function randomizeStation(state) {
  const next = { ...state };
  if (!next.customSeed) next.seed = unityRandomInt(0, 100000000);
  if (!next.customScale) next.scale = 1;
  if (!next.customColors) {
    next.colors = [Color.grey.clone(), new Color(unityRandomFloat(0, 1), unityRandomFloat(0, 1), unityRandomFloat(0, 1), 1)];
  }
  if (!next.customColorDetail) next.colorDetail = unityRandomFloat(0.01, 0.1);
  if (!next.customPods) {
    const random = new SS_Random(next.seed);
    next.numberOfPods = random.rangeEven(2, 8);
  }
  return next;
}
