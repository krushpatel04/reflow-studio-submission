import json, hashlib, os
from engine.resize import resize
U = os.environ["CHAMELEON_UPSTREAM"]
for n in ("level1_warmup", "level2_core", "level3_advanced"):
    t = json.load(open(f"{U}/input/chameleon_sample_{n}.json"))
    print(n, hashlib.sha256(json.dumps(resize(t["source"], t["target_canvas"]), sort_keys=True).encode()).hexdigest())
