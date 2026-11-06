# CHEESE CHALLENGE

Brutally hard pixel-art platformer starring **Cheese Rat**. Plain HTML5 Canvas + JavaScript, **no dependencies, no build step**.

## Run
- Easiest: open `index.html` in a browser (scripts are classic, so it works from `file://`).
- Dev server: `npm start` (needs Node 14+) then open http://localhost:8080
- Smoke test: `npm test` (headless: validates levels, runs the engine, tests the leaderboard)

## Controls
Arrows / A D move, Space / Up / W jump (hold = higher), R restart run, Q end the current run and open the score screen. Touch buttons appear on phones/tablets.

## Structure
```
index.html          screens (menu, leaderboard, how-to, end screen) + script order
styles/main.css     arcade theme (yellow #ffd23f, black, green #39ff14)
src/config.js       physics constants, score rules, LEVELS (tiny level DSL, documented at the top)
src/sprites.js      placeholder Cheese Rat sprite (generated) + override() to load real PNGs
src/game.js         engine: input, physics, hazards, rendering, particles
src/leaderboard.js  leaderboard with swappable providers (localStorage now)
src/rewards.js      DISABLED rewards stub with the server-verification plan
src/ui.js           DOM wiring, HUD, touch controls
tests/smoke.js      headless smoke test
server.js           tiny static server
```

## Modify
- **New level**: add a `build('NAME', width, [ops])` entry in `src/config.js` (ops: platforms, spikes, lava, saws, moving/vanishing blocks, checkpoints, cheese, goal). Ground is rows 10-11; max safe jump is ~4 tiles wide and ~3 tall.
- **Feel/difficulty**: `CC.CFG` (speed, gravity, jump, coyote time) and `CC.SCORE`.
- **Real art**: see `assets/README.md`. Tiles, hazards and cheese are drawn with shapes in `draw()` (`src/game.js`).

## Leaderboard (important)
Scores are stored with **localStorage: this browser only, NOT global**. The UI says so. To go global, write a provider
(`{name, global:true, submit(entry), list()}`) that calls your backend and register it with `CC.Leaderboard.setProvider()`. Example sketch in `src/leaderboard.js`.

## Rewards (not implemented)
No payments, wallets or tokens. Client-side scores can be faked, so real rewards must be verified on a server (run token, input log, server-side replay).
Fixed 60 Hz timestep makes runs replayable. Plan and hook points: `src/rewards.js` (`onRunStart`, `submitRunForVerification`).

## Not included yet
Sound/music, real sprite art, Phaser (chose dependency-free Canvas so it runs anywhere), server backend.
