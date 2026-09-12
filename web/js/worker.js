import { generateSprite } from "./generate.js";

self.onmessage = (event) => {
  const { id, type, params } = event.data;
  try {
    const result = generateSprite(type, params);
    self.postMessage({ id, ok: true, width: result.width, height: result.height, pixels: result.pixels }, [result.pixels.buffer]);
  } catch (err) {
    self.postMessage({ id, ok: false, error: err && err.message ? err.message : String(err) });
  }
};
