import { Perlin, Voronoi, QualityMode, generatePlanarNormalized } from "./libnoise.js";
import {
  Color, SpriteTexture, SS_Random, clamp, clamp01, distance, DEG2RAD,
  createGradient, generateColorWheelColors, unityRandomInt, unityRandomFloat, pick,
} from "./core.js";

export const PlanetType = { Gas_Giant: 0, Terrestrial: 1 };

export function generatePlanet(params) {
  const {
    seed, size, colors, planetType, oceans, clouds, cloudDensity,
    cloudTransparency, atmosphere, city, cityDensity, lightAngle,
  } = params;

  const random = new SS_Random(seed);
  const noise = new Perlin(0.01, 2, 0.5, 8, seed, QualityMode.High);
  const cloudNoise = new Perlin(0.02, 2, 0.5, 12, seed + 1, QualityMode.Low);

  const radius = size * 0.9;
  const settleLevel = random.range(0.25, 0.75);
  let atmosphereThickness = random.range((size * 0.01) | 0, (size * 0.05) | 0);
  atmosphereThickness = clamp(atmosphereThickness, 8, 16);

  const gradientColors = createGradient(colors, 16, 32);
  const centerX = size / 2;
  const centerY = size / 2;
  const lightX = centerX + Math.cos(lightAngle * DEG2RAD) * (size / 4);
  const lightY = centerY + Math.sin(lightAngle * DEG2RAD) * (size / 4);
  const tex = new SpriteTexture(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = distance(x, y, centerX, centerY);
      const distNorthPole = distance(x, size - 1, centerX, centerY);

      if (dist <= radius / 2) {
        let planetNoise = (noise.getValue(x, y, 0) + 1) * 0.5;
        planetNoise = clamp01(planetNoise);

        if (planetType === PlanetType.Gas_Giant) {
          let n = noise.getValue(dist / 10 + planetNoise * 10, y - distNorthPole / 5 + planetNoise * 10, 0);
          n = clamp01((n + 1) * 0.5);
          n *= gradientColors.length - 1;
          tex.setPixel(x, y, gradientColors[n | 0]);
        } else {
          let pixelColor;
          if (oceans) {
            if (planetNoise > settleLevel) {
              const n = planetNoise * (gradientColors.length - 1);
              pixelColor = gradientColors[n | 0].mul(planetNoise);
              pixelColor.a = 1;
            } else {
              const n = planetNoise * ((gradientColors.length - 1) / colors.length);
              pixelColor = gradientColors[n | 0].clone();
            }
          } else {
            const n = planetNoise * (gradientColors.length - 1);
            pixelColor = gradientColors[n | 0].clone();
          }
          pixelColor.a = 1;
          tex.setPixel(x, y, pixelColor);

          if (clouds) {
            let cloud = clamp01((cloudNoise.getValue(x, y, 0) + 1) * 0.5);
            if (cloud >= cloudDensity) {
              const planetColor = tex.getPixel(x, y);
              const alpha = cloudTransparency * cloud;
              tex.setPixel(x, y, new Color(
                alpha * 1 + (1 - alpha) * planetColor.r,
                alpha * 1 + (1 - alpha) * planetColor.g,
                alpha * 1 + (1 - alpha) * planetColor.b,
                1
              ));
            }
          }
        }
      }

      if (atmosphere) {
        const current = tex.getPixel(x, y);
        if (current.equals(Color.clear)) {
          const distToEdge = distance(x, y, centerX, centerY);
          if (distToEdge < radius / 2 + atmosphereThickness && distToEdge > radius / 2) {
            const atmosphereColor = gradientColors[0].clone();
            let dist2 = dist - radius / 2;
            dist2 = (atmosphereThickness - dist2) / atmosphereThickness;
            atmosphereColor.a = dist2;
            tex.setPixel(x, y, atmosphereColor);
          }
        }
      }

      if (dist <= radius / 2 + atmosphereThickness) {
        let lightDistance = distance(x, y, lightX, lightY);
        lightDistance = 1 - lightDistance / (size / 2);
        if (lightDistance < 0.025) lightDistance = 0.025;
        const lightingColor = tex.getPixel(x, y);
        lightingColor.r *= lightDistance;
        lightingColor.g *= lightDistance;
        lightingColor.b *= lightDistance;
        tex.setPixel(x, y, lightingColor);
      }

      if (city && dist <= radius / 2) {
        const lightDistance = distance(x, y, lightX, lightY);
        if (lightDistance > radius / 2 + atmosphereThickness) {
          let pixelNoise = clamp01((noise.getValue(x, y, 0) + 1) * 0.5);
          if (pixelNoise > settleLevel && pixelNoise < settleLevel + 0.05) {
            if (random.range(0, 1) > cityDensity) {
              const newColor = Color.white.mul(0.65).add(Color.yellow.mul(0.85)).mul(random.range(0.5, 0.8));
              newColor.a = 1;
              tex.setPixel(x, y, newColor);
            }
          }
        }
      }
    }
  }

  return tex;
}

export function generateSun(params) {
  const { seed, size, mainColor } = params;
  const noise = new Perlin(0.05, 2, 0.5, 8, seed, QualityMode.Low);
  const noiseGlow = new Perlin(0.005, 2, 0.5, 6, seed, QualityMode.Low);
  const radius = size * 0.75;
  const tmp = [Color.white, mainColor, new Color(255 / 255, 102 / 255, 0, 1)];
  const gradient = createGradient(tmp, 8, 32);
  const centerX = size / 2;
  const centerY = size / 2;
  const atmosphereThickness = size * 0.125;
  const tex = new SpriteTexture(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = distance(x, y, centerX, centerY);
      if (dist <= radius / 2) {
        let n = clamp01((noise.getValue(x, y, 0) + 1) * 0.5);
        n *= gradient.length - 1;
        const baseColor = gradient[n | 0].clone();
        const hotA = dist / (radius / 2) + 0.0025;
        const c = new Color(
          clamp(baseColor.r + hotA, 0, 1),
          clamp(baseColor.g + hotA, 0, 1),
          clamp(baseColor.b + hotA, 0, 1),
          1
        );
        tex.setPixel(x, y, c);
      }

      const currentPixel = tex.getPixel(x, y);
      if (currentPixel.equals(Color.clear)) {
        const distToEdge = distance(x, y, centerX, centerY);
        if (distToEdge < radius / 2 + atmosphereThickness && distToEdge > radius / 2) {
          let dist2 = dist - radius / 2;
          dist2 = (atmosphereThickness - dist2) / atmosphereThickness;
          let glowNoise = clamp01((noiseGlow.getValue(x, y, 0) + 1) * 0.5);
          const atmosphereColor = new Color(1, 1, 1, Math.pow(dist2, 2) * glowNoise);
          tex.setPixel(x, y, atmosphereColor);
        }
      }
    }
  }
  return tex;
}

export function generateMoon(params) {
  const { seed, size, roughness, colors, lightAngle } = params;
  const gradientColors = createGradient(colors, 16, 32);
  const perlin = new Perlin(0.01, 2, 0.5, 8, seed, QualityMode.High);
  const centerX = size / 2;
  const centerY = size / 2;
  const lightX = centerX + Math.cos(lightAngle * DEG2RAD) * (size / 4);
  const lightY = centerY + Math.sin(lightAngle * DEG2RAD) * (size / 4);
  const tex = new SpriteTexture(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = distance(x, y, centerX, centerY);
      let edgeNoise = clamp01((perlin.getValue(x, y, 0) + 1) * 0.5);
      edgeNoise *= 8 * roughness;
      if (dist < size / 2 - edgeNoise) {
        const pixelNoise = clamp01((perlin.getValue(x, y, 0) + 1) * 0.5);
        const n = pixelNoise * (gradientColors.length - 1);
        const pixelColor = gradientColors[n | 0].clone();
        pixelColor.a = 1;
        let lightDistance = 1 - distance(x, y, lightX, lightY) / (size / 2);
        if (lightDistance < 0.025) lightDistance = 0.025;
        pixelColor.r *= lightDistance;
        pixelColor.g *= lightDistance;
        pixelColor.b *= lightDistance;
        tex.setPixel(x, y, pixelColor);
      }
    }
  }
  return tex;
}

export function generateAsteroid(params) {
  const { seed, size, colors, minerals, mineralColor, lightAngle } = params;
  const gradientColors = createGradient(colors, 4, 8);
  const perlin = new Perlin(0.01, 2, 0.5, 8, seed, QualityMode.Low);
  const mineralNoise = new Voronoi(0.1, 0.25, seed + 1, true);
  const centerX = size / 2;
  const centerY = size / 2;
  const lightX = centerX + Math.cos(lightAngle * DEG2RAD) * (size / 4);
  const lightY = centerY + Math.sin(lightAngle * DEG2RAD) * (size / 4);
  const tex = new SpriteTexture(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = distance(x, y, centerX, centerY);
      let edgeNoise = clamp01((perlin.getValue(x, y, 0) + 1) * 0.5) * 16;
      if (dist < size / 2 - edgeNoise) {
        const pixelNoise = clamp01((perlin.getValue(x, y, 0) + 1) * 0.5);
        const n = pixelNoise * (gradientColors.length - 1);
        const pixelColor = gradientColors[n | 0].clone();
        pixelColor.a = 1;
        if (minerals) {
          let mineralAlpha = clamp01((1 + mineralNoise.getValue(x, y, 0)) * 0.5);
          if (mineralAlpha > 0.65) {
            pixelColor.r = mineralAlpha * mineralColor.r + (1 - mineralAlpha) * pixelColor.r;
            pixelColor.g = mineralAlpha * mineralColor.g + (1 - mineralAlpha) * pixelColor.g;
            pixelColor.b = mineralAlpha * mineralColor.b + (1 - mineralAlpha) * pixelColor.b;
            pixelColor.a = 1;
          }
        }
        let lightDistance = 1 - distance(x, y, lightX, lightY) / (size / 2);
        if (lightDistance < 0.025) lightDistance = 0.025;
        pixelColor.r *= lightDistance;
        pixelColor.g *= lightDistance;
        pixelColor.b *= lightDistance;
        tex.setPixel(x, y, pixelColor);
      }
    }
  }
  return tex;
}

export function generateBlackhole(_params) {
  const size = 256;
  const radius = size * 0.75;
  const centerX = size / 2;
  const centerY = size / 2;
  const atmosphereThickness = size * 0.125;
  const tex = new SpriteTexture(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = distance(x, y, centerX, centerY);
      if (dist <= radius / 2) {
        tex.setPixel(x, y, Color.black);
      }
      const currentPixel = tex.getPixel(x, y);
      if (currentPixel.equals(Color.clear)) {
        const distToEdge = distance(x, y, centerX, centerY);
        if (distToEdge < radius / 2 + atmosphereThickness && distToEdge > radius / 2) {
          const dist2 = dist - radius / 2;
          tex.setPixel(x, y, new Color(0, 0, 0, (atmosphereThickness - dist2) / atmosphereThickness));
        }
      }
    }
  }
  return tex;
}

export function generateBackground(params) {
  const { seed, width, height, frequency, lacunarity, persistence, octaves, starCount, tint, brightness } = params;
  const random = new SS_Random(seed);
  const perlin = new Perlin(frequency, lacunarity, persistence, octaves, seed, QualityMode.Low);
  const noiseData = generatePlanarNormalized(perlin, width, height);
  const tex = new SpriteTexture(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const n = noiseData[x + y * width];
      const pixelColor = tint.mul(n * brightness);
      pixelColor.a = 1;
      tex.setPixel(x, y, pixelColor);
    }
  }
  for (let i = 0; i < starCount; i++) {
    const x = random.range(0, width - 1);
    const y = random.range(0, height - 1);
    const star = Color.white.mul(random.range(0.5, 1));
    star.a = 1;
    tex.setPixel(x, y, star);
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
  if (!next.customColors) next.colors = generateColorWheelColors(next.seed, 3);
  if (!next.customMinerals) next.minerals = unityRandomInt(0, 2) > 0;
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
