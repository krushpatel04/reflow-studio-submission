#!/usr/bin/env python3
"""Separate-process varied-task cache probe; run from repo root with upstream env."""
import copy
import hashlib
import importlib
import json
import os
from pathlib import Path
import resource
import statistics
import subprocess
import sys
import time
import warnings

ROOT = Path.cwd()
OUT = ROOT / "reports/text-measurement-reuse-20261029/cache-comparison"
UPSTREAM = Path(os.environ["CHAMELEON_UPSTREAM"])
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(OUT))
from scripts.submission_workload_profile import synthetic_families

def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()

def worker(variant):
    resize = importlib.import_module(f"{variant}.resize").resize
    fit = importlib.import_module(f"{variant}.text_fit")
    public = [json.loads(p.read_text()) for p in sorted((UPSTREAM / "input").glob("*.json"))]
    dense = synthetic_families(public[0])
    # Exercise imports once, then empty only the font cache before measurements.
    resize(public[2]["source"], public[2]["target_canvas"])
    fit._font.cache_clear()
    results, phases = [], {}
    def run(task):
        source, target = copy.deepcopy((task["source"], task["target_canvas"]))
        before = copy.deepcopy((source, target))
        with warnings.catch_warnings(record=True) as caught:
            warnings.simplefilter("always")
            result = resize(source, target)
        assert (source, target) == before
        results.append((result, [(w.category.__name__, str(w.message)) for w in caught]))
    def phase(name, tasks):
        start = time.perf_counter()
        for task in tasks:
            run(task)
        phases[name] = {"seconds": time.perf_counter() - start,
            "cache": fit._font.cache_info()._asdict(),
            "rss_highwater_bytes_macos": resource.getrusage(resource.RUSAGE_SELF).ru_maxrss}
    phase("public-and-dense", public + [dense["dense16"], dense["dense100"]])
    phase("repeated-public", public * 10)
    tasks = []
    for index in range(120):
        tasks.append({"source": {"canvas": {"width": 400, "height": 400}, "elements": [{
            "id": "copy", "type": "text", "x": 20, "y": 20, "width": 300, "height": 80,
            "content": "Ordinary copy with enough words to wrap cleanly", "font_family": "Solstice Sans",
            "font_size": 24 + index / 16, "font_weight": "bold" if index % 2 else "regular",
            "color": "rgba(0,0,0,1)"}]}, "target_canvas": {"width": 48, "height": 120}})
    phase("varied-120", tasks)
    phase("repeated-public-after-churn", public * 10)
    print(json.dumps({"phases": phases, "outputs": results, "input_sha256": digest(tasks)}))

if len(sys.argv) > 1:
    worker(sys.argv[1])
    raise SystemExit

OUT.mkdir(parents=True, exist_ok=True)
sources = {}
for variant in ("unbounded", "bounded"):
    package = OUT / variant
    package.mkdir(exist_ok=True)
    sources[variant] = {}
    for path in sorted((ROOT / "engine").glob("*.py")):
        data = path.read_bytes()
        if path.name == "text_fit.py":
            # Reconstruct the pre-bound decorator from final source for reproduction.
            assert b"@lru_cache(maxsize=None)" in data or b"@lru_cache(maxsize=128)" in data
            data = data.replace(b"@lru_cache(maxsize=128)", b"@lru_cache(maxsize=None)")
            if variant == "bounded":
                data = data.replace(b"@lru_cache(maxsize=None)", b"@lru_cache(maxsize=128)")
        (package / path.name).write_bytes(data)
        sources[variant][path.name] = hashlib.sha256(data).hexdigest()

report = {"method": "Three alternating pairs of separate fresh macOS processes; native layout only. Warm imports, clear cache once, then retain realistic process cache throughout each sequence. Exact full outputs/warnings and input immutability checked. RSS is process cumulative high-water, not per-phase or current RSS.", "sources": sources, "trials": []}
expected = None
for trial in range(3):
    row = {}
    for variant in (("unbounded", "bounded") if trial % 2 == 0 else ("bounded", "unbounded")):
        result = json.loads(subprocess.check_output([sys.executable, __file__, variant]))
        if expected is None:
            expected = result["outputs"]
        assert result["outputs"] == expected, (trial, variant)
        row[variant] = {"phases": result["phases"], "output_sha256": digest(result["outputs"]), "input_sha256": result["input_sha256"]}
        print(trial, variant, result["phases"], flush=True)
    report["trials"].append(row)
report["exact_output_and_warning_equality"] = True
report["source_and_target_unchanged"] = True
report["median_seconds"] = {phase: {variant: statistics.median(row[variant]["phases"][phase]["seconds"] for row in report["trials"])
    for variant in ("unbounded", "bounded")} for phase in report["trials"][0]["bounded"]["phases"]}
(OUT / "results.json").write_text(json.dumps(report, indent=2) + "\n")
