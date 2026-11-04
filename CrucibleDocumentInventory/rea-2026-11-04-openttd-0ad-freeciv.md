---
type: research
date: 2026-11-04
status: cards-written-nothing-built
tags: [values-crucible, rea, reverse-engineering, openttd, 0ad, freeciv, keystone-slice]
related: ["[[audit-2026-11-03-rea-plan]]", "[[rea-2026-11-01-civ4-diplomacy-code]]", "[[decision-2026-11-02-boss-set-scorecards]]", "[[keystone-slice-status]]"]
---

# REA step A: OpenTTD, 0 A.D. and Freeciv source, 2026-11-04

Jerry approved step A of [[audit-2026-11-03-rea-plan]] on 2026-11-04 at 14:28. This step reads real source code for Q3 (supply chains), Q4 (storm and territory) and Q5 (unrest), and writes REA cards only. Nothing is built until a card is chosen.

## Sources read

All three are GPL. We read them for rules and rebuild clean-room; no code is copied.

| Game | Repository and commit | Files and functions |
|---|---|---|
| OpenTTD | github.com/OpenTTD/OpenTTD @ 611118d (2026-11-03) | `src/economy.cpp` `GetTransportedGoodsIncome`; `src/station_cmd.cpp` `UpdateStationRating`, `MoveGoodsToStation` |
| 0 A.D. | github.com/0ad/0ad @ 61a3b95 (2024-08-17 mirror) | `simulation/components/TerritoryDecay.js`, `Capturable.js` `TimerTick`, `GetRegenRate` |
| Freeciv | github.com/freeciv/freeciv @ cfa2c92 (2026-11-03) | `common/city.c` `citizen_base_mood`, `citizen_luxury_happy`, `citizen_happy_units`, `citizen_content_buildings`, `city_unhappy`; `server/cityturn.c` (disorder counter) |

## What the code does, in plain math

**OpenTTD: delivery pay falls with time** (`GetTransportedGoodsIncome`)
- Pay is distance × amount × base rate × a time factor (out of 255).
- Up to a cargo's first time limit, the factor stays at 255.
- After that, it falls 1 per period. After the second limit, it falls 2 per period.
- It never drops below 31, which is about 12% of full pay. Past the 31 floor, it tails off slowly.

**OpenTTD: a station's rating is slow to move** (`UpdateStationRating`)
- A target rating adds up how recently cargo was collected, how much is left waiting, and how fast and new the last vehicle was.
- The actual rating moves toward that target by at most 2 points per update.
- `MoveGoodsToStation` gives the station a share of what the industry produces in proportion to its rating.
- When the rating is low and cargo piles up, some of the waiting cargo is lost.
- So neglect shows up slowly and takes just as long to repair.

**0 A.D.: a site that is cut off drifts to whoever is next to it** (`TerritoryDecay`, `Capturable.TimerTick`)
- Every building holds capture points split among the players.
- If it is cut off from its owner's connected territory, it loses points each second. Those points go to the connected neighbours in proportion to their presence, or to nobody if there are none.
- Units garrisoned inside add regeneration back to the owner.

**Freeciv: unrest builds in layers** (`citizen_*` in `city.c`)
1. **Base mood:** citizens start content up to a limit; everyone above the limit starts unhappy, and some are angry.
2. **Luxury:** spending lifts moods. One unit of luxury per step, and two steps (unhappy to happy) cost double.
3. **Buildings:** they make people content, but never happy.
4. **Martial law:** troops in the city turn angry citizens into unhappy ones, then unhappy ones into content ones. Each unit counts, up to a cap.
5. **Troops away:** units deployed away from home make citizens at home unhappier.
- **Disorder:** happy < unhappy + 2 × angry, so angry citizens count double.
- **Escalation** (`cityturn.c`): each turn of disorder adds to a counter. One turn before the limit there is a warning ("Unrest threatens to spread"). Past the limit the government falls. Restoring order resets the counter.

## REA cards

### Card 1: care or control (Freeciv martial law against luxury)

- **Source:** `citizen_happy_units` against `citizen_luxury_happy`. Freeciv has two ways to calm a city: spend on people (luxury), or station force (martial law). Force is cheap and immediate, and it never makes anyone happy, only quiet.
- **Formula:** a new Meridian order, a "Security cordon at the plant gates". Each cordon cancels one live anger timer for the workforce calculation this turn: anger stops cutting the shift, but the anger is still there. It costs 1 fuel, takes 3 trust, and adds a "control" tag. Care, meaning existing saves and aid, is the costly path that actually lowers anger.
- **What the player feels:** "We can get the shift in by force tonight."
- **Keystone mapping:** a new `cordon` task for the shuttle or crew (`units`); `workforce()` skips timers that are cordoned; a trust effect. Prepared moments in T2 offer it.
- **Values purpose:** a direct gap between stated and enacted values. Teams that signed respect, compassion or autonomy face a cheap, effective coercive option. Under board pressure the scorecard rewards it.
- **Cost:** one new order and one sentence of rules. Low.
- **Prediction:** a selfish Meridian with a cordon meets its target more often (roughly 64% now, rising to about 70%), community trust falls about 5, and lives are unchanged. Permission (licence to operate) makes the cordon cost Meridian too.
- **Recommendation:** adopt for the slice.

### Card 2: trust moves slowly (OpenTTD rating inertia)

- **Source:** `UpdateStationRating`, which lets a rating move only ±2 per update toward its target.
- **Formula:** trust and confidence move toward this turn's total change, but by at most ±8 per turn. Any excess carries into the next turn as momentum.
- **What the player feels:** a betrayal doesn't fully land in one turn, and neither does an apology.
- **Keystone mapping:** meter update in `resolveTurn` step 10; a new `meters.swing_cap` key; the map shows "trust falling" arrows.
- **Values purpose:** consequences arrive after the choice, as they do in real organisations. It also stops a single late gift from washing away a whole evening's behaviour.
- **Cost:** no new concept, just an arrow on the meter. Low. It does change balance, so all the targets need re-tuning.
- **Prediction:** fewer swings in the last turn. The T1 and T2 choices carry more weight in the final score. The share of games where both careful teams meet their targets stays within ±5 points of now.
- **Recommendation:** adopt, but after Jerry's playtest, because it changes how every meter reads.

### Card 3: unrest ladder with a warning (Freeciv disorder counter)

- **Source:** the disorder counter, warning and overthrow in `cityturn.c`.
- **Formula:** each storm turn that community trust is below 40 adds to an unrest counter. At 1 the ticker reports "Unrest in Low Ward". At 2 Pastor Ruth warns, "If this goes on, the council will act." At 3 the council acts: the pressure trigger fires, and the plant gate is picketed, so the next turn's shift is at the floor. Any turn at 40 or above resets the counter.
- **What the player feels:** they can see trouble coming, and they get one turn to act.
- **Keystone mapping:** `s.unrest`; a new boss trigger condition `unrest_atleast`; one ticker template.
- **Values purpose:** it makes neglect visible before it costs anything, so ignoring a warning is a choice the debrief can name.
- **Cost:** a new number for players, but it reads as news. Low to medium.
- **Prediction:** a selfish Meridian loses about 5 to 8 points of its target rate, because the picket hits its own scorecard.
- **Recommendation:** adopt with Card 1. Together they make control tempting and its cost visible.

### Card 4: whose people are they? (0 A.D. capture and territory decay)

- **Source:** `Capturable.TimerTick` and `TerritoryDecay.IsConnected`.
- **Formula:** each neighbourhood holds an allegiance split, for example "Low Ward credits the community 70%, Meridian 30%". A cut-off site drifts toward whichever team's units are present. Units stationed there regenerate the owner's share.
- **What the player feels:** "Who gets the credit for saving Low Ward?"
- **Keystone mapping:** a per-site `allegiance`, fed into Meridian's "licence to operate" measure instead of the single trust meter.
- **Values purpose:** credit-taking against serving. It's a strong debrief question, and it fits the boss scorecards.
- **Cost:** a new number on every site. Medium to high for a 10-minute slice.
- **Recommendation:** hold for the five-parish game, where credit between teams matters more.

### Card 5: late doses lose value (OpenTTD delivery curve)

- **Source:** the time factor in `GetTransportedGoodsIncome`.
- **Formula:** cure doses keep full value for 1 turn after they're made, lose 10% a turn after that, then 20% a turn, and never fall below 15% of full value. It replaces the current flat spoilage.
- **What the player feels:** "Ship now, or keep the cold rooms for people?"
- **Keystone mapping:** doses need a batch age; the shipping route through Haven port exists only in the five-parish map.
- **Values purpose:** speed against care, in the kelp to cure to port chain.
- **Cost:** low, but it needs a port to make sense.
- **Recommendation:** hold for the five-parish game.

### Rejected

- **Freeciv's rule that "angry counts double" with a hard disorder cliff:** Keystone already uses the smooth workforce taken from Civ IV, which the simulation showed beats cliffs.
- **Freeciv's "troops away from home make people unhappy":** a weak fit. Community buses leaving the parish are rescues, not wars.

## Next

Jerry chooses which cards go in. My recommendation is cards 1 and 3 now (care or control, plus the unrest ladder), card 2 after his playtest, and cards 4 and 5 for the five-parish game. Step C, REA on Frostpunk 2 and Anno 1800 on Jerry's computer, still needs to know which games he owns and whether that computer runs Windows or macOS.
