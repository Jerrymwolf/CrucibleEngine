extends Node
## The AI Dilemma Director. Asks Claude for this turn's moment as soon as the last turn resolves.
## The game never waits on it: main.gd uses a written fallback if no valid moment is ready 20 s into planning.
## Needs an Anthropic API key (setup screen, or the ANTHROPIC_API_KEY environment variable).

signal finished(turn: int, result: Dictionary)  # result: {raw, error, ms}
signal tested(ok: bool, message: String)

const API_URL := "https://api.anthropic.com/v1/messages"
const DEFAULT_MODEL := "claude-opus-5-5"

var api_key := ""
var model := DEFAULT_MODEL
var _http: HTTPRequest
var _turn := 0
var _t0 := 0
var _test: HTTPRequest


func _ready() -> void:
	_http = HTTPRequest.new()
	_http.timeout = 60.0
	add_child(_http)
	_http.request_completed.connect(_on_completed)
	_test = HTTPRequest.new()
	_test.timeout = 20.0
	add_child(_test)
	_test.request_completed.connect(_on_tested)


func available() -> bool:
	return api_key.strip_edges() != ""


func busy() -> bool:
	return _http != null and _http.get_http_client_status() != HTTPClient.STATUS_DISCONNECTED


func cancel() -> void:
	if _http:
		_http.cancel_request()


## keep_t0: a retry keeps the clock of the first attempt, so the time shown is the whole wait.
func request(turn: int, prompt: String, keep_t0 := false) -> void:
	cancel()
	_turn = turn
	if not keep_t0:
		_t0 = Time.get_ticks_msec()
	if not available():
		finished.emit(turn, {"error": "no API key", "ms": 0})
		return
	var body := {
		"model": model,
		"max_tokens": 8000,
		# Low effort keeps a moment inside the 20-second window; the written fallback covers the rest.
		"output_config": {"effort": "low"},
		# If a safety classifier declines, the API retries on a fallback model inside the same call.
		"fallbacks": "default",
		"messages": [{"role": "user", "content": prompt}],
	}
	var err := _http.request(API_URL, _headers(), HTTPClient.METHOD_POST, JSON.stringify(body))
	if err != OK:
		finished.emit(turn, {"error": "could not start the request (%d)" % err, "ms": 0})


func _headers() -> PackedStringArray:
	return PackedStringArray([
		"content-type: application/json",
		"x-api-key: " + api_key.strip_edges(),
		"anthropic-version: 2023-06-01",
		"anthropic-beta: server-side-fallback-2026-07-01",
	])


## A tiny call on the setup screen, so a bad key shows up before the storm, not in turn 1.
func test_key() -> void:
	if not available():
		tested.emit(false, "No key given. Prepared moments will be used.")
		return
	_test.cancel_request()
	var body := {"model": model, "max_tokens": 16, "messages": [{"role": "user", "content": "Reply with the word ready."}]}
	var err := _test.request(API_URL, _headers(), HTTPClient.METHOD_POST, JSON.stringify(body))
	if err != OK:
		tested.emit(false, "Could not start the test (%d)." % err)


func _on_tested(result: int, code: int, _h: PackedStringArray, body: PackedByteArray) -> void:
	if result != HTTPRequest.RESULT_SUCCESS:
		tested.emit(false, "No answer (network error %d). Check the internet connection." % result)
		return
	if code == 200:
		tested.emit(true, "The key works. Claude will write the moments.")
		return
	var data = JSON.parse_string(body.get_string_from_utf8())
	tested.emit(false, "The key did not work: " + _error_text(code, data))


static func _error_text(code: int, data) -> String:
	var msg := "HTTP %d" % code
	if typeof(data) == TYPE_DICTIONARY and typeof(data.get("error")) == TYPE_DICTIONARY:
		msg += ": " + str(data["error"].get("message", ""))
	return msg


## Added to the prompt when Claude's first moment failed the checks.
static func retry_note(notes: Array) -> String:
	return "\n\nYOUR LAST MOMENT WAS REJECTED by the checks for these reasons: " + "; ".join(PackedStringArray(notes)) + ". Write a new one that follows every rule. Reply with only the JSON."


func _on_completed(result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
	var ms := Time.get_ticks_msec() - _t0
	if result != HTTPRequest.RESULT_SUCCESS:
		finished.emit(_turn, {"error": "network error %d (offline?)" % result, "ms": ms})
		return
	var data = JSON.parse_string(body.get_string_from_utf8())
	if code != 200 or typeof(data) != TYPE_DICTIONARY:
		finished.emit(_turn, {"error": _error_text(code, data), "ms": ms})
		return
	if data.get("stop_reason") == "refusal":
		finished.emit(_turn, {"error": "Claude declined this situation", "ms": ms})
		return
	var text := ""
	for block in data.get("content", []):
		if block.get("type") == "text":
			text += block.get("text", "")
	var a := text.find("{")
	var b := text.rfind("}")
	if a < 0 or b <= a:
		finished.emit(_turn, {"error": "no JSON in the answer", "ms": ms})
		return
	var raw = JSON.parse_string(text.substr(a, b - a + 1))
	if typeof(raw) != TYPE_DICTIONARY:
		finished.emit(_turn, {"error": "the answer was not valid JSON", "ms": ms})
		return
	finished.emit(_turn, {"raw": raw, "ms": ms, "model": data.get("model", model)})


# ---------- the prompt (same text as the browser test page, crucible/slice/template.html) ----------
const RULES := """You are the Dilemma Director for the Values Crucible, a facilitated leadership simulation for executives. This is the parish of Keystone on the island of Concordia during Hurricane Midas. Keystone has two teams who share one set of resources and must agree:
- the community team speaks for the people who live here (buses, a boat, volunteers, food);
- the Meridian team speaks for the company that runs the Biotech Plant, which makes the island's kelp cancer cure (a shuttle, a generator, the plant crew, funds, cure doses).
The owner of the resource makes the final call after both teams vote.

Write ONE moment for this storm turn that forces values these two teams SIGNED into collision, using only what is on the board below.
Rules:
1. The collision is the community team's #1 value against the Meridian team's #1 value when they can honestly collide here; otherwise two values from one team's ranking. At intensity 3 or 4 a #1 value must be in it.
2. Put the moment at one site that is warned, flooded, dark or at risk this turn. Put one named resident with a face at the centre (use the named residents listed when they fit).
3. Give 2 or 3 orders. Each has an owner (community or meridian) who makes the final call for it, and costs only that owner's goods, never more than they hold. At least one order must spend goods that would help that team's stockpile score.
4. Give each order mechanical effects chosen ONLY from this menu (omit any you do not use):
   "trust": -10..10 (community trust), "confidence": -10..10 (Meridian board confidence),
   "doses": -10..10 (cure doses gained or lost now), "save": {"site": one of low_ward|tech_housing|st_brendans|plant, "n": 0..60} (vulnerable people taken to safety),
   "expose": 0..100 (plant workers kept in harm's way this turn), "power": site (backup power there this turn),
   "sandbag": site (flood defence there this turn), "open_tower": true (Meridian opens Tech Tower as a shelter),
   "cold_store": true (stored cure doses are packed on ice, so none spoil if the plant loses power this turn).
5. Tag each order, for EACH team, with which of that team's signed values it honours and which it costs. Use only that team's own values. Every order must cost at least one signed value for someone.
6. Set "final_call" to the team whose resources the moment is mostly about, and "default" to an order owned by that team; it happens if that team does not decide in time. An order owned by the OTHER team runs only if that other team votes for it too, because they pay for it.
6b. The order that protects people must carry a real human stake (a named person, a number of people) and a real cost; no order may be all gain.
7. Pressure comes only from off-board voices: a named community leader or a named Meridian executive. Never from the other team.
8. Witness, not judge: no scoring, no right answer, no moral words such as selfish, heroic, greedy or noble.
9. Plain, concrete English. The whole moment must be readable in 15 seconds: situation under 45 words, order labels under 9 words.

Reply with only JSON in exactly this shape:
{"final_call":"community|meridian","site":"site id","collision":["value id","value id"],"title":"headline under 8 words","situation":"...","resident":"Name, age, one line","voice":{"who":"Name, role","line":"what they say"},"orders":[{"label":"...","owner":"community|meridian","cost":{"good id":number},"effects":{},"tags":{"community":{"honours":["value id"],"costs":["value id"]},"meridian":{"honours":[],"costs":[]}},"news":"one ticker line if chosen"}],"default":0}
Good ids: community owns food, volunteers, c_fuel; meridian owns doses, funds, m_fuel."""


static func build_prompt(C: Dictionary, s: Dictionary, stances: Dictionary) -> String:
	var st := PackedStringArray()
	for t in ["community", "meridian"]:
		var r: Array = stances[t]["ranks"]
		st.append('%s TEAM signed, ranked for when they collide: 1. %s 2. %s 3. %s. Statement: "%s"' % [t.to_upper(), r[0], r[1], r[2], stances[t]["statement"]])
		for v in r:
			if C["values"].has(v) and C["values"][v].size() > 2 and C["values"][v][2] != "":
				st.append("  %s means: %s" % [v, C["values"][v][2]])
	return RULES + "\n\n" + "\n".join(st) + "\n\nBOARD:\n" + board_text(C, s)


static func _likelihood(p: float) -> String:
	return "certain" if p >= 0.85 else ("likely" if p >= 0.5 else "possible")


static func _hazards(T: Dictionary) -> String:
	var out := PackedStringArray()
	for h in T["hazards"]:
		out.append("%s (%s%s)" % [h["text"], _likelihood(h["p"]), ", sandbags help" if h.has("sandbag_p") else ""])
	return "; ".join(out)


static func board_text(C: Dictionary, s: Dictionary) -> String:
	var T: Dictionary = C["turns"][s["turn"] - 1]
	var lines := PackedStringArray()
	lines.append("TURN %d of %d: %s, %s, intensity %d of 4." % [s["turn"], C["turns"].size(), T["label"], T["hours"], T["intensity"]])
	lines.append("THIS TURN THE STORM BRINGS: %s." % _hazards(T))
	if T.has("flash"):
		lines.append("FLASH WARNING: %s." % T["flash"]["text"])
	if s["turn"] < C["turns"].size():
		lines.append("NEXT TURN: %s." % _hazards(C["turns"][s["turn"]]))
	else:
		lines.append("This is the last storm turn.")
	lines.append("SITES:")
	for id in ["low_ward", "tech_housing", "plant", "st_brendans", "crater_road"]:
		var x: Dictionary = s["sites"][id]
		var n: Dictionary = C["sites"][id]
		var flags := PackedStringArray()
		if x["flooded"]: flags.append("FLOODED")
		if x["dark"]: flags.append("DARK")
		if x["closed"]: flags.append("CLOSED")
		var state := ", ".join(flags) if flags.size() else "dry"
		var ppl := " people home: %d vulnerable, %d able" % [x["home"]["vuln"], x["home"]["able"]] if n.has("people") else ""
		lines.append("- %s (%s, owner %s): %s;%s" % [id, n["name"], n["owner"], state, ppl])
	var sh: Dictionary = s["shelter"]
	lines.append("SHELTERED: St. Brendan's %d of %d; Tech Tower %s (%d of 60); evacuated to Heartland %d. Lost so far: %d." % [
		sh["st_brendans"]["vuln"] + sh["st_brendans"]["able"], C["sites"]["st_brendans"]["capacity"], "open" if s["towerOpen"] else "closed",
		sh["tech_tower"]["vuln"] + sh["tech_tower"]["able"], sh["heartland"]["vuln"] + sh["heartland"]["able"], s["lost"]["vuln"] + s["lost"]["able"]])
	var k: Dictionary = s["stock"]
	lines.append("STOCKS: community food %d, volunteers %d, c_fuel %d; meridian doses %d, funds %d, m_fuel %d." % [
		k["community"]["food"], k["community"]["volunteers"], k["community"]["c_fuel"], k["meridian"]["doses"], k["meridian"]["funds"], k["meridian"]["m_fuel"]])
	lines.append("METERS: community trust %d, board confidence %d (below 40 hurts)." % [s["meters"]["trust"], s["meters"]["confidence"]])
	var units := PackedStringArray()
	for id in C["units"]:
		var u: Dictionary = C["units"][id]
		units.append('%s "%s" (%s%s)' % [id, u["name"], u["team"], ", carries %d" % u["carry"] if u.has("carry") else ""])
	lines.append("UNITS: %s." % "; ".join(units))
	lines.append("NAMED RESIDENTS:")
	for r in C["residents"]:
		lines.append("%s, %d, %s: %s Now: %s" % [r["name"], r["age"], C["sites"][r["site"]]["name"], r["line"], s["residents"][r["id"]]["status"]])
	lines.append("VOICES YOU MAY USE: %s; %s; also any named elder, mayor or Meridian executive." % [C["voices"]["community"]["who"], C["voices"]["meridian"]["who"]])
	var last := PackedStringArray()
	for h in s["history"]:
		if h["choice"] != null:
			last.append('turn %d: "%s" (%s)' % [h["turn"], h["dilemma"]["orders"][h["choice"]["index"]]["label"], "storm decided" if h["choice"]["stormDecided"] else h["choice"]["by"] + " decided"])
	lines.append("EARLIER CHOICES: %s." % ("; ".join(last) if last.size() else "none yet"))
	return "\n".join(lines)
