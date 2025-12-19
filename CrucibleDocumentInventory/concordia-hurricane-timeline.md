# HURRICANE MIDAS: Timeline and Weather Progression

## Storm Overview

**Hurricane Midas** — Category 4 at peak intensity
- Maximum sustained winds: 145 mph
- Minimum central pressure: 938 mb
- Storm surge potential: 10-14 feet
- Rainfall: 12-18 inches over 24 hours
- Forward speed: 12 mph (slows to 8 mph at landfall)
- Eye diameter: 25 miles

**Track:** Direct hit on Concordia Island. Eye passes over the island, providing a 2-3 hour respite before backside hits.

**Historical comparison:** Worst storm to hit Concordia in 40 years. Last comparable storm (1984) killed 12, destroyed the original processing facility.

---

## Simulation Time Structure

**Total simulation time:** 96 hours (T-72h to T+24h)
**Compressed play time:** 3.5 hours (approximately 27:1 compression)

| Simulation Phase | Sim Time | Real Time | Compression |
|------------------|----------|-----------|-------------|
| Watch Phase | T-72h to T-24h | 45-60 min | ~50:1 |
| Crisis Phase | T-24h to T+6h | 90-120 min | ~15:1 |
| Recovery Phase | T+6h to T+24h | 45-60 min | ~20:1 |

**Time acceleration varies:** Slower during high-intensity decision points, faster during waiting periods. CM can adjust pacing.

---

## Master Timeline

### T-72h: WATCH ISSUED

**Weather:**
- Midas upgraded to Category 3, 500 miles southeast
- Track uncertainty cone includes Concordia (40% probability)
- Current conditions: Clear skies, calm seas, business as usual

**Intensity Level:** 2-3

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| Airport | ✅ Normal | All flights operating |
| Harbor | ✅ Normal | Fleet out harvesting |
| Ring Road | ✅ Normal | Full access |
| Crater Roads | ✅ Normal | Full access |
| Power Grid | ✅ Normal | Dam at full capacity |
| Communications | ✅ Normal | All systems operational |
| Hospital | ✅ Normal | 45% capacity |

**Decision Windows Open:**
- Fleet deployment (full flexibility)
- Evacuation planning (voluntary)
- Resource pre-positioning
- Staff scheduling
- Production targets

**Key Pressures:**
- Singapore shipment deadline: 72 hours
- Kelp inventory buffer: 24 hours (need harvest)
- HQ wants "contingency plans, not overreaction"

**Sample NarrativeAgent Content:**
> *"Concordia Weather Service has issued a Hurricane Watch for the island and surrounding waters. Hurricane Midas, currently Category 3, may affect our area within 72 hours. Residents should review emergency plans and monitor updates."*

> *[Email from Chicago HQ]: "Monitoring Midas closely. Please confirm Singapore shipment remains on track. Market is watching our reliability."*

---

### T-60h: TRACK SOLIDIFIES

**Weather:**
- Midas intensifies to Category 4
- Track shifts—Concordia now 55% probability
- First outer bands visible on radar, 400 miles out
- Seas building: 6-8 foot swells

**Intensity Level:** 3-4

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| Airport | ✅ Normal | Commercial flights still operating |
| Harbor | ⚠️ Advisory | Swells building; small craft advisory |
| Ring Road | ✅ Normal | |
| Crater Roads | ✅ Normal | |
| Power Grid | ✅ Normal | |
| Communications | ✅ Normal | |
| Hospital | ✅ Normal | Beginning to clear elective procedures |

**Decision Windows:**
- Fleet recall (can still make safe harbor from any position)
- Evacuation orders (voluntary or mandatory?)
- Non-essential personnel release
- Singapore loading decision (start now = finish before storm)

**Key Pressures:**
- Fleet captains asking for guidance
- Workers asking about early release
- Singapore deadline: 60 hours
- Insurance company wants storm prep confirmation

**Sample NarrativeAgent Content:**
> *[Radio from Rosa Mendez]: "Fleet Operations, this is Mendez. Seas are building. My captains are asking whether to head in or keep harvesting. Need a decision in the next 4 hours."*

> *[Social media post, Haven worker]: "They're saying we might get hit. Management still hasn't said anything about letting us go home. Classic."*

---

### T-48h: WARNING ISSUED

**Weather:**
- Hurricane Warning replaces Watch
- Direct hit now 70% probability
- Outer bands 250 miles out
- Sustained winds at island: 15-20 mph, gusts to 30
- Seas: 10-12 foot swells
- First rain bands approaching

**Intensity Level:** 4-5

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| Airport | ⚠️ Limited | Some carriers canceling; charter flights busy |
| Harbor | ⚠️ Limited | Fleet must return within 24h or risk being caught |
| Ring Road | ✅ Normal | |
| Crater Roads | ✅ Normal | |
| Power Grid | ✅ Normal | |
| Communications | ✅ Normal | |
| Hospital | ⚠️ Preparing | Clearing beds, calling in staff |

**Decision Windows:**
- Fleet recall (last safe window for distant boats)
- Mandatory evacuation orders
- Essential personnel designation
- Production run/reduce/halt decision
- Singapore loading (must start NOW to finish in time)
- Shelter allocation policy

**Key Pressures:**
- Airport seats becoming scarce
- Workers with families on mainland want to leave
- Singapore deadline: 48 hours
- Union asking about hazard pay and safety protocols

**Sample NarrativeAgent Content:**
> *"Hurricane Warning now in effect for Concordia Island. Hurricane Midas, Category 4, expected to make direct impact within 48 hours. All residents should complete storm preparations immediately."*

> *[Maria Santos to Haven management]: "My people are asking what the plan is. Half of them want to leave now. The other half want to know if they're getting paid to stay. I need answers."*

> *[Marcus Webb, all-hands email]: "Team, we're monitoring Midas closely. Our priority is your safety AND our commitment to patients who depend on us. Parish managers will communicate specific guidance. Stay tuned."*

---

### T-36h: EVACUATION WINDOW

**Weather:**
- Direct hit now 85% probability
- Outer rain bands reaching island
- Sustained winds: 25-35 mph, gusts to 50
- Seas: 14-16 feet, harbor operations difficult
- Visibility reduced in rain bands

**Intensity Level:** 5-6

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| Airport | ⚠️ Limited | Last commercial flights departing; wind limits approaching |
| Harbor | ❌ Closed to departures | Too dangerous; ships must shelter or leave now |
| Ring Road | ⚠️ Degraded | Flooding beginning at low points near Haven |
| Crater Roads | ⚠️ Caution | Wet, visibility reduced |
| Power Grid | ✅ Normal | |
| Communications | ✅ Normal | |
| Hospital | ⚠️ Surge mode | Canceling all electives, max staffing |

**Decision Windows CLOSING:**
- ⏰ Fleet recall: FINAL (boats not in harbor now won't make it)
- ⏰ Commercial evacuation: FINAL (last flights departing)
- ⏰ Singapore loading: FINAL (ship must leave or ride out storm)

**Decision Windows Still Open:**
- Charter/helicopter evacuation (VIPs, medical)
- Shelter-in-place orders
- Production decisions
- Worker release (but roads degrading)

**Key Pressures:**
- 4 boats still 6+ hours from harbor
- 47 people at airport, 32 seats on last plane
- Singapore ship half-loaded—finish or abandon?
- Workers who didn't leave earlier now asking to leave

**Sample NarrativeAgent Content:**
> *[Airport announcement]: "Attention passengers: This is the final departure for the mainland. All remaining flights are canceled. Passengers without boarding passes should proceed to the shelter area."*

> *[Text message, Gateway harbor master]: "Pacific Harvester and three others still out. Rosa says they're coming in but it's going to be close."*

> *[Haven extraction plant supervisor]: "We can run one more cycle before we need to secure the tanks. That's 8 hours. Your call."*

---

### T-24h: LOCKDOWN BEGINS

**Weather:**
- Direct hit confirmed: 95% probability
- Tropical storm conditions on island
- Sustained winds: 45-55 mph, gusts to 75
- Seas: 18-20 feet, harbor closed
- Heavy rain: 1-2 inches/hour
- Storm surge beginning

**Intensity Level:** 6-7

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| Airport | ❌ Closed | Wind limits exceeded; no flights possible |
| Harbor | ❌ Closed | No vessel movement |
| Ring Road | ❌ Partial closure | Haven-Sterling section flooded |
| Crater Roads | ❌ Closed | Too dangerous; falling debris |
| Power Grid | ⚠️ Stressed | Brownouts possible; Heartland monitoring |
| Communications | ⚠️ Degraded | Cell towers struggling; radio still good |
| Hospital | 🔴 Emergency only | Accepting only critical cases |

**Decision Windows CLOSED:**
- ❌ Evacuation (no one leaves the island now)
- ❌ Fleet movement
- ❌ Inter-parish road travel (except emergency)

**Decision Windows Still Open:**
- Production (Keystone can still run if power holds)
- Worker shelter assignments
- Power prioritization (who gets it if rationing needed?)
- Emergency response positioning

**Key Pressures:**
- 2 boats still not confirmed in harbor
- Road to Keystone housing flooding
- Extraction plant tanks need to be secured or vented
- Hospital requesting power priority commitment
- Workers at Keystone asking about families in housing

**Sample NarrativeAgent Content:**
> *"All residents should be in shelter NOW. Do not attempt to travel. Emergency services will not respond until conditions improve. Repeat: shelter in place."*

> *[Frank Reeves to team]: "I need skeleton crew in the clean rooms. Everyone else to the shelter. If you've got family in the housing complex, I... I don't have good news about the access road."*

> *[Yuki Tanaka to Summit]: "Reservoir at 87% and rising. I may need to make spillway decisions in the next 6-8 hours. I need to know your priorities."*

---

### T-18h: HURRICANE CONDITIONS

**Weather:**
- Hurricane conditions on island
- Sustained winds: 65-80 mph, gusts to 100
- Storm surge: 4-6 feet at Haven harbor
- Rain: 2-3 inches/hour
- Visibility near zero in rain bands
- First structural damage reports

**Intensity Level:** 7-8

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| Airport | ❌ Closed | Hangar damage reported |
| Harbor | ❌ Closed | Surge flooding port; extraction plant at risk |
| Ring Road | ❌ Closed | Multiple sections impassable |
| Crater Roads | ❌ Closed | Landslide reported on Summit access |
| Power Grid | ❌ Partial failure | Gateway offline; others on backup/rationed |
| Communications | ❌ Partial failure | Cell towers down; satellite and radio only |
| Hospital | 🔴 Overwhelmed | 15 storm-related injuries already |

**No Movement Possible Between Parishes**

Each parish is now isolated. Decisions must be made locally.

**Key Pressures:**
- Haven fuel terminal showing stress on one tank seal
- Keystone worker housing taking water
- Sterling lower district beginning to flood
- Hospital generator fuel: 36 hours
- One boat (*Pacific Harvester*) still unaccounted for
- Heartland reservoir: 92% and rising

**Sample NarrativeAgent Content:**
> *[Emergency broadcast]: "This is Concordia Emergency Management. Category 4 conditions. All residents remain sheltered. Multiple injuries reported. Do not go outside for any reason."*

> *[Haven fuel terminal, radio]: "Control, this is Terminal. Tank 3 seal is showing pressure variance. We're not in failure yet but I don't like what I'm seeing. Requesting guidance."*

> *[Keystone housing resident, social media—intermittent]: "Water in the first floor. Kids are scared. Company said this housing was safe. Where's the help?"*

---

### T-12h: PEAK INTENSITY

**Weather:**
- Midas at maximum intensity over island
- Sustained winds: 100-120 mph, gusts to 145
- Storm surge: 8-10 feet at Haven
- Rain: 3-4 inches/hour
- Total rainfall so far: 10 inches
- Catastrophic damage occurring

**Intensity Level:** 9-10 (MAXIMUM)

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| Airport | ❌ Damaged | Control tower damaged; runway debris |
| Harbor | ❌ Damaged | Crane collapse; extraction plant flooding |
| Ring Road | ❌ Destroyed in sections | Multiple washouts |
| Crater Roads | ❌ Impassable | |
| Power Grid | ❌ Island-wide failure | Dam emergency shutdown; all on generators |
| Communications | ❌ Minimal | Radio only; satellite intermittent |
| Hospital | 🔴 Generator power | Primary generator running; backup on standby |

**Complete Parish Isolation**

**Key Pressures:**
- Haven extraction plant flooded—chemical release possible
- Keystone clean rooms lost environmental control
- Heartland reservoir at 97%—spillway decision NOW
- Sterling hospital generator fuel: 24 hours remaining
- Worker injuries at multiple locations
- Two workers trapped at fuel terminal

**Sample NarrativeAgent Content:**
> *[Emergency radio, breaking]: "All stations—Haven extraction reports flooding. Chemical containment status unknown. Shelter in place. Close all vents."*

> *[Yuki Tanaka, Heartland]: "Reservoir at 97%. I'm at the threshold. If I open the spillway, Sterling floods. If I don't and it keeps rising, I risk the dam. I need a decision. I need it now."*

> *[Frank Reeves, Keystone]: "Clean rooms are gone. Batch is contaminated. But I've got bigger problems—I've got people in the housing complex and I can't reach them."*

---

### T-8h: THE EYE

**Weather:**
- Eye passing over island
- Sudden calm: winds drop to 15-20 mph
- Rain stops temporarily
- Stars may be visible
- FALSE SENSE OF SAFETY—backside coming in 2-3 hours
- Storm surge still elevated

**Intensity Level:** 5-6 (temporary)

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| All systems | ❌ Damaged | Assessing; no repairs possible yet |
| Movement | ⚠️ Briefly possible | 2-hour window before backside hits |
| Power Grid | ❌ Down | Dam offline; generators only |
| Communications | ⚠️ Partial | Some cell service restored in eye |

**CRITICAL DECISION WINDOW:**

The eye provides 2-3 hours of relative calm. Teams can:
- Attempt emergency rescues
- Move critical supplies
- Evacuate trapped people
- Assess damage

**BUT:** Backside of hurricane is coming. Anyone caught outside when it arrives is in extreme danger. Some backside winds will exceed frontside.

**Key Pressures:**
- Trapped workers at fuel terminal: rescue now or wait?
- Housing complex residents: can we reach them?
- Sterling flooding: door-to-door checks possible?
- *Pacific Harvester*: any chance to search?
- Hospital needs fuel transfer from depot—possible in the eye?

**Sample NarrativeAgent Content:**
> *[Emergency broadcast]: "The eye of Hurricane Midas is passing over Concordia. Conditions are temporarily calm but the backside of the storm will arrive in 2-3 hours with potentially stronger winds. Do NOT be deceived by the calm. Remain sheltered unless conducting authorized emergency operations."*

> *[Maria Santos]: "I've got two people trapped at the terminal and a window to get them out. If I send a team now, they might make it back before the backside. Might."*

> *[Mayor Chen]: "I've got reports of elderly residents in the flood zone who didn't make it to shelter. If we're going to check on them, it's now or never."*

---

### T-6h: BACKSIDE IMPACT

**Weather:**
- Backside of hurricane hits
- Winds from opposite direction: 90-110 mph, gusts to 130
- Structures weakened by frontside now failing
- Storm surge: 10-12 feet (peak)
- Rain: 2-3 inches/hour
- Additional 4-6 inches expected

**Intensity Level:** 8-9

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| All systems | ❌ Damaged | Further damage occurring |
| Movement | ❌ Impossible | Anyone caught outside in extreme danger |

**Decision Windows:**
- Emergency rescues no longer possible
- Wait for conditions to improve
- Manage with available resources only

**Key Pressures:**
- Did rescue teams make it back?
- Sterling flooding now at peak—how bad?
- Heartland spillway release (if it happened)—impact?
- Generator fuel consumption—how long can we last?
- Injury count rising; hospital capacity stretched

**Sample NarrativeAgent Content:**
> *[Emergency broadcast]: "Backside conditions have arrived. All residents MUST remain sheltered. Conditions are extremely dangerous. We have received reports of structural failures. Emergency services cannot respond."*

> *[Status unknown on various rescue/movement attempts from the eye—consequences being revealed]*

---

### T+0h: LANDFALL COMPLETE / STORM EXITING

**Weather:**
- Center has passed; storm exiting to northwest
- Sustained winds: 60-75 mph, gusts to 95
- Still dangerous, but decreasing
- Rain: 1-2 inches/hour, tapering
- Storm surge beginning to recede
- Total rainfall: 16 inches

**Intensity Level:** 7 (declining)

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| Airport | ❌ Damaged | Assessment needed |
| Harbor | ❌ Damaged | Assessment needed |
| Ring Road | ❌ Multiple failures | Some sections may be passable |
| Power Grid | ❌ Down | Dam inspection required before restart |
| Communications | ⚠️ Partial | Radio working; some cell restored |
| Hospital | ⚠️ Strained | 28 storm injuries, 4 critical |

**Decision Windows Opening:**
- Damage assessment teams
- Priority rescue operations
- Resource allocation for recovery
- Communication to outside world (what do we say?)

**Key Pressures:**
- Full scope of damage unknown
- Missing persons (anyone unaccounted for?)
- Chain of command questions (who's in charge now?)
- Outside world wants information
- Workers want to know about families

**Sample NarrativeAgent Content:**
> *[Marcus Webb, radio address]: "The worst has passed. Our immediate priorities are: life safety, accounting for all personnel, and damage assessment. Parish managers: report status when able. We will get through this together."*

---

### T+6h: TROPICAL STORM CONDITIONS

**Weather:**
- Midas now 80 miles northwest, weakening
- Sustained winds: 35-45 mph, gusts to 60
- Rain ending
- Surge receding rapidly
- Debris, flooding, and downed trees everywhere

**Intensity Level:** 5-6 (declining)

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| Airport | ❌ Closed | Runway debris clearance: 12-24 hours |
| Harbor | ⚠️ Limited | Small boat movement possible |
| Ring Road | ⚠️ Partial | One route Sterling-Haven cleared |
| Crater Roads | ❌ Blocked | Landslide clearance needed |
| Power Grid | ⚠️ Partial | Dam restarting; limited distribution |
| Communications | ⚠️ Degraded | Working on restoration |
| Hospital | ⚠️ Strained | Taking patients from other parishes |

**Recovery Phase Begins**

**Decision Windows:**
- Rescue operations (active)
- Power restoration priorities
- Road clearance priorities
- External communication (media, regulators, families)
- Accountability questions beginning

**Key Pressures:**
- Full casualty count emerging
- Property damage assessment
- *Pacific Harvester* search (what happened to the crew?)
- Singapore shipment status (did the ship make it?)
- Workers asking when they can see families
- First media inquiries arriving

**Sample NarrativeAgent Content:**
> *[Coast Guard, if available]: "Concordia, this is Coast Guard Cutter Resolute. We are en route, ETA 8 hours. What is your status and immediate needs?"*

> *[Reporter email]: "This is Sarah Chen, AP. We're hearing reports of casualties and significant damage at the Meridian facility. Can you confirm? Deadline is 2 hours."*

---

### T+12h: RECOVERY OPERATIONS

**Weather:**
- Midas dissipating over open water
- Sustained winds: 20-25 mph
- Partly cloudy, occasional showers
- Cleanup conditions reasonable

**Intensity Level:** 4

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| Airport | ⚠️ Emergency only | One runway cleared; medevac capable |
| Harbor | ⚠️ Limited | Cargo ops not possible; small craft okay |
| Ring Road | ⚠️ Partial | Two routes open |
| Crater Roads | ⚠️ One route | Summit accessible |
| Power Grid | ⚠️ 60% restored | Keystone, Summit, Heartland online |
| Communications | ✅ Mostly restored | Cell service spotty |
| Hospital | ⚠️ Strained | Medevac available for critical |

**Decision Windows:**
- Medevac prioritization
- External communication strategy
- Worker release to check on families
- Production restart assessment
- Accountability preparation

**Key Pressures:**
- Confirmed fatalities (number depends on team decisions)
- *Pacific Harvester* found (survivors? casualties?)
- Media presence increasing
- HQ sending "crisis team"
- Insurance adjusters arriving
- OSHA/regulatory inquiries beginning
- Workers exhausted and emotional

**Sample NarrativeAgent Content:**
> *[Search and rescue report]: "[Outcome of Pacific Harvester search—depends on earlier decisions]"*

> *[HQ notification]: "Crisis response team departing Chicago, arriving tomorrow. Please prepare full incident timeline and decision log. CEO wants briefing upon arrival."*

---

### T+24h: ACCOUNTABILITY BEGINS

**Weather:**
- Clear skies, light winds
- Recovery operations in full swing

**Intensity Level:** 4 (stable)

**Infrastructure Status:**
| System | Status | Notes |
|--------|--------|-------|
| Airport | ⚠️ Limited commercial | Some flights resuming |
| Harbor | ⚠️ Limited | Assessment ongoing |
| Ring Road | ✅ Mostly open | All parishes accessible |
| Power Grid | ✅ 85% restored | Full restoration: 48-72 hours |
| Communications | ✅ Normal | |
| Hospital | ⚠️ Elevated | Still handling storm injuries |

**Recovery Phase Continues**

**Decision Windows:**
- Public statements and accountability
- Regulatory response
- Worker support and debriefing
- Production restart decisions
- Long-term recovery planning

**Key Pressures:**
- Full accounting: deaths, injuries, damage
- Questions about decisions made during storm
- Media coverage intensifying
- Families of casualties demanding answers
- Workers processing trauma
- Singapore contract implications
- Insurance claims

**Sample NarrativeAgent Content:**
> *[Media headline]: "Hurricane Midas: [X] Dead, Questions Mount About Concordia Response"*

> *[HQ crisis team leader]: "We need to understand every decision that was made, by whom, and why. This isn't about blame—it's about learning. But there will be questions, and we need answers."*

---

## Infrastructure Failure Cascade

```
T-72h    T-48h    T-36h    T-24h    T-18h    T-12h    T-8h     T-6h     T+0h     T+6h
  │        │        │        │        │        │        │        │        │        │
  │        │        │        │        │        │        │        │        │        │
AIRPORT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╸LIMITED╺━━━━━━━━━━╸CLOSED╺━━━━━━━━━━━━━━━━━━━━╸EMERGENCY
  │        │        │        │        │        │        │        │        │        │
HARBOR ━━━━━━━━━━━━━━━━━╸ADVISORY╺━━━━╸CLOSED╺━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╸LIMITED
  │        │        │        │        │        │        │        │        │        │
RING ROAD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━╸DEGRADED╺━╸PARTIAL╺━╸CLOSED╺━━━━━━━━━━╸PARTIAL╺━╸OPEN
  │        │        │        │        │        │        │        │        │        │
CRATER ROADS ━━━━━━━━━━━━━━━━━━━━━━━━━╸CAUTION╺━━╸CLOSED╺━━━━━━━━━━━━━━━━━━━━━╸ONE ROUTE
  │        │        │        │        │        │        │        │        │        │
POWER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╸STRESSED╺━╸PARTIAL╺━╸DOWN╺━━━━━━╸PARTIAL╺━╸85%
  │        │        │        │        │        │        │        │        │        │
COMMS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╸DEGRADED╺━╸PARTIAL╺━╸MINIMAL╺━━╸PARTIAL╺━╸NORMAL
  │        │        │        │        │        │        │        │        │        │
```

---

## Decision Window Summary

| Decision | Opens | CRITICAL | Closes | Consequence of Missing |
|----------|-------|----------|--------|----------------------|
| Fleet recall | T-72h | T-48h | T-36h | Boats caught at sea |
| Commercial evacuation | T-72h | T-48h | T-36h | People trapped on island |
| Singapore loading | T-72h | T-48h | T-36h | Contract breach or half-shipment |
| Shelter policy | T-72h | T-48h | T-24h | Chaos at shelter doors |
| Essential personnel | T-72h | T-48h | T-24h | Workforce confusion |
| Power prioritization | T-48h | T-24h | T-18h | Ad hoc decisions under pressure |
| Production halt | T-48h | T-24h | T-18h | Workers at risk or equipment damaged |
| Worker release | T-48h | T-36h | T-24h | Workers can't reach families |
| Fuel terminal evacuation | T-24h | T-18h | T-12h | Workers trapped |
| Housing evacuation | T-24h | T-18h | T-12h | Residents trapped |
| Spillway decision | T-18h | T-12h | T-12h | Dam at risk or uncontrolled flood |
| Eye rescues | T-8h | T-8h | T-6h | Miss the window entirely |
| Public statement | T+6h | T+12h | T+24h | Media narrative set without you |

---

## Intensity Level Mapping

| Level | Conditions | Decision Pressure | Time Pressure |
|-------|------------|-------------------|---------------|
| 1-2 | Normal operations | Low | None |
| 3-4 | Watch phase; uncertainty | Moderate | Hours to days |
| 5-6 | Warning phase; degrading | High | Hours |
| 7-8 | Hurricane conditions | Extreme | Minutes to hours |
| 9-10 | Peak intensity; crisis | Maximum | Immediate |

**Intensity affects:**
- NarrativeAgent message frequency and urgency
- Decision timer length
- Consequence severity
- Emotional pressure in framing

---

## Weather State Machine (For Coding)

```typescript
interface WeatherState {
  timeOffset: number;         // Hours from landfall (negative = before)
  phase: 'watch' | 'warning' | 'hurricane' | 'eye' | 'backside' | 'recovery';
  intensityLevel: number;     // 1-10
  
  winds: {
    sustained: number;        // mph
    gusts: number;            // mph
  };
  
  rain: {
    rate: number;             // inches/hour
    total: number;            // cumulative inches
  };
  
  surge: {
    height: number;           // feet above normal
    rising: boolean;
  };
  
  visibility: 'clear' | 'reduced' | 'poor' | 'near-zero';
  
  infrastructure: {
    airport: 'normal' | 'limited' | 'closed' | 'damaged' | 'emergency';
    harbor: 'normal' | 'advisory' | 'closed' | 'damaged' | 'limited';
    ringRoad: 'normal' | 'degraded' | 'partial' | 'closed' | 'open';
    craterRoads: 'normal' | 'caution' | 'closed' | 'oneRoute';
    power: 'normal' | 'stressed' | 'partial' | 'down' | 'restored85';
    comms: 'normal' | 'degraded' | 'partial' | 'minimal' | 'restored';
    hospital: 'normal' | 'preparing' | 'surge' | 'emergency' | 'overwhelmed' | 'strained';
  };
  
  parishAccess: {
    gateway: boolean;
    haven: boolean;
    sterling: boolean;
    keystone: boolean;
    heartland: boolean;
    summit: boolean;
  };
  
  decisionWindows: {
    fleetRecall: 'open' | 'critical' | 'closed';
    evacuation: 'open' | 'critical' | 'closed';
    singaporeLoading: 'open' | 'critical' | 'closed';
    // ... etc
  };
}

const weatherProgression: WeatherState[] = [
  { timeOffset: -72, phase: 'watch', intensityLevel: 2, ... },
  { timeOffset: -60, phase: 'watch', intensityLevel: 3, ... },
  { timeOffset: -48, phase: 'warning', intensityLevel: 4, ... },
  // ... full progression
];
```

---

## CM Controls

The Crucible Master can:

**Adjust Pacing:**
- Accelerate through low-intensity periods
- Slow down at critical decision points
- Pause for team discussion

**Modify Weather:**
- Make storm track shift (better or worse)
- Adjust intensity (+/- 1 category)
- Extend or shorten eye duration

**Control Information:**
- Delay bad news
- Surface hidden consequences
- Introduce conflicting reports

**Trigger Events:**
- Infrastructure failures (ahead of schedule)
- Injuries or casualties
- New information (boat found, leak detected, etc.)

---

## Integration with Values Experience

**Pre-Crisis (T-72h start):**
Teams enter simulation having just completed values discovery. They have:
- Personal values (top 5 ranked)
- Team values and definitions
- Written commitment statement
- Decision process agreement

**No values prompts during storm.** Teams must remember their own values.

**Post-Crisis (T+24h):**
Debrief compares stated values to decisions made at each phase:
- "At T-48h, you decided X. Your commitment said Y."
- "When intensity reached 8, your stated value of Safety scored -1.4."
- "The gap between your commitment and your decisions widened as pressure increased."

---

## Next: Complete Dilemma Library

With timeline locked, remaining dilemmas can be placed precisely:
- 15 Watch Phase (T-72h to T-24h): Uncertainty, positioning, resource allocation
- 20 Crisis Phase (T-24h to T+6h): Impossible tradeoffs, time pressure, cascading failures
- 10 Recovery Phase (T+6h to T+24h): Accountability, consequences, what now

Current count: 18 (3 per parish)
Needed: 27 more

Dilemmas will be keyed to specific timeline points and intensity levels.
