// The game's rules and state, with no drawing and no browser in it: the
// lantern spirit, falling starlight motes, void shards, power-ups, the
// golden comet, waves, the combo chain, score, lives and the win. step()
// advances one fixed step and returns what happened as bit flags, so the
// caller can react without the world knowing about screens or sound.
// Nothing here allocates after createWorld returns.

import {
  COMBO, COMET, FIELD, LIVES, MAX_LIVES, MOTE, PLAYER, POOL, POWERUP, SHARD, WAVE,
} from './config.js';

export const KIND_MOTE = 0;
export const KIND_SHARD = 1;
export const KIND_POWERUP = 2;

export const POWER_SHIELD = 0;
export const POWER_MAGNET = 1;
export const POWER_SLOW = 2;

export const EVENT_COIN = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_POWER = 8;
export const EVENT_COMET = 16;
export const EVENT_SHIELD = 32;
export const EVENT_WIN = 64;
export const EVENT_WAVE = 128;
export const EVENT_DASH = 256;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2, y: FIELD.height * 0.62, vx: 0, vy: 0,
    radius: PLAYER.radius, invulnerable: 0, shield: false,
    dashTime: 0, dashCooldown: 0, dashX: 1, dashY: 0, faceX: 1, faceY: 0,
  };

  function makePool(count, fill) {
    const pool = [];
    for (let i = 0; i < count; i += 1) pool.push(fill());
    return pool;
  }

  const motes = makePool(POOL.motes, () => ({
    active: false, kind: KIND_MOTE, x: 0, y: 0, vx: 0, vy: 0, radius: MOTE.radius, phase: 0, age: 0,
  }));
  const shards = makePool(POOL.shards, () => ({
    active: false, kind: KIND_SHARD, x: 0, y: 0, vx: 0, vy: 0, radius: SHARD.radius, rot: 0, spin: 0, age: 0,
  }));
  const powerups = makePool(POOL.powerups, () => ({
    active: false, kind: KIND_POWERUP, x: 0, y: 0, vx: 0, vy: 0, radius: POWERUP.radius, type: 0, age: 0,
  }));
  const particles = makePool(POOL.particles, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#fff',
  }));
  const floaters = makePool(POOL.floaters, () => ({
    active: false, x: 0, y: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 20,
  }));

  const comet = { active: false, x: 0, y: 0, vx: 0, vy: 0, radius: COMET.radius };

  const state = {
    player, motes, shards, powerups, particles, floaters, comet,
    score: 0, lives: LIVES, wave: 1, waveTime: 0, elapsed: 0, time: 0,
    combo: 0, comboTimer: 0, multiplier: 1,
    motesCollected: 0, shardsFaced: 0,
    shieldTime: 0, magnetTime: 0, slowTime: 0,
    moteTimer: 0.4, shardTimer: 1.2, powerTimer: 9,
    cometDone: false, banner: '', bannerTime: 0, shake: 0,
    lastGain: 0, lastPower: -1, won: false, over: false,
  };

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height * 0.62;
    player.vx = 0;
    player.vy = 0;
    player.invulnerable = 0;
    player.shield = false;
    player.dashTime = 0;
    player.dashCooldown = 0;
    player.faceX = 1;
    player.faceY = 0;
    for (const pool of [motes, shards, powerups, particles, floaters]) {
      for (const item of pool) item.active = false;
    }
    comet.active = false;
    state.score = 0;
    state.lives = LIVES;
    state.wave = 1;
    state.waveTime = 0;
    state.elapsed = 0;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.motesCollected = 0;
    state.shardsFaced = 0;
    state.shieldTime = 0;
    state.magnetTime = 0;
    state.slowTime = 0;
    state.moteTimer = 0.4;
    state.shardTimer = 1.2;
    state.powerTimer = 9;
    state.cometDone = false;
    state.banner = 'WAVE 1';
    state.bannerTime = 2.2;
    state.shake = 0;
    state.lastGain = 0;
    state.lastPower = -1;
    state.won = false;
    state.over = false;
  }

  function free(pool) {
    for (let i = 0; i < pool.length; i += 1) if (!pool[i].active) return pool[i];
    return null;
  }

  function burst(x, y, color, count, speed, size) {
    for (let i = 0; i < count; i += 1) {
      const p = free(particles);
      if (!p) return;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.35 + random() * 0.65);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.maxLife = 0.45 + random() * 0.4;
      p.life = p.maxLife;
      p.size = size * (0.6 + random() * 0.8);
      p.color = color;
    }
  }

  function floater(x, y, text, color, size) {
    const f = free(floaters);
    if (!f) return;
    f.active = true;
    f.x = x;
    f.y = y;
    f.maxLife = 1.1;
    f.life = f.maxLife;
    f.text = text;
    f.color = color;
    f.size = size || 20;
  }

  function spawnMote() {
    const m = free(motes);
    if (!m) return;
    m.active = true;
    m.x = 30 + random() * (FIELD.width - 60);
    m.y = -MOTE.radius;
    m.vx = 0;
    m.vy = MOTE.fall * (0.85 + random() * 0.4);
    m.phase = random() * Math.PI * 2;
    m.age = 0;
  }

  function shardInterval() {
    return Math.max(SHARD.minInterval, SHARD.interval * SHARD.intervalScale ** (state.wave - 1));
  }

  function spawnShard() {
    const s = free(shards);
    if (!s) return;
    // Shards enter from a random edge and drift across the field, aimed
    // loosely at where the player is standing.
    const edge = Math.floor(random() * 4);
    if (edge === 0) { s.x = -20; s.y = random() * FIELD.height * 0.6; }
    else if (edge === 1) { s.x = FIELD.width + 20; s.y = random() * FIELD.height * 0.6; }
    else if (edge === 2) { s.x = random() * FIELD.width; s.y = -20; }
    else { s.x = random() * FIELD.width; s.y = FIELD.height + 20; }
    const tx = player.x + (random() - 0.5) * 260;
    const ty = player.y + (random() - 0.5) * 260;
    const dx = tx - s.x;
    const dy = ty - s.y;
    const len = Math.hypot(dx, dy) || 1;
    const speed = (SHARD.minSpeed + SHARD.speedPerWave * (state.wave - 1) + random() * SHARD.speedJitter)
      * (state.slowTime > 0 ? POWERUP.slowFactor : 1);
    s.vx = (dx / len) * speed;
    s.vy = (dy / len) * speed;
    s.active = true;
    s.rot = random() * Math.PI * 2;
    s.spin = (random() - 0.5) * 4;
    s.age = 0;
    state.shardsFaced += 1;
  }

  function spawnPowerup() {
    const p = free(powerups);
    if (!p) return;
    p.active = true;
    p.type = Math.floor(random() * 3);
    p.x = 40 + random() * (FIELD.width - 80);
    p.y = -POWERUP.radius;
    p.vx = 0;
    p.vy = POWERUP.fall;
    p.age = 0;
  }

  function spawnComet() {
    const fromLeft = random() < 0.5;
    comet.active = true;
    comet.x = fromLeft ? -40 : FIELD.width + 40;
    comet.y = 110 + random() * (FIELD.height - 260);
    comet.vx = (fromLeft ? 1 : -1) * COMET.speed;
    comet.vy = (random() - 0.5) * 90;
    state.cometDone = true;
    floater(FIELD.width / 2, 150, 'A GOLDEN COMET!', '#ffe066', 26);
  }

  function breakCombo() {
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
  }

  function collectMote(m) {
    m.active = false;
    state.motesCollected += 1;
    state.combo += 1;
    state.comboTimer = MOTE.comboWindow;
    state.multiplier = Math.min(COMBO.maxMultiplier, 1 + Math.floor(state.combo / COMBO.perStep));
    const gain = MOTE.points * state.multiplier;
    state.score += gain;
    state.lastGain = gain;
    burst(m.x, m.y, '#ffd94d', 10, 170, 3.5);
    floater(m.x, m.y - 14, `+${gain}`, state.multiplier > 1 ? '#ffe066' : '#fff6c8', state.multiplier > 1 ? 24 : 19);
  }

  function applyPowerup(type) {
    state.lastPower = type;
    if (type === POWER_SHIELD) {
      player.shield = true;
      state.shieldTime = POWERUP.shieldSeconds;
      floater(player.x, player.y - 34, 'SHIELD!', '#5cd6ff', 24);
    } else if (type === POWER_MAGNET) {
      state.magnetTime = POWERUP.magnetSeconds;
      floater(player.x, player.y - 34, 'STAR MAGNET!', '#c792ff', 24);
    } else {
      state.slowTime = POWERUP.slowSeconds;
      floater(player.x, player.y - 34, 'TIME SLOWS!', '#7dffb0', 24);
    }
    burst(player.x, player.y, '#ffffff', 16, 200, 3.5);
  }

  /**
   * One fixed step. `steer` is {x, y} in -1..1. `dash` is null, or
   * {x, y} — the direction to dash in (toward the mouse, or the steering
   * direction). With `harmless` set (the title screen's backdrop) motes
   * drift and nothing touches the player and nothing scores.
   */
  function step(dt, steer, dash, harmless) {
    let events = 0;
    state.time += dt;

    if (!harmless) {
      state.elapsed += dt;
      state.waveTime += dt;
      if (state.waveTime >= WAVE.seconds) {
        state.waveTime = 0;
        state.cometDone = false;
        if (state.wave >= WAVE.max) {
          state.won = true;
          state.score += 500;
          events |= EVENT_WIN;
          return events;
        }
        state.wave += 1;
        const bonus = 50 * state.wave;
        state.score += bonus;
        state.banner = `WAVE ${state.wave}  ·  +${bonus}`;
        state.bannerTime = 2.2;
        events |= EVENT_WAVE;
      }
      if (!state.cometDone && state.waveTime >= COMET.atWaveTime) spawnComet();
    }

    // --- player movement ---
    const px = player.x;
    const py = player.y;
    if (player.dashTime > 0) {
      player.dashTime -= dt;
      player.vx = player.dashX * PLAYER.dashSpeed;
      player.vy = player.dashY * PLAYER.dashSpeed;
      if (random() < 0.8) {
        const p = free(particles);
        if (p) {
          p.active = true; p.x = px; p.y = py;
          p.vx = -player.dashX * 60 + (random() - 0.5) * 60;
          p.vy = -player.dashY * 60 + (random() - 0.5) * 60;
          p.maxLife = 0.35; p.life = 0.35; p.size = 5; p.color = '#ffe9a8';
        }
      }
    } else {
      const len = Math.hypot(steer.x, steer.y);
      if (len > 0) {
        const nx = steer.x / Math.max(1, len);
        const ny = steer.y / Math.max(1, len);
        player.vx += nx * PLAYER.accel * dt;
        player.vy += ny * PLAYER.accel * dt;
        player.faceX = nx;
        player.faceY = ny;
        const speed = Math.hypot(player.vx, player.vy);
        if (speed > PLAYER.speed) {
          player.vx = (player.vx / speed) * PLAYER.speed;
          player.vy = (player.vy / speed) * PLAYER.speed;
        }
      } else {
        const damp = Math.max(0, 1 - PLAYER.friction * dt);
        player.vx *= damp;
        player.vy *= damp;
      }
    }
    if (dash && player.dashCooldown <= 0 && player.dashTime <= 0) {
      let dx = dash.x;
      let dy = dash.y;
      const len = Math.hypot(dx, dy);
      if (len < 0.05) { dx = player.faceX; dy = player.faceY; }
      else { dx /= len; dy /= len; }
      player.dashX = dx;
      player.dashY = dy;
      player.dashTime = PLAYER.dashTime;
      player.dashCooldown = PLAYER.dashCooldown;
      player.invulnerable = Math.max(player.invulnerable, PLAYER.dashInvulnerable);
      burst(px, py, '#ffe9a8', 8, 140, 4);
      events |= EVENT_DASH;
    }
    player.x = Math.min(FIELD.width - player.radius, Math.max(player.radius, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - player.radius, Math.max(player.radius, player.y + player.vy * dt));
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.dashCooldown > 0) player.dashCooldown = Math.max(0, player.dashCooldown - dt);

    // --- timers ---
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) breakCombo();
    }
    if (state.shieldTime > 0) {
      state.shieldTime -= dt;
      if (state.shieldTime <= 0) player.shield = false;
    }
    if (state.magnetTime > 0) state.magnetTime -= dt;
    if (state.slowTime > 0) state.slowTime -= dt;
    if (state.bannerTime > 0) state.bannerTime -= dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);

    // --- spawning ---
    state.moteTimer -= dt;
    if (state.moteTimer <= 0) {
      spawnMote();
      state.moteTimer = MOTE.interval * (0.8 + random() * 0.5) + random() * MOTE.intervalJitter;
    }
    if (!harmless) {
      state.shardTimer -= dt;
      if (state.shardTimer <= 0) {
        spawnShard();
        if (state.wave >= SHARD.burstFromWave && random() < 0.3) {
          for (let i = 0; i < SHARD.burstSize - 1; i += 1) spawnShard();
        }
        state.shardTimer = shardInterval() * (0.75 + random() * 0.5);
      }
      state.powerTimer -= dt;
      if (state.powerTimer <= 0) {
        spawnPowerup();
        state.powerTimer = POWERUP.interval + random() * POWERUP.intervalJitter;
      }
    }

    // --- motes ---
    for (let i = 0; i < motes.length; i += 1) {
      const m = motes[i];
      if (!m.active) continue;
      m.age += dt;
      m.y += m.vy * dt;
      m.x += Math.sin(m.age * 2.2 + m.phase) * MOTE.sway * dt;
      if (state.magnetTime > 0 && !harmless) {
        const d2 = dist2(m.x, m.y, player.x, player.y);
        if (d2 < 240 * 240) {
          const d = Math.sqrt(d2) || 1;
          m.x += ((player.x - m.x) / d) * 260 * dt;
          m.y += ((player.y - m.y) / d) * 260 * dt;
        }
      }
      if (m.y > FIELD.height + 20) {
        m.active = false;
        if (!harmless && MOTE.missBreaksCombo && state.combo > 0) breakCombo();
        continue;
      }
      if (harmless) continue;
      const rr = m.radius + player.radius;
      if (dist2(m.x, m.y, player.x, player.y) < rr * rr) {
        collectMote(m);
        events |= EVENT_COIN;
      }
    }

    // --- shards ---
    for (let i = 0; i < shards.length; i += 1) {
      const s = shards[i];
      if (!s.active) continue;
      s.age += dt;
      s.rot += s.spin * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      if (s.x < -60 || s.x > FIELD.width + 60 || s.y < -60 || s.y > FIELD.height + 60) {
        s.active = false;
        continue;
      }
      if (harmless) continue;
      const rr = s.radius + player.radius - 4;
      if (dist2(s.x, s.y, player.x, player.y) >= rr * rr) continue;
      if (player.invulnerable > 0 || player.dashTime > 0) continue;
      s.active = false;
      if (player.shield) {
        player.shield = false;
        state.shieldTime = 0;
        player.invulnerable = PLAYER.invulnerable;
        burst(s.x, s.y, '#5cd6ff', 18, 260, 4);
        floater(player.x, player.y - 34, 'SHIELD HELD!', '#5cd6ff', 22);
        events |= EVENT_SHIELD;
      } else {
        state.lives -= 1;
        player.invulnerable = PLAYER.invulnerable;
        state.shake = 16;
        burst(player.x, player.y, '#ff4d6d', 26, 300, 4.5);
        burst(s.x, s.y, '#ff4d6d', 14, 220, 4);
        breakCombo();
        events |= EVENT_HIT;
        if (state.lives <= 0) {
          state.over = true;
          events |= EVENT_OVER;
          return events;
        }
      }
    }

    // --- power-ups ---
    for (let i = 0; i < powerups.length; i += 1) {
      const p = powerups[i];
      if (!p.active) continue;
      p.age += dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.age * 1.8) * 22 * dt;
      if (p.y > FIELD.height + 20) { p.active = false; continue; }
      if (harmless) continue;
      const rr = p.radius + player.radius;
      if (dist2(p.x, p.y, player.x, player.y) < rr * rr) {
        p.active = false;
        applyPowerup(p.type);
        events |= EVENT_POWER;
      }
    }

    // --- comet ---
    if (comet.active) {
      comet.x += comet.vx * dt;
      comet.y += comet.vy * dt;
      if (random() < 0.7) {
        const p = free(particles);
        if (p) {
          p.active = true; p.x = comet.x; p.y = comet.y;
          p.vx = -comet.vx * 0.08 + (random() - 0.5) * 40;
          p.vy = (random() - 0.5) * 40;
          p.maxLife = 0.6; p.life = 0.6; p.size = 4; p.color = '#ffe066';
        }
      }
      if (comet.x < -80 || comet.x > FIELD.width + 80) {
        comet.active = false;
      } else if (!harmless) {
        const rr = comet.radius + player.radius;
        if (dist2(comet.x, comet.y, player.x, player.y) < rr * rr) {
          comet.active = false;
          const gain = COMET.points * state.multiplier;
          state.score += gain;
          state.lastGain = gain;
          player.dashCooldown = 0;
          burst(comet.x, comet.y, '#ffe066', 30, 320, 5);
          floater(comet.x, comet.y - 20, `COMET +${gain}`, '#ffe066', 28);
          events |= EVENT_COMET;
        }
      }
    }

    // --- particles & floaters ---
    for (let i = 0; i < particles.length; i += 1) {
      const p = particles[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.vy *= 0.985;
    }
    for (let i = 0; i < floaters.length; i += 1) {
      const f = floaters[i];
      if (!f.active) continue;
      f.life -= dt;
      if (f.life <= 0) { f.active = false; continue; }
      f.y -= 34 * dt;
    }

    return events;
  }

  reset();
  return { state, reset, step, burst, floater };
}
