extends RefCounted
## Keystone slice rules. Pure and deterministic: no nodes, no clock, one seeded RNG per turn.
## A line-for-line port of crucible/slice/engine.js (the reference the balance ledger runs on).
## All numbers come from data/keystone_slice.json (C). AI text enters only as logged input.
## tests/run_tests.gd replays tests/golden.json (made by the JS engine) to prove both agree.

const TEAMS := ["community", "meridian"]
const EFFECT_SITES := ["low_ward", "tech_housing", "st_brendans", "plant"]
const MASK := 0xFFFFFFFF


# ---------- content loading ----------
## JSON numbers arrive as floats in Godot. Whole numbers become ints so counts print and compare cleanly.
static func normalize(v):
	match typeof(v):
		TYPE_FLOAT:
			return int(v) if v == floor(v) and absf(v) < 1e15 else v
		TYPE_DICTIONARY:
			var d := {}
			for k in v:
				d[k] = normalize(v[k])
			return d
		TYPE_ARRAY:
			var a := []
			for x in v:
				a.append(normalize(x))
			return a
	return v


static func load_content(path: String, values_path: String) -> Dictionary:
	var c: Dictionary = normalize(JSON.parse_string(FileAccess.get_file_as_string(path)))
	var deck: Array = JSON.parse_string(FileAccess.get_file_as_string(values_path))["VALUES_DECK"]
	var values := {}
	for v in deck:
		values[v["id"]] = [v["name"], v["quadrant"], v.get("definition", "")]
	c["values"] = values
	return c


# ---------- RNG: mulberry32, bit-for-bit the same as the JS engine ----------
class Rng:
	var a: int

	const M32 := 0xFFFFFFFF

	func _init(seed_value: int) -> void:
		a = seed_value & M32

	static func imul(x: int, y: int) -> int:
		# 32-bit multiply without int64 overflow: split into 16-bit halves.
		x &= M32
		y &= M32
		var lo := (x & 0xFFFF) * (y & 0xFFFF)
		var mid := (((x >> 16) & 0xFFFF) * (y & 0xFFFF) + (x & 0xFFFF) * ((y >> 16) & 0xFFFF)) & 0xFFFF
		return (lo + (mid << 16)) & M32

	func next() -> float:
		a = (a + 0x6D2B79F5) & M32
		var t := imul(a ^ (a >> 15), 1 | a)
		t = ((t + imul(t ^ (t >> 7), 61 | t)) & M32) ^ t
		return float((t ^ (t >> 14)) & M32) / 4294967296.0


static func rng_for(seed_value: int, turn: int) -> Rng:
	return Rng.new((seed_value * 7919 + turn * 104729) & MASK)


# ---------- stable hash for replay checks ----------
static func stable(v) -> String:
	match typeof(v):
		TYPE_DICTIONARY:
			var keys: Array = v.keys()
			keys.sort()
			var parts := PackedStringArray()
			for k in keys:
				parts.append(JSON.stringify(str(k)) + ":" + stable(v[k]))
			return "{" + ",".join(parts) + "}"
		TYPE_ARRAY:
			var parts := PackedStringArray()
			for x in v:
				parts.append(stable(x))
			return "[" + ",".join(parts) + "]"
	return JSON.stringify(v)


static func state_hash(v) -> String:
	var h := 0x811c9dc5
	for b in stable(v).to_utf8_buffer():
		h = Rng.imul(h ^ b, 0x01000193)
	return "%08x" % h


# ---------- new game ----------
static func new_game(C: Dictionary, seed_value: int) -> Dictionary:
	var sites := {}
	for id in C["sites"]:
		var s: Dictionary = C["sites"][id]
		var home: Dictionary = s["people"].duplicate(true) if s.has("people") else {"able": 0, "vuln": 0}
		sites[id] = {"flooded": false, "dark": false, "closed": false, "home": home}
	var residents := {}
	for r in C["residents"]:
		residents[r["id"]] = {"where": r["site"], "status": "at work" if r["group"] == "crew" else "home"}
	return {
		"seed": seed_value & MASK, "turn": 1, "over": false,
		"stock": C["start"]["stock"].duplicate(true), "meters": C["start"]["meters"].duplicate(true),
		"sites": sites,
		"shelter": {"st_brendans": {"vuln": 0, "able": 0}, "tech_tower": {"vuln": 0, "able": 0}, "heartland": {"vuln": 0, "able": 0}},
		"lost": {"vuln": 0, "able": 0}, "rescued": {"vuln": 0, "able": 0}, "injured": 0,
		"towerOpen": false, "residents": residents, "promises": [], "history": [],
	}


# ---------- scoring ----------
static func points(C: Dictionary, team: String, stock: Dictionary) -> int:
	var p := 0
	for g in stock[team]:
		p += int(stock[team][g]) * int(C["goods"][g]["points"])
	return p


static func standings(C: Dictionary, s: Dictionary) -> Dictionary:
	var out := {}
	for t in TEAMS:
		var now := points(C, t, s["stock"])
		var start := points(C, t, C["start"]["stock"])
		out[t] = {"points": now, "start": start, "index": int(round(float(now) / start * 100.0))}
	return out


# ---------- dilemmas ----------
static func team_goods(C: Dictionary, team: String) -> Array:
	var out := []
	for g in C["goods"]:
		if C["goods"][g]["owner"] == team:
			out.append(g)
	return out


## Same as JS int(): round half up, bounded, booleans and null are not numbers.
static func _int(v, d := 0) -> int:
	var f := 0.0
	if typeof(v) == TYPE_INT:
		f = float(v)
	elif typeof(v) == TYPE_FLOAT:
		if is_nan(v) or is_inf(v):
			return d
		f = v
	elif typeof(v) == TYPE_STRING and v.strip_edges() != "" and v.is_valid_float():
		f = v.to_float()
	else:
		return d
	return int(floor(clampf(f, -1e9, 1e9) + 0.5))


## Plain text only: no control characters, so both engines store and hash identical strings.
static func _str(v, n: int) -> String:
	var t := "" if v == null else str(v)
	var out := ""
	for i in t.length():
		var c := t.unicode_at(i)
		out += " " if c < 32 or c == 127 else t[i]
	return out.left(n)


## Words that judge. The engine is a witness: a moment that uses them is rejected.
const JUDGING := ["selfish", "greedy", "greed", "heroic", "hero", "noble", "coward", "villain", "evil", "shameful", "right answer", "wrong answer", "right thing", "obvious choice"]


static func _judges(text: String):
	var x := " " + text.to_lower() + " "
	for w in JUDGING:
		var at := x.find(w)
		while at >= 0:
			var before := x.unicode_at(at - 1)
			var after := x.unicode_at(at + w.length())
			if not _is_az(before) and not _is_az(after):
				return w
			at = x.find(w, at + 1)
	return null


static func _is_az(c: int) -> bool:
	return c >= 97 and c <= 122


## Turns any dilemma (AI or fallback) into the one checked shape the engine resolves.
## strict (AI moments): reject judging words, drop orders that cost no signed value or dominate.
static func validate_dilemma(C: Dictionary, s: Dictionary, raw, stances: Dictionary, strict := true) -> Dictionary:
	var notes := []
	if typeof(raw) != TYPE_DICTIONARY:
		return {"ok": false, "notes": ["no JSON object"]}
	var final_call = raw.get("final_call")
	if not final_call in TEAMS:
		return {"ok": false, "notes": ["final_call must be community or meridian"]}
	var signed := {"community": stances["community"]["ranks"], "meridian": stances["meridian"]["ranks"]}
	var orders := []
	var raw_orders = raw.get("orders", [])
	if typeof(raw_orders) != TYPE_ARRAY:
		raw_orders = []
	for o in raw_orders:
		if orders.size() == 3:
			break
		if typeof(o) != TYPE_DICTIONARY or not o.get("owner") in TEAMS:
			notes.append("order dropped: bad owner")
			continue
		var owner: String = o["owner"]
		var goods := team_goods(C, owner)
		var cost := {}
		var afford := true
		var raw_cost = o.get("cost", {})
		if typeof(raw_cost) != TYPE_DICTIONARY:
			raw_cost = {}
		for g in raw_cost:
			var k: String = g
			if g == "fuel":
				k = "c_fuel" if owner == "community" else "m_fuel"
			if not k in goods:
				notes.append('order "%s": %s is not %s\'s to spend' % [o.get("label", ""), g, owner])
				afford = false
				break
			var v := clampi(_int(raw_cost[g]), 0, 20)
			if v > int(s["stock"][owner][k]):
				afford = false
				notes.append('order "%s": not enough %s' % [o.get("label", ""), k])
				break
			if v:
				cost[k] = v
		if not afford:
			continue
		var e = o.get("effects", {})
		if typeof(e) != TYPE_DICTIONARY:
			e = {}
		var effects := {}
		if _int(e.get("trust")) != 0:
			effects["trust"] = clampi(_int(e["trust"]), -10, 10)
		if _int(e.get("confidence")) != 0:
			effects["confidence"] = clampi(_int(e["confidence"]), -10, 10)
		if _int(e.get("doses")) != 0:
			effects["doses"] = clampi(_int(e["doses"]), -10, 10)
		if typeof(e.get("save")) == TYPE_DICTIONARY and e["save"].get("site") in EFFECT_SITES and _int(e["save"].get("n")) > 0:
			effects["save"] = {"site": e["save"]["site"], "n": clampi(_int(e["save"].get("n")), 0, 60)}
		if _int(e.get("expose")) > 0:
			effects["expose"] = clampi(_int(e["expose"]), 0, 100)
		if e.get("power") in EFFECT_SITES:
			effects["power"] = e["power"]
		if e.get("sandbag") in EFFECT_SITES:
			effects["sandbag"] = e["sandbag"]
		if typeof(e.get("open_tower")) == TYPE_BOOL and e["open_tower"]:
			effects["open_tower"] = true
		if typeof(e.get("cold_store")) == TYPE_BOOL and e["cold_store"]:
			effects["cold_store"] = true
		var tags := {}
		var raw_tags = o.get("tags", {})
		if typeof(raw_tags) != TYPE_DICTIONARY:
			raw_tags = {}
		for t in TEAMS:
			var tt = raw_tags.get(t, {})
			if typeof(tt) != TYPE_DICTIONARY:
				tt = {}
			tags[t] = {"honours": _keep(tt.get("honours"), signed[t]), "costs": _keep(tt.get("costs"), signed[t])}
		var label := _str(o.get("label"), 70)
		var order := {"label": label if label != "" else "Order", "owner": owner, "cost": cost, "effects": effects, "tags": tags, "news": _str(o.get("news"), 140)}
		if strict and tags["community"]["costs"].is_empty() and tags["meridian"]["costs"].is_empty():
			notes.append('order "%s" dropped: it costs no signed value' % order["label"])
			continue
		var gains: bool = effects.has("save") or effects.has("power") or effects.has("sandbag") or effects.has("open_tower") or effects.has("cold_store") or effects.get("trust", 0) > 0 or effects.get("confidence", 0) > 0 or effects.get("doses", 0) > 0
		var loses: bool = effects.has("expose") or effects.get("trust", 0) < 0 or effects.get("confidence", 0) < 0 or effects.get("doses", 0) < 0
		if strict and cost.is_empty() and gains and not loses:
			notes.append('order "%s" dropped: it costs nothing and only helps' % order["label"])
			continue
		orders.append(order)
	if orders.size() < 2:
		notes.append("fewer than 2 valid orders")
		return {"ok": false, "notes": notes}
	var any_cost := false
	for o in orders:
		for t in TEAMS:
			if o["tags"][t]["costs"].size():
				any_cost = true
	if not any_cost:
		notes.append("no order costs a signed value")
	var collision := []
	var raw_col = raw.get("collision", [])
	if typeof(raw_col) == TYPE_ARRAY:
		for v in raw_col:
			var id := str(v).to_lower()
			if (id in signed["community"] or id in signed["meridian"]) and not id in collision and collision.size() < 2:
				collision.append(id)
	# The standing plan (what happens with no decision) must be the deciding team's own order.
	var def := _int(raw.get("default"), 0)
	if def < 0 or def >= orders.size() or orders[def]["owner"] != final_call:
		def = -1
		for i in orders.size():
			if orders[i]["owner"] == final_call:
				def = i
				break
	if def < 0:
		notes.append("no order belongs to the %s team, which makes the call" % final_call)
		return {"ok": false, "notes": notes}
	var voice = null
	var rv = raw.get("voice")
	if typeof(rv) == TYPE_DICTIONARY and rv.get("who") != null and str(rv.get("who")) != "":
		voice = {"who": _str(rv["who"], 80), "line": _str(rv.get("line"), 220)}
		var who: String = voice["who"].to_lower()
		if who.find("community team") >= 0 or who.find("meridian team") >= 0:
			notes.append("voice dropped: pressure comes from off-board voices, never a team")
			voice = null
	var d := {
		"turn": s["turn"], "final_call": final_call, "collision": collision, "default": def,
		"site": raw.get("site") if raw.get("site") in EFFECT_SITES else null,
		"title": _str(raw.get("title"), 80), "situation": _str(raw.get("situation"), 420),
		"resident": _str(raw.get("resident"), 120), "voice": voice, "orders": orders,
	}
	if strict:
		var parts := PackedStringArray([d["title"], d["situation"], d["resident"], voice["who"] + " " + voice["line"] if voice != null else ""])
		for o in orders:
			parts.append(o["label"] + " " + o["news"])
		var w = _judges(" ".join(parts))
		if w != null:
			notes.append('judging word "%s": the engine is a witness' % w)
			return {"ok": false, "notes": notes}
	return {"ok": true, "notes": notes, "dilemma": d}


static func _keep(a, signed: Array) -> Array:
	var out := []
	if typeof(a) == TYPE_ARRAY:
		for v in a:
			var id := str(v).to_lower()
			if id in signed:
				out.append(id)
	return out


## Board facts a written moment may quote, so its text never contradicts the map.
static func board_facts(C: Dictionary, s: Dictionary) -> Dictionary:
	var sb: Dictionary = s["shelter"]["st_brendans"]
	return {"sheltered": sb["vuln"] + sb["able"], "sheltered_vuln": sb["vuln"],
		"low_ward_vuln": s["sites"]["low_ward"]["home"]["vuln"], "tech_housing_vuln": s["sites"]["tech_housing"]["home"]["vuln"]}


static func _applies(C: Dictionary, s: Dictionary, f: Dictionary) -> bool:
	var w: Dictionary = f.get("when", {})
	var b := board_facts(C, s)
	for k in w.get("min", {}):
		if not (b.has(k) and b[k] >= w["min"][k]):
			return false
	for k in w.get("max", {}):
		if not (b.has(k) and b[k] <= w["max"][k]):
			return false
	return true


static func _fill(t, b: Dictionary) -> String:
	var out := "" if t == null else str(t)
	for k in b:
		out = out.replace("{" + k + "}", str(b[k]))
	return out


## Written moment: the first variant for this turn whose board conditions hold. Each order's value tags are
## authored per value and per team (what honouring or paying "loyalty" means differs for each side).
static func fallback_dilemma(C: Dictionary, s: Dictionary, stances: Dictionary) -> Dictionary:
	var for_turn := []
	for x in C["fallbacks"]:
		if x["turn"] == s["turn"]:
			for_turn.append(x)
	var f: Dictionary = C["fallbacks"][-1]
	if for_turn.size():
		f = for_turn[-1]
		for x in for_turn:
			if _applies(C, s, x):
				f = x
				break
	var b := board_facts(C, s)
	var raw: Dictionary = f.duplicate(true)
	for k in ["title", "situation", "resident"]:
		raw[k] = _fill(raw.get(k), b)
	if typeof(raw.get("voice")) == TYPE_DICTIONARY:
		raw["voice"]["line"] = _fill(raw["voice"].get("line"), b)
	var orders := []
	for o in f["orders"]:
		var oo: Dictionary = o.duplicate(true)
		var tags := {}
		for t in TEAMS:
			var vt: Dictionary = o.get("values", {}).get(t, {})
			var hs: Array = vt.get("honours", [])
			var cs: Array = vt.get("costs", [])
			var honours := []
			var costs := []
			for v in stances[t]["ranks"]:
				if v in hs:
					honours.append(v)
				elif v in cs:
					costs.append(v)
			tags[t] = {"honours": honours, "costs": costs}
		oo["tags"] = tags
		oo["label"] = _fill(o.get("label"), b)
		oo["news"] = _fill(o.get("news"), b)
		orders.append(oo)
	raw["orders"] = orders
	raw["collision"] = [stances["community"]["ranks"][0], stances["meridian"]["ranks"][0]]
	var v := validate_dilemma(C, s, raw, stances, false)
	if v["ok"]:
		return v
	return validate_dilemma(C, s, _hold_moment(), stances, false)  # never leave a turn without a moment


## Last resort if a written moment cannot be paid for: hold or act, both free.
static func _hold_moment() -> Dictionary:
	return {"final_call": "meridian", "site": null, "title": "Hold the line",
		"situation": "Keystone's crews are stretched thin. Meridian can keep its standing plan or release the plant crew early to help their families.",
		"resident": "", "voice": null, "default": 0,
		"orders": [{"label": "Keep the standing plan", "owner": "meridian", "cost": {}, "effects": {"confidence": 2, "trust": -2}},
			{"label": "Release the crew to their families", "owner": "meridian", "cost": {}, "effects": {"confidence": -3, "trust": 3}}]}


# ---------- turn resolution ----------
## input: { orders: {unit: {task, site, dest}}, lends: {unit: true}, towerOpen: bool,
##          dilemma, votes: {community, meridian}, promises: [...], confirms: [index] }
## A rescue unit "could have helped" if a site it can reach still has people at home.
static func _could_help(C: Dictionary, s: Dictionary, U: Dictionary) -> bool:
	for id in C["sites"]:
		if not C["sites"][id].has("people"):
			continue
		var x: Dictionary = s["sites"][id]
		if x["home"]["vuln"] + x["home"]["able"] <= 0:
			continue
		if U.get("road", false):
			if not x["flooded"]:
				return true
		elif id in U.get("reach", []):
			return true
	return false


static func resolve_turn(C: Dictionary, state0: Dictionary, input: Dictionary) -> Dictionary:
	assert(not state0["over"], "game over")
	var s: Dictionary = state0.duplicate(true)
	var T: Dictionary = C["turns"][s["turn"] - 1]
	var I: int = T["intensity"]
	var rng := rng_for(s["seed"], s["turn"])
	var ev := []
	var ticker := []
	var turn_lost := {"vuln": 0, "able": 0}
	var turn_rescued := {"vuln": 0, "able": 0}
	var credit := {"community": 0, "meridian": 0}
	var powered := {}
	var sandbagged := {}
	var active := {}
	var gen_taken := false
	var cold_store := false
	var orders: Dictionary = input.get("orders", {})
	var lends: Dictionary = input.get("lends", {})
	var M: Dictionary = C["meters"]

	# 1. promises made or confirmed this turn
	for p in input.get("promises", []):
		var np: Dictionary = p.duplicate(true)
		np.merge({"made": s["turn"], "due": s["turn"] + 1, "confirmed": false, "status": "open"}, true)
		s["promises"].append(np)
	for i in input.get("confirms", []):
		if typeof(i) == TYPE_INT and i >= 0 and i < s["promises"].size():
			s["promises"][i]["confirmed"] = true

	# 2. Tech Tower
	if input.get("towerOpen", false) and not s["towerOpen"]:
		if _pay(s, "meridian", C["tower_open_cost"]):
			s["towerOpen"] = true
			_say(ev, "Meridian opens Tech Tower to residents (shelters 60).")

	# 3. dilemma choice: the owner of the call decides; no vote means the storm decided
	var choice = null
	var D = input.get("dilemma")
	if D:
		var v: Dictionary = input.get("votes", {})
		var fc: String = D["final_call"]
		var n_orders: int = D["orders"].size()
		var idx = _vote(v.get(fc), n_orders)
		var index: int = idx if idx != null else int(D["default"])
		choice = {"index": index, "stormDecided": idx == null, "by": fc, "votes": {"community": _vote(v.get("community"), n_orders), "meridian": _vote(v.get("meridian"), n_orders)}}
		# An order the other team pays for runs only if that team voted for it too.
		var asked: Dictionary = D["orders"][index]
		if asked["owner"] != fc and _vote(v.get(asked["owner"]), n_orders) != index:
			choice["refused"] = index
			index = int(D["default"])
			choice["index"] = index
			_say(ev, '%s did not agree to "%s", so the standing plan ran.' % [C["teams"][asked["owner"]]["short"], asked["label"]], "bad")
		var o: Dictionary = D["orders"][index]
		if _pay(s, o["owner"], o["cost"]):
			var e: Dictionary = o["effects"]
			if e.get("open_tower", false):
				s["towerOpen"] = true
			if e.get("cold_store", false):
				cold_store = true
			if e.has("power"):
				powered[e["power"]] = true
				if o["owner"] == "meridian":
					gen_taken = true  # the moment's power is the generator
			if e.has("sandbag"):
				sandbagged[e["sandbag"]] = true
			s["meters"]["trust"] += int(e.get("trust", 0))
			s["meters"]["confidence"] += int(e.get("confidence", 0))
			if e.get("doses", 0):
				s["stock"]["meridian"]["doses"] = maxi(0, s["stock"]["meridian"]["doses"] + int(e["doses"]))
			if e.has("save"):
				# to Heartland while Crater Road is open, otherwise up the hill to St. Brendan's
				var sv_site: String = e["save"]["site"]
				var sv_dest := "st_brendans" if s["sites"]["crater_road"]["closed"] else "heartland"
				if not (sv_dest == "st_brendans" and sv_site == "st_brendans"):
					var sv_n := _move(s, sv_site, sv_dest, int(e["save"]["n"]), turn_rescued, true)
					credit[o["owner"]] += sv_n
					_board(C, s, sv_site, sv_dest, ev)
					if sv_n:
						_say(ev, "%d vulnerable people were taken from %s to %s." % [sv_n, C["sites"][sv_site]["name"], C["destinations"][sv_dest]["name"]], "good")
					else:
						_say(ev, "Nobody was left at %s to take to safety." % C["sites"][sv_site]["name"], "info")
			if e.get("expose", 0) > 0:
				choice["expose"] = int(e["expose"])
			if o["news"] != "":
				ticker.append(o["news"])
		else:
			choice["unpaid"] = true
			_say(ev, '"%s" could not be paid for, so nothing happened.' % o["label"], "bad")
		if choice["stormDecided"]:
			_say(ev, 'No decision from the %s team. The storm decided: "%s".' % [C["teams"][fc]["short"], o["label"]], "choice")
		else:
			_say(ev, '%s made the call: "%s".' % [C["teams"][fc]["short"], o["label"]], "choice")

	# 4. unit orders, in fixed unit order
	for uid in C["units"]:
		var U: Dictionary = C["units"][uid]
		var o = orders.get(uid)
		if o == null or o.get("task") == "idle":
			continue
		var op: String = _other(U["team"]) if lends.get(uid, false) else U["team"]  # operator, who gets the credit for a rescue
		var fuel_key := "c_fuel" if U["team"] == "community" else "m_fuel"  # running costs stay with the owner
		var site_id: String = str(o.get("site", ""))
		var site = s["sites"].get(site_id)
		var task: String = o.get("task", "")
		if task == "evac":
			if site == null:
				continue
			if U.get("road", false) and site["flooded"]:
				_say(ev, "%s could not reach %s: the streets are under water." % [U["name"], C["sites"][site_id]["name"]], "bad")
				continue
			if not U.get("road", false) and not site_id in U.get("reach", []):
				continue
			var dest: String = o.get("dest", "st_brendans")
			if dest == "heartland":
				if s["sites"]["crater_road"]["closed"]:
					_say(ev, "%s turned back: Crater Road is closed." % U["name"], "bad")
					continue
				if not U.get("road", false):
					continue
				if not _pay(s, U["team"], {fuel_key: C["destinations"]["heartland"]["fuel"]}):
					_say(ev, "%s had no fuel for the Heartland run." % U["name"], "bad")
					continue
			if dest == "tech_tower" and not s["towerOpen"]:
				_say(ev, "%s found Tech Tower locked." % U["name"], "bad")
				continue
			var room: int = U["carry"]
			if dest == "tech_tower":
				var tt: Dictionary = s["shelter"]["tech_tower"]
				room = mini(room, int(C["destinations"]["tech_tower"]["capacity"]) - tt["vuln"] - tt["able"])
			var before: int = turn_rescued["vuln"]
			var n := _move(s, site_id, dest, room, turn_rescued, false)
			credit[op] += turn_rescued["vuln"] - before
			_board(C, s, site_id, dest, ev)
			if n:
				active[uid] = true
				_say(ev, "%s moved %d people from %s to %s." % [U["name"], n, C["sites"][site_id]["name"], C["destinations"][dest]["name"]], "good")
			else:
				_say(ev, "%s went to %s but nobody was left to move." % [U["name"], C["sites"][site_id]["name"]])
		elif task == "sandbag":
			if site == null or site["flooded"]:
				continue
			if _pay(s, U["team"], U["sandbag_cost"]):
				sandbagged[site_id] = true
				_say(ev, "%s sandbagged %s." % [U["name"], C["sites"][site_id]["name"]])
		elif task == "power":
			if site == null:
				continue
			if gen_taken:
				_say(ev, "%s went where the moment sent it, not to %s." % [U["name"], C["sites"][site_id]["name"]])
				continue
			if _pay(s, U["team"], {fuel_key: U["power_cost_fuel"]}):
				powered[site_id] = true
				_say(ev, "%s is powering %s." % [U["name"], C["sites"][site_id]["name"]])
			else:
				_say(ev, "%s had no fuel." % U["name"], "bad")

	# 5. the storm
	for h in T["hazards"]:
		var site: Dictionary = s["sites"][h["site"]]
		var eff: String = h["effect"]
		if site[eff]:
			continue
		var p: float = h["p"]
		if eff == "flooded" and sandbagged.has(h["site"]) and h.has("sandbag_p"):
			p = h["sandbag_p"]
		if rng.next() < p:
			site[eff] = true
			_say(ev, h["text"] + ".", "storm")
			ticker.append(h["text"] + ".")
		elif eff == "flooded" and sandbagged.has(h["site"]):
			_say(ev, "Sandbags held at %s." % C["sites"][h["site"]]["name"], "good")

	# 6. losses
	var L: Dictionary = C["loss"]
	for id in EFFECT_SITES:
		var site: Dictionary = s["sites"][id]
		var home: Dictionary = site["home"]
		if not home["vuln"] and not home["able"]:
			continue
		var lv := 0
		var la := 0
		if site["flooded"]:
			lv = int(round(home["vuln"] * L["flooded"]["vuln"] * I))
			la = int(round(home["able"] * L["flooded"]["able"] * I))
		elif site["dark"] and not powered.has(id):
			lv = int(round(home["vuln"] * L["dark"]["vuln"] * I))
		if lv or la:
			_resident_risk(C, s, rng, id, float(lv) / maxi(1, home["vuln"]), ev)
			home["vuln"] -= lv
			home["able"] -= la
			turn_lost["vuln"] += lv
			turn_lost["able"] += la
			_say(ev, "%s: %d people lost%s." % [C["sites"][id]["name"], lv + la, " in the flood" if site["flooded"] else " without power"], "loss")
	var sb: Dictionary = s["shelter"]["st_brendans"]
	var cap: int = C["sites"]["st_brendans"]["capacity"]
	if s["sites"]["st_brendans"]["dark"] and not powered.has("st_brendans") and sb["vuln"]:
		var lv := int(round(sb["vuln"] * L["shelter_dark"] * I))
		if lv:
			sb["vuln"] -= lv
			turn_lost["vuln"] += lv
			_say(ev, "St. Brendan's in the dark: %d people on oxygen or monitors lost." % lv, "loss")
			_resident_risk(C, s, rng, "st_brendans", float(lv) / maxi(1, sb["vuln"] + lv), ev)
	var over: int = sb["vuln"] + sb["able"] - cap
	if over > 0:
		var lv := mini(sb["vuln"], int(round(over * L["overflow"] * I)))
		sb["vuln"] -= lv
		turn_lost["vuln"] += lv
		s["meters"]["trust"] += M["overflow"]
		_say(ev, "St. Brendan's is %d over capacity. People sleep in the aisles%s." % [over, "; %d lost" % lv if lv else ""], "bad")
	if choice != null and choice.get("expose", 0) > 0:
		var la := int(round(choice["expose"] * L["exposed"] * I))
		if la:
			var th: Dictionary = s["sites"]["tech_housing"]["home"]
			th["able"] = maxi(0, th["able"] - la)
			turn_lost["able"] += la
			_say(ev, "%d plant workers kept in harm's way were lost." % la, "loss")

	# 7. yields
	var Y: Dictionary = C["yields"]
	var cy := {"food": 0, "volunteers": 0}
	if not s["sites"]["low_ward"]["flooded"]:
		cy["food"] += Y["low_ward"]["food"]
		cy["volunteers"] += floori(float(s["sites"]["low_ward"]["home"]["able"]) / Y["low_ward"]["able_per_volunteer"])
	if not s["sites"]["tech_housing"]["flooded"]:
		cy["volunteers"] += Y["tech_housing"]["volunteers"]
	var sh: Dictionary = s["shelter"]
	cy["volunteers"] += floori(float(sh["st_brendans"]["able"] + sh["tech_tower"]["able"] + sh["heartland"]["able"]) / Y["sheltered_able_per_volunteer"])
	if s["meters"]["trust"] < M["low"]:
		cy["food"] = floori(cy["food"] / 2.0)
		cy["volunteers"] = floori(cy["volunteers"] / 2.0)
		_say(ev, "Community trust is low: half the volunteers stayed home.", "bad")
	s["stock"]["community"]["food"] += cy["food"]
	s["stock"]["community"]["volunteers"] += cy["volunteers"]

	var pc: Dictionary = orders.get("pcrew", {"task": "run"})
	var plant: Dictionary = s["sites"]["plant"]
	var plant_powered: bool = not plant["dark"] or powered.has("plant")
	var ran: bool = (pc.get("task") == "run" or not orders.has("pcrew")) and not lends.get("pcrew", false) and not plant["flooded"] and plant_powered
	var my := {"doses": 0, "funds": 0}
	var families_at_risk := false
	for id in EFFECT_SITES:
		if s["sites"][id]["flooded"] and s["sites"][id]["home"]["vuln"] > 0:
			families_at_risk = true
	if ran:
		my["doses"] = Y["plant"]["doses"]
		my["funds"] = Y["plant"]["funds"]
		if families_at_risk:
			my["doses"] = floori(my["doses"] / 2.0)
			my["funds"] = floori(my["funds"] / 2.0)
			_say(ev, "Half the shift left the line to find family still stuck in the flood.", "bad")
		s["meters"]["confidence"] += M["plant_ran"]
		_say(ev, "The plant ran: +%d cure doses." % my["doses"], "good")
	else:
		s["meters"]["confidence"] += M["plant_idle"]
		_say(ev, "The plant made nothing this turn%s." % (" (flooded)" if plant["flooded"] else (" (no power)" if not plant_powered else "")), "bad")
	if plant["flooded"] and pc.get("task") == "run" and s["residents"]["frank"]["status"] == "at work":
		s["residents"]["frank"]["status"] = "injured"
		s["injured"] += 1
		_say(ev, "Frank Reeves was hurt when the plant flooded.", "loss")
	if not plant_powered and cold_store and s["stock"]["meridian"]["doses"] > 0:
		_say(ev, "The stored doses were packed on ice in time: none spoiled.", "good")
	if not plant_powered and not cold_store and s["stock"]["meridian"]["doses"] > 0:
		var sp := mini(s["stock"]["meridian"]["doses"], Y["plant"]["spoil_unpowered"])
		s["stock"]["meridian"]["doses"] -= sp
		_say(ev, "The plant's cold store warmed up: %d stored doses spoiled." % sp, "bad")
	if s["meters"]["confidence"] < M["low"]:
		my["funds"] -= M["hq_clawback_funds"]
		_say(ev, "Board confidence is low: HQ pulls %d funds back." % M["hq_clawback_funds"], "bad")
	s["stock"]["meridian"]["doses"] += my["doses"]
	s["stock"]["meridian"]["funds"] = maxi(0, s["stock"]["meridian"]["funds"] + my["funds"])

	# 8. needs
	var need := ceili(float(people_in_parish(s)) / C["needs"]["people_per_food"])
	if s["stock"]["community"]["food"] >= need:
		s["stock"]["community"]["food"] -= need
	else:
		s["stock"]["community"]["food"] = 0
		s["meters"]["trust"] += M["hunger"]
		_say(ev, "Food ran out. People went hungry.", "bad")

	# 9. meters from what people saw
	s["meters"]["trust"] -= int(round(float(turn_lost["vuln"]) / M["vuln_lost_per_trust"])) + int(round(float(turn_lost["able"]) / M["able_lost_per_trust"]))
	# people credit whoever came for them: community rescues build trust, Meridian rescues earn the board good press
	s["meters"]["trust"] += mini(M["rescued_trust_cap"], int(round(float(credit["community"]) / M["rescued_per_trust"])))
	s["meters"]["confidence"] += mini(M["rescued_trust_cap"], int(round(float(credit["meridian"]) / M["rescued_per_trust"])))

	# the press notices rescue units that sat still while people were lost
	if turn_lost["vuln"] + turn_lost["able"] > 0:
		for uid in C["units"]:
			var U: Dictionary = C["units"][uid]
			if not U.has("carry") or active.has(uid):
				continue  # only a trip that moved someone counts
			if not _could_help(C, s, U):
				continue  # nobody it could still reach was waiting
			var t: String = U["team"]
			s["meters"][C["teams"][t]["meter"]] += M["idle_while_lost"]
			ticker.append("%s sat idle while Keystone lost %d people." % [U["name"], turn_lost["vuln"] + turn_lost["able"]])

	# 10. promises due this turn
	for p in s["promises"]:
		if p["status"] != "open" or p["due"] != s["turn"]:
			continue
		if not p["confirmed"]:
			p["status"] = "unconfirmed"
			continue
		var kept := false
		if p["kind"] == "lend":
			kept = lends.get(p["unit"], false)
		else:
			var uo = orders.get(p["unit"])
			kept = uo != null and uo.get("site") == p["site"] and uo.get("task") != "idle"
		p["status"] = "kept" if kept else "broken"
		s["meters"][C["teams"][p["to"]]["meter"]] += M["promise_kept"] if kept else M["promise_broken"]
		_say(ev, "Promise %s: %s" % ["kept" if kept else "broken", p["text"]], "good" if kept else "bad")
		ticker.append("%s %s its promise: %s" % [C["teams"][p["by"]]["short"], "keeps" if kept else "breaks", p["text"]])

	s["meters"]["trust"] = clampi(s["meters"]["trust"], 0, 100)
	s["meters"]["confidence"] = clampi(s["meters"]["confidence"], 0, 100)
	s["lost"]["vuln"] += turn_lost["vuln"]
	s["lost"]["able"] += turn_lost["able"]
	s["rescued"]["vuln"] += turn_rescued["vuln"]
	s["rescued"]["able"] += turn_rescued["able"]
	for t in TEAMS:
		if s["meters"][C["teams"][t]["meter"]] < M["low"]:
			ticker.append('%s: "%s"' % [C["voices"][t]["who"], C["voices"][t]["low"]])
	if ticker.is_empty():
		ticker.append("Keystone, %s: Midas %s, pressure rising." % [T["hours"], T["label"].to_lower()])

	var report := {"turn": s["turn"], "label": T["label"], "events": ev, "ticker": ticker, "lost": turn_lost, "rescued": turn_rescued,
		"yields": {"community": cy, "meridian": my}, "choice": choice}
	s["history"].append({"turn": s["turn"], "dilemma": D, "choice": choice, "lost": turn_lost, "rescued": turn_rescued})
	s["turn"] += 1
	if s["turn"] > C["turns"].size():
		_finish(C, s, report)
	return {"state": s, "report": report}


## Recovery after the last storm turn: saved people go back to work, meters scale the yield.
static func _finish(C: Dictionary, s: Dictionary, report: Dictionary) -> void:
	var R: Dictionary = C["recovery"]
	var M: Dictionary = C["meters"]
	var Y: Dictionary = C["yields"]
	var able_alive: int = C["sites"]["low_ward"]["people"]["able"] + C["sites"]["tech_housing"]["people"]["able"] - s["lost"]["able"]
	var cm := _mult(C, s["meters"]["trust"])
	var mm := (_mult(C, s["meters"]["confidence"]) + 2.0 * _mult(C, s["meters"]["trust"])) / 3.0  # the plant needs its licence to operate: trust counts double
	var cv := floori(float(able_alive) / R["able_per_volunteer"] * R["turns"] * cm)
	var cf := floori((Y["low_ward"]["food"] + floori(float(s["meters"]["trust"]) / R["trust_per_aid"])) * R["turns"] * cm) - floori(float(s["lost"]["vuln"]) / R["vuln_lost_per_food"])
	var pd: int = R["plant_flooded_doses"] if s["sites"]["plant"]["flooded"] else Y["plant"]["doses"] * R["turns"]
	var md := floori(pd * mm)
	var mf := floori(Y["plant"]["funds"] * (1 if s["sites"]["plant"]["flooded"] else R["turns"]) * mm)
	s["stock"]["community"]["volunteers"] += cv
	s["stock"]["community"]["food"] = maxi(0, s["stock"]["community"]["food"] + cf)
	s["stock"]["meridian"]["doses"] += md
	s["stock"]["meridian"]["funds"] += mf
	s["recovery"] = {"community": {"volunteers": cv, "food": cf}, "meridian": {"doses": md, "funds": mf}}
	s["over"] = true
	report["recovery"] = s["recovery"]


static func _mult(C: Dictionary, m: int) -> float:
	if m >= C["meters"]["high"]:
		return C["recovery"]["high_mult"]
	if m < C["meters"]["low"]:
		return C["recovery"]["low_mult"]
	return 1.0


# ---------- helpers ----------
## A vote is an order index; anything else (missing, fractional, out of range) is no vote.
static func _vote(x, n: int):
	if typeof(x) == TYPE_FLOAT and x == floor(x) and absf(x) < 1e9:
		x = int(x)
	if typeof(x) == TYPE_INT and x >= 0 and x < n:
		return x
	return null


static func _say(ev: Array, text: String, kind := "info") -> void:
	ev.append({"text": text, "kind": kind})


static func _other(t: String) -> String:
	return "meridian" if t == "community" else "community"


static func _pay(s: Dictionary, team: String, cost: Dictionary) -> bool:
	for g in cost:
		if int(s["stock"][team].get(g, 0)) < int(cost[g]):
			return false
	for g in cost:
		s["stock"][team][g] -= int(cost[g])
	return true


static func _move(s: Dictionary, from: String, dest: String, room: int, tally: Dictionary, vuln_only: bool) -> int:
	var src
	if from == "st_brendans":
		src = s["shelter"]["st_brendans"]
	elif s["sites"].has(from):
		src = s["sites"][from]["home"]
	if src == null or room <= 0:
		return 0
	var v := mini(src["vuln"], room)
	var a := 0 if vuln_only else mini(src["able"], room - v)
	src["vuln"] -= v
	src["able"] -= a
	s["shelter"][dest]["vuln"] += v
	s["shelter"][dest]["able"] += a
	tally["vuln"] += v
	tally["able"] += a
	return v + a


## A named vulnerable resident boards the first rescue that leaves their street with room for them.
static func _board(C: Dictionary, s: Dictionary, from: String, dest: String, ev: Array) -> void:
	for r in C["residents"]:
		if r["group"] == "vuln" and s["residents"][r["id"]]["status"] == "home" and r["site"] == from:
			s["residents"][r["id"]]["status"] = "moved"
			s["residents"][r["id"]]["where"] = dest
			_say(ev, "%s was moved to %s." % [r["name"], C["destinations"][dest]["name"]], "good")
			return


static func people_in_parish(s: Dictionary) -> int:
	var sh: Dictionary = s["shelter"]
	var n: int = sh["st_brendans"]["vuln"] + sh["st_brendans"]["able"] + sh["tech_tower"]["vuln"] + sh["tech_tower"]["able"]
	for id in EFFECT_SITES:
		n += s["sites"][id]["home"]["vuln"] + s["sites"][id]["home"]["able"]
	return n


static func _resident_risk(C: Dictionary, s: Dictionary, rng: Rng, site: String, frac: float, ev: Array) -> void:
	for r in C["residents"]:
		var st: Dictionary = s["residents"][r["id"]]
		var here: bool = (st["status"] == "home" and r["site"] == site) or (st["status"] == "moved" and st["where"] == site)
		if here and r["group"] == "vuln" and rng.next() < frac * 2:
			st["status"] = "lost"
			_say(ev, "%s did not survive the night." % r["name"], "loss")


# ---------- replay ----------
static func replay(C: Dictionary, log: Dictionary) -> Dictionary:
	var s := new_game(C, int(log["setup"]["seed"]))
	for input in log["turns"]:
		s = resolve_turn(C, s, input)["state"]
	return {"state": s, "hash": state_hash(s)}
