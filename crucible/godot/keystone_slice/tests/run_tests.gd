extends SceneTree

const Eng = preload("res://scripts/engine.gd")
## Headless check that the Godot rules match the JS reference engine turn by turn.
## Run from crucible/godot/keystone_slice:  godot --headless --script res://tests/run_tests.gd

func _init() -> void:
	var C := Eng.load_content("res://data/keystone_slice.json", "res://data/values.json")
	var golden: Dictionary = Eng.normalize(JSON.parse_string(FileAccess.get_file_as_string("res://tests/golden.json")))
	var failures := 0
	var checks := 0
	for g in golden["games"]:
		var seed_value: int = g["seed"]
		# 1. the RNG is bit-for-bit the same
		for i in 2:
			var got := Eng.rng_for(seed_value, i + 1).next()
			checks += 1
			if absf(got - float(g["rng_first"][i])) > 1e-12:
				failures += 1
				printerr("seed %d rng turn %d: got %.15f want %.15f" % [seed_value, i + 1, got, g["rng_first"][i]])
		# 2. every turn reaches the same state
		var s := Eng.new_game(C, seed_value)
		var t := 0
		for turn in g["turns"]:
			t += 1
			var input: Dictionary = turn["input"].duplicate(true)
			input["dilemma"] = Eng.fallback_dilemma(C, s, g["stances"])["dilemma"]
			s = Eng.resolve_turn(C, s, input)["state"]
			var snap := {"stock": s["stock"], "meters": s["meters"], "lost": s["lost"], "rescued": s["rescued"], "shelter": s["shelter"],
				"towerOpen": s["towerOpen"], "sites": s["sites"], "residents": s["residents"], "promises": s["promises"].map(func(p): return p["status"])}
			checks += 1
			var a := Eng.stable(snap)
			var b := Eng.stable(turn["expect"])
			if a != b:
				failures += 1
				printerr("seed %d turn %d differs\n godot: %s\n js:    %s" % [seed_value, t, a, b])
		# 3. standings and replay
		checks += 1
		if Eng.stable(Eng.standings(C, s)) != Eng.stable(g["standings"]):
			failures += 1
			printerr("seed %d standings differ: %s vs %s" % [seed_value, Eng.standings(C, s), g["standings"]])
	print("%d checks, %d failures" % [checks, failures])
	print("PASS" if failures == 0 else "FAIL")
	quit(0 if failures == 0 else 1)
