import json,sys,collections
d=json.load(open(sys.argv[1]))
nr=d["normalized_result"]; g=nr["graph"]
print("FULL LIMITATIONS (top-level):")
for l in d["limitations"]: print(" -",l)
print("confidence:",d.get("confidence"),"authority:",d.get("authority"))
print("relationship_coverage:",json.dumps(d.get("relationship_coverage"))[:500])
print("semantic_graph nodes/edges:",len(nr["semantic_graph"].get("nodes",[])),len(nr["semantic_graph"].get("edges",[])))
print("semantic node kinds:",collections.Counter(n.get("kind") for n in nr["semantic_graph"].get("nodes",[])).most_common(10))
nodes={n["node_id"]:n for n in g["nodes"]}
rel=collections.Counter(e.get("relation") for e in g["edges"]); print("edge relations:",rel)
# module-level import adjacency
def modpath(n):
    for o in n.get("observations",[]):
        p=o.get("properties",{})
        if p.get("module_path"): return p["module_path"]
    try:
        k=json.loads(n["identity"]["key"]); 
        if isinstance(k,list) and len(k)>1: return k[1]
    except Exception: pass
    return None
imports=collections.defaultdict(set); unresolved=0; statuses=collections.Counter()
for e in g["edges"]:
    p=e.get("properties",{})
    if p.get("module_link_kind")=="import" or e.get("relation") in ("imports","depends-on"):
        s=modpath(nodes.get(e["source_node_id"],{})); t=p.get("resolved_path") or modpath(nodes.get(e["target_node_id"],{}))
        statuses[p.get("resolution_status")]+=1
        if s and t: imports[s].add(t)
print("import resolution statuses:",statuses)
focus=["src/simulation.js","src/powerManager.js","src/disasterManager.js","src/miscTiles.js","src/evaluation.js","src/census.js","src/valves.js","src/budget.js","src/emergencyServices.js","src/repairManager.js","src/mapScanner.js","src/blockMapUtils.js","src/residential.js","src/random.ts"]
for f in focus:
    print(f,"->",sorted(imports.get(f,[]))[:20])
# reverse: who imports random.ts
rev=[s for s,ts in imports.items() if any("random" in t for t in ts)]
print("modules importing random.ts:",len(rev),sorted(rev)[:40])
# storage / asset nodes
for n in g["nodes"]:
    if n["kind"] in ("storage","package","unknown","artifact"):
        print(n["kind"],":",(n.get("observations") or [{}])[0].get("label"))
