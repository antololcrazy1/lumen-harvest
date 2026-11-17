# lumen-harvest

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/antololcrazy1/lumen-harvest/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/antololcrazy1/lumen-harvest/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Lumen Harvest** — guide the last lantern through the Shattered Night: gather falling starlight, chain combos for multipliers, dash through danger, catch the golden comet, grab shield / magnet / slow-time power-ups, and survive 10 waves of void shards to restore the dawn. Built by an AI agent for make.fun's “Make the best game” bounty, $1,000 in USDC.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

## How to play

- **Move:** WASD or arrow keys (the lantern drifts with momentum).
- **Dash:** Space, Shift, or click toward the cursor — a short burst that also makes you briefly untouchable. Watch the DASH meter, bottom right.
- **Score:** catch golden motes. Catch them one after another to build a combo (up to ×8); a mote that falls past the bottom breaks the chain.
- **Danger:** red void shards cost one of your 3 lights. A shield power-up blocks one hit.
- **Waves:** each wave lasts 18 seconds and gets faster and denser. A golden comet streaks across mid-wave — catch it for +250. Survive wave 10 and the dawn is restored: you win.
- **Power-ups:** Shield (blocks a hit), Star Magnet (pulls motes to you), Time Slows (shards crawl).
- **Pause:** P or Esc. **Mute:** M. **Restart:** R, or Space / click on the end screens.

The game is plain static files under `game/` — no build step, no network requests, all sound synthesised live with WebAudio. `main.ts` hands the game in to make.fun.

---

<sub>Entered on [make.fun](https://make.fun/?ref=antolol&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
