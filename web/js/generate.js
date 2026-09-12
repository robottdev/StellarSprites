import { Color } from "./core.js";
import {
  generatePlanet, generateSun, generateMoon, generateAsteroid, generateBlackhole, generateBackground,
  randomizePlanet, randomizeSun, randomizeMoon, randomizeAsteroid, randomizeBlackhole, randomizeBackground,
} from "./celestial.js";
import { generateShip, generateStation, randomizeShip, randomizeStation } from "./craft.js";
import { generateSolarSystem, randomizeScene } from "./scene.js";

function reviveColor(c) {
  if (!c) return Color.white.clone();
  if (c instanceof Color) return c;
  return new Color(c.r, c.g, c.b, c.a ?? 1);
}

function reviveColors(arr) {
  return (arr || []).map(reviveColor);
}

export function reviveParams(type, params) {
  const p = { ...params };
  if (p.colors) p.colors = reviveColors(p.colors);
  if (p.mainColor) p.mainColor = reviveColor(p.mainColor);
  if (p.tint) p.tint = reviveColor(p.tint);
  if (p.mineralColor) p.mineralColor = reviveColor(p.mineralColor);
  if (p.oceanColor) p.oceanColor = reviveColor(p.oceanColor);
  if (p.starColor) p.starColor = reviveColor(p.starColor);
  if (p.availableColors) p.availableColors = reviveColors(p.availableColors);
  if (p.availableMineralColors) p.availableMineralColors = reviveColors(p.availableMineralColors);
  return p;
}

export function randomize(type, state) {
  const s = reviveParams(type, state);
  switch (type) {
    case "ship": return randomizeShip(s);
    case "planet": return randomizePlanet(s);
    case "sun": return randomizeSun(s);
    case "moon": return randomizeMoon(s);
    case "asteroid": return randomizeAsteroid(s);
    case "station": return randomizeStation(s);
    case "blackhole": return randomizeBlackhole(s);
    case "background": return randomizeBackground(s);
    case "scene": return randomizeScene(s);
    default: return s;
  }
}

export function generateSprite(type, rawParams) {
  const params = reviveParams(type, rawParams);
  let texture;
  if (type === "ship") {
    texture = generateShip(params).texture;
  } else if (type === "station") {
    texture = generateStation(params).texture;
  } else if (type === "planet") {
    texture = generatePlanet(params);
  } else if (type === "sun") {
    texture = generateSun(params);
  } else if (type === "moon") {
    texture = generateMoon(params);
  } else if (type === "asteroid") {
    texture = generateAsteroid(params);
  } else if (type === "blackhole") {
    texture = generateBlackhole(params);
  } else if (type === "background") {
    texture = generateBackground({
      ...params,
      width: params.size,
      height: params.size,
    });
  } else if (type === "scene") {
    const result = generateSolarSystem(params);
    return {
      width: result.texture.width,
      height: result.texture.height,
      pixels: result.texture.toRgbaBytes(),
      scene: result.scene,
    };
  } else {
    throw new Error("Unknown generator: " + type);
  }
  return {
    width: texture.width,
    height: texture.height,
    pixels: texture.toRgbaBytes(),
  };
}
