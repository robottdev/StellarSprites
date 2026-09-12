import { Color, clamp, clamp01, mixColor, overColor, smoothstep } from "./core.js";

export function n01(module, x, y, z = 0) {
  return clamp01((module.getValue(x, y, z) + 1) * 0.5);
}

export function sphereAt(x, y, cx, cy, radius) {
  const nx = (x - cx) / radius;
  const ny = (y - cy) / radius;
  const r2 = nx * nx + ny * ny;
  if (r2 >= 1) return null;
  return { nx, ny, nz: Math.sqrt(Math.max(0, 1 - r2)), r2 };
}

/** Coverage for a disk edge so sprites don't look stair-stepped. */
export function diskCoverage(dist, radius) {
  const w = 1.15;
  if (dist <= radius - w) return 1;
  if (dist >= radius + w) return 0;
  return clamp01((radius + w - dist) / (2 * w));
}

export function makeLight(angleDeg, z = 0.58) {
  const a = (angleDeg * Math.PI) / 180;
  let x = Math.cos(a);
  let y = Math.sin(a);
  const len = Math.hypot(x, y, z) || 1;
  return { x: x / len, y: y / len, z: z / len };
}

export function lambert(n, light, ambient = 0.07, wrap = 0.18) {
  const raw = n.nx * light.x + n.ny * light.y + n.nz * light.z;
  const wrapped = (raw + wrap) / (1 + wrap);
  return ambient + (1 - ambient) * Math.max(0, wrapped);
}

export function specular(n, light, power = 32, strength = 0.55) {
  const hx = light.x;
  const hy = light.y;
  const hz = light.z + 1;
  const hl = Math.hypot(hx, hy, hz) || 1;
  const ndh = Math.max(0, n.nx * (hx / hl) + n.ny * (hy / hl) + n.nz * (hz / hl));
  return Math.pow(ndh, power) * strength;
}

export function rimLight(n, light, power = 2.6) {
  const fres = Math.pow(1 - Math.max(0, n.nz), power);
  const facing = Math.max(0, n.nx * light.x + n.ny * light.y + n.nz * light.z);
  return fres * (0.25 + 0.85 * facing);
}

export function perturbNormal(n, dhdx, dhdy, strength) {
  let nx = n.nx - dhdx * strength;
  let ny = n.ny - dhdy * strength;
  let nz = n.nz;
  const len = Math.hypot(nx, ny, nz) || 1;
  return { nx: nx / len, ny: ny / len, nz: nz / len, r2: n.r2 };
}

export function shadeRgb(color, light, rim = 0, spec = 0) {
  const r = color.r * light + rim * 0.65 + spec;
  const g = color.g * light + rim * 0.7 + spec;
  const b = color.b * light + rim * 0.9 + spec;
  return new Color(clamp01(r), clamp01(g), clamp01(b), color.a);
}

export function heatColor(t) {
  t = clamp01(t);
  if (t < 0.35) {
    const k = t / 0.35;
    return new Color(0.45 + 0.55 * k, 0.06 + 0.22 * k, 0.02);
  }
  if (t < 0.7) {
    const k = (t - 0.35) / 0.35;
    return new Color(1, 0.32 + 0.5 * k, 0.06 + 0.45 * k);
  }
  const k = (t - 0.7) / 0.3;
  return new Color(1, 0.82 + 0.18 * k, 0.55 + 0.45 * k);
}

export function makeCraters(random, count, radius) {
  const craters = [];
  for (let i = 0; i < count; i++) {
    const ang = random.range(0, Math.PI * 2);
    const dist = Math.sqrt(random.range(0, 1)) * radius * 0.88;
    const x = Math.cos(ang) * dist;
    const y = Math.sin(ang) * dist;
    const r = i === 0
      ? random.range(radius * 0.12, radius * 0.18)
      : random.range(radius * 0.028, radius * 0.11);
    const depth = i === 0 ? random.range(0.45, 0.7) : random.range(0.22, 0.62);
    craters.push({ x, y, r, depth });
    const nested = random.range(0, 1) > 0.4 ? 1 + (random.range(0, 1) > 0.65 ? 1 : 0) : 0;
    for (let n = 0; n < nested; n++) {
      const na = random.range(0, Math.PI * 2);
      const nd = random.range(0, r * 0.55);
      craters.push({
        x: x + Math.cos(na) * nd,
        y: y + Math.sin(na) * nd,
        r: random.range(r * 0.18, r * 0.45),
        depth: depth * random.range(0.45, 0.9),
      });
    }
  }
  return craters;
}

export function craterHeight(lx, ly, craters) {
  let h = 0;
  for (let i = 0; i < craters.length; i++) {
    const c = craters[i];
    const d = Math.hypot(lx - c.x, ly - c.y) / c.r;
    if (d >= 1.4) continue;
    const bowl = d < 1 ? (d * d - 1) * c.depth : 0;
    const rim = Math.exp(-((d - 1) * 5.5) * ((d - 1) * 5.5)) * 0.42 * c.depth;
    h += bowl + rim;
  }
  return h;
}

export function stampGlow(tex, cx, cy, radius, color) {
  const r = Math.ceil(radius);
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const d = Math.hypot(x - cx, y - cy) / Math.max(0.001, radius);
      if (d > 1) continue;
      const a = (1 - d) * (1 - d) * color.a;
      const cur = tex.getPixel(x, y);
      tex.setPixel(x, y, new Color(
        clamp01(cur.r + color.r * a),
        clamp01(cur.g + color.g * a),
        clamp01(cur.b + color.b * a),
        clamp01(Math.max(cur.a, a * 1.2))
      ));
    }
  }
}

export function atmosphereAlpha(dist, radius, thickness) {
  if (dist <= radius) {
    const limb = smoothstep(radius * 0.72, radius, dist);
    return limb * 0.35;
  }
  const t = 1 - clamp01((dist - radius) / Math.max(1, thickness));
  return t * t;
}

export { mixColor, overColor, smoothstep, clamp01, clamp };
