import { Perlin, Voronoi, RidgedMultifractal, QualityMode } from "./libnoise.js";
import {
  Color, SpriteTexture, SS_Random, clamp, clamp01, mixColor, overColor, sampleStops,
  generateColorWheelColors, unityRandomInt, unityRandomFloat, pick, hash2,
} from "./core.js";
import {
  n01, sphereAt, makeLight, lambert, specular, rimLight, perturbNormal,
  shadeRgb, heatColor, makeCraters, craterHeight, stampGlow, atmosphereAlpha,
  diskCoverage,
} from "./lighting.js";

export const PlanetType = { Gas_Giant: 0, Terrestrial: 1 };

function smooth01(t) {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
}

function terrainPalette(colors, oceans) {
  const a = colors[0] || Color.blue;
  const b = colors[1] || Color.green;
  const c = colors[2] || Color.red;
  if (oceans) {
    return [
      mixColor(a, Color.black, 0.55),
      mixColor(a, Color.black, 0.25),
      a,
      mixColor(a, b, 0.45),
      mixColor(b, Color.black, 0.2),
      b,
      mixColor(b, c, 0.5),
      mixColor(c, Color.white, 0.28),
    ];
  }
  return [
    mixColor(a, Color.black, 0.4),
    a,
    mixColor(a, b, 0.5),
    b,
    mixColor(b, c, 0.45),
    mixColor(c, Color.white, 0.2),
  ];
}

export function generatePlanet(params) {
  const {
    seed, size, colors, planetType, oceans, clouds, cloudDensity,
    cloudTransparency, atmosphere, city, cityDensity, lightAngle,
  } = params;

  const random = new SS_Random(seed);
  const landNoise = new Perlin(1.55, 2.05, 0.52, 6, seed, QualityMode.Medium);
  const warpNoise = new Perlin(0.9, 2.1, 0.5, 4, seed + 11, QualityMode.Low);
  const cloudNoise = new Perlin(2.35, 2.05, 0.5, 5, seed + 1, QualityMode.Low);
  const stormNoise = new Perlin(3.15, 2.2, 0.45, 4, seed + 21, QualityMode.Low);
  const cityNoise = new Voronoi(4.2, 1.0, seed + 7, false);
  const detailNoise = new Perlin(6.5, 2.0, 0.4, 3, seed + 31, QualityMode.Low);

  const radius = size * 0.42;
  const settleLevel = oceans ? random.range(0.38, 0.58) : 0.22;
  const atmosphereThickness = clamp(size * 0.058, 10, 24);
  const palette = terrainPalette(colors, oceans && planetType === PlanetType.Terrestrial);
  const cx = size / 2;
  const cy = size / 2;
  const light = makeLight(lightAngle, 0.62);
  const tex = new SpriteTexture(size, size);
  const useAtmosphere = atmosphere || planetType === PlanetType.Gas_Giant;
  const atmoColor = mixColor(colors[0] || Color.blue, Color.white, 0.28);
  const spotNx = random.range(-0.52, 0.52);
  const spotNy = random.range(-0.28, 0.28);
  const bandCount = 8 + random.range(0, 6);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - cx, y - cy);
      const sph = sphereAt(x, y, cx, cy, radius);

      if (sph) {
        const freq = 2.35;
        const wx = (n01(warpNoise, sph.nx * 2.2, sph.ny * 2.2, sph.nz * 2.2) - 0.5) * 0.62;
        const wy = (n01(warpNoise, sph.nx * 2.2 + 5, sph.ny * 2.2, sph.nz * 2.2) - 0.5) * 0.62;
        let height = n01(landNoise, (sph.nx + wx) * freq, (sph.ny + wy) * freq, sph.nz * freq);
        height = clamp01(height * 0.9 + n01(detailNoise, sph.nx * 9, sph.ny * 9, sph.nz * 9) * 0.1);

        let albedo;
        let wet = false;
        if (planetType === PlanetType.Gas_Giant) {
          const lat = sph.ny;
          const warp = (n01(stormNoise, sph.nx * 5.5, sph.ny * 2.1, sph.nz * 5.5) - 0.5) * 0.55;
          const bands = 0.5 + 0.5 * Math.sin((lat * bandCount + warp) * Math.PI);
          const storms = n01(stormNoise, sph.nx * 8, sph.ny * 5, sph.nz * 8);
          const spot = Math.exp(-(((sph.nx - spotNx) * 5.2) ** 2 + ((sph.ny - spotNy) * 8.5) ** 2));
          height = clamp01(bands * 0.68 + storms * 0.24 + spot * 0.38);
          albedo = sampleStops(palette, height);
          albedo = mixColor(albedo, mixColor(colors[2] || Color.red, colors[1] || Color.white, 0.25), spot * 0.7);
          albedo = mixColor(albedo, Color.white, Math.pow(Math.max(0, 0.15 - Math.abs(lat)), 1.4) * 0.35);
        } else {
          const polar = Math.pow(Math.abs(sph.ny), 2.2);
          if (oceans) {
            wet = height < settleLevel;
            if (wet) {
              const depth = clamp01((settleLevel - height) / Math.max(0.05, settleLevel));
              albedo = sampleStops(palette.slice(0, 4), 1 - depth);
              const foam = smooth01(1 - Math.abs(height - settleLevel) / 0.035) * 0.22;
              albedo = mixColor(albedo, new Color(0.82, 0.9, 0.95, 1), foam);
            } else {
              const landT = clamp01((height - settleLevel) / Math.max(0.08, 1 - settleLevel));
              albedo = sampleStops(palette.slice(3), landT);
            }
          } else {
            albedo = sampleStops(palette, height);
          }
          if (polar > 0.5) {
            const ice = smooth01((polar - 0.5) / 0.5);
            const iceAmt = oceans ? ice * (wet ? 0.58 : 1) : ice * 0.78;
            albedo = mixColor(albedo, new Color(0.93, 0.96, 1, 1), iceAmt);
            if (iceAmt > 0.65) wet = false;
          }
        }

        albedo.a = 1;
        const bump = (height - 0.5) * (planetType === PlanetType.Gas_Giant ? 0.18 : 0.5);
        const n = perturbNormal(sph, bump * sph.nx, bump * sph.ny, 0.4);

        let cloud = 0;
        let cloudShadow = 0;
        if (clouds && planetType === PlanetType.Terrestrial) {
          const bands = 0.5 + 0.5 * Math.sin(sph.ny * 5.2 + n01(warpNoise, sph.nx, sph.nz, 0) * 1.6);
          const cLarge = n01(cloudNoise, sph.nx * 1.7 + 2, sph.ny * 1.15, sph.nz * 1.7);
          const cFine = n01(cloudNoise, sph.nx * 4.1 + 5, sph.ny * 2.2, sph.nz * 4.1);
          const cval = cLarge * 0.74 + cFine * 0.26;
          cloud = smooth01((cval * (0.7 + 0.3 * bands) - cloudDensity * 0.62) / 0.28);
          const sval = n01(
            cloudNoise,
            (sph.nx - light.x * 0.06) * 1.7 + 2,
            (sph.ny - light.y * 0.06) * 1.15,
            (sph.nz - light.z * 0.06) * 1.7
          );
          cloudShadow = smooth01((sval * (0.7 + 0.3 * bands) - cloudDensity * 0.62) / 0.28);
        }

        const ndl = n.nx * light.x + n.ny * light.y + n.nz * light.z;
        let lightAmt = lambert(n, light, 0.045, 0.18);
        lightAmt *= 1 - cloudShadow * 0.38 * (1 - cloud);
        const nightAmt = clamp01(0.55 - ndl);
        const rim = rimLight(n, light, 2.6) * (useAtmosphere ? 0.9 : 0.22);
        const spec = wet ? specular(n, light, 42, 0.52) : specular(n, light, 90, 0.07);
        let lit = shadeRgb(albedo, lightAmt, rim * 0.48, spec);
        if (nightAmt > 0) {
          const fill = mixColor(albedo, new Color(0.08, 0.1, 0.18, 1), 0.7);
          lit = mixColor(lit, shadeRgb(fill, 0.16, 0, 0), nightAmt * 0.55);
        }

        if (cloud > 0.01) {
          const cloudCol = mixColor(new Color(0.94, 0.96, 0.99, 1), atmoColor, 0.12);
          const ca = clamp01(cloud * (0.35 + cloudTransparency * 0.8) * (0.5 + 0.5 * sph.nz));
          lit = mixColor(lit, shadeRgb(cloudCol, Math.min(1, lightAmt + 0.16), rim * 0.35, 0.04), ca);
        }

        if (city && planetType === PlanetType.Terrestrial && oceans) {
          const coast = Math.abs(height - settleLevel) < 0.055;
          const inland = !wet && height < settleLevel + 0.12;
          const cluster = n01(cityNoise, sph.nx * 10, sph.ny * 10, sph.nz * 10);
          const block = hash2(Math.floor(x / 2), Math.floor(y / 2), seed);
          if (nightAmt > 0.42 && cluster > 0.38 && (coast || inland) && block > cityDensity) {
            const glow = (0.5 + 0.5 * hash2(x + 3, y, seed)) * nightAmt;
            const amber = hash2(x, y + 9, seed) > 0.22
              ? new Color(1, 0.78, 0.38, 1)
              : new Color(0.55, 0.75, 1, 1);
            lit = mixColor(lit, amber, glow * (coast ? 0.95 : 0.55));
          }
        }

        lit.a = diskCoverage(dist, radius);
        tex.setPixel(x, y, lit);
      }

      if (useAtmosphere) {
        const a = atmosphereAlpha(dist, radius, atmosphereThickness);
        if (a > 0.008) {
          const sun = sph
            ? clamp01(0.18 + 0.95 * Math.max(0, sph.nx * light.x + sph.ny * light.y + sph.nz * light.z))
            : 0.42;
          const scatter = mixColor(atmoColor, Color.white, 0.22 + 0.35 * sun);
          scatter.a = a * (sph ? 0.55 : 0.92) * (0.45 + 0.55 * sun);
          tex.setPixel(x, y, overColor(tex.getPixel(x, y), scatter));
        }
      }
    }
  }
  return tex;
}

export function generateSun(params) {
  const { seed, size, mainColor } = params;
  const gran = new Perlin(5.2, 2.0, 0.48, 5, seed, QualityMode.Low);
  const cell = new Voronoi(6.4, 1.0, seed + 2, false);
  const flare = new Perlin(1.35, 2.2, 0.5, 4, seed + 4, QualityMode.Low);
  const corona = new Perlin(1.05, 2.05, 0.55, 4, seed + 8, QualityMode.Low);
  const spotNoise = new Perlin(2.8, 2.1, 0.45, 3, seed + 12, QualityMode.Low);
  const radius = size * 0.32;
  const cx = size / 2;
  const cy = size / 2;
  const tex = new SpriteTexture(size, size);
  const hot = mixColor(Color.white, mainColor, 0.18);
  const mid = mainColor.clone();
  const cool = mixColor(mainColor, new Color(1, 0.32, 0.04, 1), 0.5);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const sph = sphereAt(x, y, cx, cy, radius);
      const ang = Math.atan2(dy, dx);
      let pixel = new Color(0, 0, 0, 0);

      const coronaLen = radius * 1.15;
      if (dist > radius * 0.92 && dist < radius + coronaLen) {
        const radial = clamp01((dist - radius) / coronaLen);
        const streak = n01(corona, Math.cos(ang * 4) * 5, Math.sin(ang * 4) * 5, radial * 7);
        const flareN = n01(flare, Math.cos(ang) * 2.6, Math.sin(ang) * 2.6, 0);
        const prominence = Math.pow(Math.max(0, streak - 0.62) * 2.4, 1.6) * (1 - radial);
        const wisps = Math.pow(1 - radial, 2.05) * (0.22 + 0.78 * streak) * (0.4 + 0.6 * flareN);
        const a = clamp01(wisps + prominence * 0.85);
        const col = mixColor(mainColor, Color.white, 0.35 + 0.5 * (1 - radial) + prominence * 0.4);
        pixel = new Color(col.r, col.g, col.b, a);
      }

      if (sph) {
        const g = n01(gran, sph.nx * 8, sph.ny * 8, sph.nz * 8);
        const granules = n01(cell, sph.nx * 7, sph.ny * 7, sph.nz * 7);
        const limb = Math.pow(Math.max(0.001, sph.nz), 0.52);
        const t = clamp01(0.28 + g * 0.45 + granules * 0.18);
        let col = sampleStops([cool, mid, hot], t);
        col = mixColor(col, hot, limb * 0.38);
        const darken = 0.42 + 0.58 * limb;
        col = new Color(col.r * darken, col.g * (0.38 + 0.62 * limb), col.b * (0.32 + 0.68 * limb), 1);
        const core = Math.pow(sph.nz, 1.7) * 0.28;
        col.r = clamp01(col.r + core);
        col.g = clamp01(col.g + core * 0.88);
        col.b = clamp01(col.b + core * 0.65);

        const spotMask = n01(spotNoise, sph.nx * 3.2, sph.ny * 3.2, sph.nz * 3.2);
        if (spotMask < 0.32 && sph.nz > 0.25) {
          const amt = (0.32 - spotMask) / 0.32;
          col = mixColor(col, mixColor(cool, Color.black, 0.35), amt * 0.7 * limb);
        }

        col.a = diskCoverage(dist, radius);
        pixel = overColor(pixel, col);
      }

      tex.setPixel(x, y, pixel);
    }
  }
  return tex;
}

export function generateMoon(params) {
  const { seed, size, roughness, colors, lightAngle } = params;
  const rock = new Perlin(2.15, 2.0, 0.5, 5, seed, QualityMode.Medium);
  const mare = new Perlin(0.82, 2.1, 0.48, 4, seed + 3, QualityMode.Low);
  const fine = new Perlin(8.5, 2.0, 0.4, 3, seed + 6, QualityMode.Low);
  const random = new SS_Random(seed);
  const radius = size * 0.42;
  const cx = size / 2;
  const cy = size / 2;
  const light = makeLight(lightAngle, 0.5);
  const craters = makeCraters(random, 12 + ((roughness * 22) | 0), radius);
  const palette = [
    mixColor(colors[0], Color.black, 0.38),
    colors[0],
    colors[1] || colors[0],
    mixColor(colors[2] || colors[1] || colors[0], Color.white, 0.18),
  ];
  const tex = new SpriteTexture(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lx = x - cx;
      const ly = y - cy;
      const dist = Math.hypot(lx, ly);
      const edgeJitter = (n01(rock, x * 0.045, y * 0.045, 0) - 0.5) * roughness * radius * 0.09;
      const sph = sphereAt(x, y, cx, cy, radius + edgeJitter);
      if (!sph) continue;

      const h0 = n01(rock, sph.nx * 3.4, sph.ny * 3.4, sph.nz * 3.4);
      const grain = n01(fine, sph.nx * 14, sph.ny * 14, sph.nz * 14);
      const mareN = n01(mare, sph.nx * 1.35, sph.ny * 1.35, sph.nz * 1.35);
      const c0 = craterHeight(lx, ly, craters);
      const cdx = craterHeight(lx + 1, ly, craters);
      const cdy = craterHeight(lx, ly + 1, craters);
      let albedo = sampleStops(palette, clamp01(h0 * 0.62 + grain * 0.22 + 0.1));
      if (mareN > 0.56) {
        albedo = mixColor(albedo, mixColor(colors[0], Color.black, 0.32), clamp01((mareN - 0.56) * 1.8));
      }
      albedo = mixColor(albedo, mixColor(albedo, Color.black, 0.45), clamp01(-c0 * 0.85));
      albedo = mixColor(albedo, mixColor(albedo, Color.white, 0.25), clamp01(c0 * 0.55));
      albedo.a = 1;

      const n = perturbNormal(sph, h0 * 0.22 + grain * 0.12 + (c0 - cdx), h0 * 0.22 + (c0 - cdy), 1.05);
      const ndl = n.nx * light.x + n.ny * light.y + n.nz * light.z;
      const lightAmt = lambert(n, light, 0.035, 0.1);
      const earthshine = 0.055 * clamp01(0.35 - ndl);
      const pixel = shadeRgb(albedo, lightAmt + earthshine, rimLight(n, light, 3.2) * 0.18, specular(n, light, 110, 0.05));
      pixel.a = diskCoverage(dist, radius + edgeJitter);
      tex.setPixel(x, y, pixel);
    }
  }
  return tex;
}

export function generateAsteroid(params) {
  const { seed, size, colors, minerals, mineralColor, lightAngle } = params;
  const rock = new Perlin(1.7, 2.0, 0.48, 4, seed, QualityMode.Medium);
  const shape = new Perlin(0.78, 2.05, 0.46, 3, seed + 2, QualityMode.Low);
  const fine = new Perlin(6.4, 2.0, 0.36, 3, seed + 6, QualityMode.Low);
  const patch = new Perlin(1.05, 2.1, 0.5, 3, seed + 9, QualityMode.Low);
  const random = new SS_Random(seed);
  const cx = size / 2;
  const cy = size / 2;
  const baseR = size * 0.40;
  const squash = 0.78 + random.range(0, 0.16);
  const rot = random.range(-0.9, 0.9);
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  const lobeN = 2 + (random.range(0, 2) | 0);
  const lobeAmp = 0.07 + random.range(0, 0.07);
  const lobePhase = random.range(0, Math.PI * 2);
  const dentAmp = 0.09 + random.range(0, 0.08);
  const light = makeLight(lightAngle, 0.5);
  const craters = makeCraters(random, 5 + random.range(0, 6), baseR * 0.9);
  const palette = [
    mixColor(colors[0], Color.black, 0.4),
    colors[0],
    colors[1] || colors[0],
    mixColor(colors[2] || colors[1] || colors[0], Color.white, 0.14),
  ];
  const tex = new SpriteTexture(size, size);

  function localXY(x, y) {
    const ox = x - cx;
    const oy = y - cy;
    return {
      lx: ox * cosR - oy * sinR,
      ly: (ox * sinR + oy * cosR) / squash,
    };
  }

  function radiusAt(lx, ly) {
    const ang = Math.atan2(ly, lx);
    const n = n01(shape, Math.cos(ang) * 1.05, Math.sin(ang) * 1.05, 0.15);
    const lobe = Math.sin(ang * lobeN + lobePhase) * lobeAmp;
    const dent = (n - 0.5) * 2 * dentAmp;
    return baseR * (1 + lobe + dent);
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const { lx, ly } = localXY(x, y);
      const dist = Math.hypot(lx, ly);
      const rad = radiusAt(lx, ly);
      const nx = lx / rad;
      const ny = ly / rad;
      const r2 = nx * nx + ny * ny;
      if (r2 >= 1) continue;
      const sph = { nx, ny, nz: Math.sqrt(Math.max(0, 1 - r2)), r2 };

      const h0 = n01(rock, sph.nx * 2.35, sph.ny * 2.35, sph.nz * 2.35);
      const grain = n01(fine, sph.nx * 9.5, sph.ny * 9.5, sph.nz * 9.5);
      const mareN = n01(patch, sph.nx * 1.2, sph.ny * 1.2, sph.nz * 1.2);
      const c0 = craterHeight(lx, ly, craters);
      const cdx = craterHeight(lx + 1, ly, craters);
      const cdy = craterHeight(lx, ly + 1, craters);
      let albedo = sampleStops(palette, clamp01(h0 * 0.58 + grain * 0.14 + 0.12));
      if (mareN > 0.6) {
        albedo = mixColor(albedo, mixColor(colors[0], Color.black, 0.34), clamp01((mareN - 0.6) * 1.7));
      }
      albedo = mixColor(albedo, mixColor(albedo, Color.black, 0.45), clamp01(-c0 * 0.85));
      albedo = mixColor(albedo, mixColor(albedo, Color.white, 0.22), clamp01(c0 * 0.5));
      if (minerals) {
        const m = n01(patch, sph.nx * 1.55, sph.ny * 1.55, sph.nz * 1.55 + 2);
        if (m > 0.74) {
          albedo = mixColor(albedo, mineralColor, clamp01((m - 0.74) * 1.35) * 0.38);
        }
      }
      albedo.a = 1;

      const shapeDx = (radiusAt(lx - 1, ly) - radiusAt(lx + 1, ly)) / Math.max(8, rad) * 0.9;
      const shapeDy = (radiusAt(lx, ly - 1) - radiusAt(lx, ly + 1)) / Math.max(8, rad) * 0.9;
      const n = perturbNormal(
        sph,
        h0 * 0.18 + grain * 0.08 + (c0 - cdx) + shapeDx,
        h0 * 0.18 + (c0 - cdy) + shapeDy,
        1.0
      );
      const ndl = n.nx * light.x + n.ny * light.y + n.nz * light.z;
      const earthshine = 0.05 * clamp01(0.35 - ndl);
      const shine = minerals ? specular(n, light, 70, 0.08) : specular(n, light, 110, 0.045);
      const pixel = shadeRgb(albedo, lambert(n, light, 0.04, 0.1) + earthshine, rimLight(n, light, 3.1) * 0.16, shine);
      pixel.a = diskCoverage(dist, rad);
      tex.setPixel(x, y, pixel);
    }
  }
  return tex;
}

export function generateBlackhole(params) {
  const seed = params.seed || 0;
  const size = 256;
  const random = new SS_Random(seed);
  const noise = new Perlin(0.042, 2.1, 0.52, 4, seed, QualityMode.Low);
  const cx = size / 2;
  const cy = size / 2;
  const rh = size * 0.148;
  const tilt = 0.28 + random.range(0, 0.14);
  const swirl = 0.85 + random.range(0, 0.4);
  const inner = rh * 1.42;
  const outer = size * 0.46;
  const tex = new SpriteTexture(size, size);

  function diskSample(u, v) {
    const rho = Math.hypot(u, v / tilt);
    if (rho < inner || rho > outer) return null;
    const t = (rho - inner) / (outer - inner);
    const phi = Math.atan2(v / tilt, u) + swirl * Math.pow(inner / Math.max(rho, 1), 0.72);
    const dens = Math.pow(Math.sin(Math.PI * clamp01(t)), 0.48);
    const turb = n01(noise, rho * 0.065, phi * 2.8, 0);
    const lanes = 0.55 + 0.45 * Math.sin(phi * 5 + rho * 0.08);
    const doppler = 1 + 1.05 * clamp(u / Math.max(rho, 1), -1, 1);
    const heat = clamp01(Math.pow(1 - t, 1.28) * (0.42 + 0.58 * clamp01(doppler * 0.55 + 0.45)));
    const col = heatColor(heat);
    const bright = dens * lanes * (0.28 + 0.82 * turb) * (0.35 + 0.9 * clamp01(doppler));
    return new Color(
      clamp01(col.r * bright * 1.15),
      clamp01(col.g * bright),
      clamp01(col.b * bright * 0.9),
      clamp01(dens * 1.2)
    );
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x - cx;
      const v = y - cy;
      const r = Math.hypot(u, v);
      const ang = Math.atan2(v, u);
      const lens = swirl * rh / Math.max(r, 5);
      const wu = Math.cos(ang + lens) * r;
      const wv = Math.sin(ang + lens) * r;
      const inFront = v > 0;
      const disk = diskSample(wu, wv);

      let pixel = new Color(0, 0, 0, 0);
      const glow = Math.exp(-r / (size * 0.24)) * (0.2 + 0.16 * n01(noise, x * 0.018, y * 0.018, 0));
      if (glow > 0.008) pixel = new Color(0.75 * glow, 0.32 * glow, 0.12 * glow, glow * 0.7);

      if (disk && !inFront) pixel = overColor(pixel, disk);

      if (r > rh && r < rh * 2.6) {
        const inv = (rh * rh) / Math.max(r, 1);
        const lu = Math.cos(ang - lens * 0.55) * inv * 3.4;
        const lv = Math.sin(ang - lens * 0.55) * inv * 3.4;
        const lensed = diskSample(lu, lv);
        if (lensed) {
          const amt = smooth01(1 - Math.abs(r - rh * 1.42) / (rh * 0.95)) * 0.62;
          const src = lensed.clone();
          src.a *= amt;
          pixel = overColor(pixel, src);
        }
      }

      if (r < rh) {
        const edge = smooth01((r - rh * 0.86) / (rh * 0.14));
        pixel = new Color(pixel.r * edge * 0.18, pixel.g * edge * 0.08, pixel.b * edge * 0.05, 1);
      }

      if (disk && inFront) pixel = overColor(pixel, disk);

      const ring = Math.exp(-((r - rh * 1.2) ** 2) / ((rh * 0.042) ** 2));
      if (ring > 0.015) {
        const photon = new Color(1, 0.94, 0.78, ring * 0.95);
        pixel = overColor(pixel, photon);
      }

      tex.setPixel(x, y, pixel);
    }
  }
  return tex;
}

export function generateBackground(params) {
  const { seed, width, height, frequency, lacunarity, persistence, octaves, starCount, tint, brightness } = params;
  const random = new SS_Random(seed);
  const nebula = new Perlin(frequency, lacunarity, persistence, octaves, seed, QualityMode.Low);
  const nebula2 = new Perlin(frequency * 1.65, lacunarity, persistence, Math.max(2, octaves - 2), seed + 9, QualityMode.Low);
  const veins = new Perlin(frequency * 0.55, 2.2, 0.55, Math.max(3, octaves - 1), seed + 17, QualityMode.Low);
  const dust = new RidgedMultifractal(frequency * 3.1, 2.1, Math.min(6, octaves), seed + 3, QualityMode.Low);
  const tex = new SpriteTexture(width, height);
  const accent = new Color(
    clamp01(0.55 + tint.b * 0.45),
    clamp01(tint.r * 0.25 + 0.12),
    clamp01(0.75 + tint.g * 0.2),
    1
  );
  const core = mixColor(tint, Color.white, 0.35);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n1 = clamp01((nebula.getValue(x, 0, y) + 1) * 0.5);
      const n2 = clamp01((nebula2.getValue(x * 0.72, 4, y * 0.72) + 1) * 0.5);
      const n3 = clamp01((veins.getValue(x, y, 0) + 1) * 0.5);
      const d = clamp01((dust.getValue(x, y, 0) + 1) * 0.5);
      const blob = Math.pow(n1, 1.35);
      let col = mixColor(new Color(0.012, 0.016, 0.045, 1), tint, blob * brightness);
      col = mixColor(col, accent, Math.pow(n2, 1.6) * brightness * 0.5);
      col = mixColor(col, core, Math.pow(n3, 2.2) * brightness * 0.28);
      col = mixColor(col, Color.black, d * 0.32);
      col.a = 1;
      tex.setPixel(x, y, col);
    }
  }

  for (let i = 0; i < starCount; i++) {
    const x = random.range(0, width);
    const y = random.range(0, height);
    const mag = Math.pow(random.range(0, 1), 1.65);
    const warm = random.range(0, 1);
    const col = warm > 0.72
      ? new Color(0.68, 0.8, 1, 1)
      : warm < 0.18
        ? new Color(1, 0.78, 0.55, 1)
        : warm > 0.45 && warm < 0.52
          ? new Color(1, 0.92, 0.75, 1)
          : Color.white;
    const coreA = 0.55 + mag * 0.7;
    const cur = tex.getPixel(x, y);
    tex.setPixel(x, y, new Color(
      clamp01(cur.r + col.r * coreA),
      clamp01(cur.g + col.g * coreA),
      clamp01(cur.b + col.b * coreA),
      1
    ));
    if (mag > 0.55) {
      stampGlow(tex, x, y, 1.2 + mag * 2.0, new Color(col.r, col.g, col.b, 0.38 * mag));
    }
    if (mag > 0.86 && x > 2 && y > 2 && x < width - 3 && y < height - 3) {
      const spike = 0.42 * mag;
      for (let s = 1; s <= 2; s++) {
        for (const [sx, sy] of [[s, 0], [-s, 0], [0, s], [0, -s]]) {
          const p = tex.getPixel(x + sx, y + sy);
          const k = spike * (s === 1 ? 1 : 0.45);
          tex.setPixel(x + sx, y + sy, new Color(clamp01(p.r + k * col.r), clamp01(p.g + k * col.g), clamp01(p.b + k * col.b), 1));
        }
      }
    }
  }
  return tex;
}

export function randomizePlanet(state) {
  const next = { ...state };
  if (!next.customSeed) next.seed = unityRandomInt(0, 100000000);
  if (!next.customSize) next.size = pick(next.availableSizes);
  if (!next.customScale) next.scale = unityRandomFloat(1, 2);
  if (!next.customColors) next.colors = generateColorWheelColors(next.seed, 3);
  if (!next.customPlanetType) {
    next.planetType = unityRandomInt(0, 2);
    if (next.planetType === PlanetType.Gas_Giant) next.atmosphere = false;
  }
  if (!next.customOceans) next.oceans = unityRandomInt(0, 2) > 0;
  if (next.oceans) {
    next.colors = [...next.colors];
    next.colors[0] = next.oceanColor;
  }
  if (!next.customClouds) {
    if (next.planetType === PlanetType.Terrestrial) {
      next.clouds = unityRandomInt(0, 2) > 0;
      next.cloudDensity = unityRandomFloat(0.25, 0.75);
      next.cloudTransparency = unityRandomFloat(0.25, 0.75);
    } else {
      next.clouds = false;
    }
  }
  if (!next.customAtmosphere) {
    next.atmosphere = unityRandomInt(0, 2) > 0;
    if (next.planetType === PlanetType.Terrestrial && next.oceans) next.atmosphere = true;
  }
  if (!next.customCity) {
    next.city = unityRandomInt(0, 2) > 0;
    if (next.city) next.cityDensity = unityRandomFloat(0.9, 1);
  }
  if (next.planetType === PlanetType.Gas_Giant || !next.oceans) next.city = false;
  return next;
}

export function randomizeSun(state) {
  const next = { ...state };
  if (!next.customSeed) next.seed = unityRandomInt(0, 100000000);
  if (!next.customSize) next.size = pick(next.availableSizes);
  if (!next.customScale) next.scale = unityRandomFloat(1, 2);
  if (!next.customColor) next.mainColor = pick(next.availableColors);
  return next;
}

export function randomizeMoon(state) {
  const next = { ...state };
  if (!next.customSeed) next.seed = unityRandomInt(0, 100000000);
  if (!next.customSize) next.size = pick(next.availableSizes);
  if (!next.customRoughness) next.roughness = unityRandomFloat(0, 1);
  if (!next.customScale) next.scale = unityRandomFloat(1, 2);
  if (!next.customColors) next.colors = generateColorWheelColors(next.seed, 3);
  return next;
}

export function randomizeAsteroid(state) {
  const next = { ...state };
  if (!next.customSeed) next.seed = unityRandomInt(0, 100000000);
  if (!next.customSize) next.size = pick(next.availableSizes);
  if (!next.customScale) next.scale = unityRandomFloat(1, 2);
  if (!next.customColors) {
    const raw = generateColorWheelColors(next.seed, 3);
    next.colors = raw.map((c, i) => {
      const grey = 0.34 + i * 0.15;
      return mixColor(new Color(grey, grey * 0.97, grey * 0.92), c, 0.2);
    });
  }
  if (!next.customMinerals) next.minerals = unityRandomInt(0, 5) > 2;
  if (!next.customMineralColor) next.mineralColor = pick(next.availableMineralColors);
  return next;
}

export function randomizeBlackhole(state) {
  const next = { ...state };
  if (!next.customSeed) next.seed = unityRandomInt(0, 100000000);
  if (!next.customScale) next.scale = unityRandomFloat(1, 2);
  return next;
}

export function randomizeBackground(state) {
  const next = { ...state };
  if (!next.customSeed) next.seed = unityRandomInt(0, 100000000);
  if (!next.customSize) next.size = pick(next.availableSizes);
  if (!next.customStarCount) next.starCount = unityRandomInt(next.starCountMin, next.starCountMax);
  if (!next.customTint) {
    next.tint = new Color(unityRandomFloat(0, 1), unityRandomFloat(0, 1), unityRandomFloat(0, 1), 1);
  }
  if (!next.customBrightness) next.brightness = unityRandomFloat(next.brightnessMin, next.brightnessMax);
  return next;
}
