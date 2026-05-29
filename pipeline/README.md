# Pipeline

This folder contains every artifact produced and consumed by the game development pipeline.

## Skills

| Skill | What it does | Invocation |
|-------|-------------|------------|
| **pipeline-create-gdd** | Creates a Game Design Document through guided steps | `/pipeline-create-gdd` |
| **pipeline-build-game** | Fans out parallel design variants, prunes on fun signal, builds survivors, ranks for curator | `/pipeline-build-game` |
| **pipeline-report** | Generates a structured run report with timing, model, and variant breakdowns | `/pipeline-report` |
| **pipeline-improve** | Reads a run report and outputs prioritized improvements (+ `--audit`) | `/pipeline-improve` |

## Workflow

```
1. Create GDD        /pipeline-create-gdd        → game-prompt.md
2. Build game        /pipeline-build-game         → runs/run-<NN>-<YYYY-MM-DD>/
3. Generate report   /pipeline-report             → runs/run-<NN>-<YYYY-MM-DD>/pipeline-report.md
4. Improve           /pipeline-improve            → prioritized fixes
5. (optional) Audit  /pipeline-improve --audit    → health check
```

### Step by step

1. **Create GDD** — Run `/pipeline-create-gdd`. Outputs `game-prompt.md` with required frontmatter (`interaction-template`, `mode`, `slug`, `title`).

2. **Build game** — Run `/pipeline-build-game`. Reads `game-prompt.md` + `project.md`, fans out N=3 design variants in parallel (Writer + Art Director + Designer), prunes the weakest on Tier-0 fun signal, builds survivors serially via Engineer, then runs Tier-1+2 critique. The winning variant is promoted into `game_root`. Each run creates `runs/run-<NN>-<YYYY-MM-DD>/`.

3. **Generate report** — Run `/pipeline-report` after a run. Captures timing, model used, per-step breakdowns, variant outcomes, and user feedback into the run directory.

4. **Improve** — Run `/pipeline-improve`. Reads the latest run's reports and outputs prioritized pipeline improvements.

5. **Audit** — Run `/pipeline-improve --audit`. Scans all pipeline assets for staleness, naming drift, broken references, and schema violations.

## Prerequisites

Before the first run, the host project must have:

- **`pipeline/project.md`** — YAML frontmatter declaring `game_root`, `runs_root`, `package_manager`, `commands`, `write_allowlist`, `write_denylist`. Schema: `local/skills/pipeline-build-game/references/project-context-schema.md`.
- **`pipeline/game-prompt.md`** — The GDD. Schema: `local/skills/pipeline-build-game/references/gdd-frontmatter-schema.md`.

Canonical templates for both files live in `local/files/pipeline-build-game/pipeline/`.

## Folder Structure

```
pipeline/
├── README.md                       # this file
├── project.md                      # scaffold contract (game_root, runs_root, commands, etc.)
├── game-prompt.md                  # GDD input (shared across runs)
└── runs/
    └── run-<NN>-<YYYY-MM-DD>/
        ├── gdd.md                  # GDD snapshot at run start
        ├── context.<persona>.md    # per-expert context slices
        ├── run-summary.yml         # run config (slug, playbook, build_mode, axes)
        ├── variant-plan.yml        # variant axis assignments
        ├── prune-summary.yml       # Tier-0 prune decision
        ├── game-report.md          # variant-ranked ship report (for game team)
        ├── pipeline-report.md      # pipeline meta-report (for pipeline maintainers)
        └── variants/
            └── <ID>/
                ├── design.yml              # integrated design brief
                ├── persona-deltas/         # YAML deltas from Writer, AD, Designer
                ├── engineer-status.yml     # build outcome + commands run
                ├── build-report.yml        # Tier-1+2 critique + ship_grade
                ├── sim-metrics.yml         # simulator output
                ├── events.jsonl            # simulator event log
                ├── tier0-audit.yml         # Tier-0 fun audit
                └── game-snapshot/          # full game code snapshot
```

## How the Build Pipeline Works

The build pipeline (`pipeline-build-game`) is a coordinator that delegates to five domain experts:

| Expert | Role | Output |
|--------|------|--------|
| **Writer** | Content, voice, copy | `persona-deltas/writer.yml` |
| **Art Director** | Visual identity, palette, typography | `persona-deltas/art-director.yml` |
| **Designer** | Scoring, tuning, difficulty | `persona-deltas/designer.yml` |
| **Engineer** | State, renderers, wiring, tests | Game code in `game_root` + `engineer-status.yml` |
| **Playtester** | Fun audit (Tier-0 design) + critique (Tier-1+2 build) | `tier0-audit.yml` / `build-report.yml` |

### Build modes

| Mode | Variants built | Fix passes | Use case |
|------|---------------|------------|----------|
| `paired` (default) | N - 1 | up to 2 | Building calibration corpus |
| `single` | 1 | up to 2 | Production after calibration converges |
| `scale` | 1 | 0 | Batch generation (100+ games) |

Set via `build_mode` in `pipeline/project.md` frontmatter.

## Artifact Formats

| Format | Used for | Why |
|--------|----------|-----|
| **YAML** | Agent-consumed structured artifacts | Token-efficient, agents read only the keys they need |
| **Markdown** | Human-consumed reports | Readable, supports tables and checklists |
| **TypeScript** | Game code | Runtime contract for everything in `game_root` |

## Common Commands

```bash
# Full pipeline run (reads game-prompt.md)
/pipeline-build-game

# Inline prompt from chat (thin prompts route through GDD creation first)
/pipeline-build-game <your game idea here>

# Post-run reporting
/pipeline-report                # generate pipeline-report.md for this run
/pipeline-improve               # prioritized improvements from the latest run
/pipeline-improve --audit       # pipeline health audit
```
