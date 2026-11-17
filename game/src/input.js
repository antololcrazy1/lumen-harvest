// Keyboard and pointer input for Lumen Harvest. Held keys steer in two
// dimensions (WASD or arrows); one-shot presses (confirm, dash, pause,
// restart, mute) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. A mouse
// click dashes toward the cursor; a click on a menu screen confirms.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_DASH = 4;
export const ACTION_RESTART = 8;
export const ACTION_MUTE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Enter']);
const DASH = new Set(['Space', 'ShiftLeft', 'ShiftRight']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  // Cursor in logical playfield coordinates (the renderer sets the scale).
  const mouse = { x: 640, y: 360, scale: 1, offsetX: 0, offsetY: 0, inside: false };

  function setScale(scale, offsetX, offsetY) {
    mouse.scale = scale;
    mouse.offsetX = offsetX;
    mouse.offsetY = offsetY;
  }

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      held.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (DASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_DASH;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else {
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => held.clear());

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left - mouse.offsetX) / mouse.scale;
    mouse.y = (event.clientY - rect.top - mouse.offsetY) / mouse.scale;
    mouse.inside = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left - mouse.offsetX) / mouse.scale;
    mouse.y = (event.clientY - rect.top - mouse.offsetY) / mouse.scale;
    mouse.inside = true;
    actions |= ACTION_DASH | ACTION_CONFIRM;
  });

  return {
    setScale,
    mouse,
    /** Steering as {x, y}, each -1, 0 or 1, normalised by the caller. */
    steer() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        if (LEFT.has(code)) x -= 1;
        else if (RIGHT.has(code)) x += 1;
        else if (UP.has(code)) y -= 1;
        else if (DOWN.has(code)) y += 1;
      }
      return { x, y };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
