# Port assessment — web prototype → Unreal Engine

Written against commit `9e42718`. ~13k lines across 80 files.

## What's actually here

| Layer | Files | Verdict |
|---|---|---|
| `src/sim/` + `src/core/` | ~2,900 lines, zero dependencies | **Port the rules, not the code.** This is the real asset. |
| `data/*.json` | 7 tables, ~1,400 lines | **Ports directly.** Becomes UE DataTables verbatim. |
| `src/render/` | ~5,500 lines of three.js | **Throw away, mine for spec.** The geometry math is a blockout brief. |
| `src/ui/` + `src/styles/` | ~1,900 lines DOM/CSS | **Throw away, mine for spec.** Panel layouts become UMG. |
| `scripts/*.mjs` | 4 smoke tests | **Port the assertions** into UE automation tests. |

### The parts worth keeping

**The sim is already headless and deterministic.** It runs in a Web Worker,
communicates over a message protocol (`src/core/protocol.js`), and snapshots to
plain JSON. Two of the four smoke tests run on bare Node with no `node_modules`
at all. That separation is exactly the shape you want in Unreal: a pure C++
simulation module that a `UGameInstanceSubsystem` owns, with the renderer as a
consumer of snapshots. Keep it.

**The economics and politics model is more interesting than KSP's.** Quarterly
congressional appropriation, support drift tied to whether you're flying, a
hoarding penalty if you sit on unspent budget, a four-quarter cancellation
countdown below 20% support, contractors with cost/reliability/schedule
multipliers and political weight, research points you can only earn by flying
(`awardRp` gates on milestones, not purchases). That's the differentiator versus
KSP. It should get *more* systemic depth in Unreal, not less.

**The balance table is real engineering.** `data/balance.json` has correct
delta-v budgets, human consumable rates, ISRU energy costs, EDL stage sequence,
and Mars orbital constants. Don't re-derive any of it.

**The Starship interior is already modeled as decks.** `src/render/ship/` splits
into `deckBuilder`, `decks`, `shaft`, `handrails`, `windows`, `hullStructure`,
plus **two separate movement controllers — `gravController.js` and
`zeroGController.js`**. Someone already worked out that the player's locomotion
has to change with flight phase. That's the single best gameplay idea in the
repo and it survives the port intact.

## Problems to fix before or during the port

1. **Layering violation.** `src/sim/planning.js`, `fleet.js`, and `research.js`
   all `import { MISSION_TYPES } from '../render/phases.js'` — the simulation
   depends on the renderer. In Unreal this becomes `MarsCore` depending on
   `MarsGame`, which won't link. `MISSION_TYPES` and `PHASE` belong in
   `src/core/constants.js`. Fix it here first so the port target is clean.

2. **`research.js` is doing fleet operations.** `parkLab()` assigns vehicles,
   moves ships to LEO, and writes hull stores. That's three systems in one
   function. Split before porting or the C++ inherits the tangle.

3. **No tests wired to `npm test`, no CI, no README** (README added in this
   change). Two smoke tests silently require `three`, so a fresh clone can't run
   them. `test:sim` now isolates the dependency-free ones.

4. **`state` is one giant mutable object** passed everywhere. Fine in JS, painful
   in C++. The port should split it into per-system structs (`FProgramBudget`,
   `FPoliticalState`, `FFleetState`, …) owned by a single `FProgramState`, each
   with its own tick, which is roughly how the modules are already divided.

5. **Save format is unversioned structurally.** `meta.version` exists but nothing
   migrates. Design the UE save with an explicit version + upgrade path from day
   one; you will change the schema fifty times.

## The scope change you're asking for

The prototype is Mars-only and starts at a Mars program already underway. The
Unreal build adds:

- **A walkable ground campus** (VAB, Mission Control, Research Center) as a real
  first-person space, not a menu. This is new — the prototype fakes it with an
  office scene.
- **LEO and Moon as destinations**, not just Mars. The delta-v table needs lunar
  entries (TLI 3120 m/s, LOI 900 m/s, descent 2050 m/s, ascent 1870 m/s) and the
  mission planner needs a destination axis it currently doesn't have.
- **HLS-style Starship interior.** The prototype's cabin is a generic 3-deck
  cylinder; you want the published HLS layout language (long crew tunnel, deck
  levels tied to the payload bay, airlock, elevator to the surface) applied to a
  full Starship rather than the lander variant.

## Recommended strategy

Do **not** try to transpile. Do this instead:

1. Freeze this repo as the reference implementation. It stays runnable.
2. Copy `data/*.json` into the Unreal project unchanged, import as DataTables.
3. Rewrite `src/sim/*` as C++ in a `MarsCore` module, one file per current
   module, porting the *rules* and reusing the *constants*. Port each smoke test
   into an automation test as you go — the JS output is your expected values.
4. Build the Unreal front end fresh. None of the three.js code transfers.

Estimated ratio: the sim port is maybe 15% of the work and is the part you can
verify mechanically. The other 85% is level design, locomotion, UMG, and the
flight director — all new.

See [`UNREAL_KICKOFF_PROMPT.md`](UNREAL_KICKOFF_PROMPT.md) for the brief.
