extends Control
## The parish map. Drawn from a 600 x 380 logical map (the site x,y in keystone_slice.json) scaled to fit.
## Tap a highlighted site to give the selected unit its order.

signal site_pressed(id: String)

const W := 600.0
const H := 380.0
const SITE_W := 170.0
const SITE_H := 104.0

const LAND := Color("#18222c")
const SEA := Color("#102536")
const PANEL := Color("#131d27")
const SUNK := Color("#0f1820")
const LINE := Color("#26364a")
const FG := Color("#e3e9ef")
const MUTED := Color("#93a2b4")
const STORM := Color("#f08a3c")
const WATER := Color("#4f86b0")
const COMM := Color("#4fc1c9")
const MERI := Color("#8fa8e0")
const HONOUR := Color("#5fc79c")
const COST := Color("#f07a72")

var C: Dictionary
var s: Dictionary
var targets := {}        # site id -> "EVACUATE" | "SANDBAG" | "POWER" | "RUN"
var assigned := {}       # site id -> [unit ids]
var hit := {}            # site id -> true when the storm changed it this turn
var flash_site := ""
var band := Vector3.ZERO:
	set(v):
		band = v
		queue_redraw()

var _k := 1.0
var _off := Vector2.ZERO
var _t := 0.0


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_STOP
	resized.connect(queue_redraw)


func _process(delta: float) -> void:
	if flash_site != "" or not hit.is_empty():
		_t += delta
		queue_redraw()


func _p(x: float, y: float) -> Vector2:
	return _off + Vector2(x, y) * _k


func _site_rect(id: String) -> Rect2:
	var n: Dictionary = C["sites"][id]
	return Rect2(_p(n["x"] - SITE_W / 2, n["y"] - SITE_H / 2), Vector2(SITE_W, SITE_H) * _k)


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		for id in C["sites"]:
			if targets.has(id) and _site_rect(id).has_point(event.position):
				site_pressed.emit(id)
				accept_event()
				return
	elif event is InputEventMouseMotion:
		var over := false
		for id in targets:
			if _site_rect(id).has_point(event.position):
				over = true
		mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND if over else Control.CURSOR_ARROW


func _draw() -> void:
	if C.is_empty() or s.is_empty():
		return
	_k = minf(size.x / W, size.y / H)
	_off = (size - Vector2(W, H) * _k) / 2.0
	var font := get_theme_default_font()
	var fs := func(n: float) -> int: return maxi(13, int(round(n * _k)))

	draw_rect(Rect2(_p(0, 0), Vector2(W, H) * _k), LAND)
	var sea := PackedVector2Array([_p(600, 0), _p(600, 380), _p(330, 380), _p(390, 350), _p(395, 300), _p(520, 300), _p(560, 200), _p(560, 160), _p(555, 90), _p(545, 0)])
	draw_colored_polygon(sea, SEA)
	draw_string(font, _p(470, 214), "SEA", HORIZONTAL_ALIGNMENT_RIGHT, 115 * _k, fs.call(11), WATER)
	draw_colored_polygon(PackedVector2Array([_p(10, 10), _p(120, 10), _p(60, 120)]), SUNK)
	draw_string(font, _p(16, 28), "TO HEARTLAND", HORIZONTAL_ALIGNMENT_LEFT, -1, fs.call(10), MUTED)

	# roads, dashed when Crater Road is closed
	for r in C["roads"]:
		var a: Dictionary = C["sites"][r[0]]
		var b: Dictionary = C["sites"][r[1]]
		var closed: bool = (r[0] == "crater_road" or r[1] == "crater_road") and s["sites"]["crater_road"]["closed"]
		if closed:
			draw_dashed_line(_p(a["x"], a["y"]), _p(b["x"], b["y"]), LINE, 6 * _k, 10 * _k)
		else:
			draw_line(_p(a["x"], a["y"]), _p(b["x"], b["y"]), LINE, 6 * _k, true)

	# the storm band: soft rings and a dashed eye
	if band.z > 0:
		var c := _p(band.x, band.y)
		for i in 6:
			var f := 1.0 - i / 6.0
			draw_circle(c, band.z * _k * f, Color(STORM, 0.05 + 0.03 * i))
		draw_arc(c, band.z * 0.18 * _k, 0, TAU, 40, STORM, 2 * _k)

	# flash warning ring, pulsing
	if flash_site != "":
		var n: Dictionary = C["sites"][flash_site]
		var pulse := 0.45 + 0.45 * sin(_t * 5.0)
		draw_rect(Rect2(_p(n["x"] - SITE_W / 2 - 6, n["y"] - SITE_H / 2 - 6), Vector2(SITE_W + 12, SITE_H + 12) * _k), Color(STORM, pulse), false, 3 * _k)

	for id in C["sites"]:
		_draw_site(id, font, fs)


func _draw_site(id: String, font: Font, fs: Callable) -> void:
	var n: Dictionary = C["sites"][id]
	var x: Dictionary = s["sites"][id]
	var r := _site_rect(id)
	var fill := PANEL
	if x["flooded"]:
		fill = PANEL.lerp(WATER, 0.35)
	elif x["dark"]:
		fill = SUNK
	draw_rect(r, fill)
	var border := LINE
	var bw := 1.0
	if targets.has(id):
		border = STORM
		bw = 3.0
	if hit.has(id):
		border = Color(COST, 0.5 + 0.5 * sin(_t * 6.0))
		bw = 3.0
	draw_rect(r, border, false, bw * _k)

	var flags := PackedStringArray()
	if x["flooded"]: flags.append("FLOODED")
	if x["dark"]: flags.append("DARK")
	if x["closed"]: flags.append("CLOSED")
	var st := " · ".join(flags) if flags.size() else "DRY"
	var st_col := WATER if x["flooded"] else (COST if x["dark"] or x["closed"] else HONOUR)

	# five short lines: name / status / people / more / action or owner
	var l3 := ""
	var l4 := ""
	var sh: Dictionary = s["shelter"]
	if n.has("people"):
		l3 = "%d vulnerable at home" % x["home"]["vuln"]
		l4 = "%d others at home" % x["home"]["able"]
	if id == "st_brendans":
		l3 = "Sheltering %d of %d" % [sh["st_brendans"]["vuln"] + sh["st_brendans"]["able"], n["capacity"]]
		var over: int = sh["st_brendans"]["vuln"] + sh["st_brendans"]["able"] - n["capacity"]
		l4 = "%d over capacity" % over if over > 0 else ""
	elif id == "crater_road":
		l3 = "Road to Heartland"
		l4 = "%d evacuated there" % (sh["heartland"]["vuln"] + sh["heartland"]["able"])
	elif id == "plant":
		l3 = "Frank injured" if s["residents"]["frank"]["status"] == "injured" else "Plant crew on site"
	if id == "tech_housing" and s["towerOpen"]:
		l4 = "Tower open: %d sheltered" % (sh["tech_tower"]["vuln"] + sh["tech_tower"]["able"])

	var pad := 10 * _k
	var w := r.size.x - pad * 2
	var lh := 19.0 * _k
	draw_string(font, r.position + Vector2(pad, lh), String(n["name"]).to_upper(), HORIZONTAL_ALIGNMENT_LEFT, w, fs.call(13), FG)
	draw_string(font, r.position + Vector2(pad, lh * 2), st, HORIZONTAL_ALIGNMENT_LEFT, w, fs.call(12), st_col)
	draw_string(font, r.position + Vector2(pad, lh * 3), l3, HORIZONTAL_ALIGNMENT_LEFT, w, fs.call(12), FG)
	draw_string(font, r.position + Vector2(pad, lh * 4), l4, HORIZONTAL_ALIGNMENT_LEFT, w, fs.call(12), MUTED)
	if targets.has(id):
		draw_string(font, r.position + Vector2(pad, lh * 5 - 2 * _k), "TAP TO " + String(targets[id]), HORIZONTAL_ALIGNMENT_LEFT, w, fs.call(12), STORM)
	else:
		draw_string(font, r.position + Vector2(pad, lh * 5 - 2 * _k), String(n["owner"]).to_upper() + " SITE", HORIZONTAL_ALIGNMENT_LEFT, w, fs.call(11), MUTED)

	# unit tokens under the site
	var i := 0
	for uid in assigned.get(id, []):
		var u: Dictionary = C["units"][uid]
		var tr := Rect2(r.position + Vector2(i * 50 * _k, r.size.y + 4 * _k), Vector2(46, 18) * _k)
		draw_rect(tr, COMM if u["team"] == "community" else MERI)
		draw_string(font, tr.position + Vector2(0, 13 * _k), token(u["name"]), HORIZONTAL_ALIGNMENT_CENTER, tr.size.x, fs.call(10), SUNK)
		i += 1


## "Bus 1" -> "B1", "Plant shuttle" -> "PS"
static func token(name: String) -> String:
	var out := ""
	for w in name.split(" ", false):
		if w.is_valid_int():
			out += w
		else:
			out += w.substr(0, 1).to_upper()
	return out
