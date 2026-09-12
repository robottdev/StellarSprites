import { generateSprite } from "./generate.js";

self.onmessage = (event) => {
  const { id, type, params } = event.data;
  try {
    const result = generateSprite(type, params);
    const transfer = [result.pixels.buffer];
    if (result.scene && result.scene.sprites) {
      for (const sprite of result.scene.sprites) {
        if (sprite.pixels && sprite.pixels.buffer) transfer.push(sprite.pixels.buffer);
      }
    }
    self.postMessage({
      id,
      ok: true,
      width: result.width,
      height: result.height,
      pixels: result.pixels,
      scene: result.scene || null,
    }, transfer);
  } catch (err) {
    self.postMessage({ id, ok: false, error: err && err.message ? err.message : String(err) });
  }
};
