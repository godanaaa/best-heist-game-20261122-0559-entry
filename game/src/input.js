// Keyboard and mouse input. WASD or arrows walk, Shift sprints (loud),
// E or right-click drops a smoke puff, Space / click confirms, P pauses,
// M mutes. Clicking the floor sets a move target the thief walks to, so
// the game is fully playable with the mouse alone as well.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SMOKE = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let clickTarget = null;
  let sprinting = false;

  function keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    keys.add(event.key.toLowerCase());
    if (event.key === ' ' || event.key === 'Enter') actions |= ACTION_CONFIRM;
    if (event.key === 'p' || event.key === 'P' || event.key === 'Escape') actions |= ACTION_PAUSE;
    if (event.key === 'e' || event.key === 'E') actions |= ACTION_SMOKE;
    if (event.key === 'm' || event.key === 'M') actions |= ACTION_MUTE;
  }
  function keyUp(event) {
    keys.delete(event.key.toLowerCase());
  }
  function pointerDown(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    clickTarget = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
    if (event.button === 2) actions |= ACTION_SMOKE;
  }
  function contextMenu(event) {
    event.preventDefault();
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('contextmenu', contextMenu);

  return {
    // -1, 0 or 1 on each axis, from keys first, then a click target.
    direction(thief) {
      let dx = 0;
      let dy = 0;
      if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
      if (keys.has('d') || keys.has('arrowright')) dx += 1;
      if (keys.has('w') || keys.has('arrowup')) dy -= 1;
      if (keys.has('s') || keys.has('arrowdown')) dy += 1;
      sprinting = keys.has('shift');
      if (dx === 0 && dy === 0 && clickTarget && thief) {
        const ox = clickTarget.x - thief.x;
        const oy = clickTarget.y - thief.y;
        if (Math.hypot(ox, oy) < 10) clickTarget = null;
        else {
          dx = Math.abs(ox) > 6 ? Math.sign(ox) : 0;
          dy = Math.abs(oy) > 6 ? Math.sign(oy) : 0;
        }
      }
      if (dx !== 0 && dy !== 0) {
        dx *= Math.SQRT1_2;
        dy *= Math.SQRT1_2;
      }
      return { dx, dy, sprint: sprinting };
    },
    clearTarget() {
      clickTarget = null;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
