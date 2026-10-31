"""Builds ledger.md tables (hashes, status from logs, font px) from files on disk. Run from repo root."""
import json, hashlib, re
from pathlib import Path
E = Path("docs/evidence/2026-10-06-r4")
sh = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()[:12] if p.exists() else "MISSING"
def px(j):
    d = json.loads(j.read_text())
    return ", ".join(f"{e['id']}={e['font_size']:.2f}" for e in d["elements"] if e["type"] == "text")
def status(log):
    t = log.read_text() if log.exists() else ""
    return ("REAL" if "REAL" in t and "FALLBACK" not in t else "NOT-PROVEN") + (" exit0" if re.search(r"^exit 0", t, re.M) else " exit?")
out = ["## Public L1-L3 (status from run.log; font px of text elements)", "", "| case | variant | status | json | png | text px |", "|---|---|---|---|---|---|"]
for v in ("P4", "P5", "P5b"):
    st = status(E / "public" / v / "run.log")
    for j in sorted((E / "public" / v).glob("*_output.json")):
        out.append(f"| {j.name[17:-12]} | {v} | {st} | `{sh(j)}` | `{sh(j.with_suffix('.png'))}` | {px(j)} |")
out += ["", "## Synthetic S1-S4", "", "| case | variant | status | json | png | text px |", "|---|---|---|---|---|---|"]
for c in ("S1_narrow_group", "S2_rotated_group", "S3_extreme_strip", "S4_extreme_tall"):
    for v in ("P4", "P5", "P5b"):
        b = E / "synthetic" / f"{c}_{v}"
        j = Path(f"{b}_output.json")
        out.append(f"| {c} | {v} | {status(Path(f'{b}.log'))} | `{sh(j)}` | `{sh(j.with_suffix('.png'))}` | {px(j) if j.exists() else '-'} |")
Path(E / "ledger_tables.md").write_text("\n".join(out) + "\n")
