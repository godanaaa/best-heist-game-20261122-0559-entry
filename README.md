# Midnight Vault — a stealth heist game

[![Make the best heist game](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Rank](https://make.fun/badge/best-heist-game-20261122-0559/godanaaa/best-heist-game-20261122-0559-entry/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Reward](https://make.fun/badge/best-heist-game-20261122-0559/godanaaa/best-heist-game-20261122-0559-entry/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

Vesper Marlowe. One museum. Three rooms. No alarms.

**Midnight Vault** is a complete top-down stealth heist game that runs offline
in a desktop browser from its own static files. Cross each room past guard
patrols with visible vision cones and sweeping security cameras, lift every
glowing piece of loot, and reach the green GETAWAY door before the alarm
meter hits 100%.

## How to play

- **WASD / arrow keys** to move, or **click a floor tile** to walk there
- **Shift** to sprint (loud — it feeds the alarm)
- **E** (or right-click) to drop a smoke puff that blocks sight — 3 per room
- **P** to pause, **M** to mute, **Space** to start / retry

## The game

- 3 rooms with escalating patrols: The Gilded Gallery, The Vault Hall,
  The Crown Chamber — more guards, more cameras, tighter cones each time
- Guard patrol AI with vision cones blocked by walls and cover; cameras
  sweep their cones on their own rhythm
- An alarm meter that climbs while any cone holds you and decays when you
  break line of sight; at 100% the night is over
- Original WebAudio sounds (loot chime, alarm swell, getaway fanfare),
  synthesized at runtime — no audio files, no network
- Start screen, pause, caught and clean-getaway screens, HUD with loot,
  alarm, timer, par time and smoke count

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` from any static server — every file it loads is
under `game/`, and it makes no network request.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`
- `game/index.html` — the game page
- `game/src/config.js` — tuning and the three levels
- `game/src/world.js` — thief, patrols, cameras, loot, smoke and the alarm
- `game/src/render.js` — canvas drawing, HUD and screens
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesized sounds
- `game/src/shots.js` — staged screenshot scenes (real gameplay, autopilot)
- `game/src/main.js` — boot and the game loop
- `game/src/random.js` — seeded randomness
- `screenshots/` — 4 real renders of the game's own code
- `vendor/makefun-game.ts` — the kit's library, unchanged

Built for the [Make the best heist game](https://make.fun/bounty/best-heist-game-20261122-0559)
bounty on make.fun.
