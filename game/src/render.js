// Drawing only: the world's state and the current screen in, pixels out.
// The 1280x720 playfield is scaled to fit the window and centred, the
// margin filled with the backdrop colour. Night sky, aurora ribbons,
// glowing starlight, jagged void shards, the lantern spirit, particles,
// the HUD and the menu panels — all canvas shapes and text, no images.

import { COMBO, FIELD, FONT, LIVES, MOTE, PALETTE, POWERUP, WAVE } from './config.js';
import { KIND_MOTE, KIND_POWERUP, KIND_SHARD, POWER_MAGNET, POWER_SHIELD, POWER_SLOW } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 34, bottom: 78 };

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

function roundRectPath(context, x, y, w, h, r) {
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + w, y, x + w, y + h, r);
  context.arcTo(x + w, y + h, x, y + h, r);
  context.arcTo(x, y + h, x, y, r);
  context.arcTo(x, y, x + w, y, r);
  context.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('');
  const bestLabel = cachedLabel('BEST ');
  const waveLabel = cachedLabel('WAVE ');
  const finalLabel = cachedLabel('SCORE ');
  const waveReachedLabel = cachedLabel('REACHED WAVE ');

  // The background stars are fixed for the life of the page.
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: Math.random() * FIELD.width,
      y: Math.random() * FIELD.height * 0.85,
      r: 0.6 + Math.random() * 1.7,
      twinkle: Math.random() * Math.PI * 2,
      speed: 0.6 + Math.random() * 1.6,
    });
  }
  // Aurora control points, one wave each, so the ribbons flow smoothly.
  const aurora = [];
  for (let i = 0; i <= 24; i += 1) aurora.push(i / 24);

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    context.font = `${weight || 600} ${size}px ${FONT}`;
    context.fillStyle = color;
    context.textAlign = align || 'left';
    context.fillText(value, x, y);
  }

  function glowCircle(x, y, radius, color, alpha) {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.globalAlpha = alpha;
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
  }

  function drawSky(state) {
    const gradient = context.createLinearGradient(0, 0, 0, FIELD.height);
    gradient.addColorStop(0, PALETTE.backdrop);
    gradient.addColorStop(0.6, PALETTE.deep);
    gradient.addColorStop(1, '#131a3d');
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Twinkling stars.
    for (const star of stars) {
      const a = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(state.time * star.speed + star.twinkle));
      context.globalAlpha = a;
      context.fillStyle = '#dfe6ff';
      context.fillRect(star.x, star.y, star.r, star.r);
    }
    context.globalAlpha = 1;

    // Three slow aurora ribbons across the upper sky: each is a band with a
    // wavy top edge and a wavy bottom edge, so it reads as light, not land.
    const bands = [
      { color: PALETTE.auroraA, base: 130, amp: 42, phase: 0.4, alpha: 0.17, thick: 74 },
      { color: PALETTE.auroraB, base: 195, amp: 52, phase: 1.7, alpha: 0.15, thick: 92 },
      { color: PALETTE.auroraC, base: 255, amp: 36, phase: 3.1, alpha: 0.12, thick: 62 },
    ];
    function bandY(band, t) {
      return band.base + Math.sin(t * 5.2 + state.time * 0.25 + band.phase) * band.amp
        + Math.sin(t * 11 + state.time * 0.13) * 10;
    }
    for (const band of bands) {
      context.globalAlpha = band.alpha;
      context.fillStyle = band.color;
      context.beginPath();
      for (const t of aurora) context.lineTo(t * FIELD.width, bandY(band, t));
      for (let i = aurora.length - 1; i >= 0; i -= 1) {
        const t = aurora[i];
        context.lineTo(t * FIELD.width, bandY(band, t) + band.thick);
      }
      context.closePath();
      context.fill();
    }
    context.globalAlpha = 1;

    // A soft horizon glow at the bottom, where the motes are born to fall.
    glowCircle(FIELD.width / 2, FIELD.height + 60, 620, '#2a2f6e', 0.5);
  }

  function drawMote(m, time) {
    const pulse = 1 + 0.18 * Math.sin(time * 5 + m.phase);
    glowCircle(m.x, m.y, m.radius * 3.2 * pulse, '#ffd94d', 0.5);
    context.fillStyle = PALETTE.moteCore;
    context.beginPath();
    context.arc(m.x, m.y, m.radius * 0.62 * pulse, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = PALETTE.mote;
    context.lineWidth = 2.5;
    context.beginPath();
    context.arc(m.x, m.y, m.radius * pulse, 0, Math.PI * 2);
    context.stroke();
    // Sparkle cross.
    const s = m.radius * 1.5 * pulse;
    context.strokeStyle = 'rgba(255, 246, 200, 0.9)';
    context.lineWidth = 1.5;
    context.beginPath();
    context.moveTo(m.x - s, m.y);
    context.lineTo(m.x + s, m.y);
    context.moveTo(m.x, m.y - s);
    context.lineTo(m.x, m.y + s);
    context.stroke();
  }

  function drawShard(s) {
    glowCircle(s.x, s.y, s.radius * 2.4, '#ff4d6d', 0.35);
    context.save();
    context.translate(s.x, s.y);
    context.rotate(s.rot);
    context.fillStyle = PALETTE.shard;
    context.beginPath();
    const points = 5;
    for (let i = 0; i < points * 2; i += 1) {
      const angle = (i / (points * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? s.radius * 1.25 : s.radius * 0.55;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.shardCore;
    context.beginPath();
    context.arc(0, 0, s.radius * 0.42, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawPowerupIcon(p) {
    const colors = [PALETTE.shield, PALETTE.magnet, PALETTE.slow];
    const color = colors[p.type] || '#ffffff';
    const bob = Math.sin(p.age * 3) * 3;
    const y = p.y + bob;
    glowCircle(p.x, y, p.radius * 2.6, color, 0.5);
    context.fillStyle = 'rgba(10, 14, 34, 0.9)';
    context.beginPath();
    context.arc(p.x, y, p.radius, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = color;
    context.lineWidth = 2.5;
    context.stroke();
    context.strokeStyle = '#ffffff';
    context.fillStyle = '#ffffff';
    context.lineWidth = 2;
    if (p.type === POWER_SHIELD) {
      // A little shield.
      context.beginPath();
      context.moveTo(p.x, y - 7);
      context.lineTo(p.x + 6, y - 4);
      context.lineTo(p.x + 6, y + 1);
      context.quadraticCurveTo(p.x + 6, y + 6, p.x, y + 8);
      context.quadraticCurveTo(p.x - 6, y + 6, p.x - 6, y + 1);
      context.lineTo(p.x - 6, y - 4);
      context.closePath();
      context.stroke();
    } else if (p.type === POWER_MAGNET) {
      // A horseshoe magnet.
      context.beginPath();
      context.arc(p.x, y - 1, 6, Math.PI, 0);
      context.stroke();
      context.beginPath();
      context.moveTo(p.x - 6, y - 1);
      context.lineTo(p.x - 6, y + 5);
      context.moveTo(p.x + 6, y - 1);
      context.lineTo(p.x + 6, y + 5);
      context.stroke();
    } else {
      // A clock: time slows.
      context.beginPath();
      context.arc(p.x, y, 6.5, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.moveTo(p.x, y);
      context.lineTo(p.x, y - 4);
      context.moveTo(p.x, y);
      context.lineTo(p.x + 3.5, y + 1.5);
      context.stroke();
    }
  }

  function drawComet(comet) {
    const tail = 150;
    const gradient = context.createLinearGradient(
      comet.x - Math.sign(comet.vx) * tail, comet.y,
      comet.x, comet.y,
    );
    gradient.addColorStop(0, 'rgba(255, 224, 102, 0)');
    gradient.addColorStop(1, 'rgba(255, 224, 102, 0.85)');
    context.strokeStyle = gradient;
    context.lineWidth = 7;
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(comet.x - Math.sign(comet.vx) * tail, comet.y);
    context.lineTo(comet.x, comet.y);
    context.stroke();
    glowCircle(comet.x, comet.y, 52, '#ffe066', 0.8);
    context.fillStyle = '#fffbe0';
    context.beginPath();
    context.arc(comet.x, comet.y, 13, 0, Math.PI * 2);
    context.fill();
  }

  function drawPlayer(state) {
    const player = state.player;
    const flicker = 1 + 0.12 * Math.sin(state.time * 9) + 0.06 * Math.sin(state.time * 23);
    const hidden = player.invulnerable > 0 && player.dashTime <= 0
      && Math.floor(player.invulnerable * 10) % 2 === 0;
    if (hidden) return;
    glowCircle(player.x, player.y, 64 * flicker, '#ff9d3c', 0.55);
    glowCircle(player.x, player.y, 34, '#ffe9a8', 0.6);
    // Lantern body.
    const body = context.createRadialGradient(
      player.x - 5, player.y - 7, 2, player.x, player.y, player.radius + 2,
    );
    body.addColorStop(0, '#fffbe0');
    body.addColorStop(0.55, PALETTE.player);
    body.addColorStop(1, '#ff9d3c');
    context.fillStyle = body;
    context.beginPath();
    context.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    context.fill();
    // Flame on top.
    context.fillStyle = PALETTE.playerFlame;
    context.beginPath();
    context.moveTo(player.x, player.y - player.radius - 12 * flicker);
    context.quadraticCurveTo(player.x + 7, player.y - player.radius - 2, player.x, player.y - player.radius + 2);
    context.quadraticCurveTo(player.x - 7, player.y - player.radius - 2, player.x, player.y - player.radius - 12 * flicker);
    context.fill();
    // Sleepy determined eyes.
    context.fillStyle = '#2a1a08';
    context.beginPath();
    context.arc(player.x - 5.5, player.y - 1, 2.2, 0, Math.PI * 2);
    context.arc(player.x + 5.5, player.y - 1, 2.2, 0, Math.PI * 2);
    context.fill();
    // Shield ring.
    if (player.shield) {
      context.strokeStyle = PALETTE.shield;
      context.globalAlpha = 0.7 + 0.3 * Math.sin(state.time * 6);
      context.lineWidth = 3;
      context.beginPath();
      context.arc(player.x, player.y, player.radius + 12, 0, Math.PI * 2);
      context.stroke();
      context.globalAlpha = 1;
    }
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      context.beginPath();
      context.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  }

  function drawFloaters(state) {
    context.textBaseline = 'alphabetic';
    for (const f of state.floaters) {
      if (!f.active) continue;
      context.globalAlpha = Math.max(0, f.life / f.maxLife);
      text(f.text, f.x, f.y, f.size, f.color, 'center', 800);
    }
    context.globalAlpha = 1;
  }

  function drawHud(state, best, muted) {
    context.textBaseline = 'top';
    // Score, top left.
    text(scoreLabel(state.score), 26, 18, 34, PALETTE.text, 'left', 800);
    text(bestLabel(best), 26, 58, 17, PALETTE.muted, 'left', 600);
    // Wave, top centre, with a progress bar for the wave.
    text(waveLabel(state.wave), FIELD.width / 2, 18, 28, PALETTE.text, 'center', 800);
    const barW = 220;
    const barX = FIELD.width / 2 - barW / 2;
    context.fillStyle = 'rgba(255, 255, 255, 0.14)';
    roundRectPath(context, barX, 54, barW, 8, 4);
    context.fill();
    context.fillStyle = PALETTE.auroraA;
    roundRectPath(context, barX, 54, barW * Math.min(1, state.waveTime / WAVE.seconds), 8, 4);
    context.fill();
    // Lives, top right: little lanterns, dim when lost.
    const gap = 30;
    const firstX = FIELD.width - 26 - LIVES * gap + gap;
    text('LIGHTS', firstX - 14, 24, 17, PALETTE.muted, 'right', 600);
    for (let i = 0; i < LIVES; i += 1) {
      const x = firstX + i * gap;
      const y = 32;
      if (i < state.lives) {
        glowCircle(x, y, 16, '#ff9d3c', 0.5);
        context.fillStyle = PALETTE.player;
        context.beginPath();
        context.arc(x, y, 9, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillStyle = 'rgba(255, 255, 255, 0.16)';
        context.beginPath();
        context.arc(x, y, 9, 0, Math.PI * 2);
        context.fill();
      }
    }
    // Active power-ups as pills under the lives.
    let pillY = 56;
    const pills = [];
    if (state.player.shield) pills.push(['SHIELD', Math.ceil(state.shieldTime), PALETTE.shield]);
    if (state.magnetTime > 0) pills.push(['MAGNET', Math.ceil(state.magnetTime), PALETTE.magnet]);
    if (state.slowTime > 0) pills.push(['SLOW', Math.ceil(state.slowTime), PALETTE.slow]);
    for (const [label, seconds, color] of pills) {
      const labelText = `${label} ${seconds}s`;
      context.font = `700 15px ${FONT}`;
      const w = context.measureText(labelText).width + 20;
      context.fillStyle = 'rgba(10, 14, 34, 0.75)';
      roundRectPath(context, FIELD.width - 26 - w, pillY, w, 24, 12);
      context.fill();
      context.strokeStyle = color;
      context.lineWidth = 1.5;
      context.stroke();
      text(labelText, FIELD.width - 26 - w / 2, pillY + 5, 15, color, 'center', 700);
      pillY += 30;
    }
    // Combo meter, bottom left, only while a chain is alive.
    if (state.combo >= 2) {
      const mult = state.multiplier;
      context.fillStyle = 'rgba(10, 14, 34, 0.7)';
      roundRectPath(context, 26, FIELD.height - 66, 220, 44, 10);
      context.fill();
      text(`COMBO x${mult}`, 40, FIELD.height - 58, 22, PALETTE.gold, 'left', 800);
      text(`${state.combo} in a row`, 40, FIELD.height - 32, 14, PALETTE.muted, 'left', 600);
      const frac = Math.max(0, state.comboTimer / MOTE.comboWindow);
      context.fillStyle = 'rgba(255, 255, 255, 0.14)';
      roundRectPath(context, 150, FIELD.height - 50, 82, 7, 3);
      context.fill();
      context.fillStyle = PALETTE.gold;
      roundRectPath(context, 150, FIELD.height - 50, 82 * frac, 7, 3);
      context.fill();
    }
    // Dash cooldown, bottom right.
    const dashFrac = 1 - state.player.dashCooldown / 1.6;
    context.fillStyle = 'rgba(10, 14, 34, 0.7)';
    roundRectPath(context, FIELD.width - 246, FIELD.height - 66, 220, 44, 10);
    context.fill();
    text(dashFrac >= 1 ? 'DASH READY' : 'DASH…', FIELD.width - 232, FIELD.height - 58, 18, dashFrac >= 1 ? PALETTE.auroraA : PALETTE.muted, 'left', 800);
    context.fillStyle = 'rgba(255, 255, 255, 0.14)';
    roundRectPath(context, FIELD.width - 232, FIELD.height - 32, 192, 7, 3);
    context.fill();
    context.fillStyle = dashFrac >= 1 ? PALETTE.auroraA : '#5a6b8a';
    roundRectPath(context, FIELD.width - 232, FIELD.height - 32, 192 * Math.max(0, dashFrac), 7, 3);
    context.fill();
    // Sound state, tiny, bottom centre.
    text(muted ? 'M — sound off' : 'M — sound on', FIELD.width / 2, FIELD.height - 26, 13, PALETTE.muted, 'center', 600);
  }

  function drawBanner(state) {
    if (state.bannerTime <= 0 || !state.banner) return;
    const alpha = Math.min(1, state.bannerTime / 0.8);
    context.globalAlpha = alpha;
    context.textBaseline = 'alphabetic';
    text(state.banner, FIELD.width / 2, 130, 40, PALETTE.gold, 'center', 800);
    context.globalAlpha = 1;
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    roundRectPath(context, x, y, PANEL.width, height, 18);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 82, 52, accent || PALETTE.text, 'center', 800);
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], FIELD.width / 2, y + PANEL.top + i * PANEL.line, 21, PALETTE.muted, 'center', 600);
    }
    text(prompt, FIELD.width / 2, y + height - 36, 23, PALETTE.gold, 'center', 700);
  }

  const TITLE_LINES = [
    'The night is falling. Guide the last lantern and',
    'gather the falling starlight before the void takes it.',
    '',
    'Move with WASD or ← ↑ ↓ →  ·  Dash with SPACE or CLICK',
    'Chain motes to raise your combo  ·  Dodge the red shards',
    'Catch the golden comet  ·  Survive 10 waves to win',
    '',
  ];
  const PAUSED_LINES = ['The starlight will wait for you.', ''];
  const WIN_LINES = ['', '', ''];
  const OVER_LINES = ['', '', ''];

  /** Paint one frame: the sky, the field, then the HUD or a panel for the screen. */
  function draw(state, screen, best, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawSky(state);
    for (const m of state.motes) if (m.active) drawMote(m, state.time);
    for (const p of state.powerups) if (p.active) drawPowerupIcon(p);
    if (state.comet.active) drawComet(state.comet);
    for (const s of state.shards) if (s.active) drawShard(s);
    drawPlayer(state);
    drawParticles(state);
    drawFloaters(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[7] = best > 0 ? `Best score: ${best}` : 'No starlight gathered yet — be the first.';
      drawPanel('LUMEN HARVEST', TITLE_LINES, 'Press SPACE or CLICK to begin', PALETTE.gold);
      return;
    }
    drawHud(state, best, muted);
    drawBanner(state);
    if (screen === SCREEN_PAUSED) {
      PAUSED_LINES[1] = muted ? 'M — sound is off' : 'M — sound is on';
      drawPanel('Paused', PAUSED_LINES, 'Press P or SPACE to resume');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      OVER_LINES[2] = waveReachedLabel(state.wave);
      drawPanel('The Night Fades', OVER_LINES, 'Press SPACE or CLICK to play again');
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = finalLabel(state.score);
      WIN_LINES[1] = bestLabel(best);
      WIN_LINES[2] = 'Ten waves survived — the dawn is yours.';
      drawPanel('Dawn Restored!', WIN_LINES, 'Press SPACE or CLICK to play again', PALETTE.gold);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return {
    draw,
    /** The renderer's view transform, so input can map the cursor into the field. */
    get view() {
      return view;
    },
  };
}
