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
  ["ship", { seed: 42, shipType: 0, bodyDetail: 0.01, wingDetail: 0.1, colors: [Color.grey, Color.red], colorDetail: 0.08 }],
  ["planet", { seed: 7, size: 64, colors: [Color.blue, Color.green, Color.red], planetType: 1, oceans: true, clouds: true, cloudDensity: 0.4, cloudTransparency: 0.4, atmosphere: true, city: true, cityDensity: 0.92, lightAngle: 180 }],
  ["sun", { seed: 3, size: 64, mainColor: Color.yellow }],
  ["moon", { seed: 9, size: 64, roughness: 0.6, colors: [new Color(0.4, 0.4, 0.4), new Color(0.63, 0.63, 0.63), new Color(0.75, 0.75, 0.75)], lightAngle: 200 }],
  ["asteroid", { seed: 11, size: 64, colors: [new Color(0.4, 0.4, 0.4), new Color(0.63, 0.63, 0.63), new Color(0.75, 0.75, 0.75)], minerals: true, mineralColor: Color.yellow, lightAngle: 180 }],
  ["station", { seed: 13, colors: [Color.grey, Color.cyan], colorDetail: 0.02, numberOfPods: 6 }],
  ["blackhole", { seed: 1 }],
  ["background", { seed: 21, size: 64, frequency: 0.04, lacunarity: 2, persistence: 0.5, octaves: 4, starCount: 40, tint: Color.blue, brightness: 0.6 }],
];

for (const [type, params] of jobs) {
  const t0 = Date.now();
  const result = generateSprite(type, params);
  const dt = Date.now() - t0;
  const cov = coverage(result.pixels);
  console.log(`${type}: ${result.width}x${result.height} coverage=${cov.toFixed(3)} ${dt}ms`);
  assert(result.width > 0 && result.height > 0, type + " empty size");
  assert(cov > 0.01, type + " looks empty");
}

console.log("ok");
