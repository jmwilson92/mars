# MARS

A program-management / spaceflight simulation. You run a Mars program: money,
politics, contractors, research, launch windows, fleet, crew, and a colony that
either reaches closure or dies.

This repository currently holds the **web prototype** (Vite + vanilla JS +
three.js). The prototype is the working design document: the simulation rules,
the balance numbers, and the content tables here are the source of truth for the
Unreal Engine build that replaces the front end.

## Layout

```
src/core/     clock, RNG, state shape, save/load, message protocol
src/sim/      the simulation — economy, politics, research, fleet, planning,
              crew, colony, power/brownout, alerts. Runs in a Web Worker.
src/render/   three.js scenes — mission control, Starship interior, pad,
              LEO ops, Mars surface. Throwaway on the Unreal port.
src/ui/       DOM/UMG-equivalent panels and terminals
data/*.json   content + balance tables (cargo, tech, sites, contractors,
              resources, roles, balance)
scripts/      headless smoke tests
```

The important architectural property: `src/sim` and `src/core` are pure logic
with **no renderer and no dependencies**. `npm run test:sim` proves it — those
tests run on bare Node with `node_modules` absent. That is what makes the Unreal
port a front-end replacement rather than a rewrite.

## Running the prototype

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # all smoke tests (needs npm install for the render ones)
npm run test:sim   # dependency-free sim tests only
```

## The Unreal build

- [`docs/PORT_ASSESSMENT.md`](docs/PORT_ASSESSMENT.md) — review of this repo,
  what carries over, what does not, and what to fix first.
- [`docs/UNREAL_KICKOFF_PROMPT.md`](docs/UNREAL_KICKOFF_PROMPT.md) — the brief to
  hand to Claude Code in the new Unreal project directory.
