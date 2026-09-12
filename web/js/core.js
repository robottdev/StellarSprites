/** Core types ported from Stellar Sprites (Unity). */

export const DEG2RAD = Math.PI / 180;

export function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

export function clamp01(v) {
  return clamp(v, 0, 1);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / Math.max(1e-6, edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export function mixColor(a, b, t) {
  const u = 1 - t;
  return new Color(a.r * u + b.r * t, a.g * u + b.g * t, a.b * u + b.b * t, a.a * u + b.a * t);
}

/** Unpremultiplied alpha-over. */
export function overColor(dst, src) {
  const sa = clamp01(src.a);
  const da = clamp01(dst.a);
  const outA = sa + da * (1 - sa);
  if (outA < 1e-5) return new Color(0, 0, 0, 0);
  const k = 1 - sa;
  return new Color(
    (src.r * sa + dst.r * da * k) / outA,
    (src.g * sa + dst.g * da * k) / outA,
    (src.b * sa + dst.b * da * k) / outA,
    outA
  );
}

export function sampleStops(colors, t) {
  if (!colors || !colors.length) return Color.white.clone();
  if (colors.length === 1) return colors[0].clone();
  const x = clamp01(t) * (colors.length - 1);
  const i = Math.min(colors.length - 2, Math.floor(x));
  return mixColor(colors[i], colors[i + 1], x - i);
}

export function hash2(x, y, seed = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 0.013) * 43758.5453123;
  return n - Math.floor(n);
}

export function distance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

export class Color {
  constructor(r = 0, g = 0, b = 0, a = 1) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  clone() {
    return new Color(this.r, this.g, this.b, this.a);
  }

  equals(other) {
    return other && this.r === other.r && this.g === other.g && this.b === other.b && this.a === other.a;
  }

  mul(s) {
    return new Color(this.r * s, this.g * s, this.b * s, this.a * s);
  }

  mulColor(c) {
    return new Color(this.r * c.r, this.g * c.g, this.b * c.b, this.a * c.a);
  }

  add(c) {
    return new Color(this.r + c.r, this.g + c.g, this.b + c.b, this.a + c.a);
  }

  clamp01() {
    return new Color(clamp01(this.r), clamp01(this.g), clamp01(this.b), clamp01(this.a));
  }

  static fromHex(hex) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    return new Color(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1);
  }

  toHex() {
    const r = Math.round(clamp01(this.r) * 255);
    const g = Math.round(clamp01(this.g) * 255);
    const b = Math.round(clamp01(this.b) * 255);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
}

Color.clear = new Color(0, 0, 0, 0);
Color.black = new Color(0, 0, 0, 1);
Color.white = new Color(1, 1, 1, 1);
Color.red = new Color(1, 0, 0, 1);
Color.green = new Color(0, 1, 0, 1);
Color.blue = new Color(0, 0, 1, 1);
Color.magenta = new Color(1, 0, 1, 1);
Color.cyan = new Color(0, 1, 1, 1);
Color.yellow = new Color(1, 47 / 51, 4 / 255, 1);
Color.grey = new Color(0.5, 0.5, 0.5, 1);
Color.darkCyan = new Color(0, 139 / 255, 139 / 255, 1);

/** Seeded RNG matching System.Random's public API (exclusive int max). */
export class SS_Random {
  constructor(seed) {
    this.state = (seed >>> 0) || 1;
  }

  nextU32() {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0);
  }

  next() {
    return this.nextU32() & 0x7fffffff;
  }

  nextDouble() {
    return this.nextU32() / 4294967296;
  }

  range(min, max) {
    if (max <= min) return min;
    // Unity int Range is exclusive-max. Treat span>1 integer pairs as ints;
    // Range(0, 1) in this codebase always means a unit float (0f, 1f).
    if (Number.isInteger(min) && Number.isInteger(max) && (max - min) > 1) {
      return min + (this.next() % (max - min));
    }
    return min + this.nextDouble() * (max - min);
  }

  rangeEven(min, max) {
    return 2 * this.range((min / 2) | 0, (max / 2) | 0);
  }
}

export class SpriteTexture {
  constructor(width, height, source) {
    this.width = width;
    this.height = height;
    this.data = source ? new Float32Array(source) : new Float32Array(width * height * 4);
  }

  index(x, y) {
    return (x + y * this.width) * 4;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  getPixel(x, y) {
    if (!this.inBounds(x, y)) return Color.clear.clone();
    const i = this.index(x, y);
    return new Color(this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]);
  }

  setPixel(x, y, c) {
    if (!this.inBounds(x, y)) return;
    const i = this.index(x, y);
    this.data[i] = c.r;
    this.data[i + 1] = c.g;
    this.data[i + 2] = c.b;
    this.data[i + 3] = c.a;
  }

  isClear(x, y) {
    if (!this.inBounds(x, y)) return true;
    const i = this.index(x, y);
    return this.data[i] === 0 && this.data[i + 1] === 0 && this.data[i + 2] === 0 && this.data[i + 3] === 0;
  }

  isColor(x, y, c) {
    if (!this.inBounds(x, y)) return false;
    const i = this.index(x, y);
    return this.data[i] === c.r && this.data[i + 1] === c.g && this.data[i + 2] === c.b && this.data[i + 3] === c.a;
  }

  fill(c) {
    for (let i = 0; i < this.data.length; i += 4) {
      this.data[i] = c.r;
      this.data[i + 1] = c.g;
      this.data[i + 2] = c.b;
      this.data[i + 3] = c.a;
    }
  }

  toRgbaBytes() {
    const out = new Uint8ClampedArray(this.width * this.height * 4);
    for (let i = 0; i < this.data.length; i += 4) {
      out[i] = clamp01(this.data[i]) * 255;
      out[i + 1] = clamp01(this.data[i + 1]) * 255;
      out[i + 2] = clamp01(this.data[i + 2]) * 255;
      out[i + 3] = clamp01(this.data[i + 3]) * 255;
    }
    return out;
  }
}

export function colorsEqual(a, b) {
  return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
}

export function hsvToRgb(h, s, v) {
  if (h === 1) h = 0;
  const step = 1 / 6;
  const vh = h / step;
  const i = Math.floor(vh);
  const f = vh - i;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));
  switch (i) {
    case 0: return [v, t, p];
    case 1: return [q, v, p];
    case 2: return [p, v, t];
    case 3: return [p, q, v];
    case 4: return [t, p, v];
    default: return [v, p, q];
  }
}

export function colorWheelTexture() {
  const inner = 0;
  const outer = 128;
  const size = 2 * outer;
  const tex = new SpriteTexture(size, size);
  const cx = size / 2;
  const cy = size / 2;
  for (let y = 0; y < size; y++) {
    const dy = cy - y;
    for (let x = 0; x < size; x++) {
      const dx = cx - x;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= inner && dist <= outer) {
        const theta = Math.atan2(dy, dx);
        const hue = (theta + Math.PI) / (2 * Math.PI);
        const [r, g, b] = hsvToRgb(hue, 1, 1);
        tex.setPixel(x, y, new Color(r * 0.75, g * 0.75, b * 0.75, 1));
      }
    }
  }
  return tex;
}

export function generateColorWheelColors(seed, count) {
  const wheel = colorWheelTexture();
  const random = new SS_Random(seed);
  const colors = [];
  let angle = random.range(0, 360);
  for (let i = 0; i < count; i++) {
    const xPos = wheel.width / 2 + Math.cos(angle) * 32;
    const yPos = wheel.height / 2 + Math.sin(angle) * 32;
    colors.push(wheel.getPixel(xPos | 0, yPos | 0));
    angle += 360 / count;
  }
  return colors;
}

export function createGradient(colors, minSteps, maxSteps) {
  const random = new SS_Random(0);
  const steps = random.range(minSteps, maxSteps);
  const tmp = [];
  for (let j = 0; j < colors.length - 1; j++) {
    const start = colors[j];
    const end = colors[j + 1];
    for (let i = 0; i < steps; i++) {
      tmp.push(new Color(
        start.r + (i * (end.r - start.r)) / steps,
        start.g + (i * (end.g - start.g)) / steps,
        start.b + (i * (end.b - start.b)) / steps,
        1
      ));
    }
  }
  return tmp;
}

export function mergeColors(target, source, xOffset, yOffset) {
  for (let y = 0; y < source.height; y++) {
    for (let x = 0; x < source.width; x++) {
      const c = source.getPixel(x, y);
      if (!colorsEqual(c, Color.clear)) {
        target.setPixel(x + xOffset, y + yOffset, c);
      }
    }
  }
}

export function outline(spriteTexture, outlineColor) {
  const w = spriteTexture.width;
  const h = spriteTexture.height;
  const marks = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (spriteTexture.isClear(x, y)) continue;
      if (
        spriteTexture.isClear(x - 1, y - 1) || spriteTexture.isClear(x, y - 1) || spriteTexture.isClear(x + 1, y - 1) ||
        spriteTexture.isClear(x - 1, y) || spriteTexture.isClear(x + 1, y) ||
        spriteTexture.isClear(x - 1, y + 1) || spriteTexture.isClear(x, y + 1) || spriteTexture.isClear(x + 1, y + 1)
      ) {
        marks.push(x, y);
      }
    }
  }
  for (let i = 0; i < marks.length; i += 2) {
    spriteTexture.setPixel(marks[i], marks[i + 1], outlineColor);
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!spriteTexture.isClear(x, y) && (x === 0 || x === w - 1 || y === 0 || y === h - 1)) {
        spriteTexture.setPixel(x, y, outlineColor);
      }
    }
  }
}

export function unityRandomInt(min, maxExclusive) {
  return min + Math.floor(Math.random() * (maxExclusive - min));
}

export function unityRandomFloat(min, max) {
  return min + Math.random() * (max - min);
}

export function pick(arr) {
  return arr[unityRandomInt(0, arr.length)];
}
