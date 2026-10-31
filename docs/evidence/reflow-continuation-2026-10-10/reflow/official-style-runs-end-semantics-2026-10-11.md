# Official `style_runs.end` semantics: schema vs converter, 2026-10-11

Docs only (#4, official contract fidelity). Root read the live open #4 body on 2026-10-11: it requires a published-schema field support matrix and actual native/rendered verification; this one discrepancy is a bounded converter-level reproduction, not completion of either gate. The evidence is the pinned upstream `chameleon-a44a060` at HEAD `a44a06046b0413f0785e7203955c3822e0acbc32`. It is independent of Reflow main. The upstream was read and executed, not modified; `git status --short` stayed empty after every run. No Reflow source was touched. The Coordinator found this; CLI2 re-ran the probe independently.

## 1. Sources (pinned upstream, `path:line@blob`, sha256 of the file)

| Path | Blob | Bytes | SHA256 |
| --- | --- | --- | --- |
| `chameleon_design_schema_v0.9.json` | `5c45ec62f9035238c7b2173bf97d72cdf5c591a1` | 5541 | `14d97d48c4f00357f7f27d2e8000ef9cc8778cac7cd5a621ed7e1261f949820d` |
| `renderer/converter/convert.py` | `c2cfb56dd8a906072a6ba47cda9b689ecfe842f5` | 10464 | `2d4f68984f1cdfe41a068d477270aedfd07f9d35a22ef61a1399ebd4774d0cde` |
| `renderer/converter/brand_fonts.py` | `0e66dfc680106a9c47bf27b7020f7af6cb1680d6` | 2710 | `c4f58d99767c7a770d731080c6bccc16334dc1058ac959747b6d0d3867c9d0a5` |
| `input/chameleon_sample_level2_core.json` | `0852d4a6096929cbc2c92a397480d98edc017463` | 3244 | `c37407fa20aefb8e1c53a3476b99973000657c3c1d93fc9637e462703955a04b` |

### Schema, verbatim (`chameleon_design_schema_v0.9.json:61@5c45ec62`)

```
          "description": "text only, optional. Per-character overrides for things like a two-color headline. 0-based, end-exclusive indices into `content`.",
```

L64 `"required": ["start", "end"]`. L66-67: `start` and `end` are each `{ "type": "integer", "minimum": 0 }`. There is no maximum and no `start <= end` constraint, so `end > len(content)` and `start > end` are both schema-valid.

### Converter, verbatim (`renderer/converter/convert.py:174-189@c2cfb56d`, inside `_append_text` L156)

```
    for run in element.get("style_runs") or []:
        start = max(0, int(run.get("start", 0)))
        end = min(n - 1, int(run.get("end", n - 1)))
        if start > end:
            continue
        if "color" in run:
            for i in range(start, end + 1):
                colors[i] = run["color"]
        if "font_weight" in run:
            run_bold = _normalize_weight(run.get("font_weight")) in _BOLD_WEIGHTS
            for i in range(start, end + 1):
                bold_flags[i] = run_bold
        if "font_style" in run or "italic" in run:
            run_italic = _is_italic(run.get("font_style") or run.get("italic"))
            for i in range(start, end + 1):
                italic_flags[i] = run_italic
```

Here `n = len(wrapped)` (L166-167, after `wrap_text`). `end` is clamped to `n - 1` and iterated with `range(start, end + 1)`, so it is **inclusive**. That holds for `color`, `font_weight` and `font_style` alike. Indices are into `wrapped`, not `content`. The probe uses `width` 1000 so no wrap occurs, and it asserts `wrapped == content`.

## 2. Probe (inline, re-runnable, assert-based)

It exits 0 only when the converter's observed colors equal the table in section 3 **and** the schema end-exclusive expectation equals the stated schema column. Content `"ABCD"`, `font_family` "Solstice Sans", `font_size` 40, `width` 1000. `R` is the run color and `K` is the default color.

```python
import collections, json, os, sys
U = os.environ["CHAMELEON_UPSTREAM"]  # pinned chameleon-a44a060 checkout
sys.path.insert(0, U)
from renderer.converter import convert
from renderer.converter.brand_fonts import load_brand_font_manager

fm = load_brand_font_manager(os.path.join(U, "brand_kit", "fonts"))
R, K = "rgba(255,0,0,1)", "rgba(0,0,0,1)"

def colors(content, runs, **kw):
    el = {"type": "text", "content": content, "font_family": "Solstice Sans", "font_size": 40,
          "width": 1000, "color": K, "style_runs": runs, **kw}
    out = collections.defaultdict(list)
    convert._append_text(out, el, fm)
    assert out["text"][0] == content, out["text"][0]  # no wrap, so n == len(content)
    return out["text_color"][0]

def code(cs):
    return "".join("R" if c == R else "K" for c in cs)

# (start, end): (converter observed, schema end-exclusive expectation)
TABLE = {(0, 2): ("RRRK", "RRKK"), (1, 1): ("KRKK", "KKKK"), (0, 4): ("RRRR", "RRRR"),
         (3, 4): ("KKKR", "KKKR"), (2, 1): ("KKKK", "KKKK")}
for (s, e), (conv, schema) in TABLE.items():
    got = code(colors("ABCD", [{"start": s, "end": e, "color": R}]))
    exp = "".join("R" if s <= i < e else "K" for i in range(4))
    assert exp == schema, (s, e, exp)
    assert got == conv, (s, e, got)
    print(f"({s},{e}) converter={got} schema={schema} {'match' if got == schema else 'MISMATCH'}")

with open(os.path.join(U, "input", "chameleon_sample_level2_core.json")) as f:
    h = next(x for x in json.load(f)["source"]["elements"] if x["id"] == "headline")
run = h["style_runs"][0]
cs = colors(h["content"], [{"start": run["start"], "end": run["end"], "color": R}],
            font_family=h["font_family"], font_size=h["font_size"], width=h["width"])
covered = [i for i, c in enumerate(cs) if c == R]
assert (len(h["content"]), run["start"], run["end"]) == (15, 6, 16)
assert covered == list(range(6, 15)), covered
print(f"level2_core headline len={len(h['content'])} run=({run['start']},{run['end']}) "
      f"converter covers {covered[0]}..{covered[-1]} inclusive; schema end {run['end']} > len")
print("OK")
```

Command, as re-run by CLI2 on 2026-10-11. `<runtime>` is the local pinned-runtime directory, redacted. It contains the `chameleon-a44a060` checkout, the Python 3.11.16 venv (Pillow 12.3.0, cr-renderer per `requirements-python-submission.txt`), and an extracted system-library root. skia needs `libEGL.so.1` from that root.

```
CHAMELEON_UPSTREAM=<runtime>/chameleon-a44a060 \
LD_LIBRARY_PATH=<runtime>/chameleon-syslibs/root/usr/lib/x86_64-linux-gnu \
<runtime>/chameleon-venv311/bin/python ofc_probe.py
```

Output (stdout and stderr). Exit code **0**:

```
Fontconfig error: Cannot load default config file
(0,2) converter=RRRK schema=RRKK MISMATCH
(1,1) converter=KRKK schema=KKKK MISMATCH
(0,4) converter=RRRR schema=RRRR match
(3,4) converter=KKKR schema=KKKR match
(2,1) converter=KKKK schema=KKKK match
level2_core headline len=15 run=(6,16) converter covers 6..14 inclusive; schema end 16 > len
OK
```

`Fontconfig error: Cannot load default config file` is stderr noise from the system-library root. The fonts come from `brand_kit/fonts` through `load_brand_font_manager`, and the asserts pass. If `LD_LIBRARY_PATH` is omitted, the run fails at import with `ImportError: libEGL.so.1` (exit 1). That is an environment failure, not a probe result.

## 3. Observed vs schema

The run is `{start, end, color: R}` on `"ABCD"` (n = 4). The schema column is `s <= i < e`. The converter column is observed.

| ID | (start, end) | Converter (observed) | Schema end-exclusive | Result |
| --- | --- | --- | --- | --- |
| S1 | (0, 2) | RRRK | RRKK | **mismatch**: converter colors index 2 (end) as well |
| S2 | (1, 1) | KRKK | KKKK | **mismatch**: a zero-length run colors one char |
| S3 | (0, 4) | RRRR | RRRR | match: `end = n` is clamped to `n - 1` |
| S4 | (3, 4) | KKKR | KKKR | match: same clamp |
| S5 | (2, 1) | KKKK | KKKK | match: the converter skips `start > end` |

The two readings agree whenever `end >= n` (the clamp absorbs the off-by-one) or `start > end`. They diverge whenever `start <= end < n`: the converter then colors exactly one extra index, `end`.

### Public sample (`input/chameleon_sample_level2_core.json@0852d4a6`)

| Element | `content` | Length | Run | Schema reading | Converter reading (observed) |
| --- | --- | --- | --- | --- | --- |
| `headline` (Solstice Serif 56, width 900, no wrap) | `Chase the Light` | 15 | `{start 6, end 16, color rgba(240,178,66,1)}` | `[6, 16)`, but `end` 16 > length 15, so the run names an index past `content`. The schema has no `maximum` and does not say whether to clamp or reject. If clamped to the length, it covers 6..14 | `end = min(14, 16) = 14`, inclusive, so it covers 6..14 (`"the Light"`) |

Indices 6..14 are `"the Light"`. This sample does **not** discriminate between the readings: a clamped exclusive reading and the converter's inclusive reading both color 6..14. Only S1 and S2 discriminate. The out-of-range `end` (16 > 15) is a separate open question, whether to clamp or reject, and it is recorded here without a resolution.

## 4. Impact: test-first guidance only

- **Both readings are recorded.** Under the Adobe-authority rules neither side is resolved here:
  - Reading A, the schema text (L61): `end` is exclusive.
  - Reading B, the official converter (L176-189): `end` is inclusive and clamped to `n - 1`.
  - The schema is the stated contract. The converter is part of the official conversion path; this probe observes its character colors directly and does not verify PNG pixels. The readings disagree when `start <= end < n` in the no-wrap probe.
- **What a future Reflow test must pin: Reading A (schema, end-exclusive).**
  - The schema is the published contract.
  - `2026-09-26-issue4/schema-support.md` already records it; root confirmed that cited blob remains on current main `1f38cd4fdc02a80bfcf9b49a9965003190c86d4e`.
  - Pin it on **source-level indices**: Reflow must preserve `start` and `end` unchanged. Do not pin it on rendered pixels.
  - The test must say that the converter's rendering is Reading B and that the question stays **unresolved pending an Adobe answer**. If Adobe answers "inclusive", the test flips and this doc is superseded.
- **Oracle**, one assertion per mismatch row. It runs against the pinned converter with the same probe setup (`"ABCD"`, Solstice Sans 40, width 1000):
  - **S1:** `(0, 2)` must equal schema `RRKK`. Today the converter gives `RRRK`, so the assertion fails.
  - **S2:** `(1, 1)` must equal schema `KKKK`. Today the converter gives `KRKK`, so the assertion fails.
  - S3, S4 and S5 are controls that must keep matching, not oracle rows.
  - **Publication form:** mark S1 and S2 `expectedFailure` with the text "converter reads end inclusive; unresolved pending Adobe answer".
    - CI stays green.
    - If the upstream converter changes, the result becomes an unexpected success, which forces a re-review.
    - Owner and file are not assigned here.
- **Reflow-side consequence:**
  - For a no-wrap input that preserves source `start`/`end`, the probed converter colors the `end` index as an extra character whenever `start <= end < n`. Actual Reflow output and PNG behavior were not exercised here.
  - Reflow must **not** silently shift `end` by −1 to compensate, because that rewrites official data and breaks Reading A.
  - Any compensation needs an Adobe answer first.
- **Out-of-range `end`** (the sample, 16 > 15) is schema-valid. Whether to clamp or reject is a separate open question. Nothing is decided here.

## 5. Cross-reference and boundaries

- **Cross-reference only:** `docs/evidence/2026-09-26-issue4/schema-support.md:51@09a9a690` (at `3c3c378`). It records "Official indices are zero-based, end-exclusive" and flags the inclusive loop as a "source-level mismatch to test, **not a reproduced renderer defect**". This doc supplies the reproduction at the `_append_text` color level. That doc is not edited.
- **Scope:**
  - colors only; `font_weight` and `font_style` share the same loop (L182-189) but were not probed
  - no PNG rendered
  - `wrap_text` index shift was not probed
- **Boundaries:**
  - docs only
  - upstream unmodified
  - no Reflow source touched
  - PY-FONT-RED is on HOLD and untouched
  - nothing on import379 or any registry
  - no secrets or identities
  - no closure claim; root publishes
