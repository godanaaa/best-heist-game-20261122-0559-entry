// Staged screenshot scenes. Each one plays the real rules forward from a
// fresh room with a simple autopilot — look at every way the thief could
// move, pick the one that gets closer to the loot without stepping into a
// cone — so the frame is what a short game really looks like, and the same
// seed always gives the same frame. The 'caught' scene steers straight at
// a guard on purpose; the 'win' scene plays until the getaway opens.
import { CAMERA, GUARD, STEP, THIEF } from './config.js';
import { EVENT_CAUGHT, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const DIRS = [
  [1, 0], [-1, 0], [0, 1], [0, -1],
  [1, 1], [1, -1], [-1, 1], [-1, -1],
  [0, 0],
];

function coneDanger(world, x, y) {
  const state = world.state;
  let danger = 0;
  for (const guard of state.level.guards) {
    if (world.inCone(guard.x, guard.y, guard.angle, GUARD.coneRange, GUARD.coneHalfAngle, x, y, world.solids())) danger += 90;
  }
  for (const camera of state.level.cameras) {
    if (world.inCone(camera.x, camera.y, camera.angle, CAMERA.coneRange, CAMERA.coneHalfAngle, x, y, world.solids())) danger += 70;
  }
  return danger;
}

// Grid pathfinding for the autopilot: a straight-line pilot slides along
// walls forever at a wall corner, so the pilot plans on a coarse grid
// (40 px cells, blocked where a solid plus the thief's radius covers the
// cell centre) and walks to the next cell on the shortest path.
const CELL = 40;
const COLS = 32;
const ROWS = 20;

function cellBlocked(world, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return true;
  const x = col * CELL + CELL / 2;
  const y = row * CELL + CELL / 2;
  if (x < 28 || x > 1252 || y < 78 || y > 772) return true;
  for (const rect of world.solids()) {
    if (x > rect.x - 26 && x < rect.x + rect.w + 26 && y > rect.y - 26 && y < rect.y + rect.h + 26) return true;
  }
  return false;
}

function nearestFreeCell(world, x, y) {
  const col = Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL)));
  const row = Math.max(0, Math.min(ROWS - 1, Math.floor(y / CELL)));
  if (!cellBlocked(world, col, row)) return [col, row];
  for (let radius = 1; radius < 6; radius += 1) {
    for (let dc = -radius; dc <= radius; dc += 1) {
      for (let dr = -radius; dr <= radius; dr += 1) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== radius) continue;
        if (!cellBlocked(world, col + dc, row + dr)) return [col + dc, row + dr];
      }
    }
  }
  return [col, row];
}

function nextCellTarget(world, target) {
  const thief = world.state.thief;
  const start = nearestFreeCell(world, thief.x, thief.y);
  const goal = nearestFreeCell(world, target.x, target.y);
  if (start[0] === goal[0] && start[1] === goal[1]) return target;
  const key = (c, r) => `${c},${r}`;
  const prev = new Map();
  const queue = [start];
  prev.set(key(start[0], start[1]), null);
  while (queue.length > 0) {
    const [c, r] = queue.shift();
    if (c === goal[0] && r === goal[1]) break;
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nr = r + dr;
      if (cellBlocked(world, nc, nr) || prev.has(key(nc, nr))) continue;
      prev.set(key(nc, nr), [c, r]);
      queue.push([nc, nr]);
    }
  }
  if (!prev.has(key(goal[0], goal[1]))) return target;
  let cell = goal;
  let parent = prev.get(key(cell[0], cell[1]));
  while (parent && !(parent[0] === start[0] && parent[1] === start[1])) {
    cell = parent;
    parent = prev.get(key(cell[0], cell[1]));
  }
  return { x: cell[0] * CELL + CELL / 2, y: cell[1] * CELL + CELL / 2 };
}

export function autopilot(world, reckless) {
  const state = world.state;
  const thief = state.thief;
  let target = null;
  if (state.lootGot < state.totalLoot) {
    let best = Infinity;
    for (const item of state.level.loot) {
      if (item.taken) continue;
      const d = Math.hypot(item.x - thief.x, item.y - thief.y);
      if (d < best) {
        best = d;
        target = item;
      }
    }
  } else {
    const exit = state.level.exit;
    target = { x: exit.x + exit.w / 2, y: exit.y + exit.h / 2 };
  }
  if (!reckless) target = nextCellTarget(world, target);
  let bestDir = { dx: 0, dy: 0, sprint: false };
  let bestScore = Infinity;
  for (const [dx, dy] of DIRS) {
    const len = Math.hypot(dx, dy) || 1;
    const nx = thief.x + (dx / len) * THIEF.walkSpeed * 0.15;
    const ny = thief.y + (dy / len) * THIEF.walkSpeed * 0.15;
    const dist = Math.hypot(target.x - nx, target.y - ny);
    // Close to the prize, go for it: a few seconds in a cone is survivable,
    // the alarm decays once the thief is out of sight again.
    const score = dist + (reckless || dist < 70 ? 0 : coneDanger(world, nx, ny));
    if (score < bestScore) {
      bestScore = score;
      bestDir = { dx: dx / len, dy: dy / len, sprint: false };
    }
  }
  return bestDir;
}

export function stageShot(name, world) {
  world.reset();
  if (name === 'caught') {
    let events = 0;
    for (let t = 0; t < 90 && !(events & EVENT_CAUGHT); t += STEP) {
      events = world.step(STEP, autopilot(world, true), false, false);
    }
    return { screen: SCREEN_OVER, best: world.state.lootValue };
  }
  if (name === 'win') {
    let events = 0;
    for (let t = 0; t < 180 && !(events & EVENT_WIN) && !(events & EVENT_CAUGHT); t += STEP) {
      const move = autopilot(world, false);
      const useSmoke = world.state.spotted && world.state.smokeLeft > 0 && world.state.smoke <= 0;
      events = world.step(STEP, move, false, useSmoke);
    }
    if (events & EVENT_WIN) return { screen: SCREEN_WIN, best: world.state.lootValue };
    return { screen: SCREEN_PLAY, best: world.state.lootValue };
  }
  if (name === 'play') {
    let events = 0;
    for (let t = 0; t < 10 && !(events & EVENT_CAUGHT) && !(events & EVENT_WIN); t += STEP) {
      const move = autopilot(world, false);
      const useSmoke = world.state.spotted && world.state.smokeLeft > 0 && world.state.smoke <= 0;
      events = world.step(STEP, move, false, useSmoke);
    }
    return { screen: events & EVENT_CAUGHT ? SCREEN_OVER : SCREEN_PLAY, best: world.state.lootValue };
  }
  // start: let the patrols walk a few seconds behind the title screen.
  for (let t = 0; t < 5; t += STEP) {
    world.step(STEP, { dx: 0, dy: 0, sprint: false }, true, false);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
