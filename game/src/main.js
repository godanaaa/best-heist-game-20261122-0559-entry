// Midnight Vault: boot and the one loop. Input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is
// there. Screens: title, play, paused, caught, and clean getaway.
//
// ?seed=N fixes the patrol timing. ?shot=start|play|caught|win (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_CAUGHT, EVENT_LOOT, EVENT_SMOKE, EVENT_WIN } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_SMOKE, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const levelParam = Number.parseInt(params.get('level') ?? '', 10);
const startLevel = Number.isInteger(levelParam) && levelParam >= 0 && levelParam < 3 ? levelParam : 0;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
if (startLevel > 0) world.loadLevel(startLevel);
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best haul then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let alarmSoundAt = 0;
  let smokeQueued = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce(`Playing. ${world.state.totalLoot} pieces of loot to lift.`);
  }

  function endCaught() {
    screen = SCREEN_OVER;
    audio.caught();
    announce(`Caught. Alarm ${Math.round(world.state.alarm)} percent.`);
  }

  function endWin() {
    screen = SCREEN_WIN;
    audio.win();
    const haul = world.state.lootValue;
    if (haul > best) {
      best = haul;
      saveBest(best);
    }
    announce(`Clean getaway. $${haul} lifted.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    // Smoke is spent by the world step, not by the screen handler, so keep
    // the flag until the next step consumes it.
    if (actions & ACTION_SMOKE) smokeQueued = true;
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_CONFIRM && screen === SCREEN_WIN) {
      if (world.nextLevel()) {
        screen = SCREEN_PLAY;
        announce(`Room ${world.state.levelIndex + 1}. ${world.state.level.subtitle}`);
      } else {
        startGame();
      }
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { dx: 0, dy: 0, sprint: false }, true, false);
      return;
    }
    const move = input.direction(world.state.thief);
    const useSmoke = smokeQueued;
    smokeQueued = false;
    const events = world.step(STEP, move, false, useSmoke);
    if (events & EVENT_LOOT) {
      audio.loot();
      announce(`Lifted loot. $${world.state.lootValue} so far.`);
    }
    if (events & EVENT_SMOKE) audio.smoke();
    if (world.state.spotted && world.state.time - alarmSoundAt > 1.2) {
      alarmSoundAt = world.state.time;
      audio.alarmTick();
    }
    if (events & EVENT_CAUGHT) endCaught();
    else if (events & EVENT_WIN) endWin();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Midnight Vault. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
