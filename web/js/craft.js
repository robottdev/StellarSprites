import { Perlin, Voronoi, QualityMode } from "./libnoise.js";
import {
  Color, SpriteTexture, SS_Random, clamp, clamp01, hash2, mergeColors, outline,
  unityRandomInt, unityRandomFloat,
} from "./core.js";
import { fillPolygon, drawPolygon, fillRect } from "./raster.js";
import { stampGlow } from "./lighting.js";

export { ShipType, generateShip, randomizeShip } from "./ship.js";

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
