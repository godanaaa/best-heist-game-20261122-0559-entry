// The heist itself: the thief, patrols, cameras, loot, smoke and the alarm.
// No DOM here, so the same code runs in the browser and in a Node test.
import { ALARM, CAMERA, FIELD, GUARD, LEVELS, THIEF, TOOLS } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_SMOKE = 2;
export const EVENT_SPOTTED = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_WIN = 16;

function cloneLevel(level) {
  return JSON.parse(JSON.stringify(level));
}

function rectHit(x, y, radius, rect) {
  const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  return (x - cx) * (x - cx) + (y - cy) * (y - cy) < radius * radius;
}

function blocked(x, y, radius, solids) {
  for (const rect of solids) {
    if (rectHit(x, y, radius, rect)) return true;
  }
  return false;
}

// Does the segment from (x1,y1) to (x2,y2) cross rect? Used for sight lines.
function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  for (const [p, q] of [
    [-dx, x1 - rect.x],
    [dx, rect.x + rect.w - x1],
    [-dy, y1 - rect.y],
    [dy, rect.y + rect.h - y1],
  ]) {
    if (p === 0) {
      // Parallel to this slab and outside it: the segment never crosses it.
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > tmax) return false;
        if (t > tmin) tmin = t;
      } else {
        if (t < tmin) return false;
        if (t < tmax) tmax = t;
      }
    }
  }
  return true;
}

function lineBlocked(x1, y1, x2, y2, solids) {
  for (const rect of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, rect)) return true;
  }
  return false;
}

function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function inCone(fromX, fromY, angle, range, halfAngle, tx, ty, solids) {
  const dx = tx - fromX;
  const dy = ty - fromY;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (Math.abs(angleDiff(angleTo(fromX, fromY, tx, ty), angle)) > halfAngle) return false;
  return !lineBlocked(fromX, fromY, tx, ty, solids);
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    level: null,
    thief: { x: 90, y: 690, facing: -Math.PI / 2 },
    alarm: 0,
    lootGot: 0,
    lootValue: 0,
    smoke: 0,
    smokeLeft: TOOLS.smokeCount,
    smokeX: 0,
    smokeY: 0,
    time: 0,
    spotted: false,
    caught: false,
    won: false,
    totalLoot: 0,
    totalValue: 0,
  };

  function loadLevel(index) {
    const level = cloneLevel(LEVELS[index]);
    state.levelIndex = index;
    state.level = level;
    state.thief = { x: level.start.x, y: level.start.y, facing: -Math.PI / 2 };
    state.alarm = 0;
    state.lootGot = 0;
    state.lootValue = 0;
    state.smoke = 0;
    state.smokeLeft = TOOLS.smokeCount;
    state.time = 0;
    state.spotted = false;
    state.caught = false;
    state.won = false;
    state.totalLoot = level.loot.length;
    state.totalValue = level.loot.reduce((sum, item) => sum + item.value, 0);
    for (const guard of level.guards) {
      guard.angle = angleTo(guard.x, guard.y, guard.waypoints[1][0], guard.waypoints[1][1]);
    }
  }

  function solids() {
    return [...state.level.walls, ...state.level.cover];
  }

  function moveThief(dx, dy, sprint, dt) {
    const speed = sprint ? THIEF.sprintSpeed : THIEF.walkSpeed;
    const nx = state.thief.x + dx * speed * dt;
    const ny = state.thief.y + dy * speed * dt;
    const all = solids();
    if (!blocked(nx, state.thief.y, THIEF.radius, all)) state.thief.x = nx;
    if (!blocked(state.thief.x, ny, THIEF.radius, all)) state.thief.y = ny;
    state.thief.x = Math.max(THIEF.radius + 14, Math.min(FIELD.width - THIEF.radius - 14, state.thief.x));
    state.thief.y = Math.max(64 + THIEF.radius, Math.min(FIELD.height - THIEF.radius - 14, state.thief.y));
    if (dx !== 0 || dy !== 0) state.thief.facing = Math.atan2(dy, dx);
    if (sprint && (dx !== 0 || dy !== 0)) state.alarm = Math.min(ALARM.max, state.alarm + ALARM.sprintRate * dt);
  }

  function stepGuards(dt) {
    for (const guard of state.level.guards) {
      const target = guard.waypoints[guard.waypoint];
      const dx = target[0] - guard.x;
      const dy = target[1] - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) {
        guard.waypoint = (guard.waypoint + 1) % guard.waypoints.length;
        continue;
      }
      const step = (guard.speed * dt) / dist;
      guard.x += dx * step;
      guard.y += dy * step;
      guard.angle = Math.atan2(dy, dx);
    }
  }

  function stepCameras(dt) {
    for (const camera of state.level.cameras) {
      camera.phase += dt * camera.speed;
      camera.angle = camera.baseAngle + Math.sin(camera.phase) * camera.sweep;
    }
  }

  function inSmoke(x, y) {
    if (state.smoke <= 0) return false;
    return Math.hypot(x - state.smokeX, y - state.smokeY) < TOOLS.smokeRadius;
  }

  function stepAlarm(dt) {
    const all = solids();
    let seen = false;
    let rate = 0;
    if (!inSmoke(state.thief.x, state.thief.y)) {
      for (const guard of state.level.guards) {
        if (inCone(guard.x, guard.y, guard.angle, GUARD.coneRange, GUARD.coneHalfAngle, state.thief.x, state.thief.y, all)) {
          seen = true;
          rate = Math.max(rate, ALARM.guardRate);
          guard.spotted = 1;
        } else {
          guard.spotted = 0;
        }
      }
      for (const camera of state.level.cameras) {
        if (inCone(camera.x, camera.y, camera.angle, CAMERA.coneRange, CAMERA.coneHalfAngle, state.thief.x, state.thief.y, all)) {
          seen = true;
          rate = Math.max(rate, ALARM.cameraRate);
        }
      }
    }
    state.spotted = seen;
    if (seen) state.alarm = Math.min(ALARM.max, state.alarm + rate * dt);
    else state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
    return seen;
  }

  function step(dt, move, attract, useSmoke) {
    if (state.caught || state.won) return EVENT_NONE;
    state.time += dt;
    if (state.smoke > 0) state.smoke -= dt;
    let events = EVENT_NONE;
    if (useSmoke && state.smokeLeft > 0 && state.smoke <= 0) {
      state.smokeLeft -= 1;
      state.smoke = TOOLS.smokeSeconds;
      state.smokeX = state.thief.x;
      state.smokeY = state.thief.y;
      events |= EVENT_SMOKE;
    }
    if (!attract) moveThief(move.dx, move.dy, move.sprint, dt);
    stepGuards(dt);
    stepCameras(dt);
    const seen = stepAlarm(dt);
    if (seen && !state.spottedBefore) events |= EVENT_SPOTTED;
    state.spottedBefore = seen;
    for (const item of state.level.loot) {
      if (!item.taken && Math.hypot(item.x - state.thief.x, item.y - state.thief.y) < THIEF.radius + 20) {
        item.taken = true;
        state.lootGot += 1;
        state.lootValue += item.value;
        events |= EVENT_LOOT;
      }
    }
    for (const guard of state.level.guards) {
      if (Math.hypot(guard.x - state.thief.x, guard.y - state.thief.y) < GUARD.catchRadius) {
        state.caught = true;
        return events | EVENT_CAUGHT;
      }
    }
    if (state.alarm >= ALARM.caughtAt) {
      state.caught = true;
      return events | EVENT_CAUGHT;
    }
    const exit = state.level.exit;
    const inExit =
      state.thief.x > exit.x && state.thief.x < exit.x + exit.w && state.thief.y > exit.y && state.thief.y < exit.y + exit.h;
    if (inExit && state.lootGot === state.totalLoot) {
      state.won = true;
      return events | EVENT_WIN;
    }
    return events;
  }

  function reset() {
    loadLevel(state.levelIndex);
  }

  function nextLevel() {
    if (state.levelIndex + 1 >= LEVELS.length) return false;
    loadLevel(state.levelIndex + 1);
    return true;
  }

  loadLevel(0);
  return {
    state,
    step,
    reset,
    nextLevel,
    loadLevel,
    inSmoke,
    inCone,
    lineBlocked,
    solids,
  };
}
