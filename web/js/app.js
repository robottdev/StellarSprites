import { Color } from "./core.js?v=a16";
import { randomize } from "./generate.js?v=a16";
import { startFlyMode } from "./fly.js?v=a16";

const TYPES = [
  { id: "ship", label: "Ship" },
  { id: "planet", label: "Planet" },
  { id: "sun", label: "Sun" },
  { id: "moon", label: "Moon" },
  { id: "asteroid", label: "Asteroid" },
  { id: "station", label: "Station" },
  { id: "blackhole", label: "Black Hole" },
  { id: "background", label: "Background" },
  { id: "scene", label: "Scene" },
];

const SHIP_TYPES = ["Interceptor", "Gunship", "Hauler", "Carrier"];
const PLANET_TYPES = ["Gas Giant", "Terrestrial"];
const FILTER_MODES = ["Point", "Bilinear", "Trilinear"];

function cloneState(s) {
  return JSON.parse(JSON.stringify(s));
}

function defaultStates() {
  return {
    ship: {
      customSeed: false, seed: 0,
      customShipType: false, shipType: 0,
      customScale: true, scale: 1,
      customColors: false, colors: [Color.white, Color.white],
      customColorDetail: false, colorDetail: 0.125,
      customBodyDetail: true, bodyDetail: 0.01,
      customWingDetail: true, wingDetail: 0.1,
      filterMode: 1,
    },
    planet: {
      availableSizes: [256, 512],
      customSeed: false, seed: 0,
      customSize: false, size: 256,
      customScale: true, scale: 1,
      customColors: false, colors: [Color.blue, Color.green, Color.red],
      customPlanetType: false, planetType: 0,
      customOceans: false, oceans: false, oceanColor: new Color(0.11, 0.42, 0.63, 1),
      customClouds: false, clouds: false, cloudDensity: 0.55, cloudTransparency: 0.25,
      customAtmosphere: false, atmosphere: false,
      customCity: false, city: false, cityDensity: 0.95,
      customLighting: false, lightAngle: 180,
    },
    sun: {
      availableSizes: [256, 512, 768],
      availableColors: [Color.red, Color.white, Color.blue, Color.yellow],
      customSeed: false, seed: 0,
      customSize: false, size: 512,
      customScale: true, scale: 1,
      customColor: false, mainColor: Color.white,
    },
    moon: {
      availableSizes: [128, 256],
      customSeed: false, seed: 0,
      customSize: false, size: 128,
      customRoughness: false, roughness: 0,
      customScale: true, scale: 1,
      customColors: false, colors: [new Color(0.4, 0.4, 0.4), new Color(0.63, 0.63, 0.63), new Color(0.75, 0.75, 0.75)],
      customLighting: false, lightAngle: 180,
    },
    asteroid: {
      availableSizes: [64, 128],
      availableMineralColors: [Color.yellow, Color.red, Color.cyan],
      customSeed: false, seed: 0,
      customSize: false, size: 64,
      customScale: true, scale: 1,
      customColors: false, colors: [new Color(0.4, 0.4, 0.4), new Color(0.63, 0.63, 0.63), new Color(0.75, 0.75, 0.75)],
      customMinerals: false, minerals: true,
      customMineralColor: false, mineralColor: Color.yellow,
      customLighting: false, lightAngle: 180,
    },
    station: {
      customSeed: false, seed: 0,
      customScale: true, scale: 1,
      customColors: false, colors: [Color.white, Color.white],
      customColorDetail: true, colorDetail: 0.01,
      customPods: false, numberOfPods: 6,
      filterMode: 1,
    },
    blackhole: {
      customSeed: false, seed: 0,
      customScale: true, scale: 1,
    },
    background: {
      availableSizes: [128, 256, 512],
      customSeed: false, seed: 0,
      customSize: true, size: 256,
      frequency: 0.01, lacunarity: 2, persistence: 0.5, octaves: 8,
      customStarCount: false, starCount: 50, starCountMin: 100, starCountMax: 250,
      customTint: false, tint: Color.blue,
      customBrightness: false, brightness: 0.5, brightnessMin: 0.15, brightnessMax: 0.85,
    },
    scene: {
      customSeed: false, seed: 0,
      customPlanetCount: false, planetCount: 5,
      beltChance: 0.45,
      customStation: false, station: true,
      customHole: false, blackHole: false,
      customStarColor: false, starColor: new Color(1, 0.92, 0.55, 1),
      customQuality: true, quality: 1,
      customScale: true, scale: 1,
    },
  };
}

const states = defaultStates();
let currentType = "ship";
let lastResult = null;
let jobId = 0;
let worker = null;
let flySession = null;

const els = {
  nav: document.getElementById("type-nav"),
  controls: document.getElementById("controls"),
  preview: document.getElementById("preview"),
  canvas: document.getElementById("sprite-canvas"),
  status: document.getElementById("status"),
  generate: document.getElementById("btn-generate"),
  save: document.getElementById("btn-save"),
  fly: document.getElementById("btn-fly"),
  overlay: document.getElementById("generating"),
  meta: document.getElementById("preview-meta"),
  flyOverlay: document.getElementById("fly-mode"),
  flyCanvas: document.getElementById("fly-canvas"),
  flyReadout: document.getElementById("fly-readout"),
  flyMinimap: document.getElementById("fly-minimap"),
  flyExit: document.getElementById("btn-fly-exit"),
  flyStick: document.getElementById("fly-stick"),
  flyKnob: document.getElementById("fly-stick-knob"),
  flyThrust: document.getElementById("fly-thrust"),
  flyBoost: document.getElementById("fly-boost"),
  flyBrake: document.getElementById("fly-brake"),
};

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL("./worker.js?v=a16", import.meta.url), { type: "module" });
    worker.onmessage = onWorkerMessage;
    worker.onerror = (e) => {
      setBusy(false);
      setStatus("Worker error: " + (e.message || "failed to generate"), true);
    };
  }
  return worker;
}

function setBusy(busy) {
  els.overlay.hidden = !busy;
  els.generate.disabled = busy;
}

function setStatus(text, isError = false) {
  els.status.textContent = text;
  els.status.classList.toggle("error", isError);
}

function colorInput(value, onChange) {
  const input = document.createElement("input");
  input.type = "color";
  input.value = revive(value).toHex();
  input.addEventListener("input", () => onChange(Color.fromHex(input.value)));
  return input;
}

function revive(c) {
  return c instanceof Color ? c : new Color(c.r, c.g, c.b, c.a ?? 1);
}

function toggleGroup(title, enabled, onToggle, inner) {
  const wrap = document.createElement("section");
  wrap.className = "toggle-group" + (enabled ? " on" : "");
  const head = document.createElement("label");
  head.className = "toggle-head";
  const box = document.createElement("input");
  box.type = "checkbox";
  box.checked = enabled;
  box.addEventListener("change", () => onToggle(box.checked));
  const span = document.createElement("span");
  span.textContent = title;
  head.append(box, span);
  wrap.append(head);
  const body = document.createElement("div");
  body.className = "toggle-body";
  inner(body);
  wrap.append(body);
  return wrap;
}

function row(label, control) {
  const r = document.createElement("div");
  r.className = "control-row";
  const l = document.createElement("label");
  l.textContent = label;
  r.append(l, control);
  return r;
}

function numberField(value, onChange, opts = {}) {
  const input = document.createElement("input");
  input.type = "number";
  if (opts.min != null) input.min = opts.min;
  if (opts.max != null) input.max = opts.max;
  if (opts.step != null) input.step = opts.step;
  input.value = value;
  input.addEventListener("change", () => onChange(Number(input.value)));
  return input;
}

function slider(value, min, max, step, onChange, fmt) {
  const wrap = document.createElement("div");
  wrap.className = "slider-wrap";
  const input = document.createElement("input");
  input.type = "range";
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = value;
  const out = document.createElement("span");
  out.className = "slider-val";
  out.textContent = fmt ? fmt(value) : String(value);
  input.addEventListener("input", () => {
    const v = Number(input.value);
    out.textContent = fmt ? fmt(v) : String(v);
    onChange(v);
  });
  wrap.append(input, out);
  return wrap;
}

function select(value, options, onChange) {
  const sel = document.createElement("select");
  options.forEach((opt, i) => {
    const o = document.createElement("option");
    o.value = String(typeof opt === "object" ? opt.value : i);
    o.textContent = typeof opt === "object" ? opt.label : opt;
    sel.append(o);
  });
  sel.value = String(value);
  sel.addEventListener("change", () => onChange(Number(sel.value)));
  return sel;
}

function renderNav() {
  els.nav.innerHTML = "";
  TYPES.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = t.id === currentType ? "active" : "";
    btn.textContent = t.label;
    btn.addEventListener("click", () => {
      stopFly();
      currentType = t.id;
      lastResult = null;
      renderNav();
      renderControls();
      updateFlyButton();
      generate();
    });
    els.nav.append(btn);
  });
}

function bind(obj, key, value) {
  obj[key] = value;
}

function renderControls() {
  const s = states[currentType];
  const root = els.controls;
  root.innerHTML = "";
  const props = document.createElement("div");
  props.className = "props";

  const addSeed = () => {
    props.append(toggleGroup("Custom Seed", s.customSeed, (v) => { s.customSeed = v; renderControls(); }, (body) => {
      body.append(row("Seed", numberField(s.seed, (v) => bind(s, "seed", v | 0), { min: 0, step: 1 })));
    }));
  };

  if (currentType === "ship") {
    addSeed();
    props.append(toggleGroup("Custom Type", s.customShipType, (v) => { s.customShipType = v; renderControls(); }, (body) => {
      body.append(row("Type", select(s.shipType, SHIP_TYPES, (v) => bind(s, "shipType", v))));
    }));
    props.append(toggleGroup("Custom Scale", s.customScale, (v) => { s.customScale = v; renderControls(); }, (body) => {
      body.append(row("Scale", slider(s.scale, 1, 2, 0.01, (v) => bind(s, "scale", v), (v) => v.toFixed(2))));
    }));
    props.append(toggleGroup("Custom Colors", s.customColors, (v) => { s.customColors = v; renderControls(); }, (body) => {
      const colors = document.createElement("div");
      colors.className = "color-row";
      s.colors.forEach((c, i) => colors.append(colorInput(c, (nv) => { s.colors[i] = nv; })));
      body.append(row("Colors", colors));
    }));
    props.append(toggleGroup("Custom Color Detail", s.customColorDetail, (v) => { s.customColorDetail = v; renderControls(); }, (body) => {
      body.append(row("Color Detail", slider(s.colorDetail, 0.05, 0.25, 0.001, (v) => bind(s, "colorDetail", v), (v) => v.toFixed(3))));
    }));
    props.append(toggleGroup("Custom Body Detail", s.customBodyDetail, (v) => { s.customBodyDetail = v; renderControls(); }, (body) => {
      body.append(row("Body Detail", slider(s.bodyDetail, 0.01, 0.1, 0.001, (v) => bind(s, "bodyDetail", v), (v) => v.toFixed(3))));
    }));
    props.append(toggleGroup("Custom Wing Detail", s.customWingDetail, (v) => { s.customWingDetail = v; renderControls(); }, (body) => {
      body.append(row("Wing Detail", slider(s.wingDetail, 0.01, 0.1, 0.001, (v) => bind(s, "wingDetail", v), (v) => v.toFixed(3))));
    }));
    props.append(row("Filter Mode", select(s.filterMode, FILTER_MODES, (v) => {
      s.filterMode = v;
      applyFilter();
    })));
  }

  if (currentType === "planet") {
    addSeed();
    props.append(toggleGroup("Custom Size", s.customSize, (v) => { s.customSize = v; renderControls(); }, (body) => {
      body.append(row("Size", select(s.availableSizes.indexOf(s.size), s.availableSizes.map((n) => ({ value: s.availableSizes.indexOf(n), label: String(n) })), (i) => bind(s, "size", s.availableSizes[i]))));
    }));
    props.append(toggleGroup("Custom Scale", s.customScale, (v) => { s.customScale = v; renderControls(); }, (body) => {
      body.append(row("Scale", slider(s.scale, 0.5, 2, 0.01, (v) => bind(s, "scale", v), (v) => v.toFixed(2))));
    }));
    props.append(toggleGroup("Custom Colors", s.customColors, (v) => { s.customColors = v; renderControls(); }, (body) => {
      const colors = document.createElement("div");
      colors.className = "color-row";
      s.colors.forEach((c, i) => colors.append(colorInput(c, (nv) => { s.colors[i] = nv; })));
      body.append(row("Colors", colors));
    }));
    props.append(toggleGroup("Custom Type", s.customPlanetType, (v) => { s.customPlanetType = v; renderControls(); }, (body) => {
      body.append(row("Type", select(s.planetType, PLANET_TYPES, (v) => bind(s, "planetType", v))));
    }));
    props.append(toggleGroup("Custom Oceans", s.customOceans, (v) => { s.customOceans = v; renderControls(); }, (body) => {
      body.append(row("Oceans", checkbox(s.oceans, (v) => bind(s, "oceans", v))));
      body.append(row("Ocean Color", colorInput(s.oceanColor, (v) => bind(s, "oceanColor", v))));
    }));
    props.append(toggleGroup("Custom Clouds", s.customClouds, (v) => { s.customClouds = v; renderControls(); }, (body) => {
      body.append(row("Clouds", checkbox(s.clouds, (v) => bind(s, "clouds", v))));
      body.append(row("Density", slider(s.cloudDensity, 0, 1, 0.01, (v) => bind(s, "cloudDensity", v), (v) => v.toFixed(2))));
      body.append(row("Transparency", slider(s.cloudTransparency, 0, 1, 0.01, (v) => bind(s, "cloudTransparency", v), (v) => v.toFixed(2))));
    }));
    props.append(toggleGroup("Custom Atmosphere", s.customAtmosphere, (v) => { s.customAtmosphere = v; renderControls(); }, (body) => {
      body.append(row("Atmosphere", checkbox(s.atmosphere, (v) => bind(s, "atmosphere", v))));
    }));
    props.append(toggleGroup("Custom City", s.customCity, (v) => { s.customCity = v; renderControls(); }, (body) => {
      body.append(row("City", checkbox(s.city, (v) => bind(s, "city", v))));
      body.append(row("City Density", slider(s.cityDensity, 0.9, 1, 0.001, (v) => bind(s, "cityDensity", v), (v) => v.toFixed(3))));
    }));
    props.append(toggleGroup("Custom Lighting", s.customLighting, (v) => { s.customLighting = v; renderControls(); }, (body) => {
      body.append(row("Light Angle", slider(s.lightAngle, 0, 359, 1, (v) => bind(s, "lightAngle", v), (v) => String(v | 0))));
    }));
  }

  if (currentType === "sun") {
    addSeed();
    props.append(toggleGroup("Custom Size", s.customSize, (v) => { s.customSize = v; renderControls(); }, (body) => {
      body.append(row("Size", select(s.availableSizes.indexOf(s.size), s.availableSizes.map((n) => String(n)), (i) => bind(s, "size", s.availableSizes[i]))));
    }));
    props.append(toggleGroup("Custom Scale", s.customScale, (v) => { s.customScale = v; renderControls(); }, (body) => {
      body.append(row("Scale", slider(s.scale, 1, 2, 0.01, (v) => bind(s, "scale", v), (v) => v.toFixed(2))));
    }));
    props.append(toggleGroup("Custom Color", s.customColor, (v) => { s.customColor = v; renderControls(); }, (body) => {
      body.append(row("Color", colorInput(s.mainColor, (v) => bind(s, "mainColor", v))));
    }));
  }

  if (currentType === "moon") {
    addSeed();
    props.append(toggleGroup("Custom Size", s.customSize, (v) => { s.customSize = v; renderControls(); }, (body) => {
      body.append(row("Size", select(s.availableSizes.indexOf(s.size), s.availableSizes.map((n) => String(n)), (i) => bind(s, "size", s.availableSizes[i]))));
    }));
    props.append(toggleGroup("Custom Roughness", s.customRoughness, (v) => { s.customRoughness = v; renderControls(); }, (body) => {
      body.append(row("Roughness", slider(s.roughness, 0, 1, 0.01, (v) => bind(s, "roughness", v), (v) => v.toFixed(2))));
    }));
    props.append(toggleGroup("Custom Scale", s.customScale, (v) => { s.customScale = v; renderControls(); }, (body) => {
      body.append(row("Scale", slider(s.scale, 0.5, 2, 0.01, (v) => bind(s, "scale", v), (v) => v.toFixed(2))));
    }));
    props.append(toggleGroup("Custom Colors", s.customColors, (v) => { s.customColors = v; renderControls(); }, (body) => {
      const colors = document.createElement("div");
      colors.className = "color-row";
      s.colors.forEach((c, i) => colors.append(colorInput(c, (nv) => { s.colors[i] = nv; })));
      body.append(row("Colors", colors));
    }));
    props.append(toggleGroup("Custom Lighting", s.customLighting, (v) => { s.customLighting = v; renderControls(); }, (body) => {
      body.append(row("Light Angle", slider(s.lightAngle, 0, 359, 1, (v) => bind(s, "lightAngle", v), (v) => String(v | 0))));
    }));
  }

  if (currentType === "asteroid") {
    addSeed();
    props.append(toggleGroup("Custom Size", s.customSize, (v) => { s.customSize = v; renderControls(); }, (body) => {
      body.append(row("Size", select(s.availableSizes.indexOf(s.size), s.availableSizes.map((n) => String(n)), (i) => bind(s, "size", s.availableSizes[i]))));
    }));
    props.append(toggleGroup("Custom Scale", s.customScale, (v) => { s.customScale = v; renderControls(); }, (body) => {
      body.append(row("Scale", slider(s.scale, 0.5, 2, 0.01, (v) => bind(s, "scale", v), (v) => v.toFixed(2))));
    }));
    props.append(toggleGroup("Custom Colors", s.customColors, (v) => { s.customColors = v; renderControls(); }, (body) => {
      const colors = document.createElement("div");
      colors.className = "color-row";
      s.colors.forEach((c, i) => colors.append(colorInput(c, (nv) => { s.colors[i] = nv; })));
      body.append(row("Colors", colors));
    }));
    props.append(toggleGroup("Custom Minerals", s.customMinerals, (v) => { s.customMinerals = v; renderControls(); }, (body) => {
      body.append(row("Minerals", checkbox(s.minerals, (v) => bind(s, "minerals", v))));
    }));
    props.append(toggleGroup("Custom Mineral Color", s.customMineralColor, (v) => { s.customMineralColor = v; renderControls(); }, (body) => {
      body.append(row("Mineral Color", colorInput(s.mineralColor, (v) => bind(s, "mineralColor", v))));
    }));
    props.append(toggleGroup("Custom Lighting", s.customLighting, (v) => { s.customLighting = v; renderControls(); }, (body) => {
      body.append(row("Light Angle", slider(s.lightAngle, 0, 359, 1, (v) => bind(s, "lightAngle", v), (v) => String(v | 0))));
    }));
  }

  if (currentType === "station") {
    addSeed();
    props.append(toggleGroup("Custom Scale", s.customScale, (v) => { s.customScale = v; renderControls(); }, (body) => {
      body.append(row("Scale", slider(s.scale, 1, 2, 0.01, (v) => bind(s, "scale", v), (v) => v.toFixed(2))));
    }));
    props.append(toggleGroup("Custom Colors", s.customColors, (v) => { s.customColors = v; renderControls(); }, (body) => {
      const colors = document.createElement("div");
      colors.className = "color-row";
      s.colors.forEach((c, i) => colors.append(colorInput(c, (nv) => { s.colors[i] = nv; })));
      body.append(row("Colors", colors));
    }));
    props.append(toggleGroup("Custom Color Detail", s.customColorDetail, (v) => { s.customColorDetail = v; renderControls(); }, (body) => {
      body.append(row("Color Detail", slider(s.colorDetail, 0.01, 0.1, 0.001, (v) => bind(s, "colorDetail", v), (v) => v.toFixed(3))));
    }));
    props.append(toggleGroup("Custom Pods", s.customPods, (v) => { s.customPods = v; renderControls(); }, (body) => {
      const opts = [2, 4, 6, 8];
      body.append(row("# Pods", select(opts.indexOf(s.numberOfPods), opts.map(String), (i) => bind(s, "numberOfPods", opts[i]))));
    }));
    props.append(row("Filter Mode", select(s.filterMode, FILTER_MODES, (v) => {
      s.filterMode = v;
      applyFilter();
    })));
  }

  if (currentType === "blackhole") {
    addSeed();
    props.append(toggleGroup("Custom Scale", s.customScale, (v) => { s.customScale = v; renderControls(); }, (body) => {
      body.append(row("Scale", slider(s.scale, 0.5, 2, 0.01, (v) => bind(s, "scale", v), (v) => v.toFixed(2))));
    }));
  }

  if (currentType === "background") {
    addSeed();
    props.append(toggleGroup("Custom Size", s.customSize, (v) => { s.customSize = v; renderControls(); }, (body) => {
      body.append(row("Size", select(s.availableSizes.indexOf(s.size), s.availableSizes.map((n) => String(n)), (i) => bind(s, "size", s.availableSizes[i]))));
    }));
    props.append(row("Frequency", slider(s.frequency, 0.001, 0.1, 0.001, (v) => bind(s, "frequency", v), (v) => v.toFixed(3))));
    props.append(row("Lacunarity", slider(s.lacunarity, 1, 5, 0.01, (v) => bind(s, "lacunarity", v), (v) => v.toFixed(2))));
    props.append(row("Persistence", slider(s.persistence, 0.1, 2, 0.01, (v) => bind(s, "persistence", v), (v) => v.toFixed(2))));
    props.append(row("Octaves", slider(s.octaves, 1, 16, 1, (v) => bind(s, "octaves", v | 0), (v) => String(v | 0))));
    props.append(toggleGroup("Custom Star Count", s.customStarCount, (v) => { s.customStarCount = v; renderControls(); }, (body) => {
      body.append(row("Star Count", slider(s.starCount, s.starCountMin, s.starCountMax, 1, (v) => bind(s, "starCount", v | 0), (v) => String(v | 0))));
    }));
    props.append(toggleGroup("Custom Color", s.customTint, (v) => { s.customTint = v; renderControls(); }, (body) => {
      body.append(row("Color", colorInput(s.tint, (v) => bind(s, "tint", v))));
    }));
    props.append(toggleGroup("Custom Brightness", s.customBrightness, (v) => { s.customBrightness = v; renderControls(); }, (body) => {
      body.append(row("Brightness", slider(s.brightness, s.brightnessMin, s.brightnessMax, 0.01, (v) => bind(s, "brightness", v), (v) => v.toFixed(2))));
    }));
  }

  if (currentType === "scene") {
    addSeed();
    props.append(toggleGroup("Custom Planet Count", s.customPlanetCount, (v) => { s.customPlanetCount = v; renderControls(); }, (body) => {
      body.append(row("Planets", slider(s.planetCount, 3, 8, 1, (v) => bind(s, "planetCount", v | 0), (v) => String(v | 0))));
    }));
    props.append(row("Belt Chance", slider((s.beltChance ?? 0.45) * 100, 0, 100, 5, (v) => bind(s, "beltChance", v / 100), (v) => `${v | 0}%`)));
    props.append(toggleGroup("Station", s.customStation, (v) => { s.customStation = v; renderControls(); }, (body) => {
      body.append(row("Station", checkbox(s.station, (v) => bind(s, "station", v))));
    }));
    props.append(toggleGroup("Black Hole", s.customHole, (v) => { s.customHole = v; renderControls(); }, (body) => {
      body.append(row("Black Hole", checkbox(s.blackHole, (v) => bind(s, "blackHole", v))));
    }));
    props.append(toggleGroup("Custom Star Color", s.customStarColor, (v) => { s.customStarColor = v; renderControls(); }, (body) => {
      body.append(row("Star", colorInput(s.starColor, (v) => bind(s, "starColor", v))));
    }));
    props.append(toggleGroup("Custom Scale", s.customScale, (v) => { s.customScale = v; renderControls(); }, (body) => {
      body.append(row("Scale", slider(s.scale, 0.6, 1.6, 0.01, (v) => bind(s, "scale", v), (v) => v.toFixed(2))));
    }));
    const hint = document.createElement("p");
    hint.className = "scene-hint";
    hint.textContent = "Planets stay put. Moons still orbit their planets. Belt Chance is the odds a belt appears when you generate. Test Mode: WASD on desktop, on-screen stick on mobile.";
    props.append(hint);
  }

  root.append(props);
}

function checkbox(value, onChange) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = !!value;
  input.addEventListener("change", () => onChange(input.checked));
  return input;
}

function applyFilter() {
  const s = states[currentType];
  const mode = s.filterMode == null ? 2 : s.filterMode;
  els.canvas.style.imageRendering = mode === 0 ? "pixelated" : "auto";
}

function applyScale() {
  const s = states[currentType];
  const scale = s.scale || 1;
  els.canvas.style.transform = `scale(${scale})`;
}

function generate() {
  stopFly();
  const type = currentType;
  const next = randomize(type, cloneState(states[type]));
  states[type] = next;
  renderControls();
  setBusy(true);
  setStatus("Generating " + type + "…");
  updateFlyButton();
  const id = ++jobId;
  const t0 = performance.now();
  getWorker().postMessage({ id, type, params: next });
  els.generate.dataset.started = String(t0);
}

function onWorkerMessage(event) {
  const msg = event.data;
  if (msg.id !== jobId) return;
  setBusy(false);
  if (!msg.ok) {
    setStatus(msg.error || "Generation failed", true);
    return;
  }
  lastResult = msg;
  const canvas = els.canvas;
  canvas.width = msg.width;
  canvas.height = msg.height;
  const ctx = canvas.getContext("2d");
  const imageData = new ImageData(new Uint8ClampedArray(msg.pixels), msg.width, msg.height);
  ctx.putImageData(imageData, 0, 0);
  applyFilter();
  applyScale();
  const ms = Math.round(performance.now() - Number(els.generate.dataset.started || performance.now()));
  const s = states[currentType];
  const extra = msg.scene ? ` · ${msg.scene.starName}` : "";
  els.meta.textContent = `${msg.width}×${msg.height} · seed ${s.seed}${extra}`;
  setStatus(`Generated in ${ms} ms`);
  updateFlyButton();
}

function savePng() {
  if (!lastResult) {
    setStatus("Generate a sprite first.", true);
    return;
  }
  const s = states[currentType];
  const a = document.createElement("a");
  a.href = els.canvas.toDataURL("image/png");
  a.download = `${currentType}_${s.seed}.png`;
  a.click();
  setStatus("Saved " + a.download);
}

function updateFlyButton() {
  if (!els.fly) return;
  els.fly.hidden = currentType !== "scene" || !lastResult || !lastResult.scene;
}

function stopFly() {
  if (flySession) {
    flySession.stop();
    flySession = null;
  }
}

function enterFly() {
  if (!lastResult || !lastResult.scene) {
    setStatus("Generate a scene first.", true);
    return;
  }
  stopFly();
  flySession = startFlyMode({
    scene: lastResult.scene,
    overlay: els.flyOverlay,
    canvas: els.flyCanvas,
    readout: els.flyReadout,
    minimap: els.flyMinimap,
    onExit: () => { flySession = null; },
    touch: {
      stick: els.flyStick,
      knob: els.flyKnob,
      thrust: els.flyThrust,
      boost: els.flyBoost,
      brake: els.flyBrake,
    },
  });
}

els.generate.addEventListener("click", generate);
els.save.addEventListener("click", savePng);
if (els.fly) els.fly.addEventListener("click", enterFly);
if (els.flyExit) els.flyExit.addEventListener("click", stopFly);

renderNav();
renderControls();
updateFlyButton();
generate();
