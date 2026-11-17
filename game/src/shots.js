// The screenshot scenes behind ?shot=start|play|surge|end. Each one plays
// the real rules forward from a fresh world for a fixed number of steps,
// steered by a simple autopilot (flee the nearest shard, chase the nearest
// mote, dash clear when cornered), so the frame is what a short game really
// looks like and the same seed always gives the same frame. The end scene's
// pilot is careless — it chases motes and ignores shards — so it is caught
// out once the waves speed up, as a hurried player is.

import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const SURGE_LIMIT_SECONDS = 60;
const END_LIMIT_SECONDS = 600;

/** How far ahead, in seconds, the careful pilot checks for shards. */
const HORIZON = 0.55;

/**
 * Steer the lantern for one step. Returns { steer: {x, y}, dash: boolean }.
 * Careful pilots flee shards; careless ones only chase motes.
 */
function autopilot(state, careful) {
  const player = state.player;
  let threat = null;
  let threatDist = Infinity;
  if (careful) {
    for (const shard of state.shards) {
      if (!shard.active) continue;
      const px = shard.x + shard.vx * HORIZON;
      const py = shard.y + shard.vy * HORIZON;
      const d = Math.hypot(px - player.x, py - player.y);
      if (d < threatDist) {
        threatDist = d;
        threat = { x: px, y: py };
      }
    }
  }
  let target = null;
  if (state.comet.active) {
    target = { x: state.comet.x, y: state.comet.y };
  } else {
    let best = Infinity;
    for (const mote of state.motes) {
      if (!mote.active) continue;
      const d = Math.hypot(mote.x - player.x, mote.y - player.y);
      if (d < best) {
        best = d;
        target = { x: mote.x, y: mote.y };
      }
    }
  }
  if (!target) target = { x: FIELD.width / 2, y: FIELD.height / 2 };

  let dx = target.x - player.x;
  let dy = target.y - player.y;
  if (threat && threatDist < 110) {
    // Flee: away from the shard, blended with the mote chase so the pilot
    // does not corner itself against a wall.
    dx = (player.x - threat.x) * 1.6 + dx * 0.4;
    dy = (player.y - threat.y) * 1.6 + dy * 0.4;
  }
  const len = Math.hypot(dx, dy) || 1;
  const steer = {
    x: dx / len > 0.3 ? 1 : dx / len < -0.3 ? -1 : 0,
    y: dy / len > 0.3 ? 1 : dy / len < -0.3 ? -1 : 0,
  };
  const dash = careful && threat !== null && threatDist < 62 && player.dashCooldown <= 0;
  return { steer, dash: dash ? { x: dx / len, y: dy / len } : null };
}

/**
 * Set `world` to the named scene (start, play, surge or end; any other name
 * is start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'surge' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      world.step(STEP, { x: 0, y: 0 }, null, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'surge') {
    // Play into wave 2 until the golden comet is streaking across, then
    // hold the frame a moment later so the comet and its trail show.
    for (let i = 0; i < SURGE_LIMIT_SECONDS / STEP; i += 1) {
      const pilot = autopilot(world.state, true);
      world.step(STEP, pilot.steer, pilot.dash, false);
      if (world.state.comet.active) break;
    }
    for (let i = 0; i < 24; i += 1) {
      const pilot = autopilot(world.state, true);
      world.step(STEP, pilot.steer, pilot.dash, false);
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const careful = name !== 'end';
  for (let i = 0; i < limit / STEP; i += 1) {
    const pilot = autopilot(world.state, careful);
    if (world.step(STEP, pilot.steer, pilot.dash, false) & EVENT_OVER) break;
  }
  const over = world.state.lives === 0;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
