import { Color } from "./core.js";

function point(x, y) {
  return { x, y };
}

export function fillPolygon(tex, points, color) {
  if (!points || points.length < 3) return;
  const w = tex.width;
  const h = tex.height;
  let minY = h;
  let maxY = 0;
  for (const p of points) {
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  minY = Math.max(0, Math.ceil(minY));
  maxY = Math.min(h - 1, Math.floor(maxY));
  const n = points.length;
  const inter = new Array(n);
  for (let y = minY; y <= maxY; y++) {
    let count = 0;
    for (let i = 0; i < n; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % n];
      const y1 = p1.y;
      const y2 = p2.y;
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) {
        inter[count++] = p1.x + ((y - y1) * (p2.x - p1.x)) / (y2 - y1);
      }
    }
    for (let i = 1; i < count; i++) {
      const v = inter[i];
      let j = i;
      while (j > 0 && inter[j - 1] > v) {
        inter[j] = inter[j - 1];
        j--;
      }
      inter[j] = v;
    }
    for (let i = 0; i + 1 < count; i += 2) {
      let x0 = Math.ceil(inter[i]);
      let x1 = Math.floor(inter[i + 1]);
      if (x0 < 0) x0 = 0;
      if (x1 >= w) x1 = w - 1;
      for (let x = x0; x <= x1; x++) tex.setPixel(x, y, color);
    }
  }
}

export function drawLine(tex, x0, y0, x1, y1, color, thickness = 1) {
  x0 |= 0;
  y0 |= 0;
  x1 |= 0;
  y1 |= 0;
  const radius = Math.max(0, (thickness - 1) / 2);
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (true) {
    stamp(tex, x0, y0, color, radius);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
  }
}

function stamp(tex, cx, cy, color, radius) {
  if (radius <= 0) {
    tex.setPixel(cx, cy, color);
    return;
  }
  const r = Math.ceil(radius);
  const r2 = radius * radius;
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2 + 0.25) tex.setPixel(x, y, color);
    }
  }
}

export function drawPolygon(tex, points, color, thickness = 1) {
  if (!points || points.length < 2) return;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    drawLine(tex, a.x, a.y, b.x, b.y, color, thickness);
  }
}

export function fillDisc(tex, cx, cy, radius, color) {
  stamp(tex, cx | 0, cy | 0, color, Math.max(0, radius));
}

export function fillEllipse(tex, cx, cy, rx, ry, color) {
  const x0 = Math.max(0, Math.floor(cx - rx - 1));
  const x1 = Math.min(tex.width - 1, Math.ceil(cx + rx + 1));
  const y0 = Math.max(0, Math.floor(cy - ry - 1));
  const y1 = Math.min(tex.height - 1, Math.ceil(cy + ry + 1));
  const rx2 = Math.max(0.25, rx * rx);
  const ry2 = Math.max(0.25, ry * ry);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if ((dx * dx) / rx2 + (dy * dy) / ry2 <= 1.02) tex.setPixel(x, y, color);
    }
  }
}

export function fillRect(tex, x, y, w, h, color) {
  const x1 = Math.min(tex.width, x + w);
  const y1 = Math.min(tex.height, y + h);
  const x0 = Math.max(0, x);
  const y0 = Math.max(0, y);
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) tex.setPixel(px, py, color);
  }
}

export { point };

export const MAGENTA = Color.magenta;
export const BLACK = Color.black;
export const TRANSPARENT = Color.clear;
