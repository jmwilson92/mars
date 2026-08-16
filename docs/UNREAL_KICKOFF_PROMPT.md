# Unreal kickoff prompt

Paste everything below the line into a fresh Claude Code session, running in an
**empty directory** where the Unreal project will live. Clone this repo next to
it first and tell Claude where it is — the prompt refers to it as the reference
implementation.

Suggested setup:

```bash
mkdir -p ~/dev/ares && cd ~/dev/ares
git clone https://github.com/jmwilson92/mars.git reference
mkdir game && cd game
claude
```

Then paste. Work through it milestone by milestone — do not ask for all of M0–M6
in one go.

---

# PROJECT BRIEF — "ARES" : a realistic space-agency simulation in Unreal Engine

You are building an Unreal Engine game from scratch in this directory. Read this
entire brief before writing code. Then confirm the plan back to me, ask about
anything genuinely ambiguous, and start at **Milestone 0** only.

## 0. Reference implementation — read this first

There is a working web prototype of this game at `../reference` (Vite + vanilla
JS + three.js, ~13k lines). **It is the design document.** Before writing any
code:

- Read `../reference/docs/PORT_ASSESSMENT.md` — it tells you what carries over.
- Read `../reference/src/sim/*.js` and `../reference/src/core/*.js`. These are
  the simulation rules you are porting. They are dependency-free and
  deterministic.
- Read all of `../reference/data/*.json`. These are the content and balance
  tables. **Copy them into this project unchanged.** Do not invent new numbers
  where these tables already have them.
- Skim `../reference/src/render/ship/*.js` — the Starship interior geometry
  (deck heights, radius, shaft, handrail placement, window cuts) is a blockout
  spec, and the split between `gravController.js` and `zeroGController.js` is
  the locomotion design.

Port the **rules**, not the code. Do not transpile JavaScript.

## 1. What this game is

A single-player, first-person space-agency simulation. Think Kerbal Space
Program's campaign, except:

- **The politics and money are the actual game.** Congressional appropriations,
  public support, contractor relationships, cost-plus vs fixed-price contracts,
  program cancellation risk, accident review boards, milestone payouts.
- **You never fly the rocket.** Every launch, orbital insertion, rendezvous,
  trans-lunar injection, trans-Mars injection, landing, and return is executed
  automatically by a flight director system. This is a hard design constraint —
  see §5.
- **You are physically present.** You walk your space center on foot. You board
  Starship and ride it to orbit, to the Moon, to Mars. You are a passenger and an
  administrator, never a pilot.
- **Research points are earned, not bought.** Flying novel missions successfully
  is the only way to unlock capability, which is the only way to earn the
  credibility that unlocks funding.

Tone: grounded, procedural, NASA-flight-controller. Not comedic. Not arcade.

## 2. Engine and project setup

- **Detect the installed Unreal version first** (check the launcher install path
  or `UE_*` env vars). Target the newest installed 5.x. Minimum 5.5. Tell me what
  you found before proceeding.
- **C++ project**, not Blueprint-only. Blueprints are for content, animation
  graphs, and UI binding — never for simulation rules or math.
- Project name `Ares`. Modules:
  - `AresCore` — pure simulation. **No dependency on `Engine`.** Only `Core`,
    `CoreUObject`, `Json`. This module must compile and unit-test headless. This
    is a hard rule; the reference implementation violates the equivalent rule
    (`src/sim` imports from `src/render`) and you must not repeat it.
  - `AresGame` — actors, subsystems, player character, level scripting.
  - `AresUI` — UMG widgets, terminal screens, HUD. Depends on `AresCore` for
    read-only snapshots.
  - `AresEditor` — data validation commandlets, JSON→DataTable importers.
- Source control: `git init`, commit at every milestone. `.gitignore` for
  `Binaries/ Intermediate/ Saved/ DerivedDataCache/ .vs/ *.sln`.
- Rendering: Lumen + Nanite on, virtual shadow maps, TSR. No ray tracing
  requirement. Target 60fps at 1440p on a mid-range GPU.
- **No marketplace assets, no third-party plugins** unless I approve one
  explicitly. Everything is engine-native or blockout geometry you generate.

## 3. Architecture — get this right, everything else depends on it

### 3.1 Simulation core (`AresCore`)

- `FProgramState` — the root state struct, split into per-system sub-structs:
  `FBudgetState`, `FPoliticsState`, `FResearchState`, `FFleetState`,
  `FMissionState`, `FCrewState`, `FColonyState`, `FContractState`.
  Do **not** make one giant mutable blob (the reference does; it's a mistake).
- `FSimClock` — fixed-step. Program time advances in whole days. Flight time
  advances in seconds. Two rates, one clock, explicit conversion. Port
  `../reference/src/core/clock.js`, including the dual Earth-day / Mars-sol / Ls
  calendar.
- `FAresRng` — seeded, serializable, deterministic. Port `core/rng.js`. Every
  random outcome in the game draws from it. Same seed + same inputs = same run.
- Each system is a free function `void TickPolitics(FProgramState&, const
  FAresData&, ...)`. No hidden state, no singletons inside `AresCore`.
- `FAresData` — immutable loaded content (cargo, tech, sites, contractors,
  resources, roles, balance). Loaded once from DataTables at startup.

### 3.2 The subsystem bridge (`AresGame`)

- `UProgramSubsystem : UGameInstanceSubsystem` owns the one `FProgramState`.
  Because it lives on the GameInstance, **the program survives level travel** —
  this is what lets you walk out of Mission Control, board Starship, and fly to
  Mars across three different maps without the simulation resetting.
- It ticks the sim, broadcasts `FOnProgramSnapshot` delegates, and exposes
  read-only accessors to UI and actors. Nothing outside it mutates
  `FProgramState`; all changes go through command structs
  (`FProgramCommand`), mirroring `../reference/src/core/protocol.js`.
- Heavy day-advance ticks (timewarp over months) run on a background task, not
  the game thread. The reference already does this with a Web Worker — same
  reasoning.

### 3.3 Scale and coordinates — read carefully

Do **not** simulate the player at true orbital scale. UE5's Large World
Coordinates give you doubles, but you still get shadow and physics artifacts at
10⁷ m and the level streaming becomes miserable.

Instead:
- **Astro frame**: `FAstroState` in `AresCore` holds true double-precision
  positions in metres, in a heliocentric or planetocentric frame as appropriate.
  This is what the orbital math operates on. It is never rendered directly.
- **Render frame**: the player is always in a local, human-scale scene —
  a launch pad, a ship interior, a landing site. Planets and orbital paths are
  rendered as **scaled proxies** (a sky-dome planet at fixed distance with the
  correct angular diameter and phase, computed from the astro frame).
- A `UAstroBridge` converts. When the ship "moves through space", what actually
  moves is the astro state; the local scene stays at the origin and the sky
  proxies update.

This one decision saves you weeks. Do not skip it.

## 4. Maps

Build three, plus a persistent one.

### 4.1 `L_Persistent`
Empty persistent level. Everything else is streamed or opened via seamless
travel. Holds nothing but the GameMode and the player.

### 4.2 `L_Cape` — the space center (walkable, first-person)

A **small, dense, hand-authored campus**. Not open world. Walking end to end
should take about 90 seconds. Four buildings around a central plaza and a road
to the pad:

1. **VAB (Vehicle Assembly Building)** — huge interior volume, a Starship stack
   standing in a bay, gantry levels, overhead crane. Interior terminal:
   **vehicle configuration & manifest** (payload mass/volume budget, cargo
   selection from `cargo.json`, tanker/crew/cargo/robotic variant, ship
   assignment). This is where a mission's stack is built.
2. **Mission Control** — tiered flight-control room, front projection wall, 12–16
   consoles with named positions (FLIGHT, CAPCOM, FIDO, GUIDO, EECOM, BOOSTER,
   PROP, SURGEON, INCO, GNC, RETRO, PAO). Port the layout intent from
   `../reference/src/render/mc/*.js`. Interior terminal: **mission timeline,
   telemetry, launch commit, timewarp**. This is the room you watch flights from
   when you're not aboard.
3. **Research Center** — labs, clean room, a wall of the tech tree. Interior
   terminal: **tech tree** (from `tech.json` — branches, tiers, RP cost, minimum
   duration, prerequisites, maturity). RP is spent here; RP is only earned by
   flying.
4. **Administration / HQ** — offices, a small hearing room. Interior terminal:
   **budget, appropriations, contracts, contractors, public support, press**.
   This is the politics room. Congressional hearings happen here as events.
5. **Launch pad + tower**, ~600m out, with a Starship on it when a mission is
   stacked. Walk or take a transit cart. Crew access arm at the top for boarding.

Blockout-quality geometry is correct for M1. Do not chase visual fidelity before
the loop works. Use engine-native materials and simple modular kits you generate.

Interaction: an `UInteractionComponent` on the player, `IInteractable` on
terminals/doors/elevators, one prompt line ("[E] Flight Director's console"), and
terminals open a full-screen UMG widget with the player still in the world.

### 4.3 `L_Starship` — the ship interior (HLS-inspired)

The vessel is a **full Starship** configured for crew, taking its interior
language from what SpaceX has published for HLS: a tall cylindrical pressure
volume, decks stacked along the long axis, a central shaft/elevator, large
viewports, and a surface elevator on the lander variant.

Layout (start from `../reference/src/render/ship/constants.js` — inner radius
4.15 m, deck height 2.48 m):
- **Flight deck / cupola** (top) — forward viewports, two seats, the ship's own
  console showing the same telemetry Mission Control sees.
- **Crew deck** — 6 sleep stations, personal stowage, comms station.
- **Galley / wardroom** — table with foot restraints, a big window. This is where
  the crew is when nothing is happening.
- **Science / work deck** — racks, glovebox, an Optimus charging bay.
- **ECLSS / systems deck** — visible plumbing, tanks, CO₂ scrubbers, the water
  wall. Panels the player can open.
- **Airlock + EVA prep** — suit ports, a real airlock cycle sequence.
- **Payload bay / surface elevator** (lander config) — the deployable elevator
  down to the regolith.
- Central **shaft with ladder + handrails** connecting all decks. In 0g the ladder
  is a translation guide; in gravity it's a ladder.

Windows must actually look out at the correct sky for the current mission phase
(pad → ascent → Earth from LEO → transit starfield → Moon/Mars approach and
surface). Wire them to the astro frame from §3.3.

### 4.4 `L_Surface` — destination surfaces

One parameterized map serving Moon and Mars landing sites, driven by
`sites.json`. Gravity, sky, atmosphere, dust, sun intensity, and terrain
material all read from the site record. Mars: 3.72 m/s², thin CO₂ haze, butterscotch
sky, dust devils. Moon: 1.62 m/s², hard black sky, brutal terminator shadows, no
scattering.

## 5. Flight is automatic — the hard constraint

**The player never controls the vehicle.** No throttle, no attitude, no
staging, no landing. This is not a limitation to work around; it is the design.
Do not add manual controls, do not add an "advanced" mode, do not add a joystick
fallback. If you think of a good reason to give the player a control, the answer
is no.

Implement `UFlightDirectorSubsystem`:

- At **commit** time (in Mission Control / VAB), the mission is solved *once*:
  patched-conic transfer, delta-v budget from `balance.json`, propellant margin
  from Tsiolkovsky, launch window from the synodic period, arrival date. If the
  solution doesn't close, the mission is NO-GO with a specific reason. This is
  where the player's real decision lives — in the stack, not the stick.
- At **run** time, a phase state machine executes the solved plan on a timeline.
  Phases (extend `../reference/src/render/phases.js`):
  `PRELAUNCH → TERMINAL_COUNT → LIFTOFF → MAX_Q → MECO → STAGE_SEP →
  BOOSTER_BOOSTBACK → SES → SECO → COAST → CIRCULARIZATION → LEO_OPS →
  [ORBITAL_REFUEL] → TLI|TMI → CRUISE → [MCC burns] → LOI|MARS_ENTRY →
  DESCENT → LANDING_BURN → TOUCHDOWN → SURFACE_OPS → ASCENT → RETURN`
- Each phase has: a duration, an accel profile, a set of comm callouts, a camera
  behavior, and a gravity/locomotion mode. The vehicle's visible motion is
  **driven by the plan**, interpolated, not by a physics solver. It should look
  and sound right; it does not need to be integrated.
- Failures are **rolled from the sim**, not from flight dynamics: EDL success
  probability from `balance.json` (`earlySuccess` 0.72 → `matureSuccess` 0.96
  scaled by tech maturity), engine-out from contractor `reliabilityMod`,
  abort modes that actually trigger. When a failure rolls, the flight director
  plays the corresponding abort or loss sequence. The player watches it happen.
  This is the emotional core of the game — the moment you cannot do anything.
- **Timewarp**: at any point the player can hand off and skip to the next event.
  In Mission Control this is a rate control (1× / 3× / 10× / 30×, port
  `FLIGHT_RATES`); aboard ship it is a "sleep until" / "skip to next milestone".

### 5.1 Orbital mechanics — real, but solved not flown

Implement in `AresCore` as a pure math library (`AresAstro`):
- Kepler element propagation, `M → E → ν` solver.
- Vis-viva, Hohmann and bi-elliptic transfer delta-v.
- Lambert solver (universal variables) for the porkchop plot.
- Synodic launch windows: Earth–Mars 779.9 days (in `balance.json`),
  Earth–Moon effectively continuous.
- Delta-v table — extend `balance.json` `deltaV_mps` with lunar legs:
  `leoToTli: 3120`, `tliToLlo: 900`, `lloToSurface: 2050`,
  `surfaceToLlo: 1870`, `lloToTei: 900`.
- Starship's real constraint: **it needs orbital refueling for anything beyond
  LEO.** Model tanker flights explicitly. A Mars or lunar mission is a *campaign*
  of 6–14 launches, not one launch. This is the single most important realism
  detail and the reference implementation already has the tanker variant and
  `boosterRefuel_usd` for it.

Player-facing, all of this appears as: a porkchop plot, a delta-v ladder, a
propellant margin bar, and an arrival date. Never as a maneuver node.

## 6. Locomotion — the thing that makes riding along worth it

`UAresMovementComponent` (custom `UCharacterMovementComponent`) with modes driven
by the flight director's current phase:

| Mode | When | Behavior |
|---|---|---|
| `Walk1G` | On Earth, on pad | Standard FPS walk |
| `HighG` | Ascent, entry, landing burn | **Player is strapped into a seat.** Look-around only, screen shake, chromatic/vignette g-effects, breathing audio, HUD blur at peak g |
| `ZeroG` | Coast, LEO, cruise | Handhold-based. Push off a surface, drift ballistically, grab handrails/ladder to arrest. Momentum matters. Port the intent of `zeroGController.js`. Also: loose props float (see below) |
| `ThrustG` | During burns in flight | Low gravity along the thrust axis — the ship's long axis becomes "down", so the decks work as floors |
| `LowG` | Moon 1.62, Mars 3.72 | Long float-y stride, dust kick, EVA suit inertia |

Details that sell it and are cheap:
- Loose objects (`looseProps.js` in the reference) simulate in 0g and settle
  under thrust. A pen drifting across the galley during coast, then falling when
  the engines light.
- Suit HUD in EVA, helmet audio occlusion, breathing.
- Crew NPCs use the same movement modes so they float too.

## 7. The program simulation — port and expand

Port these from `../reference/src/sim/` faithfully first, then extend:

**Budget** (`economy.js`) — quarterly appropriation of `annual/4`, a hoarding
penalty above 2× annual, an ops burn every day, a ledger of every debit.
*Extend:* an annual budget-request cycle where you submit a number and Congress
marks it up or down based on support, recent success, and election year.

**Politics** (`politics.js`) — support drifts −0.012/day idle, −0.004 in flight,
+0.004 once landed; hoarding costs 0.03/day; below 20 support for four quarters
cancels the program. *Extend:* named committee chairs with districts and pet
contractors; an election every 4 years that changes the administration's mandate
(Moon-first vs Mars-first vs commercial-first vs austerity); hearings as
interactive events in the HQ hearing room where your answers move support.

**Research** (`research.js`, `tech.json`) — RP earned only from flown milestones
(`awardRp` keys off milestones already achieved). LEO labs generate 3–4 RP/day.
Tech has a minimum calendar duration, not just a cost — you cannot buy time.

**Contracts** — *this is new and you should build it.* Contracts from
`contractors.json` with cost multiplier, reliability mod, schedule mod, political
weight. Cost-plus (they overrun, you pay, schedule slips less) vs fixed-price
(they eat overruns, but cut corners → reliability penalty). Milestone payouts.
Protest and re-compete if you snub a politically-weighted prime. Commercial
resupply and crew contracts as a way to buy capability you haven't researched.

**Fleet** (`fleet.js`) — individual hulls with names, locations, propellant
fractions, stores, reuse count and wear. Boosters that land and refly cheaper
(`boosterRefuel_usd` 52M vs `starshipLaunch_usd` 850M — a 16× difference that
should drive the whole economy).

**Crew** (`crew.js`, `roles.json`) — named individuals, roles, tasks, radiation
dose against a 1000 mSv career limit, morale. They should be recognizable people
you see aboard the ship and lose in accidents.

**Colony** (`colony.js`, `power`, `brownout`, `pipeline`) — keep for the Mars
end-game, but it is **not** milestone-critical. Port it in M6, not before.

**Accident review** — *new.* A loss-of-vehicle or loss-of-crew triggers a review
board: the fleet is grounded for N days, support craters, a root cause is
identified, and a mandatory fix costs money and unlocks a reliability bump. This
is the mechanism that makes failure interesting rather than just punishing.

## 8. Build order — do these in sequence, stop at each for review

**M0 — Skeleton.** Project generates, four modules compile, `git init`, one
automation test passes. `AresCore` has `FProgramState`, `FSimClock`, `FAresRng`
and the clock test from `../reference/scripts/`. No maps yet. *Ship this and stop.*

**M1 — Walk the Cape.** `L_Cape` blockout: four buildings + pad, first-person
character, Enhanced Input, interaction component, doors. Each building has one
placeholder terminal that opens an empty UMG panel. Nothing simulates yet.
*Acceptance: I can walk from HQ to the pad and back and open four screens.*

**M2 — The program is real.** Port `budget`, `politics`, `research`, `clock`,
`economy`, and the DataTables from `data/*.json`. `UProgramSubsystem` ticks.
The four terminals show and mutate live state. Timewarp works. Save/load works
with an explicit schema version. *Acceptance: I can play 5 program-years in
Mission Control, run out of money, and get cancelled.*

**M3 — One flight, end to end, automatic.** Mission planning in the VAB, commit
in Mission Control, `UFlightDirectorSubsystem` flies a LEO mission on rails with
the player watching from Mission Control. Telemetry, callouts, phase timeline.
Failure rolls work. *Acceptance: I can stack a cargo Starship, commit it, watch
it reach orbit, and watch a different one fail on ascent.*

**M4 — Ride it.** `L_Starship` interior blockout, boarding at the pad via the
crew arm, seamless travel into the ship, the full locomotion mode set driven by
flight phase, windows showing the correct sky. *Acceptance: I can board, strap
in, ride to LEO under g, unbuckle in 0g, and float to the cupola to look at
Earth.*

**M5 — Destinations.** Orbital refueling, TLI and TMI, `L_Surface`
parameterized for Moon and Mars, landing sequences, surface EVA. *Acceptance: I
can run a lunar campaign of tanker flights plus a crewed lander, and stand on the
Moon.*

**M6 — Depth.** Contracts, accident review boards, elections and hearings, the
colony sim, crew careers, the full tech tree.

## 9. Rules for how you work

- **`AresCore` never includes `Engine.h`.** If you need it, you're writing the
  code in the wrong module.
- **Every ported system gets an automation test** whose expected values come from
  running the JS reference. `../reference/npm run test:sim` is your oracle.
- **Determinism is testable.** Add a test that runs 2000 simulated days twice
  from the same seed and asserts identical state hashes. Keep it green.
- Data-driven over hard-coded: if a number appears in `data/*.json`, read it from
  the DataTable. Never duplicate a balance constant in C++.
- Blockout geometry and engine-default materials until a milestone is
  functionally accepted. No art passes on unproven mechanics.
- Commit at every milestone with a real message. Don't commit `Binaries/`,
  `Intermediate/`, `Saved/`, or `DerivedDataCache/`.
- When something in this brief conflicts with what the reference implementation
  does, this brief wins — but tell me about the conflict.
- **Ask before adding any plugin, marketplace asset, or third-party dependency.**

Start with Milestone 0. Tell me what Unreal version you found and confirm the
module plan before you write code.
