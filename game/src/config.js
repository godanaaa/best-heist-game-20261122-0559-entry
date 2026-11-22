// Midnight Vault: configuration, tuning and the three heist levels.
// Every number here is a gameplay decision, not a magic constant: guard speed
// versus thief speed, cone range versus room size, and how fast the alarm
// climbs when a cone finds the thief and falls when it loses them.

export const STEP = 1 / 60;
export const FIELD = { width: 1280, height: 800 };
export const HUD_HEIGHT = 64;
export const BEST_KEY = 'midnight-vault-best-loot';

export const THIEF = {
  radius: 13,
  walkSpeed: 205,
  sprintSpeed: 305,
  sprintNoise: 26,
};

export const ALARM = {
  max: 100,
  guardRate: 46,
  cameraRate: 34,
  decay: 11,
  sprintRate: 4,
  caughtAt: 100,
};

export const TOOLS = {
  smokeCount: 3,
  smokeSeconds: 4,
  smokeRadius: 110,
};

// A wall is {x, y, w, h} in field coordinates (y below the HUD). Cover is a
// low obstacle: it blocks sight, the thief can hide behind it, guards walk
// around it, and it is drawn as a display case, crate or velvet rope.
function wall(x, y, w, h) {
  return { x, y, w, h };
}
function cover(x, y, w, h, label) {
  return { x, y, w, h, label };
}
function loot(x, y, value, name) {
  return { x, y, value, name, taken: false };
}
function guard(x, y, waypoints, speed) {
  return { x, y, waypoints, speed, waypoint: 1, angle: 0, spotted: 0 };
}
function camera(x, y, baseAngle, sweep, speed) {
  return { x, y, baseAngle, sweep, speed, angle: baseAngle, phase: 0 };
}

export const LEVELS = [
  {
    name: '1 · The Gilded Gallery',
    subtitle: 'Lift the Moonstone Tiara and slip out the service door.',
    par: 75,
    start: { x: 90, y: 690 },
    exit: { x: 1180, y: 110, w: 64, h: 64 },
    walls: [
      wall(0, 64, 1280, 14),
      wall(0, 64, 14, 722),
      wall(1266, 64, 14, 722),
      wall(0, 772, 1280, 14),
      wall(420, 64, 16, 220),
      wall(420, 420, 16, 220),
      wall(840, 160, 16, 220),
      wall(840, 520, 16, 220),
    ],
    cover: [
      cover(180, 300, 150, 54, 'MARBLE PLINTH'),
      cover(620, 180, 150, 54, 'VELVET ROPE'),
      cover(620, 560, 150, 54, 'DISPLAY CASE'),
      cover(980, 330, 150, 54, 'CRATE'),
    ],
    loot: [
      loot(640, 120, 250, 'Moonstone Tiara'),
      loot(250, 640, 120, 'Jade Figurine'),
      loot(1120, 640, 180, 'Gold Pocket Watch'),
    ],
    guards: [
      guard(640, 330, [[640, 330], [640, 620], [1080, 620], [1080, 330]], 62),
      guard(250, 470, [[250, 470], [250, 180]], 55),
    ],
    cameras: [camera(1180, 90, Math.PI * 0.75, 0.9, 0.55)],
  },
  {
    name: '2 · The Vault Hall',
    subtitle: 'Two guards, two cameras, one very loud floor.',
    par: 95,
    start: { x: 90, y: 690 },
    exit: { x: 1180, y: 110, w: 64, h: 64 },
    walls: [
      wall(0, 64, 1280, 14),
      wall(0, 64, 14, 722),
      wall(1266, 64, 14, 722),
      wall(0, 772, 1280, 14),
      wall(320, 64, 16, 260),
      wall(320, 470, 16, 260),
      wall(640, 160, 16, 260),
      wall(640, 520, 16, 260),
      wall(960, 64, 16, 260),
      wall(960, 470, 16, 260),
    ],
    cover: [
      cover(170, 380, 130, 50, 'CRATE'),
      cover(480, 180, 130, 50, 'DISPLAY CASE'),
      cover(480, 600, 130, 50, 'MARBLE PLINTH'),
      cover(800, 380, 130, 50, 'VELVET ROPE'),
      cover(1110, 380, 130, 50, 'CRATE'),
    ],
    loot: [
      loot(480, 120, 300, 'Sapphire Sceptre'),
      loot(800, 120, 220, 'Emerald Brooch'),
      loot(480, 680, 160, 'Silver Mask'),
      loot(1120, 680, 260, 'Diamond Ledger'),
    ],
    guards: [
      guard(480, 330, [[480, 330], [480, 620], [800, 620], [800, 330]], 72),
      guard(1120, 330, [[1120, 330], [1120, 620]], 66),
      guard(170, 180, [[170, 180], [170, 620]], 60),
    ],
    cameras: [
      camera(640, 90, Math.PI * 0.6, 1.1, 0.7),
      camera(1180, 700, Math.PI * 1.25, 1.0, 0.6),
    ],
  },
  {
    name: '3 · The Crown Chamber',
    subtitle: 'The Crown of Aldermere. Every eye in the house is on it.',
    par: 120,
    start: { x: 90, y: 690 },
    exit: { x: 1180, y: 110, w: 64, h: 64 },
    walls: [
      wall(0, 64, 1280, 14),
      wall(0, 64, 14, 722),
      wall(1266, 64, 14, 722),
      wall(0, 772, 1280, 14),
      wall(300, 64, 16, 200),
      wall(300, 400, 16, 200),
      wall(300, 660, 16, 70),
      wall(640, 200, 16, 200),
      wall(640, 540, 16, 200),
      wall(980, 64, 16, 200),
      wall(980, 400, 16, 200),
      wall(980, 660, 16, 70),
    ],
    cover: [
      cover(150, 330, 120, 48, 'CRATE'),
      cover(470, 470, 120, 48, 'DISPLAY CASE'),
      cover(810, 330, 120, 48, 'VELVET ROPE'),
      cover(150, 600, 120, 48, 'MARBLE PLINTH'),
      cover(810, 600, 120, 48, 'CRATE'),
    ],
    loot: [
      loot(640, 420, 500, 'Crown of Aldermere'),
      loot(470, 120, 280, 'Ruby Chalice'),
      loot(810, 120, 280, 'Opal Diadem'),
      loot(470, 700, 200, 'Pearl Strand'),
      loot(1120, 700, 240, 'Gilded Astrolabe'),
    ],
    guards: [
      guard(640, 330, [[640, 330], [640, 620], [980, 620], [980, 330]], 82),
      guard(470, 470, [[470, 470], [150, 470], [150, 180], [470, 180]], 76),
      guard(1120, 470, [[1120, 470], [1120, 180]], 72),
      guard(300, 690, [[300, 690], [980, 690]], 68),
    ],
    cameras: [
      camera(640, 90, Math.PI * 0.5, 1.2, 0.85),
      camera(90, 400, 0, 1.0, 0.7),
      camera(1180, 700, Math.PI * 1.3, 1.1, 0.75),
    ],
  },
];

export const GUARD = { radius: 14, coneRange: 225, coneHalfAngle: 0.62, catchRadius: 26 };
export const CAMERA = { coneRange: 205, coneHalfAngle: 0.55 };
