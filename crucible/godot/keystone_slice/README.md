# Keystone storm slice (Godot)

The phase 2 go/no-go build: one parish (Keystone), both teams, three storm turns, with each turn's moment written live by Claude. Play it for about 10 minutes, then decide go or no-go.

## Open and play

1. Install Godot 4.3 or newer (the standard build, not .NET) from godotengine.org.
2. In the Godot Project Manager, choose **Import**, then pick `crucible/godot/keystone_slice/project.godot`.
3. Press **F5** (or the play button).
4. On the setup screen, pick each team's three signed values and statement, choose who you play (both teams, or one with a bot playing the other), then **Start the storm**.

## Claude writes the moments (optional)

Paste an Anthropic API key on the setup screen, or set `ANTHROPIC_API_KEY` before launching Godot. The key is saved only in this computer's Godot user folder (`user://settings.cfg`). The model field defaults to `claude-opus-5-5`.

Without a key, or when Claude is slow (20 seconds into planning), offline, or writes a moment that fails the validator twice, the game uses the written moment for that turn. The game never waits on the AI.

## Check that the rules match the reference engine

The rules in `scripts/engine.gd` are a port of `crucible/slice/engine.js`. From this folder run:

```
godot --headless --script res://tests/run_tests.gd
```

It replays three scripted games (`tests/golden.json`) and must print `PASS`. If anything differs, it prints the turn and both states.

## Files

| File | What it is |
|---|---|
| `scripts/engine.gd` | Deterministic rules: seeded RNG, turn resolution, standings, dilemma validator, replay hash |
| `scripts/director.gd` | The AI Dilemma Director: the prompt and the Claude API call |
| `scripts/main.gd` | Setup, planning console, storm play-out and debrief |
| `scripts/map_view.gd` | The parish map |
| `data/*.json` | Copies of `crucible/content/keystone_slice.json` and `values.json` |
| `tests/` | Golden parity test against the JS engine |

Content stays in `crucible/content/`. After editing it, run `node crucible/slice/golden.mjs` from the repo root: it copies the content here and rewrites the golden test.

Each finished game saves its run log (every input, including what Claude wrote) to `user://runs/`. The debrief replays that log and shows whether the state hash matches.
