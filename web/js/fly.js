function canvasFromSprite(sprite) {
  const c = document.createElement("canvas");
  c.width = sprite.width;
  c.height = sprite.height;
  const ctx = c.getContext("2d");
  ctx.putImageData(new ImageData(new Uint8ClampedArray(sprite.pixels), sprite.width, sprite.height), 0, 0);
  return c;
}

function orbitPos(radius, phase) {
  return { x: Math.cos(phase) * radius, y: Math.sin(phase) * radius };
}

export function startFlyMode({ scene, overlay, canvas, readout, minimap, onExit }) {
  const sprites = scene.sprites.map(canvasFromSprite);
  const keys = new Set();
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
  let nearest = scene.sun.name;

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

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("wheel", onWheel, { passive: false });
  overlay.hidden = false;
  canvas.focus();

  function resize() {
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
  resize();

  function bodyPos(orbitRadius, phase) {
    return orbitPos(orbitRadius, phase);
  }

  function stepOrbits(dt) {
    for (const p of planets) {
      p.phase += p.orbitSpeed * dt;
      for (const m of p.moons) m.phase += m.orbitSpeed * dt;
    }
    for (const r of rocks) {
      r.phase += r.orbitSpeed * dt;
      r.heading = (r.heading || 0) + r.spin * dt;
    }
    for (const n of npcs) n.phase += n.orbitSpeed * dt;
    if (station) station.phase += station.orbitSpeed * dt;
    if (hole) hole.phase += hole.orbitSpeed * dt;
  }

  function stepShip(dt) {
    const turn = (keys.has("KeyA") || keys.has("ArrowLeft") ? -1 : 0) + (keys.has("KeyD") || keys.has("ArrowRight") ? 1 : 0);
    ship.heading += turn * 2.6 * dt;
    const boost = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const accel = (boost ? 520 : 240) * dt;
    const fx = Math.sin(ship.heading);
    const fy = -Math.cos(ship.heading);
    if (keys.has("KeyW") || keys.has("ArrowUp")) {
      ship.vx += fx * accel;
      ship.vy += fy * accel;
    }
    if (keys.has("KeyS") || keys.has("ArrowDown")) {
      ship.vx -= fx * accel * 0.45;
      ship.vy -= fy * accel * 0.45;
    }
    if (keys.has("Space") || keys.has("KeyX")) {
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
    if (lightFromSun) {
      rot = Math.atan2(y, x);
    }
    ctx.rotate(rot);
    if (clipCircle) {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2);
      ctx.clip();
    }
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
      const pos = bodyPos(p.orbitRadius, p.phase);
      consider(p.name, pos.x, pos.y, p.radius);
      for (const m of p.moons) {
        const mp = bodyPos(m.orbitRadius, m.phase);
        consider(m.name, pos.x + mp.x, pos.y + mp.y, m.radius);
      }
    }
    if (station) {
      const host = planets[station.parent] || planets[0];
      const hp = bodyPos(host.orbitRadius, host.phase);
      const sp = bodyPos(station.orbitRadius, station.phase);
      consider(station.name, hp.x + sp.x, hp.y + sp.y, station.radius);
    }
    if (hole) {
      const hp = bodyPos(hole.orbitRadius, hole.phase);
      consider(hole.name, hp.x, hp.y, hole.radius);
    }
    nearest = bestD < 420 ? best : scene.starName + " system";
    return { name: nearest, dist: bestD };
  }

  function drawMinimap() {
    if (!minimap) return;
    const m = minimap.getContext("2d");
    const w = minimap.width;
    const h = minimap.height;
    const scale = (w * 0.42) / scene.worldRadius;
    m.fillStyle = "#071018";
    m.fillRect(0, 0, w, h);
    m.strokeStyle = "rgba(120,170,255,0.25)";
    m.lineWidth = 1;
    for (const p of planets) {
      m.beginPath();
      m.arc(w / 2, h / 2, p.orbitRadius * scale, 0, Math.PI * 2);
      m.stroke();
    }
    const dot = (x, y, r, color) => {
      m.fillStyle = color;
      m.beginPath();
      m.arc(w / 2 + x * scale, h / 2 + y * scale, Math.max(1.4, r * scale), 0, Math.PI * 2);
      m.fill();
    };
    dot(0, 0, scene.sun.radius, "#ffd27a");
    for (const p of planets) {
      const pos = bodyPos(p.orbitRadius, p.phase);
      dot(pos.x, pos.y, p.radius, p.kind === "gas" ? "#d6b48a" : "#7ec8ff");
    }
    if (hole) {
      const hp = bodyPos(hole.orbitRadius, hole.phase);
      dot(hp.x, hp.y, hole.radius, "#ff6b4a");
    }
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
    stepOrbits(dt);
    stepShip(dt);

    const ctx = canvas.getContext("2d");
        const bg = sprites[scene.background.spriteIndex];
        const bw = canvas.width * 1.45;
        const bh = canvas.height * 1.45;
        const maxX = (bw - canvas.width) / 2 - 4;
        const maxY = (bh - canvas.height) / 2 - 4;
        const ox = Math.max(-maxX, Math.min(maxX, camera.x * 0.035));
        const oy = Math.max(-maxY, Math.min(maxY, camera.y * 0.035));
        ctx.drawImage(
          bg,
          canvas.width / 2 - bw / 2 - ox,
          canvas.height / 2 - bh / 2 - oy,
          bw,
          bh
        );

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(camera.zoom, camera.zoom);
    ctx.translate(-camera.x, -camera.y);
    ctx.strokeStyle = "rgba(140, 180, 255, 0.16)";
    ctx.lineWidth = 1.2 / camera.zoom;
    for (const p of planets) {
      ctx.beginPath();
      ctx.arc(0, 0, p.orbitRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (scene.belt) {
      ctx.strokeStyle = "rgba(210, 180, 90, 0.12)";
      ctx.beginPath();
      ctx.arc(0, 0, scene.belt.inner, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, scene.belt.outer, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    const sunScreen = worldToScreen(0, 0, ctx);
    const glowR = scene.sun.radius * 2.4 * camera.zoom;
    const glow = ctx.createRadialGradient(sunScreen.x, sunScreen.y, glowR * 0.18, sunScreen.x, sunScreen.y, glowR);
    glow.addColorStop(0, "rgba(255, 230, 170, 0.28)");
    glow.addColorStop(0.45, "rgba(255, 180, 80, 0.1)");
    glow.addColorStop(1, "rgba(255, 140, 40, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(sunScreen.x, sunScreen.y, glowR, 0, Math.PI * 2);
    ctx.fill();
    drawSprite(ctx, scene.sun.spriteIndex, 0, 0, scene.sun.radius, 0, false, true);

    if (hole) {
      const hp = bodyPos(hole.orbitRadius, hole.phase);
      drawSprite(ctx, hole.spriteIndex, hp.x, hp.y, hole.radius, 0, false);
    }
    for (const r of rocks) {
      const rp = bodyPos(r.orbitRadius, r.phase);
      drawSprite(ctx, r.spriteIndex, rp.x, rp.y, r.radius, r.heading || 0, false);
    }
    for (const p of planets) {
      const pos = bodyPos(p.orbitRadius, p.phase);
      drawSprite(ctx, p.spriteIndex, pos.x, pos.y, p.radius, 0, true);
      for (const m of p.moons) {
        const mp = bodyPos(m.orbitRadius, m.phase);
        drawSprite(ctx, m.spriteIndex, pos.x + mp.x, pos.y + mp.y, m.radius, 0, true);
      }
    }
    if (station) {
      const host = planets[station.parent] || planets[0];
      const hp = bodyPos(host.orbitRadius, host.phase);
      const sp = bodyPos(station.orbitRadius, station.phase);
      drawSprite(ctx, station.spriteIndex, hp.x + sp.x, hp.y + sp.y, station.radius, station.phase, false);
    }
    for (const n of npcs) {
      const np = bodyPos(n.orbitRadius, n.phase);
      const tang = n.phase + Math.PI / 2;
      drawSprite(ctx, n.spriteIndex, np.x, np.y, n.radius, tang, false);
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
    canvas.removeEventListener("wheel", onWheel);
    overlay.hidden = true;
    if (onExit) onExit();
  }

  requestAnimationFrame(frame);
  return { stop };
}
