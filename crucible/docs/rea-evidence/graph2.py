import json,sys,collections
d=json.load(open(sys.argv[1])); g=d["normalized_result"]["graph"]
nodes={n["node_id"]:n for n in g["nodes"]}
imp=[e for e in g["edges"] if e.get("relation")=="imports"]
print("sample import edge:",json.dumps(imp[0])[:900])
def mp(n):
    for o in n.get("observations",[]):
        p=o.get("properties",{})
        for k in ("module_path","path","artifact_path"):
            if p.get(k): return p[k]
        if o.get("label"): return o["label"].split(":")[0]
    return None
imports=collections.defaultdict(set)
for e in imp:
    p=e.get("properties",{})
    s=mp(nodes[e["source_node_id"]]); t=p.get("resolved_path") or p.get("specifier") or mp(nodes.get(e["target_node_id"],{}))
    if s and t: imports[s].add(t)
focus=["src/simulation.js","src/powerManager.js","src/disasterManager.js","src/miscTiles.js","src/evaluation.js","src/census.js","src/valves.js","src/budget.js","src/emergencyServices.js","src/repairManager.js","src/mapScanner.js","src/blockMapUtils.js","src/residential.js","src/zoneUtils.js"]
for f in focus: print(f,"->",", ".join(sorted(x.replace("src/","") for x in imports.get(f,[]))))
rev=sorted(s for s,ts in imports.items() if any(t.endswith("random.ts") for t in ts))
print("modules importing random.ts (%d):"%len(rev),", ".join(x.replace("src/","") for x in rev))
nf=[(mp(nodes[e["source_node_id"]]),e["properties"].get("specifier")) for e in imp if e["properties"].get("resolution_status")=="not-found"]
print("not-found imports sample:",nf[:8])
