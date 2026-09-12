import { generateSprite } from "./js/generate.js";
import { Color } from "./js/core.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function coverage(pixels) {
  let opaque = 0;
  for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 8) opaque++;
  return opaque / (pixels.length / 4);
}

const jobs = [
  ["ship-interceptor", "ship", { seed: 42, shipType: 0, bodyDetail: 0.01, wingDetail: 0.08, colors: [Color.grey, Color.red], colorDetail: 0.06 }],
  ["ship-gunship", "ship", { seed: 88, shipType: 1, bodyDetail: 0.04, wingDetail: 0.06, colors: [new Color(0.5, 0.52, 0.55), new Color(0.2, 0.55, 0.85)], colorDetail: 0.05 }],
  ["ship-hauler", "ship", { seed: 21, shipType: 2, bodyDetail: 0.05, wingDetail: 0.04, colors: [new Color(0.45, 0.48, 0.5), new Color(0.85, 0.45, 0.1)], colorDetail: 0.04 }],
  ["ship-carrier", "ship", { seed: 7, shipType: 3, bodyDetail: 0.03, wingDetail: 0.05, colors: [new Color(0.55, 0.58, 0.62), new Color(0.95, 0.4, 0.12)], colorDetail: 0.05 }],
  ["planet", "planet", { seed: 7, size: 64, colors: [Color.blue, Color.green, Color.red], planetType: 1, oceans: true, clouds: true, cloudDensity: 0.4, cloudTransparency: 0.4, atmosphere: true, city: true, cityDensity: 0.92, lightAngle: 180 }],
  ["planet-gas", "planet", { seed: 19, size: 64, colors: [Color.yellow, Color.red, Color.white], planetType: 0, oceans: false, clouds: false, cloudDensity: 0.5, cloudTransparency: 0.5, atmosphere: false, city: false, cityDensity: 0.95, lightAngle: 180 }],
  ["sun", "sun", { seed: 3, size: 64, mainColor: Color.yellow }],
  ["moon", "moon", { seed: 9, size: 64, roughness: 0.6, colors: [new Color(0.4, 0.4, 0.4), new Color(0.63, 0.63, 0.63), new Color(0.75, 0.75, 0.75)], lightAngle: 200 }],
  ["asteroid", "asteroid", { seed: 11, size: 64, colors: [new Color(0.4, 0.4, 0.4), new Color(0.63, 0.63, 0.63), new Color(0.75, 0.75, 0.75)], minerals: true, mineralColor: Color.yellow, lightAngle: 180 }],
  ["station", "station", { seed: 13, colors: [Color.grey, Color.cyan], colorDetail: 0.02, numberOfPods: 6 }],
  ["blackhole", "blackhole", { seed: 1 }],
  ["background", "background", { seed: 21, size: 64, frequency: 0.04, lacunarity: 2, persistence: 0.5, octaves: 4, starCount: 40, tint: Color.blue, brightness: 0.6 }],
];

for (const [name, type, params] of jobs) {
  const t0 = Date.now();
  const result = generateSprite(type, params);
  const dt = Date.now() - t0;
  const cov = coverage(result.pixels);
  console.log(`${name}: ${result.width}x${result.height} coverage=${cov.toFixed(3)} ${dt}ms`);
  assert(result.width > 0 && result.height > 0, name + " empty size");
  assert(cov > 0.01, name + " looks empty");
}

console.log("ok");
