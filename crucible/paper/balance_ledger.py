"""Seeded ledger for the phase 0 paper prototype (Keystone and Haven).

Plays the printed rules turn by turn with two scripted strategies per team,
"careful" and "passive" (does nothing; every moment it owns times out), and
rolls the storm die from a seeded RNG. It checks the kit's balance claims;
it is not the game engine, and the careful scripts are one reasonable way
to play, not the best one.

    python3 crucible/paper/balance_ledger.py              # 1,000 seeds per line
    python3 crucible/paper/balance_ledger.py --seeds 200
"""
import argparse
import random
import statistics

TEAMS = ("KC", "KM", "HC", "HM")

# The numbers printed in the kit. Change them here and in the kit together.
P = dict(
    start_coins={"KC": 13, "KM": 7, "HC": 11, "HM": 7},
    ship1_km=6, ship1_hm=1,      # per dose aboard the Kestrel Reach (end of t4)
    ship2_km=5, ship2_hm=1,      # per dose aboard the recovery ship (end of t12)
    crane_hm=2,                  # Haven Meridian per crew on the cranes, harbour open
    lost_coins=5,                # paid by the owning team for a lost group
    peak_loss=2,                 # end of t7: each stranded group is lost on this or less
    fuel_price=2,                # coins per fuel, Haven Meridian to Keystone Meridian
    relief_fuel=3,               # the cutter Resolute lands this much fuel at Haven, start of t10
    project={"bus2": 2, "blockc": 3, "cafeteria": 1, "vault": 3,
             "hall": 2, "rota": 1, "yard": 3, "tug": 1},
)
FAMILIES_K = ("KC-A", "KC-B", "KC-C", "KC-D")
FAMILIES_H = ("HC-quay", "HC-net", "HC-low")
CREWS_H = ("HC-day", "HC-night")
HOME = {"KC": "Southfield", "HC": "Waterfront"}


class Game:
    def __init__(self, seed, strat):
        self.rng = random.Random(seed)
        self.strat = strat
        self.coins = dict(P["start_coins"])
        self.trust = {"K": 6, "H": 6}
        self.conf = {"K": 6, "H": 6}
        self.proj = set()
        self.g = {}                       # id -> {team, zone, state}; state ok|stranded|lost|injured
        for k in FAMILIES_K:
            self.g[k] = dict(team="KC", zone="Southfield", state="ok")
        self.g["KC-crew"] = dict(team="KC", zone="CleanRooms", state="ok")
        for k in CREWS_H:
            self.g[k] = dict(team="HC", zone="Cranes", state="ok")
        for k in FAMILIES_H:
            self.g[k] = dict(team="HC", zone="Waterfront", state="ok")
        self.vault, self.berth, self.aboard1, self.aboard2 = 4, 0, 0, 0
        self.fuel = {"KM": 1, "HM": 6}
        self.trucks = 3
        self.cranes_damaged = False
        self.flooded = set()
        self.tired = False
        self.no_load = set()              # turns with no loading
        self.crew_away = set()            # turns the Keystone crew is off the line
        self.sheltered_once = set()
        self.memo_told = False
        self.memo_hit = False
        self.dark = 0
        self.offboard = 0
        self.tank3 = None
        self.spill = False
        self.half_cranes = False
        self.loading_started = False

    def care(self, team):
        return self.strat[team] == "careful"

    def roll(self):
        return self.rng.randint(1, 6)

    def buy(self, team, p):
        if self.coins[team] >= P["project"][p]:
            self.coins[team] -= P["project"][p]
            self.proj.add(p)

    def shelter(self, gid, zone):
        grp = self.g[gid]
        if grp["state"] != "ok":
            return
        if gid not in self.sheltered_once and grp["zone"] not in self.flooded:
            self.sheltered_once.add(gid)
            self.trust[grp["team"][0]] += 1
        grp["zone"] = zone

    def play(self):
        for t in range(1, 13):
            self.moments(t)
            self.moves(t)
            self.storm(t)
            self.yields(t)
            self.upkeep(t)
            self.meters(t)
            if t in (3, 6, 9, 12):
                self.goals(t)
        return self.score()

    # 1. moments the teams chose ("passive" = the card's no-answer line)
    def moments(self, t):
        c = self.care
        if t == 1:
            if c("HM"):                        # B: meeting first, hazard pay
                self.coins["HM"] -= 2; self.coins["HC"] += 2
                self.trust["H"] += 1; self.no_load.add(1)
            else:                              # crews start on their own
                self.tired = True; self.trust["H"] -= 1
            if c("HM"): self.buy("HM", "yard")
            if c("HC"): self.buy("HC", "hall")
            if c("KC"): self.buy("KC", "bus2")
            if c("KM"): self.buy("KM", "cafeteria"); self.buy("KM", "vault")
        if t == 2:
            if c("KM"):                        # A: tell the shift now
                self.memo_told = True; self.crew_away |= {2, 3}
                self.trust["K"] += 2; self.conf["K"] -= 1
            else:                              # C: built to code
                self.conf["K"] += 1
        if t == 4:                             # batch 47: B if careful (Haven declines), C if not
            if c("KM"): self.trust["K"] += 1
            else: self.conf["K"] -= 1
        if t == 5:
            if c("HM"):                        # A: Summit 2, Heartland 1, Keystone 1; keeps the hidden 2
                sent_k = 1 + (1 if c("KM") else 0)   # careful Keystone buys one more
                self.fuel["HM"] -= 3 + sent_k; self.offboard += 3
                self.fuel["KM"] += sent_k
                self.coins["KM"] -= P["fuel_price"] * sent_k; self.coins["HM"] += P["fuel_price"] * sent_k
                self.conf["H"] += 1
            else:                              # C: port first
                self.fuel["HM"] -= 2; self.offboard += 2
                self.conf["H"] += 1; self.trust["H"] -= 1
        if t == 7:
            stranded = [k for k in FAMILIES_K if self.g[k]["state"] == "stranded"]
            if stranded and c("KM"):           # Southfield A: trucks now, before the peak roll
                for k in stranded[: self.trucks]:
                    self.g[k].update(state="ok", zone="Cafeteria")
                for _ in range(min(len(stranded), self.trucks)):
                    if self.roll() <= 2:
                        self.trucks -= 1; self.conf["K"] -= 2
                self.trust["K"] += 2
            crew_free = self.g["HC-day"]["state"] == "ok" and not (self.tired and "rota" not in self.proj)
            self.tank3 = "A" if (c("HM") and c("HC") and crew_free) else "B"
        if t == 10:
            self.fuel["HM"] += P["relief_fuel"]
        if t == 10 and c("KM"):                # signature B: hold for testing
            self.conf["K"] -= 1
        if t == 11:
            if c("HM"):                        # A: full report, full pay
                self.coins["HM"] -= 4; self.coins["HC"] += 4; self.trust["H"] += 3; self.conf["H"] -= 1
            else:                              # B: half pay
                self.coins["HM"] -= 1; self.coins["HC"] += 1; self.trust["H"] -= 2; self.half_cranes = True
            self.coins["HM"] += self.offboard  # Summit and Heartland repay

    # 2. moves
    def moves(self, t):
        c = self.care
        if c("KM") and t <= 4 and self.vault:
            n = min(self.vault, 2 * self.trucks); self.vault -= n; self.berth += n
        if c("KM") and t == 11 and self.vault:
            n = min(self.vault, 2 * self.trucks); self.vault -= n; self.berth += n
        if c("KC"):
            trip = 2 if "bus2" in self.proj else 1
            if t in (4, 5):
                lift = trip + (2 if (c("KM") and t == 5) else 0)
                for k in [k for k in FAMILIES_K if self.g[k]["zone"] == "Southfield" and self.g[k]["state"] == "ok"][:lift]:
                    self.shelter(k, "Summit")
        if t in (11, 12):
            for team, fams in (("KC", FAMILIES_K), ("HC", FAMILIES_H)):
                if not self.care(team):
                    continue
                lift = 99 if team == "HC" else (2 if "bus2" in self.proj else 1) + (2 if c("KM") else 0)
                for k in [k for k in fams if self.g[k]["state"] == "ok" and self.g[k]["zone"] != HOME[team]
                          and HOME[team] not in self.flooded][:lift]:
                    if team == "KC" and t == 11 and self.g[k]["zone"] == "Summit" and lift < 99:
                        pass
                    self.g[k]["zone"] = HOME[team]
        if c("HC"):
            yard_safe = "yard" in self.proj
            if t == 5 and not yard_safe:
                for k in CREWS_H: self.g[k]["zone"] = "Terminal"
            if t == 6:
                cap = 5 if "hall" in self.proj else 3
                movers = [k for k in (*CREWS_H, *FAMILIES_H)
                          if self.g[k]["zone"] in ("Terminal", "Waterfront")]
                for k in movers[:cap]: self.shelter(k, "Hall")
                for k in movers[cap:]: self.shelter(k, "Summit")
            if t == 8 and self.g["HC-day"]["zone"] == "Terminal":
                self.g["HC-day"]["zone"] = "Hall"
            if t == 10:
                for k in CREWS_H:
                    if self.g[k]["state"] == "ok" and self.g[k]["zone"] == "Hall": self.g[k]["zone"] = "Terminal"
            if t == 11:
                for k in CREWS_H:
                    if self.g[k]["state"] == "ok": self.g[k]["zone"] = "Cranes"
        if t == 8:                             # the eye: each vehicle brings one stranded group out
            if c("KM"):
                for k in [k for k in FAMILIES_K if self.g[k]["state"] == "stranded"][: self.trucks]:
                    self.g[k].update(state="ok", zone="Cafeteria")
            if c("HM"):
                cap = 2 if "tug" in self.proj else 1
                for k in [k for k in self.g if self.g[k]["team"] == "HC" and self.g[k]["state"] == "stranded"][:cap]:
                    self.g[k].update(state="ok", zone="Hall")

    # 3. the storm
    def storm(self, t):
        if t == 7:
            if self.tank3 == "A":
                self.g["HC-day"]["zone"] = "Terminal"
                if self.roll() == 1: self.g["HC-day"]["state"] = "injured"
                self.tank3_holds = True
            else:
                self.tank3_holds = self.roll() >= 4
                if not self.tank3_holds:
                    self.fuel["HM"] = max(0, self.fuel["HM"] - 2); self.conf["H"] -= 2; self.spill = True
        floods = {"Waterfront": 6, "Southfield": 7 if "blockc" in self.proj else 6}
        if "yard" not in self.proj:
            floods["Cranes"] = 6
        for zone, ft in floods.items():
            if t != ft:
                continue
            self.flooded.add(zone)
            if zone == "Cranes":
                self.cranes_damaged = True; self.berth = 0; self.conf["H"] -= 2
            for grp in self.g.values():
                if grp["zone"] == zone and grp["state"] == "ok":
                    grp["state"] = "stranded"
                    if zone == "Southfield" and not self.memo_told and not self.memo_hit:
                        self.memo_hit = True; self.trust["K"] -= 3
        if t == 7:                             # the peak
            for k, grp in self.g.items():
                if grp["state"] == "stranded" and self.roll() <= P["peak_loss"]:
                    self.lose(k)
        if t == 9:
            for k, grp in self.g.items():
                if grp["state"] == "stranded":
                    self.lose(k)
        if t == 10:
            self.flooded.discard("Southfield")
            if not self.spill: self.flooded.discard("Waterfront")
        if t == 11:
            self.flooded.discard("Waterfront")

    def lose(self, k):
        grp = self.g[k]
        grp["state"] = "lost"
        self.coins[grp["team"]] = max(0, self.coins[grp["team"]] - P["lost_coins"])
        self.trust[grp["team"][0]] -= 2

    # 4. yields and loading
    def yields(self, t):
        self.km_power = t <= 6 or self.fuel["KM"] > 0
        if t >= 7:
            if self.fuel["KM"] > 0: self.fuel["KM"] -= 1
            else: self.dark += 1 if t <= 9 else 0
        harbour = t <= 4 or t >= 10            # cranes earn only with a ship at the berth
        cranes_on = harbour and not (self.cranes_damaged and t >= 10)
        if t >= 10 and cranes_on:
            if any(self.g[k]["zone"] == "Cranes" and self.g[k]["state"] == "ok" for k in CREWS_H) and self.fuel["HM"] > 0:
                self.fuel["HM"] -= 1
            else:
                cranes_on = False
        for k, grp in self.g.items():
            if grp["state"] != "ok":
                continue
            team, zone = grp["team"], grp["zone"]
            if team in HOME and zone == HOME[team] and zone not in self.flooded:
                self.coins[team] += 1
            elif zone == "CleanRooms" and not self.strike["K"] and t not in self.crew_away:
                self.coins["KC"] += 1
                if self.km_power:
                    self.vault += 1 + (2 if t == 5 else 0)   # batch 47 finishes at the end of t5
            elif zone == "Cranes" and cranes_on and not self.strike["H"]:
                self.coins["HC"] += 1
                self.coins["HM"] += P["crane_hm"] // (2 if (t == 12 and self.half_cranes) else 1)
                if t not in self.no_load and self.berth:
                    self.berth -= 1
                    if t <= 4: self.aboard1 += 1
                    else: self.aboard2 += 1
                    self.loading_started = self.loading_started or t <= 2

    # 5. upkeep, ships, Chicago
    def upkeep(self, t):
        if t >= 7 and not self.km_power:
            self.conf["K"] -= 1
            if "vault" not in self.proj: self.vault = max(0, self.vault - 2)
        if t == 4:
            self.coins["KM"] += P["ship1_km"] * self.aboard1; self.coins["HM"] += P["ship1_hm"] * self.aboard1
            self.conf["K"] += 1 if self.aboard1 >= 6 else (-1 if self.aboard1 < 4 else 0)
        if t == 12:
            self.coins["KM"] += P["ship2_km"] * self.aboard2; self.coins["HM"] += P["ship2_hm"] * self.aboard2
        for team, p in (("KM", "K"), ("HM", "H")):
            if self.conf[p] <= 3:
                self.coins[team] = max(0, self.coins[team] - 2)

    # 6. meters and pressure cards
    strike = {"K": False, "H": False}

    def meters(self, t):
        for grp in self.g.values():
            if grp["state"] == "stranded": self.trust[grp["team"][0]] -= 1
        for p in "KH":
            self.trust[p] = max(0, min(10, self.trust[p])); self.conf[p] = max(0, min(10, self.conf[p]))
        self.strike = {}
        for p, mt, ct in (("K", "KM", "KC"), ("H", "HM", "HC")):
            if self.trust[p] <= 3 and self.care(mt) and self.coins[mt] >= 3:
                self.coins[mt] -= 3; self.coins[ct] += 3; self.trust[p] += 2
            if self.conf[p] <= 3 and self.care(mt) and self.coins[mt] >= 3:
                self.coins[mt] -= 3; self.conf[p] += 2
            self.strike[p] = self.trust[p] <= 3

    def goals(self, t):
        hit = {}
        if t == 3:
            hit = {"K": self.berth + self.aboard1 >= 4, "H": self.loading_started}
        if t == 6:
            hit = {"K": all(self.g[k]["state"] == "ok" and self.g[k]["zone"] != "Southfield" for k in FAMILIES_K),
                   "H": self.aboard1 >= 6}
        if t == 9:
            hit = {"K": self.dark == 0, "H": self.tank3_holds}
        if t == 12:
            hit = {"K": all(g["state"] == "lost" or g["zone"] in ("Southfield", "CleanRooms")
                            for g in self.g.values() if g["team"] == "KC"),
                   "H": all(self.g[k]["zone"] == "Cranes" and self.g[k]["state"] == "ok" for k in CREWS_H)}
        for p, ok in hit.items():
            if ok:
                for team in TEAMS:
                    if team[0] == p: self.coins[team] += 2

    def score(self):
        s = dict(self.coins)
        for grp in self.g.values():
            if grp["state"] != "lost": s[grp["team"]] += 3
        s["KC"] += 2
        s["KM"] += self.vault + self.berth + self.fuel["KM"] + 8 + 2 + 2 + 2 * self.trucks
        s["HC"] += 2 + 2
        s["HM"] += self.fuel["HM"] + 6 + (1 if self.cranes_damaged else 4) + 4 + 3
        return s


def run(strat, seeds):
    out = {t: [] for t in TEAMS}
    for seed in range(seeds):
        res = Game(seed, strat).play()
        for t in TEAMS:
            out[t].append(res[t])
    return {t: statistics.mean(v) for t, v in out.items()}, out


def report(seeds):
    allc = {t: "careful" for t in TEAMS}
    base, _ = run(allc, seeds)
    lines = [f"{seeds} seeds per line. Mean final resources; every team starts at 30.",
             "All careful:      " + "  ".join(f"{t} {base[t]:5.1f}" for t in TEAMS)]
    for t in TEAMS:
        s = dict(allc); s[t] = "passive"
        mean, dist = run(s, seeds)
        beats = sum(1 for i in range(seeds) if dist[t][i] >= max(dist[o][i] for o in TEAMS if o != t))
        lines.append(f"{t} does nothing: {t} {mean[t]:5.1f} (careful {base[t]:5.1f}, gap {base[t] - mean[t]:+5.1f});"
                     f" wins {beats}/{seeds} games")
    mean, _ = run({t: "passive" for t in TEAMS}, seeds)
    lines.append("All do nothing:   " + "  ".join(f"{t} {mean[t]:5.1f}" for t in TEAMS))
    return "\n".join(lines)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=1000)
    print(report(ap.parse_args().seeds))
