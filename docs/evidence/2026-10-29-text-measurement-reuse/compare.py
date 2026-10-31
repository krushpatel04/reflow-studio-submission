#!/usr/bin/env python3
"""Run from repo root. Layout-only differential timing; no renderer/container claim."""
import copy
import cProfile
import hashlib
import importlib
import json
import os
from pathlib import Path
import platform
import pstats
import statistics
import subprocess
import sys
import time
import warnings

ROOT = Path.cwd()
BASE = "2c118f05027d7959be9e471b1182014f8d6a1496"
OUT = ROOT / "reports/text-measurement-reuse-20261029/comparison"
OUT.mkdir(parents=True, exist_ok=True)
UPSTREAM = Path(os.environ["CHAMELEON_UPSTREAM"])
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(OUT))
from scripts.submission_workload_profile import synthetic_families

def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()

manifest = {}
modules = {}
for variant in ("baseline", "candidate"):
    package = OUT / variant
    package.mkdir(exist_ok=True)
    manifest[variant] = {}
    for path in sorted((ROOT / "engine").glob("*.py")):
        data = subprocess.check_output(["git", "show", f"{BASE}:engine/{path.name}"]) if variant == "baseline" else path.read_bytes()
        (package / path.name).write_bytes(data)
        manifest[variant][path.name] = hashlib.sha256(data).hexdigest()
    modules[variant] = (importlib.import_module(f"{variant}.resize"), importlib.import_module(f"{variant}.text_fit"))

cases = {}
for path in sorted((UPSTREAM / "input").glob("*.json")):
    name = "public-" + next(level for level in ("level1", "level2", "level3") if level in path.name)
    cases[name] = json.loads(path.read_text())
synthetic = synthetic_families(cases["public-level1"])
cases.update({name: synthetic[name] for name in ("dense16", "dense100", "infeasible")})
for name, content, target in (
    ("unicode-wrapped", "Café e\u0301 Ω中 🙂\nhello\tworld  café", {"width": 48, "height": 200}),
    ("empty", "", {"width": 32, "height": 32}),
    ("unicode-infeasible", "Café e\u0301 Ω中 🙂", {"width": 1, "height": 1}),
):
    cases[name] = {"source": {"canvas": {"width": 400, "height": 400}, "elements": [
        {"id": "copy", "type": "text", "x": 20, "y": 20, "width": 300, "height": 80,
         "content": content, "font_family": "Solstice Sans", "font_size": 24,
         "font_weight": "regular", "color": "rgba(0,0,0,1)"}]}, "target_canvas": target}

def run(variant, task):
    resize, fit = modules[variant]
    source = copy.deepcopy(task["source"])
    target = copy.deepcopy(task["target_canvas"])
    before = copy.deepcopy((source, target))
    fit._font.cache_clear()
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        start = time.perf_counter()
        result = resize.resize(source, target)
        elapsed = time.perf_counter() - start
    assert (source, target) == before, "input mutation"
    return elapsed, result, [(w.category.__name__, str(w.message)) for w in caught]

report = {"baseline_git_sha": BASE, "platform": platform.platform(), "python": sys.version,
          "method": "Five alternating layout-only trials after one untimed warmup per variant/case; per-call font cache cleared; inputs copied before call; full dict and warning equality asserted. No concurrent-work control or container timing.",
          "sources": manifest, "fonts": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted((UPSTREAM / "brand_kit/fonts").glob("*.ttf"))}, "cases": {}}
for name, task in cases.items():
    expected = run("baseline", task)[1:]
    assert run("candidate", task)[1:] == expected, name
    samples = {variant: [] for variant in modules}
    for trial in range(5):
        for variant in (("baseline", "candidate") if trial % 2 == 0 else ("candidate", "baseline")):
            elapsed, output, caught = run(variant, task)
            assert (output, caught) == expected, (name, variant, trial)
            samples[variant].append(elapsed)
    report["cases"][name] = {"input_sha256": digest(task), "output_sha256": digest(expected[0]),
        "warnings": expected[1], "source_and_target_unchanged": True, "exact_output_and_warnings_equal": True,
        "seconds": samples, "median_seconds": {v: statistics.median(s) for v, s in samples.items()}}
    print(name, report["cases"][name]["median_seconds"], flush=True)

report["profile_dense100"] = {}
for variant in modules:
    profile = cProfile.Profile()
    profile.enable()
    run(variant, cases["dense100"])
    profile.disable()
    stats = pstats.Stats(profile)
    report["profile_dense100"][variant] = [{"file": key[0], "line": key[1], "function": key[2],
        "primitive_calls": value[0], "calls": value[1], "self_seconds": value[2], "cumulative_seconds": value[3]}
        for key, value in stats.stats.items() if key[2] in ("_texts", "_block_widths", "_pillow_widths", "getlength", "<method 'getlength' of 'Font' objects>")]
(OUT / "results.json").write_text(json.dumps(report, indent=2) + "\n")
