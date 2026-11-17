// Lumen Harvest — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it
// to the window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 16,
  speed: 330,
  dashSpeed: 780,
  dashTime: 0.16,
  dashCooldown: 1.6,
  dashInvulnerable: 0.35,
  invulnerable: 1.6,
  accel: 2600,
  friction: 6.5,
};

export const LIVES = 3;
export const MAX_LIVES = 5;

/** A wave lasts this long; surviving wave 10 restores the dawn and wins the game. */
export const WAVE = { seconds: 18, max: 10 };

export const MOTE = {
  radius: 9,
  fall: 150,
  sway: 34,
  interval: 0.62,
  intervalJitter: 0.4,
  points: 10,
  /** Seconds between mote collections before the combo chain breaks. */
  comboWindow: 3.5,
  /** A mote that falls past the bottom breaks the combo chain. */
  missBreaksCombo: true,
};

export const SHARD = {
  radius: 15,
  minSpeed: 95,
  speedPerWave: 16,
  speedJitter: 55,
  interval: 1.5,
  intervalScale: 0.86,
  minInterval: 0.42,
  /** From wave 4, shards sometimes arrive in a short burst of this many. */
  burstFromWave: 4,
  burstSize: 3,
};

export const COMET = {
  /** Seconds into each wave when the golden comet streaks across. */
  atWaveTime: 9,
  radius: 20,
  speed: 520,
  points: 250,
};

export const POWERUP = {
  radius: 14,
  interval: 13,
  intervalJitter: 5,
  fall: 55,
  shieldSeconds: 12,
  magnetSeconds: 7,
  slowSeconds: 6,
  slowFactor: 0.45,
};

export const COMBO = { perStep: 4, maxMultiplier: 8 };

/** How many of each thing can exist at once; pools are allocated once, at boot. */
export const POOL = { motes: 48, shards: 56, powerups: 4, particles: 320, floaters: 24 };

export const PALETTE = {
  backdrop: '#070a18',
  deep: '#0b1030',
  auroraA: '#2de1c2',
  auroraB: '#7a5cff',
  auroraC: '#ff7ad9',
  mote: '#ffd94d',
  moteCore: '#fff6c8',
  shard: '#ff4d6d',
  shardCore: '#5c1030',
  comet: '#ffe066',
  player: '#ffe9a8',
  playerFlame: '#ff9d3c',
  shield: '#5cd6ff',
  magnet: '#c792ff',
  slow: '#7dffb0',
  panel: 'rgba(10, 14, 34, 0.88)',
  panelEdge: '#3a2f6e',
  text: '#f4f1ff',
  muted: '#a9a8c9',
  gold: '#ffd94d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-harvest.best';
