function canvasFromSprite(sprite) {
  const c = document.createElement("canvas");
  c.width = sprite.width;
  c.height = sprite.height;
  const ctx = c.getContext("2d");
  ctx.putImageData(new ImageData(new Uint8ClampedArray(sprite.pixels), sprite.width, sprite.height), 0, 0);
  return c;
}

function moonPos(planet, moon) {
  return {
    x: planet.x + Math.cos(moon.phase) * moon.orbitRadius,
    y: planet.y + Math.sin(moon.phase) * moon.orbitRadius,
  };
}

function stationPos(station, planets) {
  const host = planets[station.parent] || planets[0];
  return {
    x: host.x + Math.cos(station.phase) * station.orbitRadius,
    y: host.y + Math.sin(station.phase) * station.orbitRadius,
  };
}

export function startFlyMode({ scene, overlay, canvas, readout, minimap, onExit, touch }) {
  const sprites = scene.sprites.map(canvasFromSprite);
  const keys = new Set();
  const pad = { turn: 0, thrust: 0, thrustHold: false, boost: false, brake: false };
  const prevOverflow = document.body.style.overflow;
  const ship = {
    x: scene.player.x,
    y: scene.player.y,
    vx: 0,
    vy: 0,
    heading: scene.player.heading,
    radius: scene.player.radius,
  };
  const camera = { x: ship.x, y: ship.y, zoom: 0.55 };
  const time = { t: 0, last: performance.now() };
  let running = true;
  let pinch0 = 0;

  const planets = scene.planets.map((p) => ({ ...p, moons: p.moons.map((m) => ({ ...m })) }));
  const rocks = scene.belt ? scene.belt.rocks.map((r) => ({ ...r })) : [];
  const npcs = scene.npcs.map((n) => ({ ...n }));
  const station = scene.station ? { ...scene.station } : null;
  const hole = scene.hole ? { ...scene.hole } : null;

  function onKeyDown(e) {
    keys.add(e.code);
    if (e.code === "Escape") {
      e.preventDefault();
      stop();
      return;
    }
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) e.preventDefault();
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }
  function onWheel(e) {
    e.preventDefault();
    const next = camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1);
    camera.zoom = Math.max(0.28, Math.min(2.4, next));
  }
  function touchDist(a, b) {
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }
  function onTouchStart(e) {
    if (e.touches.length === 2) {
      pinch0 = touchDist(e.touches[0], e.touches[1]);
    }
  }
  function onTouchMove(e) {
    if (e.touches.length === 2 && pinch0) {
      e.preventDefault();
      const d = touchDist(e.touches[0], e.touches[1]);
      camera.zoom = Math.max(0.28, Math.min(2.4, camera.zoom * (d / pinch0)));
      pinch0 = d;
    }
  }
  function onTouchEnd(e) {
    if (e.touches.length < 2) pinch0 = 0;
  }

  const cleanups = [];
  function bindHold(el, key) {
    if (!el) return;
    const down = (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      pad[key] = true;
    };
    const up = () => { pad[key] = false; };
    const blockMenu = (e) => e.preventDefault();
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    el.addEventListener("contextmenu", blockMenu);
    cleanups.push(() => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("lostpointercapture", up);
      el.removeEventListener("contextmenu", blockMenu);
    });
  }

  function bindStick(el, knob) {
    if (!el) return;
    let pid = null;
    const reset = () => {
      pid = null;
      pad.turn = 0;
      pad.thrust = 0;
      if (knob) knob.style.transform = "";
    };
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const max = r.width * 0.38;
      const len = Math.hypot(dx, dy) || 1;
      if (len > max) {
        dx *= max / len;
        dy *= max / len;
      }
      const mag = Math.hypot(dx, dy) / max;
      if (mag < 0.12) {
        pad.turn = 0;
        pad.thrust = 0;
      } else {
        pad.turn = dx / max;
        pad.thrust = Math.max(-1, Math.min(1, -dy / max));
      }
      if (knob) knob.style.transform = `translate(${dx}px, ${dy}px)`;
    };
    const down = (e) => {
      e.preventDefault();
      pid = e.pointerId;
      el.setPointerCapture(pid);
      move(e);
    };
    const track = (e) => {
      if (pid === e.pointerId) move(e);
    };
    const blockMenu = (e) => e.preventDefault();
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", track);
    el.addEventListener("pointerup", reset);
    el.addEventListener("pointercancel", reset);
    el.addEventListener("lostpointercapture", reset);
    el.addEventListener("contextmenu", blockMenu);
    cleanups.push(() => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", track);
      el.removeEventListener("pointerup", reset);
      el.removeEventListener("pointercancel", reset);
      el.removeEventListener("lostpointercapture", reset);
      el.removeEventListener("contextmenu", blockMenu);
      reset();
    });
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("touchstart", onTouchStart, { passive: true });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd);
  bindStick(touch && touch.stick, touch && touch.knob);
  bindHold(touch && touch.thrust, "thrustHold");
  bindHold(touch && touch.boost, "boost");
  bindHold(touch && touch.brake, "brake");
  overlay.hidden = false;
  document.body.style.overflow = "hidden";
  canvas.focus();

  const visualViewport = window.visualViewport;

  function pinOverlay() {
    const top = visualViewport ? visualViewport.offsetTop : 0;
    const left = visualViewport ? visualViewport.offsetLeft : 0;
    const w = visualViewport ? visualViewport.width : window.innerWidth;
    const h = visualViewport ? visualViewport.height : window.innerHeight;
    overlay.style.top = Math.round(top) + "px";
    overlay.style.left = Math.round(left) + "px";
    overlay.style.width = Math.max(1, Math.round(w)) + "px";
    overlay.style.height = Math.max(1, Math.round(h)) + "px";
    overlay.style.right = "auto";
    overlay.style.bottom = "auto";
  }

  function resize() {
    pinOverlay();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = overlay.clientWidth;
    const h = overlay.clientHeight;
    canvas.width = Math.max(1, (w * dpr) | 0);
    canvas.height = Math.max(1, (h * dpr) | 0);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    if (minimap) {
      minimap.width = 168;
      minimap.height = 168;
    }
  }
  window.addEventListener("resize", resize);
  if (visualViewport) {
    visualViewport.addEventListener("resize", resize);
    visualViewport.addEventListener("scroll", resize);
  }
  resize();

  function stepMotion(dt) {
    for (const p of planets) {
      for (const m of p.moons) m.phase += m.orbitSpeed * dt;
    }
    for (const r of rocks) r.heading = (r.heading || 0) + r.spin * dt;
    if (station) station.phase += station.orbitSpeed * dt;
    for (const n of npcs) {
      n.heading += Math.sin(time.t * 0.35 + (n.speed || 30) * 0.01) * 0.4 * dt;
      const sp = n.speed || 32;
      n.x += Math.sin(n.heading) * sp * dt;
      n.y += -Math.cos(n.heading) * sp * dt;
    }
  }

  function stepShip(dt) {
    const keyTurn = (keys.has("KeyA") || keys.has("ArrowLeft") ? -1 : 0) + (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);
    const turn = Math.max(-1, Math.min(1, keyTurn + pad.turn));
    ship.heading += turn * 2.6 * dt;
    const boost = pad.boost || keys.has("ShiftLeft") || keys.has("ShiftRight");
    const accel = (boost ? 520 : 240) * dt;
    const fx = Math.sin(ship.heading);
    const fy = -Math.cos(ship.heading);
    const keyThrust = (keys.has("KeyW") || keys.has("ArrowUp") ? 1 : 0) + (keys.has("KeyS") || keys.has("ArrowDown") ? -0.45 : 0);
    const stickThrust = pad.thrustHold ? 1 : pad.thrust;
    const thrust = Math.max(-1, Math.min(1, keyThrust + stickThrust));
    if (thrust > 0.04) {
      ship.vx += fx * accel * thrust;
      ship.vy += fy * accel * thrust;
    } else if (thrust < -0.04) {
      ship.vx += fx * accel * thrust * 0.45;
      ship.vy += fy * accel * thrust * 0.45;
    }
    if (pad.brake || keys.has("Space") || keys.has("KeyX")) {
      ship.vx *= Math.exp(-2.4 * dt);
      ship.vy *= Math.exp(-2.4 * dt);
    }
    ship.vx *= Math.exp(-0.28 * dt);
    ship.vy *= Math.exp(-0.28 * dt);
    const speed = Math.hypot(ship.vx, ship.vy);
    const max = boost ? 780 : 430;
    if (speed > max) {
      ship.vx *= max / speed;
      ship.vy *= max / speed;
    }
    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    const dSun = Math.hypot(ship.x, ship.y);
    const minR = scene.sun.radius * 0.82;
    if (dSun < minR) {
      const nx = ship.x / Math.max(1e-3, dSun);
      const ny = ship.y / Math.max(1e-3, dSun);
      ship.x = nx * minR;
      ship.y = ny * minR;
      ship.vx *= -0.35;
      ship.vy *= -0.35;
    }
    const limit = scene.worldRadius * 1.2;
    if (dSun > limit) {
      ship.x *= limit / dSun;
      ship.y *= limit / dSun;
      ship.vx *= 0.4;
      ship.vy *= 0.4;
    }

    camera.x += (ship.x - camera.x) * (1 - Math.exp(-5.5 * dt));
    camera.y += (ship.y - camera.y) * (1 - Math.exp(-5.5 * dt));
  }

  function worldToScreen(x, y, ctx) {
    const z = camera.zoom;
    return {
      x: (x - camera.x) * z + ctx.canvas.width / 2,
      y: (y - camera.y) * z + ctx.canvas.height / 2,
    };
  }

  function drawSprite(ctx, spriteIndex, x, y, radius, rotation, lightFromSun, clipCircle) {
    const img = sprites[spriteIndex];
    if (!img) return;
    const p = worldToScreen(x, y, ctx);
    const size = Math.max(6, radius * 2 * camera.zoom);
    ctx.save();
    ctx.translate(p.x, p.y);
    let rot = rotation || 0;
    if (lightFromSun) rot = Math.atan2(y, x);
    ctx.rotate(rot);
    if (clipCircle) {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2);
      ctx.clip();
    }
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function nearestName() {
    let best = scene.sun.name;
    let bestD = Math.hypot(ship.x, ship.y) - scene.sun.radius;
    const consider = (name, x, y, r) => {
      const d = Math.hypot(ship.x - x, ship.y - y) - r;
      if (d < bestD) {
        bestD = d;
        best = name;
      }
    };
    for (const p of planets) {
      consider(p.name, p.x, p.y, p.radius);
      for (const m of p.moons) {
        const mp = moonPos(p, m);
        consider(m.name, mp.x, mp.y, m.radius);
      }
    }
    if (station) {
      const sp = stationPos(station, planets);
      consider(station.name, sp.x, sp.y, station.radius);
    }
    if (hole) consider(hole.name, hole.x, hole.y, hole.radius);
    return { name: bestD < 420 ? best : scene.starName + " system", dist: bestD };
  }

  function drawMinimap() {
    if (!minimap) return;
    const m = minimap.getContext("2d");
    const w = minimap.width;
    const h = minimap.height;
    const scale = (w * 0.42) / scene.worldRadius;
    m.fillStyle = "#071018";
    m.fillRect(0, 0, w, h);
    const dot = (x, y, r, color) => {
      m.fillStyle = color;
      m.beginPath();
      m.arc(w / 2 + x * scale, h / 2 + y * scale, Math.max(1.4, r * scale), 0, Math.PI * 2);
      m.fill();
    };
    dot(0, 0, scene.sun.radius, "#ffd27a");
    for (const p of planets) {
      dot(p.x, p.y, p.radius, p.kind === "gas" ? "#d6b48a" : "#7ec8ff");
    }
    if (hole) dot(hole.x, hole.y, hole.radius, "#ff6b4a");
    m.fillStyle = "#fff";
    const ang = ship.heading;
    const sx = w / 2 + ship.x * scale;
    const sy = h / 2 + ship.y * scale;
    m.beginPath();
    m.moveTo(sx + Math.sin(ang) * 6, sy - Math.cos(ang) * 6);
    m.lineTo(sx - Math.sin(ang) * 4 + Math.cos(ang) * 3, sy + Math.cos(ang) * 4 + Math.sin(ang) * 3);
    m.lineTo(sx - Math.sin(ang) * 4 - Math.cos(ang) * 3, sy + Math.cos(ang) * 4 - Math.sin(ang) * 3);
    m.closePath();
    m.fill();
    m.strokeStyle = "rgba(180,210,255,0.4)";
    m.strokeRect(0.5, 0.5, w - 1, h - 1);
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - time.last) / 1000);
    time.last = now;
    time.t += dt;
    stepMotion(dt);
    stepShip(dt);

    const ctx = canvas.getContext("2d");
    const bg = sprites[scene.background.spriteIndex];
    if (bg) {
      const tw = Math.max(1, bg.width);
      const th = Math.max(1, bg.height);
      const ox = Math.round(((camera.x * 0.035) % tw + tw) % tw);
      const oy = Math.round(((camera.y * 0.035) % th + th) % th);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      for (let y = -oy; y < canvas.height; y += th) {
        for (let x = -ox; x < canvas.width; x += tw) {
          ctx.drawImage(bg, x, y);
        }
      }
      ctx.restore();
    }

    const sunScreen = worldToScreen(0, 0, ctx);
    const diskRatio = scene.sun.diskRatio || 0.22;
    const sunSpriteR = scene.sun.radius / (2 * diskRatio);
    const glowR = sunSpriteR * 1.2 * camera.zoom;
    const glow = ctx.createRadialGradient(sunScreen.x, sunScreen.y, glowR * 0.18, sunScreen.x, sunScreen.y, glowR);
    glow.addColorStop(0, "rgba(255, 230, 170, 0.28)");
    glow.addColorStop(0.45, "rgba(255, 180, 80, 0.1)");
    glow.addColorStop(1, "rgba(255, 140, 40, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunScreen.x, sunScreen.y, glowR, 0, Math.PI * 2);
    ctx.fill();
    drawSprite(ctx, scene.sun.spriteIndex, 0, 0, sunSpriteR, 0, false, false);

    if (hole) drawSprite(ctx, hole.spriteIndex, hole.x, hole.y, hole.radius, 0, false);
    for (const r of rocks) {
      drawSprite(ctx, r.spriteIndex, r.x, r.y, r.radius, r.heading || 0, false);
    }
    for (const p of planets) {
      drawSprite(ctx, p.spriteIndex, p.x, p.y, p.radius, 0, true);
      for (const m of p.moons) {
        const mp = moonPos(p, m);
        drawSprite(ctx, m.spriteIndex, mp.x, mp.y, m.radius, 0, true);
      }
    }
    if (station) {
      const sp = stationPos(station, planets);
      drawSprite(ctx, station.spriteIndex, sp.x, sp.y, station.radius, station.phase, false);
    }
    for (const n of npcs) {
      drawSprite(ctx, n.spriteIndex, n.x, n.y, n.radius, n.heading, false);
    }
    drawSprite(ctx, scene.player.spriteIndex, ship.x, ship.y, ship.radius, ship.heading, false);

    const info = nearestName();
    const spd = Math.hypot(ship.vx, ship.vy);
    if (readout) {
      readout.textContent = `${scene.starName}  ·  ${info.name}  ·  ${spd | 0} u/s  ·  zoom ${camera.zoom.toFixed(2)}`;
    }
    drawMinimap();
    requestAnimationFrame(frame);
  }

  function stop() {
    if (!running) return;
    running = false;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", resize);
    if (visualViewport) {
      visualViewport.removeEventListener("resize", resize);
      visualViewport.removeEventListener("scroll", resize);
    }
    canvas.removeEventListener("wheel", onWheel);
    canvas.removeEventListener("touchstart", onTouchStart);
    canvas.removeEventListener("touchmove", onTouchMove);
    canvas.removeEventListener("touchend", onTouchEnd);
    for (const fn of cleanups) fn();
    overlay.style.top = "";
    overlay.style.left = "";
    overlay.style.width = "";
    overlay.style.height = "";
    overlay.style.right = "";
    overlay.style.bottom = "";
    overlay.hidden = true;
    document.body.style.overflow = prevOverflow;
    if (onExit) onExit();
  }

  requestAnimationFrame(frame);
  return { stop };
}
