extends Control
## Keystone storm slice: setup, the planning console, the storm play-out and the debrief.
## The engine state is the truth; everything here is the screen around it. Same flow as crucible/slice/template.html.

const Eng = preload("res://scripts/engine.gd")
const Director = preload("res://scripts/director.gd")
const MapView = preload("res://scripts/map_view.gd")
const TEAMS := ["community", "meridian"]
const SETTINGS := "user://settings.cfg"
const PLAYOUT_S := 3.2
const AI_WAIT_S := 20        # planning seconds the game waits for Claude's moment
const AI_RETRY_WAIT_S := 35  # ...or this long when Claude's first answer failed the checks and a retry is running
const REFLECT := [
	"Where did you first trade a value you signed, and who gave you permission to?",
	"Which voice moved you most tonight: Pastor Ruth, Dana Kell, the clock, or the score?",
	"If the people of Low Ward described what you valued tonight, what would they say?",
]

const BG := Color("#0c131a")
const PANEL := Color("#131d27")
const SUNK := Color("#0f1820")
const LINE := Color("#26364a")
const FG := Color("#e3e9ef")
const MUTED := Color("#93a2b4")
const STORM := Color("#f08a3c")
const STORM_SOFT := Color("#3a2414")
const COMM := Color("#4fc1c9")
const COMM_SOFT := Color("#0f2d31")
const MERI := Color("#8fa8e0")
const MERI_SOFT := Color("#1a2540")
const HONOUR := Color("#5fc79c")
const HONOUR_SOFT := Color("#123326")
const COST := Color("#f07a72")
const COST_SOFT := Color("#3a1916")

var C: Dictionary
var setup := {
	# Solo go/no-go default: you play the community, a bot plays Meridian from its signed values.
	"seed": 4217, "seconds": 120, "play": "community", "api_key": "", "model": Director.DEFAULT_MODEL,
	"stances": {
		"community": {"ranks": ["safety", "loyalty", "fairness"], "statement": "We get our people out first. We stand by our neighbours. Nobody gets special treatment."},
		"meridian": {"ranks": ["excellence", "duty", "accountability"], "statement": "We finish what we start. We owe the world this cure. We own every call we make."},
	},
}
var key_from_env := false
var screen := "setup"  # setup | plan | playout | report | debrief
var state: Dictionary
var prev: Dictionary
var run_log: Dictionary
var draft: Dictionary
var dil: Dictionary          # {status: writing|ready, turn, d, source, notes, ms}
var pending: Dictionary      # the Director call for the next turn: {turn, done, attempt, result, ms}
var selected := ""
var locked := {}
var left := 0
var plan_start := 0
var paused := false
var report: Dictionary
var ticker_lines: Array = []
var ai_stats: Array = []
var saved_path := ""
var test_msg := ""

var director  # Director node (untyped so its own methods resolve at run time)
var timer: Timer
var root: Control
var time_label: Label
var wait_label: Label
var promise_inputs := {}
var setup_inputs := {}
var _scrolls := {}
var _scroll_keep := {}


func _ready() -> void:
	C = Eng.load_content("res://data/keystone_slice.json", "res://data/values.json")
	theme = _make_theme()
	var bg := ColorRect.new()
	bg.color = BG
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	root = MarginContainer.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		root.add_theme_constant_override("margin_" + side, 16)
	add_child(root)
	director = Director.new()
	add_child(director)
	director.finished.connect(_on_director)
	director.tested.connect(_on_key_tested)
	timer = Timer.new()
	timer.wait_time = 1.0
	timer.timeout.connect(_tick)
	add_child(timer)
	_load_settings()
	render()


# ---------- settings ----------
func _load_settings() -> void:
	var cf := ConfigFile.new()
	if cf.load(SETTINGS) == OK:
		for k in ["seed", "seconds", "play", "api_key", "model", "stances"]:
			if cf.has_section_key("setup", k):
				setup[k] = cf.get_value("setup", k)
	if String(setup["api_key"]).strip_edges() == "":
		setup["api_key"] = OS.get_environment("ANTHROPIC_API_KEY")
		key_from_env = setup["api_key"] != ""


func _save_settings() -> void:
	var cf := ConfigFile.new()
	for k in setup:
		# a key that came from the environment stays there; only a pasted key is saved on this computer
		if k == "api_key" and key_from_env:
			continue
		cf.set_value("setup", k, setup[k])
	cf.save(SETTINGS)


# ---------- helpers ----------
func vn(v) -> String:
	return C["values"][v][0] if C["values"].has(v) else str(v)


func short(t: String) -> String:
	return C["teams"][t]["short"]


func plays(t: String) -> bool:
	return setup["play"] == "both" or setup["play"] == t


func goods_of(t: String) -> Array:
	return Eng.team_goods(C, t)


func team_col(t: String) -> Color:
	return COMM if t == "community" else MERI


func team_soft(t: String) -> Color:
	return COMM_SOFT if t == "community" else MERI_SOFT


func rank_of(t: String, v: String) -> int:
	return setup["stances"][t]["ranks"].find(v) + 1


static func fmt(n: int) -> String:
	return "%d:%02d" % [floori(n / 60.0), maxi(0, n) % 60]


func standing(t: String, stock: Dictionary) -> int:
	return int(round(float(Eng.points(C, t, stock)) / Eng.points(C, t, C["start"]["stock"]) * 100.0))


# ---------- AI Dilemma Director ----------
## Ask for the moment as soon as the last turn resolves. The planning window waits for it (see AI_WAIT_S).
func request_dilemma() -> void:
	pending = {"turn": state["turn"], "done": false, "attempt": 1, "result": {}, "ms": null, "state": state}
	if not director.available():
		_done_pending({"why": "no API key was given"})
		return
	director.request(state["turn"], Director.build_prompt(C, state, setup["stances"]))


func _on_director(turn: int, res: Dictionary) -> void:
	if pending.is_empty() or pending["done"] or turn != pending["turn"]:
		return
	pending["ms"] = res.get("ms", 0)
	if res.has("error"):
		_done_pending({"why": res["error"]})
		return
	var v: Dictionary = Eng.validate_dilemma(C, pending["state"], Eng.normalize(res["raw"]), setup["stances"])
	if v["ok"]:
		_done_pending({"v": v, "attempt": pending["attempt"], "raw": res["raw"]})
	elif pending["attempt"] == 1:
		pending["attempt"] = 2
		pending["first_notes"] = v["notes"]
		director.request(turn, Director.build_prompt(C, pending["state"], setup["stances"]) + Director.retry_note(v["notes"]), true)
		if is_instance_valid(wait_label):
			wait_label.text = "Claude's first draft broke a rule, so it is writing again. A prepared moment is used if it isn't ready soon."
	else:
		_done_pending({"why": "Claude's moment broke the rules twice (" + "; ".join(PackedStringArray(v["notes"])) + ")", "raw": res["raw"]})


func _done_pending(result: Dictionary) -> void:
	pending["done"] = true
	pending["result"] = result
	ai_stats.append({"turn": pending["turn"], "ms": pending["ms"], "ok": result.has("v"), "why": result.get("why")})
	if screen == "plan" and dil.get("status") == "writing" and dil.get("turn") == pending["turn"]:
		use_dilemma(false)


func use_dilemma(force_fallback: bool) -> void:
	var d: Dictionary
	var source := "fallback"
	var notes: Array = []
	var p := pending
	if not force_fallback and not p.is_empty() and p["done"] and p["turn"] == state["turn"] and p["result"].has("v"):
		d = p["result"]["v"]["dilemma"]
		source = "ai"
		notes = p["result"]["v"]["notes"]
	else:
		d = Eng.fallback_dilemma(C, state, setup["stances"])["dilemma"]
		if not p.is_empty() and p["done"]:
			notes = [p["result"].get("why", "Claude's moment was rejected")]
		else:
			notes = ["Claude's moment wasn't ready in time"]
			director.cancel()
	d["source"] = source
	dil = {"status": "ready", "turn": state["turn"], "d": d, "source": source, "notes": notes, "ms": p.get("ms")}
	bot_vote()
	render()


func _on_key_tested(ok: bool, msg: String) -> void:
	test_msg = msg
	if screen == "setup" and setup_inputs.has("test"):
		var l: Label = setup_inputs["test"]
		if is_instance_valid(l):
			l.text = msg
			l.add_theme_color_override("font_color", HONOUR if ok else COST)


# ---------- bots (for a team nobody is playing) ----------
func bot_orders(t: String, s: Dictionary) -> Dictionary:
	var o := {}
	var room: int = C["sites"]["st_brendans"]["capacity"] - s["shelter"]["st_brendans"]["vuln"] - s["shelter"]["st_brendans"]["able"]
	if t == "community":
		var lw: Dictionary = s["sites"]["low_ward"]
		var src := "low_ward" if not lw["flooded"] and lw["home"]["vuln"] + lw["home"]["able"] > 0 else "tech_housing"
		o["bus1"] = {"task": "evac", "site": src, "dest": "st_brendans" if room >= 40 else "heartland"}
		o["bus2"] = {"task": "evac", "site": src, "dest": "st_brendans" if room >= 80 else "heartland"}
		o["boat"] = {"task": "evac", "site": "low_ward", "dest": "st_brendans"}
		if not lw["flooded"]:
			o["vcrew"] = {"task": "sandbag", "site": "low_ward"}
	else:
		o["pcrew"] = {"task": "run", "site": "plant"}
		o["gen"] = {"task": "power", "site": "plant"}
	return o


func bot_vote() -> void:
	if dil.get("d") == null:
		return
	var d: Dictionary = dil["d"]
	for t in TEAMS:
		if plays(t):
			continue
		var top: String = setup["stances"][t]["ranks"][0]
		var best := 0
		var best_score := -99.0
		for i in d["orders"].size():
			var tg: Dictionary = d["orders"][i]["tags"][t]
			var sc: float = (3.0 if top in tg["honours"] else 0.0) + tg["honours"].size() - tg["costs"].size() * 1.5 - (3.0 if top in tg["costs"] else 0.0)
			if sc > best_score:
				best_score = sc
				best = i
		draft["votes"][t] = best


# ---------- game flow ----------
func start_game() -> void:
	_save_settings()
	director.api_key = setup["api_key"]
	director.model = setup["model"] if String(setup["model"]).strip_edges() != "" else Director.DEFAULT_MODEL
	state = Eng.new_game(C, int(setup["seed"]))
	run_log = {"format": "keystone-slice/1", "engine": "godot",
		"setup": {"seed": int(setup["seed"]), "stances": setup["stances"].duplicate(true), "play": setup["play"], "seconds": setup["seconds"]},
		"turns": [], "ai": [], "commitment": ""}
	ticker_lines = ["Hurricane Midas: Keystone ordered to prepare. Landfall expected before midnight."]
	ai_stats = []
	saved_path = ""
	request_dilemma()
	begin_turn()


func begin_turn() -> void:
	draft = {"orders": {}, "lends": {}, "towerOpen": false, "votes": {"community": null, "meridian": null}, "promises": [], "confirms": [], "confirmed_local": {}}
	for t in TEAMS:
		if not plays(t):
			draft["orders"].merge(bot_orders(t, state), true)
	if not draft["orders"].has("pcrew"):
		draft["orders"]["pcrew"] = {"task": "run", "site": "plant"}
	locked = {"community": not plays("community"), "meridian": not plays("meridian")}
	selected = ""
	report = {}
	screen = "plan"
	_scroll_keep = {}
	dil = {"status": "writing", "turn": state["turn"]}
	left = int(setup["seconds"])
	plan_start = left
	paused = false
	if not pending.is_empty() and pending["done"] and pending["turn"] == state["turn"]:
		use_dilemma(false)
	timer.start()
	render()


func _waited() -> int:
	return plan_start - left


func _tick() -> void:
	if paused or screen != "plan":
		return
	left -= 1
	if dil["status"] == "writing":
		var retrying: bool = not pending.is_empty() and not pending["done"] and pending["attempt"] == 2
		if _waited() >= (AI_RETRY_WAIT_S if retrying else AI_WAIT_S):
			use_dilemma(true)
	if left <= 0:
		lock_and_resolve()
		return
	if is_instance_valid(time_label):
		time_label.text = fmt(left)
		time_label.add_theme_color_override("font_color", COST if left <= 15 else FG)
	if is_instance_valid(wait_label) and pending.get("attempt", 1) == 1:
		wait_label.text = "If it isn't ready in %d seconds, a prepared moment is used. Plan your units meanwhile." % maxi(0, AI_WAIT_S - _waited())


func lock_and_resolve() -> void:
	timer.stop()
	if dil["status"] == "writing":
		use_dilemma(true)
	var input := {
		"orders": draft["orders"].duplicate(true), "lends": draft["lends"].duplicate(), "towerOpen": draft["towerOpen"],
		"dilemma": dil["d"], "votes": draft["votes"].duplicate(), "promises": draft["promises"].duplicate(true), "confirms": draft["confirms"].duplicate(),
	}
	run_log["turns"].append(input.duplicate(true))
	var raw = pending.get("result", {}).get("raw") if pending.get("turn") == state["turn"] else null
	run_log["ai"].append({"turn": state["turn"], "source": dil["source"], "ms": dil.get("ms"), "notes": dil["notes"], "raw": raw})
	var res: Dictionary = Eng.resolve_turn(C, state, input)
	prev = state
	state = res["state"]
	report = res["report"]
	ticker_lines = (report["ticker"] + ticker_lines).slice(0, 12)
	if not state["over"]:
		request_dilemma()
	screen = "playout"
	render()
	await get_tree().create_timer(PLAYOUT_S).timeout
	screen = "debrief" if state["over"] else "report"
	_scroll_keep = {}
	if state["over"]:
		_save_run()
	render()


# ---------- orders on the map ----------
func units_for(t: String) -> Array:
	var out := []
	for id in C["units"]:
		var u: Dictionary = C["units"][id]
		var lent: bool = draft["lends"].get(id, false)
		if (u["team"] == t and not lent) or (u["team"] != t and lent):
			out.append(id)
	return out


func targets_for(uid: String) -> Dictionary:
	var U: Dictionary = C["units"][uid]
	var out := {}
	for id in C["sites"]:
		var x: Dictionary = state["sites"][id]
		var home := 0
		if C["sites"][id].has("people"):
			home = x["home"]["vuln"] + x["home"]["able"]
		match U["kind"]:
			"bus":
				var ppl: int = state["shelter"]["st_brendans"]["vuln"] + state["shelter"]["st_brendans"]["able"] if id == "st_brendans" else home
				if ppl > 0 and not x["flooded"]:
					out[id] = "EVACUATE"
			"boat":
				if id in U["reach"] and home > 0:
					out[id] = "EVACUATE"
			"crew":
				if not x["flooded"] and id != "crater_road":
					out[id] = "SANDBAG"
			"generator":
				if id != "crater_road":
					out[id] = "POWER"
			"plantcrew":
				if id == "plant" and not x["flooded"]:
					out[id] = "RUN"
				elif not x["flooded"] and id != "crater_road":
					out[id] = "SANDBAG"
	return out


func order_site(id: String) -> void:
	if selected == "":
		return
	var act = targets_for(selected).get(id)
	if act == null:
		return
	var task: String = {"EVACUATE": "evac", "SANDBAG": "sandbag", "POWER": "power", "RUN": "run"}[act]
	var o := {"task": task, "site": id}
	if task == "evac":
		var was: Dictionary = draft["orders"].get(selected, {})
		o["dest"] = "heartland" if id == "st_brendans" else was.get("dest", "st_brendans")
		if o["dest"] == id:
			o["dest"] = "heartland"
		if C["units"][selected]["kind"] == "boat":
			o["dest"] = "st_brendans"
	draft["orders"][selected] = o
	selected = ""
	render()


func sentence(uid: String) -> String:
	var o: Dictionary = draft["orders"].get(uid, {})
	var U: Dictionary = C["units"][uid]
	if o.is_empty() or o["task"] == "idle":
		return "Holding: the plant will not run" if uid == "pcrew" else "Holding. Tap here, then tap a site on the map."
	var site: String = C["sites"][o["site"]]["name"] if C["sites"].has(o.get("site", "")) else str(o.get("site", ""))
	match o["task"]:
		"evac":
			var dest: Dictionary = C["destinations"][o["dest"]]
			return "Move up to %d people from %s to %s%s" % [U["carry"], site, dest["name"], " (%d fuel)" % dest["fuel"] if o["dest"] == "heartland" else ""]
		"sandbag":
			var bits := PackedStringArray()
			for g in U["sandbag_cost"]:
				bits.append("%d %s" % [U["sandbag_cost"][g], String(C["goods"][g]["name"]).to_lower()])
			return "Sandbag %s (%s)" % [site, ", ".join(bits)]
		"power":
			return "Power %s (%d fuel)" % [site, U["power_cost_fuel"]]
		"run":
			return "Run the plant"
	return ""


func _on_unit(uid: String) -> void:
	if selected == uid:
		draft["orders"][uid] = {"task": "idle"}
		selected = ""
	else:
		selected = uid
	render()


func _on_dest(uid: String, d: String) -> void:
	draft["orders"][uid]["dest"] = d
	render()


func _on_lend(on: bool, uid: String) -> void:
	if on:
		draft["lends"][uid] = true
	else:
		draft["lends"].erase(uid)
	selected = ""
	render()


func _on_tower(on: bool) -> void:
	draft["towerOpen"] = on
	render()


func _on_lock(t: String) -> void:
	locked[t] = not locked[t]
	selected = ""
	if locked["community"] and locked["meridian"]:
		lock_and_resolve()
	else:
		render()


func _on_vote(t: String, i: int) -> void:
	draft["votes"][t] = null if draft["votes"][t] == i else i
	render()


func _on_pause() -> void:
	paused = not paused
	render()


func _on_more_time() -> void:
	left += 30
	plan_start += 30
	render()


func _on_promise(t: String) -> void:
	var to := "meridian" if t == "community" else "community"
	var inp: Dictionary = promise_inputs[t]
	var kind: String = inp["kind"].get_item_metadata(inp["kind"].selected)
	var unit: String = inp["unit"].get_item_metadata(inp["unit"].selected)
	var site: String = inp["site"].get_item_metadata(inp["site"].selected)
	var text := ""
	if kind == "lend":
		text = "%s will lend %s to %s next turn." % [short(t), C["units"][unit]["name"], short(to)]
	else:
		text = "%s will send %s to %s next turn." % [short(t), C["units"][unit]["name"], C["sites"][site]["name"]]
	draft["promises"].append({"by": t, "to": to, "kind": kind, "unit": unit, "site": site if kind == "send" else null, "text": text})
	if not plays(to):
		_confirm(draft["promises"].size() - 1)
	render()


func _confirm(i: int) -> void:
	draft["confirmed_local"][i] = true
	_rebuild_confirms()


func _on_confirm(i: int) -> void:
	_confirm(i)
	render()


## Withdraw one team's promise and keep the other team's confirmations.
func _on_withdraw(t: String) -> void:
	var keep := []
	var conf := {}
	for i in draft["promises"].size():
		var p: Dictionary = draft["promises"][i]
		if p["by"] == t:
			continue
		if draft["confirmed_local"].has(i):
			conf[keep.size()] = true
		keep.append(p)
	draft["promises"] = keep
	draft["confirmed_local"] = conf
	_rebuild_confirms()
	render()


func _rebuild_confirms() -> void:
	var c := []
	for i in draft["confirmed_local"]:
		c.append(state["promises"].size() + int(i))
	c.sort()
	draft["confirms"] = c


# ---------- rendering ----------
func render() -> void:
	for k in _scrolls:
		if is_instance_valid(_scrolls[k]):
			_scroll_keep[k] = _scrolls[k].scroll_vertical
	_scrolls = {}
	for c in root.get_children():
		root.remove_child(c)
		c.queue_free()
	time_label = null
	wait_label = null
	promise_inputs = {}
	match screen:
		"setup":
			root.add_child(setup_view())
		"debrief":
			root.add_child(debrief_view())
		_:
			root.add_child(console_view())
	_restore_scrolls()


## Rebuilding the screen on every tap would jump each list back to the top; put them back where they were.
func _restore_scrolls() -> void:
	await get_tree().process_frame
	await get_tree().process_frame
	for k in _scrolls:
		if is_instance_valid(_scrolls[k]) and _scroll_keep.has(k):
			_scrolls[k].scroll_vertical = _scroll_keep[k]


func setup_view() -> Control:
	setup_inputs = {}
	var sc := _scroll("setup")
	var col := _vbox(18)
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(col)
	col.add_child(_lbl("VALUES CRUCIBLE · KEYSTONE · PLAYTEST", 14, MUTED))
	col.add_child(_lbl("Hurricane Midas reaches Keystone tonight", 38, FG))
	col.add_child(_lbl("Keystone is one parish with two leadership teams: the community, who speak for the people who live here, and Meridian, the company that runs the cure plant. They share one set of buses, boats, crews and a generator. Over three storm turns you give your units orders on the map and answer one hard moment each turn. The team with the most of its resources left at the end wins, and people are the workforce. About 10 minutes.", 18, FG))
	var how := _hbox(12)
	for pair in [["1. Plan", "Tap one of your units, then tap a highlighted site on the map. Buses and the boat move people, crews sandbag, the generator powers one building."],
			["2. Decide", "Each turn brings one moment. Both teams vote. The team whose resources it is about makes the final call."],
			["3. Watch", "Lock your orders. Three storm hours pass. The engine works out what happened from your orders and the storm. No dice, no judge."]]:
		var p := _panel(PANEL, LINE)
		p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var v := _vbox(4)
		v.add_child(_lbl(pair[0].to_upper(), 15, STORM))
		v.add_child(_lbl(pair[1], 16, FG))
		p.add_child(v)
		how.add_child(p)
	col.add_child(how)

	var stances := _hbox(16)
	for t in TEAMS:
		var p := _panel(PANEL, team_col(t), 2)
		p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var v := _vbox(8)
		v.add_child(_lbl(C["teams"][t]["name"], 24, team_col(t)))
		v.add_child(_lbl("Speaks for the people of Keystone. Owns the buses, the boat, the volunteers and the food." if t == "community" else "Speaks for Meridian, which makes the cure here. Owns the shuttle, the generator, the plant crew, funds and cure doses.", 15, MUTED))
		v.add_child(_lbl("THREE VALUES THIS TEAM SIGNS, MOST IMPORTANT FIRST", 13, MUTED))
		var ranks := _hbox(8)
		var picks := []
		for i in 3:
			ranks.add_child(_lbl("#%d" % (i + 1), 16, FG, false))
			var ob := OptionButton.new()
			var ids: Array = C["values"].keys()
			for j in ids.size():
				ob.add_item(vn(ids[j]))
				ob.set_item_metadata(j, ids[j])
				if ids[j] == setup["stances"][t]["ranks"][i]:
					ob.select(j)
			ob.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			ranks.add_child(ob)
			picks.append(ob)
		v.add_child(ranks)
		v.add_child(_lbl("THE STATEMENT THEY SIGN", 13, MUTED))
		var te := TextEdit.new()
		te.text = setup["stances"][t]["statement"]
		te.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
		te.custom_minimum_size = Vector2(0, 72)
		v.add_child(te)
		setup_inputs[t] = {"ranks": picks, "statement": te}
		p.add_child(v)
		stances.add_child(p)
	col.add_child(stances)

	var opts := _hbox(16)
	var play := OptionButton.new()
	for pair in [["community", "The community team (a bot plays Meridian)"], ["meridian", "The Meridian team (a bot plays the community)"], ["both", "Both teams, taking turns at the screen"]]:
		play.add_item(pair[1])
		play.set_item_metadata(play.item_count - 1, pair[0])
		if setup["play"] == pair[0]:
			play.select(play.item_count - 1)
	opts.add_child(_field("You play", play))
	var secs := OptionButton.new()
	for n in [60, 90, 120, 180]:
		secs.add_item("%d seconds" % n)
		secs.set_item_metadata(secs.item_count - 1, n)
		if int(setup["seconds"]) == n:
			secs.select(secs.item_count - 1)
	opts.add_child(_field("Planning time each turn", secs))
	var seed_in := LineEdit.new()
	seed_in.text = str(setup["seed"])
	seed_in.custom_minimum_size = Vector2(120, 0)
	opts.add_child(_field("Storm number (advanced)", seed_in))
	col.add_child(opts)

	var ai := _panel(SUNK, LINE)
	var av := _vbox(8)
	av.add_child(_lbl("CLAUDE WRITES THE MOMENTS (OPTIONAL)", 13, MUTED))
	av.add_child(_lbl("Paste an Anthropic API key so Claude writes each turn's moment live from your values and the map. A pasted key is saved only on this computer; a key from the ANTHROPIC_API_KEY setting is never saved. Without a key, or if Claude is slow or offline, a prepared moment is used.", 15, FG))
	var keyrow := _hbox(12)
	var key := LineEdit.new()
	key.secret = true
	key.placeholder_text = "sk-ant-..."
	key.text = setup["api_key"]
	key.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	keyrow.add_child(_field("API key", key, true))
	var model := LineEdit.new()
	model.text = setup["model"]
	model.custom_minimum_size = Vector2(220, 0)
	keyrow.add_child(_field("Model", model))
	av.add_child(keyrow)
	var test_row := _hbox(12)
	var test_lbl := _lbl(test_msg, 15, MUTED)
	setup_inputs["test"] = test_lbl
	var on_test := func():
		director.api_key = key.text.strip_edges()
		director.model = model.text.strip_edges() if model.text.strip_edges() != "" else Director.DEFAULT_MODEL
		test_lbl.text = "Testing the key..."
		director.test_key()
	test_row.add_child(_button("Test the key", on_test))
	test_row.add_child(test_lbl)
	av.add_child(test_row)
	ai.add_child(av)
	col.add_child(ai)

	var status := _lbl("", 16, COST)
	var on_start := func():
		for t in TEAMS:
			var r := []
			for ob in setup_inputs[t]["ranks"]:
				r.append(ob.get_item_metadata(ob.selected))
			setup["stances"][t]["ranks"] = r
			setup["stances"][t]["statement"] = setup_inputs[t]["statement"].text.strip_edges().left(240)
		setup["play"] = play.get_item_metadata(play.selected)
		setup["seconds"] = secs.get_item_metadata(secs.selected)
		setup["seed"] = absi(int(seed_in.text)) if seed_in.text.is_valid_int() else 4217
		if key.text.strip_edges() != setup["api_key"]:
			key_from_env = false
		setup["api_key"] = key.text.strip_edges()
		setup["model"] = model.text.strip_edges()
		for t in TEAMS:
			var rr: Array = setup["stances"][t]["ranks"]
			if rr[0] == rr[1] or rr[1] == rr[2] or rr[0] == rr[2]:
				status.text = "The %s team picked the same value twice. Pick three different values." % short(t)
				return
		start_game()
	var start := _button("Start the storm", on_start, true)
	start.custom_minimum_size = Vector2(320, 56)
	col.add_child(start)
	col.add_child(status)
	return sc


func console_view() -> Control:
	var s := state
	var show_turn: int = s["turn"] if screen == "plan" else s["turn"] - 1
	var TT: Dictionary = C["turns"][show_turn - 1]
	var col := _vbox(8)

	# top bar: always on screen, so the clock never scrolls away
	var top := _hbox(18)
	top.add_child(_lbl("KEYSTONE", 28, FG, false))
	top.add_child(_lbl("TURN %d OF %d · %s · %s" % [show_turn, C["turns"].size(), String(TT["label"]).to_upper(), TT["hours"]], 18, STORM, false))
	top.add_child(_lbl("STORM STRENGTH " + "■".repeat(TT["intensity"]) + "□".repeat(4 - TT["intensity"]), 15, MUTED, false))
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(spacer)
	if screen == "plan":
		top.add_child(_lbl("TIME TO PLAN", 14, MUTED, false))
		time_label = _lbl(fmt(left), 30, COST if left <= 15 else FG, false)
		top.add_child(time_label)
		top.add_child(_button("Resume" if paused else "Pause", _on_pause))
		top.add_child(_button("+30 s", _on_more_time))
	else:
		top.add_child(_lbl("THE STORM PLAYS OUT" if screen == "playout" else "WHAT HAPPENED", 16, MUTED, false))
	col.add_child(top)
	col.add_child(forecast_view(s["turn"]))
	if screen == "plan" and TT.has("flash"):
		var f := _panel(STORM, STORM)
		f.add_child(_lbl("FLASH WARNING: %s. Plan for it now." % TT["flash"]["text"], 16, BG))
		col.add_child(f)
	var tick := _panel(SUNK, LINE)
	var trow := _hbox(10)
	trow.add_child(_chip("NEWS", STORM, BG, 13))
	var news := _lbl("  ·  ".join(PackedStringArray(ticker_lines)), 15, FG, false)
	news.clip_text = true
	news.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	trow.add_child(news)
	tick.add_child(trow)
	col.add_child(tick)

	var grid := _hbox(12)
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.add_child(team_view("community"))
	var mid := _vbox(8)
	mid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var mp := _panel(PANEL, LINE, 1, 6)
	mp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	mp.size_flags_stretch_ratio = 1.15
	var mv := _vbox(2)
	mv.add_child(map_view(TT))
	mv.add_child(_lbl(hint(), 14, STORM if selected != "" else MUTED))
	mp.add_child(mv)
	mid.add_child(mp)
	var lower := _scroll("lower")
	lower.size_flags_stretch_ratio = 1.0
	lower.add_child(dilemma_view() if screen == "plan" else report_view())
	mid.add_child(lower)
	grid.add_child(mid)
	grid.add_child(team_view("meridian"))
	col.add_child(grid)
	return col


## Forecast for turn n onward: the next turn is sure, later turns less so.
func forecast_view(n: int) -> Control:
	var row := _hbox(8)
	for dist in 3:
		var p := _panel(STORM_SOFT if dist == 0 else SUNK, STORM if dist == 0 else LINE, 1, 8)
		p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var v := _vbox(2)
		var when := ["THIS TURN" if screen == "plan" else "NEXT TURN", "NEXT TURN" if screen == "plan" else "AFTER THAT", "LATER"][dist]
		if n + dist > C["turns"].size():
			v.add_child(_lbl(when, 13, MUTED))
			v.add_child(_lbl("Recovery. The storm has passed.", 14, MUTED))
		else:
			var T: Dictionary = C["turns"][n + dist - 1]
			v.add_child(_lbl(when + " · " + String(T["label"]).to_upper(), 13, STORM if dist == 0 else MUTED))
			for h in T["hazards"]:
				var hp: float = h["p"]
				var w := "possible"
				if dist == 0:
					w = "certain" if hp >= 0.85 else ("likely" if hp >= 0.5 else "possible")
				elif dist == 1:
					w = "likely" if hp >= 0.85 else "possible"
				v.add_child(_lbl("%s: %s%s" % [w.to_upper(), h["text"], " (sandbags lower the risk)" if h.has("sandbag_p") else ""], 14, COST if w == "certain" else FG))
		p.add_child(v)
		row.add_child(p)
	return row


func hint() -> String:
	if screen != "plan":
		return "Three storm hours pass..." if screen == "playout" else "Read what happened, then start the next turn."
	if selected == "":
		return "Tap one of your units in your team panel, then tap a highlighted site here."
	return "%s selected. Tap a highlighted site, or tap the unit again to hold it." % C["units"][selected]["name"]


func map_view(T: Dictionary) -> Control:
	var m = MapView.new()
	m.C = C
	m.s = state
	m.size_flags_vertical = Control.SIZE_EXPAND_FILL
	m.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	m.custom_minimum_size = Vector2(0, 260)
	if screen == "plan" and selected != "":
		m.targets = targets_for(selected)
	if screen == "plan" and T.has("flash"):
		m.flash_site = T["flash"]["site"]
	var assigned := {}
	for uid in draft.get("orders", {}):
		var o: Dictionary = draft["orders"][uid]
		if o.get("task", "idle") != "idle" and o.has("site"):
			if not assigned.has(o["site"]):
				assigned[o["site"]] = []
			assigned[o["site"]].append(uid)
	m.assigned = assigned
	var b: Dictionary = T["band"]
	m.band = Vector3(b["x"], b["y"], b["r"])
	if screen == "playout" and not prev.is_empty():
		for id in C["sites"]:
			var a: Dictionary = prev["sites"][id]
			var z: Dictionary = state["sites"][id]
			if a["flooded"] != z["flooded"] or a["dark"] != z["dark"] or a["closed"] != z["closed"]:
				m.hit[id] = true
		# the storm moves on toward the next turn's band (or out to sea after the last)
		var to := Vector3(700, 120, b["r"])
		if state["turn"] <= C["turns"].size():
			var nb: Dictionary = C["turns"][state["turn"] - 1]["band"]
			to = Vector3(nb["x"], nb["y"], nb["r"])
		var tw: Tween = m.create_tween()
		tw.tween_property(m, "band", to, PLAYOUT_S * 0.9).set_trans(Tween.TRANS_SINE)
	m.site_pressed.connect(order_site)
	return m


func team_view(t: String) -> Control:
	var s := state
	var mine := plays(t)
	var plan := screen == "plan"
	var st: Dictionary = setup["stances"][t]
	var meter: String = C["teams"][t]["meter"]
	var mv: int = s["meters"][meter]
	var outer := _panel(PANEL, team_col(t), 2)
	outer.custom_minimum_size = Vector2(316, 0)
	var sc := _scroll("team_" + t)
	outer.add_child(sc)
	var v := _vbox(8)
	v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(v)
	var h := _hbox(8)
	h.add_child(_lbl(C["teams"][t]["name"], 22, team_col(t), false))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	h.add_child(sp)
	h.add_child(_chip("YOU" if mine else "BOT", team_soft(t), team_col(t), 12))
	v.add_child(h)
	v.add_child(_lbl("Standing: %d%% of its starting resources" % standing(t, s["stock"]), 16, FG))
	v.add_child(_lbl("Most left at the end wins.", 13, MUTED))
	# Lock sits at the top, so it is always in reach
	if plan and mine:
		var lb := _button("Orders locked. Tap to change them" if locked[t] else "Lock %s orders" % short(t), _on_lock.bind(t), not locked[t])
		lb.custom_minimum_size = Vector2(0, 46)
		v.add_child(lb)
	elif plan:
		v.add_child(_lbl("A bot is playing this team from its signed values.", 14, MUTED))
	var vals := PackedStringArray()
	for i in 3:
		vals.append("#%d %s" % [i + 1, vn(st["ranks"][i])])
	v.add_child(_lbl("   ".join(vals), 15, FG))
	v.add_child(_lbl("\"%s\"" % st["statement"], 14, MUTED))
	var stock := _hbox(8)
	for g in goods_of(t):
		var cell := _vbox(0)
		cell.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		cell.add_child(_lbl(String(C["goods"][g]["name"]).to_upper(), 12, MUTED))
		cell.add_child(_lbl(str(s["stock"][t][g]), 24, FG, false))
		stock.add_child(cell)
	v.add_child(stock)
	v.add_child(_lbl("%s %d (below %d hurts)" % ["COMMUNITY TRUST" if meter == "trust" else "BOARD CONFIDENCE", mv, C["meters"]["low"]], 13, MUTED))
	var bar := ProgressBar.new()
	bar.max_value = 100
	bar.value = mv
	bar.show_percentage = false
	bar.custom_minimum_size = Vector2(0, 10)
	bar.add_theme_stylebox_override("fill", _box(COST if mv < C["meters"]["low"] else team_col(t), Color(0, 0, 0, 0), 0, 3, 0))
	bar.add_theme_stylebox_override("background", _box(SUNK, LINE, 1, 3, 0))
	v.add_child(bar)

	v.add_child(_lbl("YOUR UNITS THIS TURN" if mine else "UNITS THIS TURN", 13, MUTED))
	for id in units_for(t):
		var u: Dictionary = C["units"][id]
		var lent_in: bool = u["team"] != t
		var b := _button("%s%s\n%s" % [u["name"], "  (lent by %s)" % short(u["team"]) if lent_in else "", sentence(id)], _on_unit.bind(id))
		b.alignment = HORIZONTAL_ALIGNMENT_LEFT
		b.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		b.disabled = not plan or not mine
		if selected == id:
			b.add_theme_stylebox_override("normal", _box(team_soft(t), STORM, 3, 6, 8))
			b.add_theme_stylebox_override("hover", _box(team_soft(t), STORM, 3, 6, 8))
		v.add_child(b)
		var o: Dictionary = draft["orders"].get(id, {})
		if plan and mine and o.get("task") == "evac" and u.get("road", false):
			v.add_child(_lbl("Take them to:", 13, MUTED))
			var dr := HFlowContainer.new()
			for d in ["st_brendans", "tech_tower", "heartland"]:
				if d == o["site"]:
					continue
				var db := _button(C["destinations"][d]["name"], _on_dest.bind(id, d))
				db.disabled = (d == "tech_tower" and not (s["towerOpen"] or draft["towerOpen"])) or (d == "heartland" and s["sites"]["crater_road"]["closed"])
				if o["dest"] == d:
					db.add_theme_stylebox_override("normal", _box(team_soft(t), team_col(t), 2, 6, 6))
				db.add_theme_font_size_override("font_size", 14)
				dr.add_child(db)
			v.add_child(dr)

	if plan and mine:
		v.add_child(_lbl("LEND A UNIT TO THE OTHER TEAM FOR THIS TURN", 13, MUTED))
		var lr := HFlowContainer.new()
		for id in C["units"]:
			if C["units"][id]["team"] != t:
				continue
			var cb := CheckBox.new()
			cb.text = C["units"][id]["name"]
			cb.button_pressed = draft["lends"].get(id, false)
			cb.toggled.connect(_on_lend.bind(id))
			lr.add_child(cb)
		v.add_child(lr)
		if t == "meridian" and not s["towerOpen"]:
			var trow := _hbox(6)
			var tw := CheckBox.new()
			tw.button_pressed = draft["towerOpen"]
			tw.toggled.connect(_on_tower)
			trow.add_child(tw)
			trow.add_child(_lbl("Open Tech Tower to residents (%d funds, shelters 60)" % C["tower_open_cost"]["funds"], 15, FG))
			v.add_child(trow)
		promise_view(t, v)
	var open := PackedStringArray()
	for p in s["promises"]:
		if p["status"] == "open" and (p["by"] == t or p["to"] == t):
			open.append(p["text"] + ("" if p["confirmed"] else " (not confirmed, so not tracked)"))
	if open.size():
		v.add_child(_lbl("PROMISE DUE THIS TURN", 13, STORM))
		v.add_child(_lbl("\n".join(open), 15, FG))
	return outer


func promise_view(t: String, v: VBoxContainer) -> void:
	if state["turn"] >= C["turns"].size():
		return  # a promise made in the last storm turn could never come due
	var other := "meridian" if t == "community" else "community"
	for i in draft["promises"].size():
		var p: Dictionary = draft["promises"][i]
		if p["to"] != t:
			continue
		v.add_child(_lbl("%s PROMISES YOU" % short(p["by"]).to_upper(), 13, STORM))
		v.add_child(_lbl(p["text"], 15, FG))
		if draft["confirmed_local"].has(i):
			v.add_child(_lbl("Confirmed. The engine will check it next turn.", 14, HONOUR))
		else:
			v.add_child(_button("Confirm this promise", _on_confirm.bind(i)))
	var mine_p = null
	for p in draft["promises"]:
		if p["by"] == t:
			mine_p = p
	if mine_p != null:
		v.add_child(_lbl("YOUR PROMISE TO %s" % short(other).to_upper(), 13, STORM))
		v.add_child(_lbl(mine_p["text"], 15, FG))
		v.add_child(_button("Withdraw it", _on_withdraw.bind(t)))
		return
	v.add_child(_lbl("MAKE A PROMISE TO %s (THE ENGINE CHECKS IT NEXT TURN)" % short(other).to_upper(), 13, MUTED))
	var kind := OptionButton.new()
	kind.add_item("Lend a unit next turn")
	kind.set_item_metadata(0, "lend")
	kind.add_item("Send a unit to a site next turn")
	kind.set_item_metadata(1, "send")
	var unit := OptionButton.new()
	for id in C["units"]:
		if C["units"][id]["team"] == t:
			unit.add_item(C["units"][id]["name"])
			unit.set_item_metadata(unit.item_count - 1, id)
	var site := OptionButton.new()
	for id in C["sites"]:
		if id != "crater_road":
			site.add_item(C["sites"][id]["name"])
			site.set_item_metadata(site.item_count - 1, id)
	for ob in [kind, unit, site]:
		v.add_child(ob)
	promise_inputs[t] = {"kind": kind, "unit": unit, "site": site}
	v.add_child(_button("Log this promise", _on_promise.bind(t)))


func _chips(o: Dictionary) -> Control:
	var col := _vbox(4)
	for t in TEAMS:
		var row := HFlowContainer.new()
		row.add_child(_lbl(short(t).to_upper() + " VALUES", 12, team_col(t), false))
		var tg: Dictionary = o["tags"][t]
		for x in tg["honours"]:
			row.add_child(_chip("honours #%d %s" % [rank_of(t, x), vn(x)], HONOUR_SOFT, HONOUR))
		for x in tg["costs"]:
			row.add_child(_chip("costs #%d %s" % [rank_of(t, x), vn(x)], COST_SOFT, COST))
		if tg["honours"].is_empty() and tg["costs"].is_empty():
			row.add_child(_chip("touches none", SUNK, MUTED))
		col.add_child(row)
	return col


func _cost_text(o: Dictionary) -> Array:
	var c := PackedStringArray()
	for g in o["cost"]:
		c.append("%d %s" % [o["cost"][g], String(C["goods"][g]["name"]).to_lower()])
	var e: Dictionary = o["effects"]
	var bits := PackedStringArray()
	if e.has("save"): bits.append("up to %d vulnerable people to safety from %s" % [e["save"]["n"], C["sites"][e["save"]["site"]]["name"]])
	if e.get("expose", 0): bits.append("%d workers kept in harm's way" % e["expose"])
	if e.has("power"): bits.append("power at %s" % C["sites"][e["power"]]["name"])
	if e.has("sandbag"): bits.append("sandbags at %s" % C["sites"][e["sandbag"]]["name"])
	if e.get("open_tower", false): bits.append("Tech Tower opens")
	if e.get("cold_store", false): bits.append("stored doses packed on ice, so none spoil")
	if e.get("doses", 0): bits.append("%+d cure doses" % e["doses"])
	if e.get("trust", 0): bits.append("community trust %+d" % e["trust"])
	if e.get("confidence", 0): bits.append("board confidence %+d" % e["confidence"])
	return [", ".join(c) if c.size() else "nothing", " · ".join(bits) if bits.size() else "no direct effect"]


## What this order does to each team's standing right now (its cost and any doses), before the storm decides the rest.
func _standing_text(o: Dictionary) -> String:
	var stock: Dictionary = state["stock"].duplicate(true)
	for g in o["cost"]:
		stock[o["owner"]][g] -= int(o["cost"][g])
	var dz: int = o["effects"].get("doses", 0)
	if dz:
		stock["meridian"]["doses"] = maxi(0, stock["meridian"]["doses"] + dz)
	var bits := PackedStringArray()
	for t in TEAMS:
		var b := standing(t, state["stock"])
		var a := standing(t, stock)
		if a != b:
			bits.append("%s %d%% → %d%%" % [short(t), b, a])
	return "Standing now: " + (", ".join(bits) if bits.size() else "no change") + ". What it saves or loses later depends on the storm."


func dilemma_view() -> Control:
	var p := _panel(PANEL, STORM, 2)
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := _vbox(10)
	p.add_child(v)
	if dil["status"] == "writing":
		v.add_child(_lbl("THIS TURN'S MOMENT", 13, MUTED))
		v.add_child(_lbl("Claude is writing this turn's moment from both teams' values and the map..." if director.available() else "Preparing this turn's moment...", 20, FG))
		wait_label = _lbl("If it isn't ready in %d seconds, a prepared moment is used. Plan your units meanwhile." % maxi(0, AI_WAIT_S - _waited()), 15, MUTED)
		v.add_child(wait_label)
		return p
	var d: Dictionary = dil["d"]
	var votes: Dictionary = draft["votes"]
	var fc: String = d["final_call"]
	var head := _hbox(8)
	head.add_child(_lbl("THIS TURN'S MOMENT" + (" · " + String(C["sites"][d["site"]]["name"]).to_upper() if d["site"] != null else ""), 13, MUTED, false))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	var src := "Prepared moment"
	if dil["source"] == "ai":
		src = "Written by Claude" + (" in %d s" % roundi(dil["ms"] / 1000.0) if dil.get("ms") else "")
	head.add_child(_lbl(src, 13, MUTED, false))
	v.add_child(head)
	if dil["source"] != "ai" and dil["notes"].size():
		v.add_child(_lbl("Why not Claude: %s." % dil["notes"][0], 13, MUTED))
	if d["collision"].size():
		var cr := HFlowContainer.new()
		for i in d["collision"].size():
			if i > 0:
				cr.add_child(_lbl("  VS  ", 16, STORM, false))
			var cv: String = d["collision"][i]
			var t := "community" if cv in setup["stances"]["community"]["ranks"] else "meridian"
			cr.add_child(_chip("%s #%d %s" % [short(t).to_upper(), rank_of(t, cv), vn(cv).to_upper()], team_soft(t), team_col(t), 16))
		v.add_child(cr)
	v.add_child(_lbl(d["title"], 24, FG))
	v.add_child(_lbl(d["situation"], 17, FG))
	if d["resident"] != "":
		v.add_child(_lbl("AT THE CENTRE: " + d["resident"], 16, FG))
	if d["voice"] != null:
		var vp := _panel(SUNK, LINE)
		var vv := _vbox(2)
		vv.add_child(_lbl(String(d["voice"]["who"]).to_upper(), 12, MUTED))
		vv.add_child(_lbl("\"%s\"" % d["voice"]["line"], 16, FG))
		vp.add_child(vv)
		v.add_child(vp)
	var fh := HFlowContainer.new()
	fh.add_child(_chip("%s DECIDES" % short(fc).to_upper(), team_soft(fc), team_col(fc), 14))
	fh.add_child(_lbl("  Both teams vote. %s's vote is the final call." % short(fc), 15, MUTED, false))
	v.add_child(fh)
	for i in d["orders"].size():
		var o: Dictionary = d["orders"][i]
		var ct := _cost_text(o)
		var op := _panel(SUNK, team_col(o["owner"]) if votes[fc] == i else LINE, 2 if votes[fc] == i else 1)
		var ov := _vbox(6)
		ov.add_child(_lbl("%d. %s" % [i + 1, o["label"]], 19, FG))
		ov.add_child(_lbl("Paid by %s: %s" % [short(o["owner"]), ct[0]], 14, FG))
		ov.add_child(_lbl(ct[1], 14, MUTED))
		ov.add_child(_lbl(_standing_text(o), 14, STORM))
		if o["owner"] != fc:
			ov.add_child(_lbl("%s pays for this, so it runs only if %s votes for it too." % [short(o["owner"]), short(o["owner"])], 14, STORM))
		if i == d["default"]:
			ov.add_child(_lbl("The standing plan: this runs if %s doesn't decide." % short(fc), 13, MUTED))
		ov.add_child(_chips(o))
		var vr := _hbox(8)
		for t in TEAMS:
			var on: bool = votes[t] == i
			var vb := _button(("✓ " if on else "") + "%s votes for this" % short(t), _on_vote.bind(t, i))
			vb.disabled = not plays(t)
			vb.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			vb.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			vb.add_theme_stylebox_override("normal", _box(team_soft(t) if on else SUNK, team_col(t), 2 if on else 1, 6, 8))
			vb.add_theme_stylebox_override("disabled", _box(team_soft(t) if on else SUNK, LINE, 1, 6, 8))
			vr.add_child(vb)
		ov.add_child(vr)
		op.add_child(ov)
		v.add_child(op)
	return p


func report_view() -> Control:
	var p := _panel(PANEL, LINE)
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := _vbox(10)
	p.add_child(v)
	if screen == "playout":
		v.add_child(_lbl("THE STORM PLAYS OUT", 13, MUTED))
		v.add_child(_lbl("Hurricane Midas moves across Keystone...", 22, STORM))
		return p
	var r := report
	v.add_child(_lbl("Turn %d · %s: what happened" % [r["turn"], r["label"]], 24, FG))
	# named people first: the human cost is not one bullet among ten
	for res in C["residents"]:
		var a: Dictionary = prev["residents"][res["id"]]
		var z: Dictionary = state["residents"][res["id"]]
		if a["status"] != z["status"]:
			var bad: bool = z["status"] in ["lost", "injured"]
			var rp := _panel(COST_SOFT if bad else HONOUR_SOFT, COST if bad else HONOUR)
			rp.add_child(_lbl("%s, %d: %s" % [res["name"], res["age"], _resident_line(z)], 18, FG))
			v.add_child(rp)
	var lost: int = r["lost"]["vuln"] + r["lost"]["able"]
	var tally := _hbox(10)
	tally.add_child(_stat("Moved to safety", str(r["rescued"]["vuln"] + r["rescued"]["able"]), FG))
	tally.add_child(_stat("Died this turn", str(lost), COST if lost > 0 else FG))
	tally.add_child(_stat("Community yield", "+%d food, +%d volunteers" % [r["yields"]["community"].get("food", 0), r["yields"]["community"].get("volunteers", 0)], FG))
	tally.add_child(_stat("Meridian yield", "+%d doses" % r["yields"]["meridian"].get("doses", 0), FG))
	v.add_child(tally)
	for e in r["events"]:
		var col := FG
		if e["kind"] == "good": col = HONOUR
		elif e["kind"] == "loss" or e["kind"] == "bad": col = COST
		elif e["kind"] == "storm" or e["kind"] == "choice": col = STORM
		v.add_child(_lbl("• " + String(e["text"]).replace("people lost", "people died"), 16, col))
	var nb := _button("Start turn %d" % (r["turn"] + 1), begin_turn, true)
	nb.custom_minimum_size = Vector2(260, 52)
	v.add_child(nb)
	return p


func _resident_line(st: Dictionary) -> String:
	match st["status"]:
		"moved": return "moved to %s" % C["destinations"][st["where"]]["name"]
		"home": return "rode out the storm at home"
		"at work": return "stayed at the plant through the storm"
		"injured": return "injured when the plant flooded"
	return "did not survive the night"


# ---------- debrief ----------
func _replay_check() -> Dictionary:
	# Round-trip the run log through JSON, as if loaded from the saved file, then replay it.
	var parsed = JSON.parse_string(JSON.stringify(run_log))
	if typeof(parsed) != TYPE_DICTIONARY:
		return {"match": false, "replay": "unavailable", "live": Eng.state_hash(state)}
	var rep := Eng.replay(C, Eng.normalize(parsed))
	var live := Eng.state_hash(state)
	return {"match": rep["hash"] == live, "replay": rep["hash"], "live": live}


func _save_run() -> void:
	DirAccess.make_dir_recursive_absolute("user://runs")
	if saved_path == "":
		var stamp := Time.get_datetime_string_from_system().replace(":", "-")
		saved_path = "user://runs/keystone-seed%d-%s.json" % [run_log["setup"]["seed"], stamp]
	var f := FileAccess.open(saved_path, FileAccess.WRITE)
	if f:
		f.store_string(JSON.stringify(run_log, " "))
		f.close()
	else:
		saved_path = ""


func _orders_line(t: String, input: Dictionary) -> String:
	var bits := PackedStringArray()
	for uid in C["units"]:
		var u: Dictionary = C["units"][uid]
		var lent: bool = input["lends"].get(uid, false)
		if (u["team"] == t) == lent:
			continue  # this unit was run by the other team this turn
		var o: Dictionary = input["orders"].get(uid, {"task": "idle"})
		var where: String = C["sites"][o["site"]]["name"] if o.has("site") and C["sites"].has(o["site"]) else ""
		match o.get("task", "idle"):
			"evac": bits.append("%s took people from %s to %s" % [u["name"], where, C["destinations"][o.get("dest", "st_brendans")]["name"]])
			"sandbag": bits.append("%s sandbagged %s" % [u["name"], where])
			"power": bits.append("%s powered %s" % [u["name"], where])
			"run": bits.append("the plant crew ran the plant")
			_: bits.append("%s held" % u["name"])
	return "; ".join(bits) + "."


func debrief_view() -> Control:
	var s := state
	var sd: Dictionary = Eng.standings(C, s)
	var winner := ""
	if sd["community"]["index"] != sd["meridian"]["index"]:
		winner = "community" if sd["community"]["index"] > sd["meridian"]["index"] else "meridian"
	var rc := _replay_check()
	var died: int = s["lost"]["vuln"] + s["lost"]["able"]
	var sc := _scroll("debrief")
	var col := _vbox(14)
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.add_child(col)
	var top := _hbox(16)
	top.add_child(_lbl("KEYSTONE · AFTER THE STORM", 30, FG, false))
	top.add_child(_lbl("DEBRIEF · AFTER TWO RECOVERY TURNS", 16, STORM, false))
	col.add_child(top)

	var p1 := _panel(PANEL, LINE)
	var v1 := _vbox(8)
	p1.add_child(v1)
	var headline := "A dead heat on the standings"
	if winner != "":
		headline = "%s finished ahead with %d%% of its starting resources" % [C["teams"][winner]["name"], sd[winner]["index"]]
	v1.add_child(_lbl("%s. %d people of Keystone died." % [headline, died], 28, FG))
	v1.add_child(_lbl("The standings are the win condition you were given. The rest of this page is not a score.", 15, MUTED))
	var max_i := maxf(maxf(sd["community"]["index"], sd["meridian"]["index"]), 120.0)
	for t in TEAMS:
		var row := _hbox(10)
		var l := _lbl(short(t).to_upper(), 15, team_col(t), false)
		l.custom_minimum_size = Vector2(110, 0)
		row.add_child(l)
		var bar := ProgressBar.new()
		bar.max_value = max_i
		bar.value = sd[t]["index"]
		bar.show_percentage = false
		bar.custom_minimum_size = Vector2(0, 18)
		bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		bar.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		bar.add_theme_stylebox_override("fill", _box(team_col(t), Color(0, 0, 0, 0), 0, 3, 0))
		bar.add_theme_stylebox_override("background", _box(SUNK, LINE, 1, 3, 0))
		row.add_child(bar)
		row.add_child(_lbl("%d%%" % sd[t]["index"], 20, FG, false))
		v1.add_child(row)
	var R: Dictionary = s["recovery"]
	var food: int = R["community"]["food"]
	v1.add_child(_lbl("Recovery: survivors went back to work and aid followed trust, so the community gained %d volunteers and %s food%s. The plant restarted, scaled by board confidence and community trust, so Meridian gained %d doses and %d funds." % [
		R["community"]["volunteers"], ("%+d" % food), " (care and funerals for the dead cost food)" if food < 0 else "", R["meridian"]["doses"], R["meridian"]["funds"]], 15, MUTED))
	col.add_child(p1)

	var p2 := _panel(PANEL, LINE)
	var v2 := _vbox(8)
	p2.add_child(v2)
	v2.add_child(_lbl("THE PEOPLE OF KEYSTONE", 13, MUTED))
	var tally := _hbox(10)
	tally.add_child(_stat("Moved to safety", str(s["rescued"]["vuln"] + s["rescued"]["able"]), FG))
	tally.add_child(_stat("Died", str(died), COST if died > 0 else FG))
	tally.add_child(_stat("Of them, vulnerable", str(s["lost"]["vuln"]), FG))
	tally.add_child(_stat("Community trust", str(s["meters"]["trust"]), FG))
	tally.add_child(_stat("Board confidence", str(s["meters"]["confidence"]), FG))
	v2.add_child(tally)
	var res := _hbox(10)
	for r in C["residents"]:
		var st: Dictionary = s["residents"][r["id"]]
		var rp := _panel(SUNK, LINE)
		rp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var rv := _vbox(4)
		rv.add_child(_lbl("%s, %d" % [r["name"], r["age"]], 17, FG))
		rv.add_child(_lbl(r["line"], 14, MUTED))
		rv.add_child(_lbl(_resident_line(st).substr(0, 1).to_upper() + _resident_line(st).substr(1), 15, COST if st["status"] in ["lost", "injured"] else HONOUR))
		rp.add_child(rv)
		res.add_child(rp)
	v2.add_child(res)
	col.add_child(p2)

	var p3 := _panel(PANEL, LINE)
	var v3 := _vbox(10)
	p3.add_child(v3)
	v3.add_child(_lbl("WHAT YOU SAID, AND WHAT YOU DID", 13, MUTED))
	for t in TEAMS:
		var st: Dictionary = setup["stances"][t]
		var vals := PackedStringArray()
		for i in 3:
			vals.append("#%d %s" % [i + 1, vn(st["ranks"][i])])
		v3.add_child(_lbl("%s signed %s: \"%s\"" % [C["teams"][t]["name"], ", ".join(vals), st["statement"]], 16, team_col(t)))
	for h in s["history"]:
		if h["choice"] == null:
			continue
		var ch: Dictionary = h["choice"]
		var o: Dictionary = h["dilemma"]["orders"][ch["index"]]
		var cp := _panel(SUNK, LINE)
		var cv := _vbox(4)
		cv.add_child(_lbl("TURN %d · %s · %s" % [h["turn"], String(h["dilemma"]["title"]).to_upper(), "WRITTEN BY CLAUDE" if h["dilemma"].get("source") == "ai" else "PREPARED MOMENT"], 12, MUTED))
		var how := "%s decided" % short(ch["by"])
		if ch.has("refused"):
			how = "%s asked for \"%s\", the other team did not agree, and the standing plan ran" % [short(ch["by"]), h["dilemma"]["orders"][ch["refused"]]["label"]]
		elif ch["stormDecided"]:
			how = "No one decided; the standing plan ran"
		cv.add_child(_lbl("%s: %s" % [how, o["label"]], 18, FG))
		for t in TEAMS:
			var line := ""
			var hn := PackedStringArray()
			for x in o["tags"][t]["honours"]:
				hn.append("#%d %s" % [rank_of(t, x), vn(x)])
			var cs := PackedStringArray()
			for x in o["tags"][t]["costs"]:
				cs.append("#%d %s" % [rank_of(t, x), vn(x)])
			if hn.size(): line += "It honoured %s. " % " and ".join(hn)
			if cs.size(): line += "It cost %s. " % " and ".join(cs)
			if hn.is_empty() and cs.is_empty(): line += "It touched none of the values you signed. "
			var vt = ch["votes"][t]
			if vt == null: line += "You did not vote."
			elif vt == ch["index"]: line += "You voted for it."
			else: line += "You voted for \"%s\"." % h["dilemma"]["orders"][vt]["label"]
			var row := _hbox(8)
			var l := _lbl(short(t).to_upper(), 12, team_col(t), false)
			l.custom_minimum_size = Vector2(110, 0)
			row.add_child(l)
			row.add_child(_lbl(line, 15, FG))
			cv.add_child(row)
		var input: Dictionary = run_log["turns"][h["turn"] - 1]
		for t in TEAMS:
			cv.add_child(_lbl("%s units: %s" % [short(t), _orders_line(t, input)], 14, MUTED))
		cp.add_child(cv)
		v3.add_child(cp)
	if s["promises"].size():
		v3.add_child(_lbl("PROMISES", 13, STORM))
		for p in s["promises"]:
			v3.add_child(_lbl("%s: %s" % [p["text"], p["status"]], 15, FG))
	col.add_child(p3)

	var p5 := _panel(PANEL, STORM, 2)
	var v5 := _vbox(10)
	p5.add_child(v5)
	v5.add_child(_lbl("BEFORE YOU LEAVE THE TABLE", 13, STORM))
	for q in REFLECT:
		v5.add_child(_lbl("• " + q, 17, FG))
	v5.add_child(_lbl("One thing I will do differently on Monday:", 15, MUTED))
	var te := TextEdit.new()
	te.text = run_log.get("commitment", "")
	te.wrap_mode = TextEdit.LINE_WRAPPING_BOUNDARY
	te.custom_minimum_size = Vector2(0, 70)
	v5.add_child(te)
	var saved_lbl := _lbl("", 14, HONOUR, false)
	var on_save := func():
		run_log["commitment"] = te.text.strip_edges().left(600)
		_save_run()
		saved_lbl.text = "Saved with the run log." if saved_path != "" else "Could not save."
	var srow := _hbox(10)
	srow.add_child(_button("Save my note", on_save))
	srow.add_child(saved_lbl)
	v5.add_child(srow)
	col.add_child(p5)

	var p4 := _panel(PANEL, LINE)
	var v4 := _vbox(10)
	p4.add_child(v4)
	v4.add_child(_lbl("FOR THE GO/NO-GO", 13, MUTED))
	var ai := 0
	for a in run_log["ai"]:
		if a["source"] == "ai":
			ai += 1
	var times := PackedStringArray()
	for a in ai_stats:
		if a["ok"]:
			times.append("%d s" % roundi(a["ms"] / 1000.0))
	var why := PackedStringArray()
	for a in run_log["ai"]:
		if a["source"] != "ai" and a["notes"].size():
			why.append("turn %d: %s" % [a["turn"], a["notes"][0]])
	if ai == 0:
		v4.add_child(_lbl("All %d moments were prepared moments, not written by Claude." % run_log["ai"].size(), 16, FG))
	else:
		v4.add_child(_lbl("%d of %d moments were written by Claude, in %s." % [ai, run_log["ai"].size(), ", ".join(times)], 16, FG))
	if why.size():
		v4.add_child(_lbl("Why: " + "; ".join(why) + ".", 14, MUTED))
	v4.add_child(_lbl("Replay from the saved run log: %s  %s%s" % ["matches" if rc["match"] else "DOES NOT MATCH", rc["replay"], "" if rc["match"] else " vs " + rc["live"]], 16, HONOUR if rc["match"] else COST))
	v4.add_child(_lbl("Run log saved to %s" % ProjectSettings.globalize_path(saved_path) if saved_path != "" else "The run log could not be saved.", 14, MUTED))
	var row := _hbox(10)
	var copied := _lbl("", 14, HONOUR, false)
	var on_copy := func():
		DisplayServer.clipboard_set(JSON.stringify(run_log))
		copied.text = "Copied."
	var on_open := func():
		OS.shell_open(ProjectSettings.globalize_path("user://runs"))
	row.add_child(_button("Copy run log", on_copy))
	row.add_child(_button("Open runs folder", on_open))
	row.add_child(copied)
	v4.add_child(row)
	var row2 := _hbox(10)
	var on_again := func():
		setup["seed"] = (int(setup["seed"]) * 31 + 7) % 99991
		start_game()
	var on_values := func():
		screen = "setup"
		render()
	row2.add_child(_button("Play again with a new storm", on_again, true))
	row2.add_child(_button("Change the values", on_values))
	v4.add_child(row2)
	col.add_child(p4)
	return sc


# ---------- small UI kit ----------
func _box(bg: Color, border: Color, w := 1, r := 6, pad := 10) -> StyleBoxFlat:
	var b := StyleBoxFlat.new()
	b.bg_color = bg
	b.border_color = border
	b.set_border_width_all(w)
	b.set_corner_radius_all(r)
	b.set_content_margin_all(pad)
	return b


func _make_theme() -> Theme:
	var th := Theme.new()
	th.default_font_size = 17
	for type in ["Button", "OptionButton"]:
		th.set_stylebox("normal", type, _box(SUNK, LINE, 1, 6, 8))
		th.set_stylebox("hover", type, _box(PANEL, STORM, 1, 6, 8))
		th.set_stylebox("pressed", type, _box(STORM_SOFT, STORM, 2, 6, 8))
		th.set_stylebox("disabled", type, _box(SUNK, SUNK, 1, 6, 8))
		th.set_stylebox("focus", type, _box(Color(0, 0, 0, 0), STORM, 1, 6, 8))
		th.set_color("font_color", type, FG)
		th.set_color("font_hover_color", type, FG)
		th.set_color("font_pressed_color", type, FG)
		th.set_color("font_focus_color", type, FG)
		th.set_color("font_disabled_color", type, MUTED)
	for type in ["LineEdit", "TextEdit"]:
		th.set_stylebox("normal", type, _box(SUNK, LINE, 1, 6, 8))
		th.set_stylebox("focus", type, _box(SUNK, STORM, 1, 6, 8))
		th.set_color("font_color", type, FG)
	th.set_stylebox("panel", "PanelContainer", _box(PANEL, LINE))
	th.set_stylebox("panel", "PopupMenu", _box(PANEL, LINE, 1, 6, 6))
	th.set_color("font_color", "PopupMenu", FG)
	th.set_color("font_color", "Label", FG)
	th.set_color("font_color", "CheckBox", FG)
	th.set_color("font_hover_color", "CheckBox", FG)
	th.set_color("font_pressed_color", "CheckBox", FG)
	th.set_constant("h_separation", "HFlowContainer", 6)
	th.set_constant("v_separation", "HFlowContainer", 6)
	return th


func _lbl(text: String, px := 17, color := FG, wrap := true) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", px)
	l.add_theme_color_override("font_color", color)
	if wrap:
		l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	return l


func _button(text: String, cb: Callable, primary := false) -> Button:
	var b := Button.new()
	b.text = text
	b.pressed.connect(cb)
	if primary:
		b.add_theme_stylebox_override("normal", _box(STORM, STORM, 1, 6, 10))
		b.add_theme_stylebox_override("hover", _box(STORM.lightened(0.15), STORM, 1, 6, 10))
		b.add_theme_color_override("font_color", BG)
		b.add_theme_color_override("font_hover_color", BG)
		b.add_theme_font_size_override("font_size", 19)
	return b


func _chip(text: String, bg: Color, fg: Color, px := 13) -> Control:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", _box(bg, fg, 1, 10, 4))
	p.add_child(_lbl(text, px, fg, false))
	return p


func _stat(label: String, value: String, color: Color) -> Control:
	var p := _panel(SUNK, LINE)
	p.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var v := _vbox(2)
	v.add_child(_lbl(label.to_upper(), 12, MUTED))
	v.add_child(_lbl(value, 20, color))
	p.add_child(v)
	return p


func _field(label: String, input: Control, expand := false) -> Control:
	var v := _vbox(4)
	v.add_child(_lbl(label.to_upper(), 13, MUTED, false))
	v.add_child(input)
	if expand:
		v.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return v


func _panel(bg: Color, border: Color, w := 1, pad := 10) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", _box(bg, border, w, 6, pad))
	return p


func _vbox(sep: int) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", sep)
	return v


func _hbox(sep: int) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", sep)
	return h


## A vertical list. Its key keeps its scroll position when the screen is rebuilt.
func _scroll(key := "") -> ScrollContainer:
	var sc := ScrollContainer.new()
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	sc.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	sc.size_flags_vertical = Control.SIZE_EXPAND_FILL
	if key != "":
		_scrolls[key] = sc
	return sc
