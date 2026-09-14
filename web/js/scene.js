import {
  Color, SpriteTexture, SS_Random, clamp, mixColor, overColor,
  hsvToRgb, unityRandomInt,
} from "./core.js?v=a15";
import {
  generatePlanet, generateSun, generateMoon, generateAsteroid, generateBlackhole,
  generateBackground, PlanetType,
} from "./celestial.js?v=a15";
import { generateShip, generateStation } from "./craft.js?v=a15";

const STAR_PALETTE = [
  new Color(1, 0.92, 0.55, 1),
  new Color(1, 0.98, 0.9, 1),
  new Color(1, 0.45, 0.22, 1),
  new Color(0.55, 0.72, 1, 1),
];

const NAME_A = ["Ke", "Hel", "Nyx", "Va", "Ori", "Sol", "Ash", "Mir", "Tal", "Rho", "Zan", "Ixi", "Aer", "Lum", "Ves"];
const NAME_B = ["lara", "ion", "thos", "ara", "nys", "vos", "era", "don", "sil", "mir", "eth", "ora", "uin", "ax"];

function colorFromSeed(seed, offset) {
  const h = ((seed * 0.000137 + offset) % 1 + 1) % 1;
  const [r, g, b] = hsvToRgb(h, 0.48 + (seed % 7) * 0.04, 0.78);
  return new Color(r, g, b, 1);
}

function paletteFromSeed(seed) {
  return [
    colorFromSeed(seed, 0.02),
    colorFromSeed(seed + 19, 0.33),
    colorFromSeed(seed + 41, 0.66),
  ];
}

function pick(random, list) {
  return list[random.range(0, list.length)];
}

function packTexture(tex) {
  return { width: tex.width, height: tex.height, pixels: tex.toRgbaBytes() };
}

function bodyName(random, prefix) {
  return prefix + " " + pick(random, NAME_A) + pick(random, NAME_B);
}

function qualitySizes(quality) {
  if (quality < 0.5) {
    return {
      sun: 48, planet: 32, moon: 24, asteroid: 48, station: 48,
      ship: 64, bg: 64, map: 256, hole: 64,
    };
  }
  return {
    sun: 192, planet: 512, moon: 56, asteroid: 96, station: 128,
    ship: 128, bg: 2048, map: 512, hole: 256,
  };
}

function blitCentered(dest, src, cx, cy, destSize) {
  const dw = Math.max(2, destSize | 0);
  const x0 = Math.floor(cx - dw / 2);
  const y0 = Math.floor(cy - dw / 2);
  for (let y = 0; y < dw; y++) {
    const sy = Math.min(src.height - 1, Math.max(0, ((y + 0.5) / dw) * src.height | 0));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(src.width - 1, Math.max(0, ((x + 0.5) / dw) * src.width | 0));
      const p = src.getPixel(sx, sy);
      if (p.a < 0.03) continue;
      dest.setPixel(x0 + x, y0 + y, overColor(dest.getPixel(x0 + x, y0 + y), p));
    }
  }
}

function planetParams(seed, size, kind, colors, lightAngle) {
  const terrestrial = kind === "terrestrial";
  return {
    seed,
    size,
    colors,
    planetType: terrestrial ? PlanetType.Terrestrial : PlanetType.Gas_Giant,
    oceans: terrestrial,
    clouds: terrestrial,
    cloudDensity: 0.42,
    cloudTransparency: 0.4,
    atmosphere: true,
    city: terrestrial && (seed % 3 === 0),
    cityDensity: 0.94,
    lightAngle,
    oceanColor: colors[0],
  };
}

export function randomizeScene(state) {
  const next = { ...state };
  if (!next.customSeed) next.seed = unityRandomInt(0, 100000000);
  if (!next.customPlanetCount) next.planetCount = unityRandomInt(4, 8);
  if (next.beltChance == null) next.beltChance = 0.45;
  if (!next.customStation) next.station = unityRandomInt(0, 2) > 0;
  if (!next.customHole) next.blackHole = unityRandomInt(0, 100) < 16;
  if (!next.customStarColor) next.starColor = STAR_PALETTE[unityRandomInt(0, STAR_PALETTE.length)];
  if (!next.customQuality) next.quality = 1;
  return next;
}

export function generateSolarSystem(params) {
  const seed = params.seed | 0;
  const random = new SS_Random(seed);
  const planetCount = clamp(params.planetCount | 0, 3, 8);
  const quality = params.quality == null ? 1 : params.quality;
  const sizes = qualitySizes(quality);
  let beltChance = params.beltChance;
  if (beltChance == null && params.belt === true) beltChance = 1;
  if (beltChance == null && params.belt === false) beltChance = 0;
  beltChance = clamp(beltChance == null ? 0.45 : beltChance, 0, 1);
  const includeBelt = beltChance >= 1 || (beltChance > 0 && random.range(0, 1) < beltChance);
  const includeStation = !!params.station;
  const includeHole = !!params.blackHole && quality >= 0.5;
  const starColor = params.starColor || STAR_PALETTE[0];
  const lightAngle = 180;

  const sprites = [];
  const pushSprite = (tex) => {
    const idx = sprites.length;
    sprites.push(packTexture(tex));
    return idx;
  };

  const starName = pick(random, NAME_A) + pick(random, NAME_B);
  const au = 780;
  const sunRadius = 250;
  const sunTex = generateSun({ seed, size: sizes.sun, mainColor: starColor });
  const sunSprite = pushSprite(sunTex);

  const bgTex = generateBackground({
    seed: seed + 19,
    width: sizes.bg,
    height: sizes.bg,
    frequency: 0.018 * (256 / Math.max(64, sizes.bg)),
    lacunarity: 2.1,
    persistence: 0.48,
    octaves: quality < 0.5 ? 3 : 5,
    starCount: quality < 0.5 ? 40 : Math.min(900, Math.round(0.00017 * sizes.bg * sizes.bg)),
    tint: mixColor(starColor, new Color(0.16, 0.22, 0.48, 1), 0.62),
    brightness: 0.42,
  });
  const bgSprite = pushSprite(bgTex);

  const planets = [];
  let beltInner = 0;
  let beltOuter = 0;

  for (let i = 0; i < planetCount; i++) {
    const dist = au * (1.05 + i * 0.82 + random.range(0, 0.12));
    const ang = (i / planetCount) * Math.PI * 2 + random.range(-0.35, 0.35);
    const isGas = i >= Math.max(2, planetCount - 3);
    const kind = isGas ? "gas" : "terrestrial";
    const colors = paletteFromSeed(seed + 31 + i * 17);
    if (kind === "terrestrial") {
      colors[0] = mixColor(colors[0], new Color(0.12, 0.38, 0.7, 1), 0.45);
    }
    const pRadius = isGas
      ? 95 + random.range(0, 50)
      : 48 + random.range(0, 28);
    const pSeed = seed + 200 + i * 97;
    const tex = generatePlanet(planetParams(pSeed, sizes.planet, kind, colors, lightAngle));
    const spriteIndex = pushSprite(tex);
    const moons = [];
    const moonCount = isGas ? random.range(1, 4) : random.range(0, 3);
    for (let m = 0; m < moonCount; m++) {
      const mSeed = pSeed + 11 + m * 13;
      const mColors = paletteFromSeed(mSeed);
      const mTex = generateMoon({
        seed: mSeed,
        size: sizes.moon,
        roughness: 0.35 + random.range(0, 0.5),
        colors: mColors,
        lightAngle,
      });
      moons.push({
        name: starName + "-" + (i + 1) + String.fromCharCode(98 + m),
        spriteIndex: pushSprite(mTex),
        radius: 14 + random.range(0, 10),
        orbitRadius: pRadius * (1.7 + m * 0.55 + random.range(0, 0.2)),
        orbitSpeed: 0.55 / (1 + m * 0.35),
        phase: random.range(0, Math.PI * 2),
      });
    }
    const planet = {
      name: bodyName(random, starName),
      kind,
      spriteIndex,
      radius: pRadius,
      x: Math.cos(ang) * dist,
      y: Math.sin(ang) * dist,
      moons,
    };
    planets.push(planet);
    if (includeBelt && i === Math.min(1, planetCount - 2)) {
      beltInner = dist + pRadius * 2.2;
    }
    if (includeBelt && i === Math.min(2, planetCount - 1) && !beltOuter) {
      beltOuter = dist - pRadius * 2.2;
    }
  }

  if (includeBelt && beltOuter <= beltInner) {
    const d0 = Math.hypot(planets[0].x, planets[0].y);
    const d2 = Math.hypot(planets[Math.min(2, planets.length - 1)].x, planets[Math.min(2, planets.length - 1)].y);
    beltInner = d0 * 1.25;
    beltOuter = d2 * 0.88;
  }

  const asteroids = [];
  const rocks = [];
  if (includeBelt && beltOuter > beltInner) {
    const unique = quality < 0.5 ? 2 : 4;
    for (let a = 0; a < unique; a++) {
      const shade = 0.08 * (a - 1);
      const aColors = [
        new Color(0.40 + shade, 0.40 + shade, 0.39 + shade),
        new Color(0.56 + shade, 0.55 + shade, 0.53 + shade),
        new Color(0.72 + shade, 0.71 + shade, 0.68 + shade),
      ];
      const mineralColors = [
        new Color(0.92, 0.74, 0.18, 1),
        new Color(0.82, 0.22, 0.16, 1),
        new Color(0.25, 0.72, 0.78, 1),
        new Color(0.88, 0.55, 0.18, 1),
      ];
      const aTex = generateAsteroid({
        seed: seed + 800 + a * 9,
        size: sizes.asteroid,
        colors: aColors,
        minerals: a % 2 === 0,
        mineralColor: mineralColors[a % mineralColors.length],
        lightAngle,
      });
      asteroids.push(pushSprite(aTex));
    }
    const count = quality < 0.5 ? 10 : 28;
    for (let r = 0; r < count; r++) {
      const rad = beltInner + ((r * 17) % 1000) / 1000 * (beltOuter - beltInner);
      const ang = random.range(0, Math.PI * 2);
      rocks.push({
        spriteIndex: asteroids[r % asteroids.length],
        radius: 10 + (r % 5) * 2,
        x: Math.cos(ang) * rad,
        y: Math.sin(ang) * rad,
        heading: random.range(0, Math.PI * 2),
        spin: (random.range(0, 1) - 0.5) * 0.8,
      });
    }
  }

  let station = null;
  if (includeStation) {
    const host = planets.find((p) => p.kind === "terrestrial") || planets[0];
    const stTex = generateStation({
      seed: seed + 50,
      colors: [new Color(0.55, 0.58, 0.62, 1), mixColor(starColor, Color.cyan, 0.4)],
      colorDetail: 0.04,
      numberOfPods: 6,
    }).texture;
    station = {
      name: starName + " Anchorage",
      spriteIndex: pushSprite(stTex),
      radius: 28,
      parent: planets.indexOf(host),
      orbitRadius: host.radius * 2.4,
      orbitSpeed: 0.28,
      phase: random.range(0, Math.PI * 2),
    };
  }

  let hole = null;
  if (includeHole) {
    const hTex = generateBlackhole({ seed: seed + 66 });
    hole = {
      name: starName + " Singularity",
      spriteIndex: pushSprite(hTex),
      radius: 70,
      x: planets[planets.length - 1].x * 1.35,
      y: planets[planets.length - 1].y * 1.35,
    };
  }

  const playerShip = generateShip({
    seed: seed + 1,
    shipType: 0,
    bodyDetail: 0.03,
    wingDetail: 0.08,
    colors: [new Color(0.7, 0.73, 0.76, 1), new Color(0.85, 0.2, 0.16, 1)],
    colorDetail: 0.08,
  });
  const shipSprite = pushSprite(playerShip.texture);

  const npcShips = [];
  const npcCount = quality < 0.5 ? 1 : 3;
  for (let n = 0; n < npcCount; n++) {
    const nTex = generateShip({
      seed: seed + 400 + n * 13,
      shipType: (n + 1) % 4,
      bodyDetail: 0.04,
      wingDetail: 0.07,
      colors: [paletteFromSeed(seed + 410 + n)[0], paletteFromSeed(seed + 411 + n)[1]],
      colorDetail: 0.07,
    }).texture;
    const host = planets[Math.min(n + 1, planets.length - 1)];
    const heading = random.range(0, Math.PI * 2);
    npcShips.push({
      name: (n % 2 ? "Patrol " : "Hauler ") + (n + 1),
      spriteIndex: pushSprite(nTex),
      radius: 22,
      x: host.x + Math.cos(heading) * (host.radius + 80),
      y: host.y + Math.sin(heading) * (host.radius + 80),
      heading,
      speed: 28 + n * 10,
    });
  }

  let worldRadius = sunRadius + 400;
  for (const p of planets) worldRadius = Math.max(worldRadius, Math.hypot(p.x, p.y) + p.radius + 200);
  if (hole) worldRadius = Math.max(worldRadius, Math.hypot(hole.x, hole.y) + 200);

  const map = new SpriteTexture(sizes.map, sizes.map);
  const mapScale = (sizes.map * 0.42) / worldRadius;
  const mcx = sizes.map / 2;
  const mcy = sizes.map / 2;
  for (let y = 0; y < sizes.map; y++) {
    for (let x = 0; x < sizes.map; x++) {
      const bx = ((x * sizes.bg) / sizes.map) | 0;
      const by = ((y * sizes.bg) / sizes.map) | 0;
      map.setPixel(x, y, bgTex.getPixel(bx % sizes.bg, by % sizes.bg));
    }
  }

  blitCentered(map, sunTex, mcx, mcy, Math.max(28, sunRadius * mapScale * 2.4));
  for (const p of planets) {
    const ptex = textureFromPack(sprites[p.spriteIndex]);
    const x = mcx + p.x * mapScale;
    const y = mcy + p.y * mapScale;
    blitCentered(map, ptex, x, y, Math.max(16, Math.min(40, p.radius * mapScale * 3.2)));
    for (const m of p.moons) {
      const mx = x + Math.cos(m.phase) * Math.max(10, m.orbitRadius * mapScale * 0.35);
      const my = y + Math.sin(m.phase) * Math.max(10, m.orbitRadius * mapScale * 0.35);
      blitCentered(map, textureFromPack(sprites[m.spriteIndex]), mx, my, 7);
    }
  }
  if (station) {
    const host = planets[station.parent] || planets[0];
    blitCentered(map, textureFromPack(sprites[station.spriteIndex]), mcx + host.x * mapScale + 12, mcy + host.y * mapScale - 8, 14);
  }
  if (includeBelt && rocks.length) {
    for (let i = 0; i < rocks.length; i += 3) {
      const r = rocks[i];
      blitCentered(map, textureFromPack(sprites[r.spriteIndex]), mcx + r.x * mapScale, mcy + r.y * mapScale, 5);
    }
  }

  const home = planets[Math.min(1, planets.length - 1)];
  const scene = {
    seed,
    starName,
    worldRadius,
    background: { spriteIndex: bgSprite, width: sizes.bg, height: sizes.bg },
    sun: { name: starName, spriteIndex: sunSprite, radius: sunRadius, color: { r: starColor.r, g: starColor.g, b: starColor.b } },
    planets,
    belt: includeBelt ? { inner: beltInner, outer: beltOuter, rocks } : null,
    station,
    hole,
    player: {
      spriteIndex: shipSprite,
      radius: 26,
      x: home.x + home.radius * 2.4,
      y: home.y + 40,
      heading: 0,
    },
    npcs: npcShips,
    sprites,
  };

  return { texture: map, scene };
}

function textureFromPack(pack) {
  const tex = new SpriteTexture(pack.width, pack.height);
  const src = pack.pixels;
  for (let i = 0; i < src.length; i += 4) {
    tex.data[i] = src[i] / 255;
    tex.data[i + 1] = src[i + 1] / 255;
    tex.data[i + 2] = src[i + 2] / 255;
    tex.data[i + 3] = src[i + 3] / 255;
  }
  return tex;
}
