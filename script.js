/* The Musketeer — Hold the Line
 * A tiny top-down survival game. Plain canvas 2D, no dependencies, no build step.
 */
(function () {
  "use strict";

  // ---------------------------------------------------------------- config
  var VIEW_W = 960;
  var VIEW_H = 540;

  var PLAYER = {
    radius: 15,
    speed: 235,
    maxHealth: 100,
    slashCooldown: 0.42,
    slashRange: 74,
    slashArc: Math.PI * 0.75,
    slashDamage: 1,
    shootCooldown: 0.55,
    bulletSpeed: 640,
    bulletDamage: 1
  };

  var ZOMBIE = {
    radius: 13,
    speed: 46,
    health: 3,
    damage: 9,
    touchCooldown: 0.75
  };

  var WAVE_TIME = 22;

  // ---------------------------------------------------------------- dom
  var canvas = document.getElementById("game");
  var ctx = canvas.getContext("2d");
  var overlay = document.getElementById("overlay");
  var panelEyebrow = document.getElementById("panelEyebrow");
  var panelTitle = document.getElementById("panelTitle");
  var panelCopy = document.getElementById("panelCopy");
  var panelStats = document.getElementById("panelStats");
  var startBtn = document.getElementById("startBtn");
  var hud = document.getElementById("hud");
  var healthFill = document.getElementById("healthFill");
  var healthBar = healthFill.parentElement;
  var waveValue = document.getElementById("waveValue");
  var killsValue = document.getElementById("killsValue");
  var scoreValue = document.getElementById("scoreValue");
  var finalWave = document.getElementById("finalWave");
  var finalKills = document.getElementById("finalKills");
  var finalScore = document.getElementById("finalScore");
  var touchUi = document.getElementById("touch");
  var stick = document.getElementById("stick");
  var knob = document.getElementById("knob");
  var slashBtn = document.getElementById("slashBtn");
  var shootBtn = document.getElementById("shootBtn");
  var yearEl = document.getElementById("year");

  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---------------------------------------------------------------- state
  var state = "menu";
  var lastTime = 0;
  var elapsed = 0;
  var spawnTimer = 0;
  var wave = 1;
  var waveTimer = 0;
  var kills = 0;
  var score = 0;
  var shake = 0;

  var player = null;
  var zombies = [];
  var bullets = [];
  var particles = [];
  var slashes = [];

  var keys = Object.create(null);
  var touchVector = { x: 0, y: 0 };
  var pointer = { x: VIEW_W / 2, y: VIEW_H / 2 - 100, active: false };

  var isTouch = ("ontouchstart" in window) || navigator.maxTouchPoints > 0;

  // ---------------------------------------------------------------- helpers
  function rand(min, max) { return min + Math.random() * (max - min); }
  function clamp(v, min, max) { return v < min ? min : v > max ? max : v; }
  function dist2(ax, ay, bx, by) {
    var dx = ax - bx, dy = ay - by;
    return dx * dx + dy * dy;
  }
  function angleToward(from, to, maxStep) {
    var diff = ((to - from + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    return from + clamp(diff, -maxStep, maxStep);
  }

  // ---------------------------------------------------------------- reset
  function resetGame() {
    elapsed = 0;
    spawnTimer = 0.6;
    wave = 1;
    waveTimer = 0;
    kills = 0;
    score = 0;
    shake = 0;

    player = {
      x: VIEW_W / 2,
      y: VIEW_H / 2,
      vx: 0,
      vy: 0,
      aim: -Math.PI / 2,
      health: PLAYER.maxHealth,
      slashTimer: 0,
      shootTimer: 0,
      hurtFlash: 0,
      walkPhase: 0
    };

    zombies.length = 0;
    bullets.length = 0;
    particles.length = 0;
    slashes.length = 0;

    syncHud();
  }

  function syncHud() {
    var ratio = clamp(player ? player.health / PLAYER.maxHealth : 1, 0, 1);
    healthFill.style.width = (ratio * 100).toFixed(1) + "%";
    healthBar.classList.toggle("is-low", ratio <= 0.34);
    waveValue.textContent = String(wave);
    killsValue.textContent = String(kills);
    scoreValue.textContent = String(score);
  }

  // ---------------------------------------------------------------- input
  window.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    keys[k] = true;
    if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].indexOf(k) !== -1) {
      e.preventDefault();
    }
    if (state === "playing") {
      if (k === " " || k === "k") trySlash();
      if (k === "j") tryShoot();
    } else if (k === "enter" || k === " ") {
      e.preventDefault();
      startGame();
    }
  });

  window.addEventListener("keyup", function (e) {
    keys[e.key.toLowerCase()] = false;
  });

  window.addEventListener("blur", function () {
    keys = Object.create(null);
    touchVector.x = 0;
    touchVector.y = 0;
    resetKnob();
  });

  canvas.addEventListener("mousemove", function (e) {
    var rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    pointer.y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    pointer.active = true;
  });

  canvas.addEventListener("mouseleave", function () {
    pointer.active = false;
  });

  canvas.addEventListener("mousedown", function (e) {
    if (e.button !== 0 || state !== "playing") return;
    var rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * VIEW_W;
    pointer.y = ((e.clientY - rect.top) / rect.height) * VIEW_H;
    pointer.active = true;
    tryShoot();
  });

  canvas.addEventListener("contextmenu", function (e) {
    if (state === "playing") e.preventDefault();
  });

  // touch: virtual stick
  var stickPointerId = null;

  function resetKnob() {
    knob.style.transform = "translate(-50%, -50%)";
  }

  function updateStick(e) {
    var rect = stick.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = e.clientX - cx;
    var dy = e.clientY - cy;
    var maxR = rect.width * 0.36;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var clamped = Math.min(len, maxR);
    var nx = (dx / len) * clamped;
    var ny = (dy / len) * clamped;
    knob.style.transform = "translate(calc(-50% + " + nx + "px), calc(-50% + " + ny + "px))";
    touchVector.x = clamp(dx / maxR, -1, 1);
    touchVector.y = clamp(dy / maxR, -1, 1);
  }

  stick.addEventListener("pointerdown", function (e) {
    stickPointerId = e.pointerId;
    try { stick.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    updateStick(e);
    e.preventDefault();
  });

  stick.addEventListener("pointermove", function (e) {
    if (e.pointerId !== stickPointerId) return;
    updateStick(e);
    e.preventDefault();
  });

  function endStick(e) {
    if (e.pointerId !== stickPointerId) return;
    stickPointerId = null;
    touchVector.x = 0;
    touchVector.y = 0;
    resetKnob();
  }

  stick.addEventListener("pointerup", endStick);
  stick.addEventListener("pointercancel", endStick);

  function bindHold(btn, fn) {
    btn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      if (state === "playing") fn();
    });
  }

  bindHold(slashBtn, trySlash);
  bindHold(shootBtn, tryShoot);

  startBtn.addEventListener("click", function () {
    if (state === "playing") return;
    startGame();
  });

  if (isTouch) touchUi.classList.add("is-visible");

  // ---------------------------------------------------------------- flow
  function startGame() {
    resetGame();
    state = "playing";
    overlay.classList.add("is-hidden");
    hud.classList.remove("is-hidden");
    lastTime = 0;
    requestAnimationFrame(loop);
  }

  function gameOver() {
    state = "over";
    panelEyebrow.textContent = "You fell";
    panelTitle.textContent = "The Line Broke";
    panelCopy.textContent =
      "The horde overwhelmed you. Sharpen your rapier, reload the pistol, and try again.";
    panelStats.hidden = false;
    finalWave.textContent = String(wave);
    finalKills.textContent = String(kills);
    finalScore.textContent = String(score);
    startBtn.textContent = "Fight again";
    overlay.classList.remove("is-hidden");
    hud.classList.add("is-hidden");
  }

  // ---------------------------------------------------------------- actions
  function trySlash() {
    if (!player || player.slashTimer > 0) return;
    player.slashTimer = PLAYER.slashCooldown;
    slashes.push({ t: 0, life: 0.22, aim: player.aim });
    player.walkPhase += 0.6;

    var hitAny = false;
    for (var i = zombies.length - 1; i >= 0; i--) {
      var z = zombies[i];
      var dx = z.x - player.x;
      var dy = z.y - player.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      if (d > PLAYER.slashRange + z.radius) continue;
      var ang = Math.atan2(dy, dx);
      var delta = Math.abs(((ang - player.aim + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (delta > PLAYER.slashArc / 2) continue;
      hurtZombie(z, PLAYER.slashDamage, dx / d, dy / d, 150);
      hitAny = true;
    }
    if (hitAny) shake = Math.max(shake, 3);
  }

  function tryShoot() {
    if (!player || player.shootTimer > 0) return;
    player.shootTimer = PLAYER.shootCooldown;
    var muzzle = 18;
    var bx = player.x + Math.cos(player.aim) * muzzle;
    var by = player.y + Math.sin(player.aim) * muzzle;
    bullets.push({
      x: bx,
      y: by,
      vx: Math.cos(player.aim) * PLAYER.bulletSpeed,
      vy: Math.sin(player.aim) * PLAYER.bulletSpeed,
      life: 1.1
    });
    for (var i = 0; i < 5; i++) {
      spawnParticle(bx, by, {
        color: "#f2d489",
        speed: rand(40, 130),
        angle: player.aim + rand(-0.5, 0.5),
        life: rand(0.12, 0.26),
        size: rand(1, 2.4)
      });
    }
    shake = Math.max(shake, 2.4);
  }

  function hurtZombie(z, amount, nx, ny, push) {
    z.health -= amount;
    z.hitFlash = 0.12;
    z.x += (nx || 0) * push * 0.01;
    z.y += (ny || 0) * push * 0.01;
    var color = z.health <= 0 ? "#7ea36b" : "#8c2c22";
    for (var i = 0; i < 6; i++) {
      spawnParticle(z.x, z.y, {
        color: color,
        speed: rand(50, 190),
        angle: Math.atan2(ny || 0, nx || 0) + rand(-0.9, 0.9),
        life: rand(0.18, 0.45),
        size: rand(1.4, 3.2)
      });
    }
    if (z.health <= 0) killZombie(z);
  }

  function killZombie(z) {
    var idx = zombies.indexOf(z);
    if (idx === -1) return;
    zombies.splice(idx, 1);
    kills += 1;
    score += 10 + wave * 2;
    shake = Math.max(shake, 4);
    for (var i = 0; i < 16; i++) {
      spawnParticle(z.x, z.y, {
        color: i % 3 === 0 ? "#7ea36b" : "#5a1f19",
        speed: rand(40, 260),
        angle: rand(0, Math.PI * 2),
        life: rand(0.25, 0.7),
        size: rand(1.5, 4)
      });
    }
    syncHud();
  }

  function damagePlayer(amount) {
    if (!player || player.health <= 0) return;
    player.health = Math.max(0, player.health - amount);
    player.hurtFlash = 1;
    shake = Math.max(shake, 6);
    for (var i = 0; i < 10; i++) {
      spawnParticle(player.x, player.y, {
        color: "#c0392b",
        speed: rand(60, 220),
        angle: rand(0, Math.PI * 2),
        life: rand(0.2, 0.5),
        size: rand(1.4, 3)
      });
    }
    syncHud();
    if (player.health <= 0) gameOver();
  }

  function spawnParticle(x, y, opts) {
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(opts.angle) * opts.speed,
      vy: Math.sin(opts.angle) * opts.speed,
      life: opts.life,
      maxLife: opts.life,
      size: opts.size,
      color: opts.color
    });
  }

  // ---------------------------------------------------------------- spawning
  function spawnZombie() {
    var edge = Math.floor(Math.random() * 4);
    var x, y, margin = 40;
    if (edge === 0) { x = rand(0, VIEW_W); y = -margin; }
    else if (edge === 1) { x = VIEW_W + margin; y = rand(0, VIEW_H); }
    else if (edge === 2) { x = rand(0, VIEW_W); y = VIEW_H + margin; }
    else { x = -margin; y = rand(0, VIEW_H); }

    var tier = Math.min(wave, 8);
    var hp = ZOMBIE.health + Math.floor(tier / 3);
    var kind = Math.random() < 0.18 ? "runner" : "walker";
    var zombie = {
      x: x,
      y: y,
      radius: ZOMBIE.radius,
      health: hp,
      maxHealth: hp,
      speed: ZOMBIE.speed + Math.min(wave * 4, 40) + rand(-6, 10),
      wobble: rand(0, Math.PI * 2),
      hitFlash: 0,
      touchTimer: 0,
      kind: kind
    };
    if (kind === "runner") {
      zombie.speed *= 1.45;
      zombie.health = Math.max(1, zombie.health - 1);
      zombie.maxHealth = zombie.health;
      zombie.radius = 11;
    }
    zombies.push(zombie);
  }

  // ---------------------------------------------------------------- update
  function update(dt) {
    elapsed += dt;

    if (!player) return;

    if (pointer.active && !isTouch) {
      var aimTarget = Math.atan2(pointer.y - player.y, pointer.x - player.x);
      player.aim = angleToward(player.aim, aimTarget, 14 * dt);
    }

    var mx = 0, my = 0;
    if (keys["a"] || keys["arrowleft"]) mx -= 1;
    if (keys["d"] || keys["arrowright"]) mx += 1;
    if (keys["w"] || keys["arrowup"]) my -= 1;
    if (keys["s"] || keys["arrowdown"]) my += 1;

    mx += touchVector.x;
    my += touchVector.y;

    var mlen = Math.sqrt(mx * mx + my * my);
    if (mlen > 1) { mx /= mlen; my /= mlen; mlen = 1; }

    player.vx = mx * PLAYER.speed;
    player.vy = my * PLAYER.speed;
    player.x = clamp(player.x + player.vx * dt, PLAYER.radius, VIEW_W - PLAYER.radius);
    player.y = clamp(player.y + player.vy * dt, PLAYER.radius, VIEW_H - PLAYER.radius);

    if (mlen > 0.05) {
      player.walkPhase += dt * 11;
      if (isTouch) player.aim = angleToward(player.aim, Math.atan2(my, mx), 10 * dt);
    }

    player.slashTimer = Math.max(0, player.slashTimer - dt);
    player.shootTimer = Math.max(0, player.shootTimer - dt);
    player.hurtFlash = Math.max(0, player.hurtFlash - dt * 3);

    waveTimer += dt;
    if (waveTimer >= WAVE_TIME) {
      waveTimer = 0;
      wave += 1;
      score += 25;
      syncHud();
    }

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      var interval = Math.max(0.34, 1.45 - wave * 0.1);
      spawnTimer = interval * rand(0.75, 1.25);
      var batch = 1 + Math.floor(wave / 4);
      for (var s = 0; s < batch && zombies.length < 90; s++) spawnZombie();
    }

    for (var i = zombies.length - 1; i >= 0; i--) {
      var z = zombies[i];
      z.hitFlash = Math.max(0, z.hitFlash - dt);
      z.touchTimer = Math.max(0, z.touchTimer - dt);
      z.wobble += dt * 4;

      var dx = player.x - z.x;
      var dy = player.y - z.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      var wob = Math.sin(z.wobble) * 0.35;
      var dirX = dx / d + Math.cos(Math.atan2(dy, dx) + Math.PI / 2) * wob * 0.35;
      var dirY = dy / d + Math.sin(Math.atan2(dy, dx) + Math.PI / 2) * wob * 0.35;
      var dl = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
      dirX /= dl; dirY /= dl;

      z.x += dirX * z.speed * dt;
      z.y += dirY * z.speed * dt;

      var minD = z.radius + PLAYER.radius;
      if (d < minD) {
        z.x = player.x - (dx / d) * minD;
        z.y = player.y - (dy / d) * minD;
        if (z.touchTimer <= 0) {
          z.touchTimer = ZOMBIE.touchCooldown;
          damagePlayer(ZOMBIE.damage);
        }
      }
    }

    for (var a = 0; a < zombies.length; a++) {
      for (var b = a + 1; b < zombies.length; b++) {
        var za = zombies[a], zb = zombies[b];
        var ddx = zb.x - za.x, ddy = zb.y - za.y;
        var dd = Math.sqrt(ddx * ddx + ddy * ddy) || 0.001;
        var overlap = za.radius + zb.radius - dd;
        if (overlap > 0) {
          var push = overlap / 2;
          ddx /= dd; ddy /= dd;
          za.x -= ddx * push;
          za.y -= ddy * push;
          zb.x += ddx * push;
          zb.y += ddy * push;
        }
      }
    }

    for (var bi = bullets.length - 1; bi >= 0; bi--) {
      var bullet = bullets[bi];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;

      if (bullet.life <= 0 || bullet.x < -20 || bullet.x > VIEW_W + 20 || bullet.y < -20 || bullet.y > VIEW_H + 20) {
        bullets.splice(bi, 1);
        continue;
      }

      var hit = false;
      for (var zi = 0; zi < zombies.length; zi++) {
        var zz = zombies[zi];
        var rr = zz.radius + 4;
        if (dist2(bullet.x, bullet.y, zz.x, zz.y) < rr * rr) {
          var bl = Math.sqrt(bullet.vx * bullet.vx + bullet.vy * bullet.vy) || 1;
          hurtZombie(zz, PLAYER.bulletDamage, bullet.vx / bl, bullet.vy / bl, 90);
          hit = true;
          break;
        }
      }
      if (hit) bullets.splice(bi, 1);
    }

    for (var si = slashes.length - 1; si >= 0; si--) {
      slashes[si].t += dt;
      if (slashes[si].t >= slashes[si].life) slashes.splice(si, 1);
    }

    for (var pi = particles.length - 1; pi >= 0; pi--) {
      var p = particles[pi];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      p.life -= dt;
      if (p.life <= 0) particles.splice(pi, 1);
    }

    shake = Math.max(0, shake - dt * 26);
  }

  // ---------------------------------------------------------------- draw
  function drawGround() {
    var g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, "#131a15");
    g.addColorStop(1, "#0a0e0b");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    ctx.strokeStyle = "rgba(217, 180, 90, 0.05)";
    ctx.lineWidth = 1;
    var step = 60;
    for (var x = step; x < VIEW_W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, VIEW_H);
      ctx.stroke();
    }
    for (var y = step; y < VIEW_H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(VIEW_W, y);
      ctx.stroke();
    }

    var vign = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.25, VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.85);
    vign.addColorStop(0, "rgba(0,0,0,0)");
    vign.addColorStop(1, "rgba(0,0,0,0.55)");
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawZombie(z) {
    ctx.save();
    ctx.translate(z.x, z.y);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, z.radius * 0.8, z.radius * 0.95, z.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    var body = z.hitFlash > 0 ? "#f2d489" : (z.kind === "runner" ? "#6d8a52" : "#5d7350");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#c9d8b8";
    ctx.beginPath();
    ctx.arc(-z.radius * 0.34, -z.radius * 0.22, z.radius * 0.19, 0, Math.PI * 2);
    ctx.arc(z.radius * 0.34, -z.radius * 0.22, z.radius * 0.19, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#2b1a14";
    ctx.beginPath();
    ctx.arc(-z.radius * 0.34, -z.radius * 0.22, z.radius * 0.08, 0, Math.PI * 2);
    ctx.arc(z.radius * 0.34, -z.radius * 0.22, z.radius * 0.08, 0, Math.PI * 2);
    ctx.fill();

    var hpRatio = z.maxHealth ? z.health / z.maxHealth : 1;
    if (hpRatio < 1) {
      var w = z.radius * 2;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(-w / 2, -z.radius - 9, w, 3.5);
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(-w / 2, -z.radius - 9, w * clamp(hpRatio, 0, 1), 3.5);
    }

    ctx.restore();
  }

  function drawPlayer() {
    if (!player) return;
    ctx.save();
    ctx.translate(player.x, player.y);

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(0, PLAYER.radius * 0.85, PLAYER.radius * 1.0, PLAYER.radius * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(player.aim);

    // cape
    ctx.fillStyle = "#7a1f1f";
    ctx.beginPath();
    ctx.moveTo(-6, -PLAYER.radius * 0.8);
    ctx.lineTo(-PLAYER.radius * 1.7, 0);
    ctx.lineTo(-6, PLAYER.radius * 0.8);
    ctx.closePath();
    ctx.fill();

    // body
    ctx.fillStyle = player.hurtFlash > 0 ? "#ffffff" : "#2f4d7a";
    ctx.beginPath();
    ctx.arc(0, 0, PLAYER.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#16233a";
    ctx.lineWidth = 2;
    ctx.stroke();

    // hat brim + feather
    ctx.fillStyle = "#1b1409";
    ctx.beginPath();
    ctx.ellipse(1, 0, PLAYER.radius * 0.95, PLAYER.radius * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f2d489";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-PLAYER.radius * 0.5, -PLAYER.radius * 0.9);
    ctx.quadraticCurveTo(-PLAYER.radius * 1.5, -PLAYER.radius * 1.7, -PLAYER.radius * 1.9, -PLAYER.radius * 0.6);
    ctx.stroke();

    // rapier
    ctx.strokeStyle = "#dfe7e0";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(PLAYER.radius * 0.5, PLAYER.radius * 0.35);
    ctx.lineTo(PLAYER.radius * 2.0, PLAYER.radius * 0.35);
    ctx.stroke();
    ctx.strokeStyle = "#d9b45a";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(PLAYER.radius * 0.45, PLAYER.radius * 0.1);
    ctx.lineTo(PLAYER.radius * 0.45, PLAYER.radius * 0.6);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  function drawSlashes() {
    for (var i = 0; i < slashes.length; i++) {
      var s = slashes[i];
      var p = s.t / s.life;
      var alpha = (1 - p) * 0.85;
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(s.aim);
      ctx.strokeStyle = "rgba(242, 212, 137," + alpha.toFixed(3) + ")";
      ctx.lineWidth = 7 * (1 - p) + 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, PLAYER.slashRange * (0.75 + p * 0.35), -PLAYER.slashArc / 2, PLAYER.slashArc / 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawBullets() {
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      var ang = Math.atan2(b.vy, b.vx);
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(ang);
      ctx.fillStyle = "#f2d489";
      ctx.fillRect(-7, -1.6, 14, 3.2);
      ctx.fillStyle = "rgba(242, 212, 137, 0.35)";
      ctx.fillRect(-18, -2.4, 12, 4.8);
      ctx.restore();
    }
  }

  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var a = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);

    if (shake > 0.1) {
      ctx.translate(rand(-shake, shake) * 0.5, rand(-shake, shake) * 0.5);
    }

    drawGround();

    for (var i = 0; i < zombies.length; i++) drawZombie(zombies[i]);

    drawSlashes();
    drawBullets();
    drawPlayer();
    drawParticles();
  }

  // ---------------------------------------------------------------- loop
  function loop(time) {
    if (state !== "playing") {
      render();
      return;
    }

    if (!lastTime) lastTime = time;
    var dt = (time - lastTime) / 1000;
    lastTime = time;

    if (dt > 0.1) dt = 0.1;

    update(dt);
    render();

    if (state === "playing") requestAnimationFrame(loop);
  }

  // ---------------------------------------------------------------- boot
  resetGame();
  state = "menu";
  render();
})();