# P12 plan: fit with the renderer's font faces (GitHub #33)

Status: PLAN ONLY. Base main b7548b2. No engine edits yet. Author: Engine Engineer (agent-3).

## 1. Findings (measured on b7548b2, host files only)
- Task format ships fonts as a flat dir `brand_kit/fonts/<Family>-<Suffix>.ttf` (7 Solstice files here). Renderer: `renderer/converter/brand_fonts.build_font_dict` -> `cr_renderer FontManager.lookup(family, weight, style)`: key `normalize_family` (`_`->space, title-case, strip " Bold/Regular/Light/Italic/Medium"); family miss -> "Montserrat" -> else FIRST family in the dir (`SolsticeSans`, sorted glob); style miss -> `family[0]`.
- Fit side: `engine/text_fit.py:_path(d, e)` maps ANY family containing "Serif" to SolsticeSerif, else SolsticeSans. No other font input exists in `resize(source, target)` (no resource handle).
- Sha1 compare, renderer bytes vs `_path` file (`/tmp/fm2.py`, reproduced in `docs/evidence/2026-10-08-p12/`): 8/8 SAME for Solstice Serif/Sans x {regular, bold, italic, bolditalic}; Arial, Lora SAME (both fall to Sans); **"Times Serif" DIFF in all 4 faces** (fit: SolsticeSerif, renderer: SolsticeSans fallback). Real mismatch exists even with only the shipped kit.
- Width effect: same 20px string, SolsticeSans-Regular 242.0 vs SolsticeSerif-Regular 231.0 (4.5%). BUT L1 -> 300x250 with family forced to "Times Serif" gave identical font sizes/widths to Solstice (13.89/6.94/185.2): mismatch is real, outcome change in that case is NOT shown. No quality claim.
- NOT in scope / not claimed: the 1px tiny-text results (728x90, 160x600) are physical, unrelated.
- Real-data comparison BLOCKED: lica-data, font cache and pinned official checkout are not on this host (Reviewer search). Nothing real is claimed. Synthetic faces only (RF1).

## 2. Change (engine side only; Python only; no deps)
In `engine/text_fit.py`:
- `faces(fonts_dir)` context manager (contextvars, default None). On enter scan `*.ttf/*.otf` with the SAME rules as `brand_fonts` (stem split, weight/style suffix, `normalize_family`); on exit ALWAYS reset (try/finally). Hash/bytes are never copied; file paths are used, so faces are the renderer's own bytes by construction.
- `_path(d, e)` keeps its signature and return type (C1: `scripts/lica_official/render.py` monkeypatches it; render.py NOT edited). With no context -> current code path, byte-identical to b7548b2, touches no files beyond today's.
- With context: replicate `FontManager.lookup` including weight/style normalisation (bold/italic -> weight bold, style regular/italic/bold/bolditalic as `convert._weight_style_to_font_style`), family miss -> renderer's own fallback chain ("Montserrat", then first family) EXCEPT: a face that is absent/ambiguous (family not in dir, or style fell back) is treated as UNMEASURED: `RuntimeWarning` naming the id/family, element keeps its uniform-scaled geometry (not refit, no substitute metrics), result stays valid. Quality for such elements is "unproved".
- `resize()` signature unchanged. Context is out-of-band (C2): caller wraps `with text_fit.faces(dir): resize(...)`.

## 3. Open ownership question (human)
Wiring `scripts/lica_official/render.py` (Krush-owned) to enter `faces(...)` with the task's resource dir is NOT done here. Engine hook is default-off; someone must decide who edits render.py and where task font bytes live (`resources/blobs` ttf by `ttf_sha256`, mapped via `resources/index.json`).

## 4. Tests (RED first, additions only, existing suite UNEDITED)
New `tests_python/test_real_fonts.py` with constructed fonts (PIL-generated or copies of Solstice renamed to distinct family names with scaled advance via fontTools if present, else 2 shipped faces under new names): 
1. RED: family "Wide" mapped to a distinct face; without context fit == main; with context box width equals `ImageFont.getlength` of that face (`<= tw-2`).
2. Task-A fonts must not leak into task-B: after `with` exits (also on exception), next `resize` equals no-context output.
3. Weight/style normalisation: bold/italic/bolditalic pick expected file by sha1 vs a `lookup` model of renderer rules; missing style -> UNMEASURED warning, geometry == uniform.
4. Absent family -> warning + uniform, no crash, no substitution.
5. No-context: L1/L2/L3 + all P8 run3 hashes identical to main (`/tmp/ident.py`, `docs/evidence/2026-10-07-p11/hashes_main.txt`).
6. Context with the shipped Solstice dir: L1/L2/L3 hashes identical (shipped faces).
7. "Times Serif" shipped-kit case: with context uses Sans (renderer fallback); documents the 4-face DIFF fixed; no-context unchanged.
Mutants (script like p11/mutants.sh): drop reset; reset only on success; wrong weight; wrong style; italic<->bold swap; normalize_family skipped; fallback to Serif; unmeasured -> substitute; context default on.

## 5. Evidence path / command map (`docs/evidence/2026-10-08-p12/`)
- `fm2.py` hash table: `docs/evidence/2026-10-07-p11/devenv.sh docs/evidence/2026-10-08-p12/fm2.py`
- tests: `devenv.sh -m unittest tests_python.test_real_fonts`; full: flock `/tmp/quoroum-full-validation.lock` + `devenv.sh -m unittest discover -s tests_python -t .` + `npm run build`, `npm test`, `npx tsc --noEmit`; logs+exit in `results/midnight-run/<sha>-*`.
- genuine renderer: `tests_python/run_official_samples.sh <outdir>` (REAL/0 FALLBACK); P8 driver `docs/evidence/2026-10-07-p8/driver.py`.
- hashes: `/tmp/ident.py` -> `hashes_final.txt` vs `hashes_main.txt`.

## 6. Budget / risk
Impl <=45 min: ~40 lines engine, 1 test file. Risk: PIL cannot build distinct faces without fontTools -> fall back to renamed copies of 2 shipped faces (distinct metrics Sans vs Serif already differ 4.5%). If it cannot finish validation before 12:10Z start / 12:30Z stop: abandon, report.

## 7. Amendments (Reviewer conditions A/B/C; supersede conflicting text above)
- **A (no substitute metrics):** in context, a family absent from the dir = UNMEASURED: `RuntimeWarning` + uniform geometry. The renderer's "Montserrat"/first-family fallback is NOT used to measure. Test 7: "Times Serif" with the shipped dir -> warning + geometry == no-refit uniform; the test documents the renderer would pick Sans, and asserts we do not claim to measure it.
- **B (normalisation):** replicate `get_font_weight/get_font_style` on the LAST word of the family name (`"Foo Bold"` -> weight bold), `normalize_family` (`_`->space, `.title()`, strip " Bold/Regular/Light/Italic/Medium", FONT_MAP), and file side `brand_fonts` rules. Two files for one (family, weight, style) = AMBIGUOUS -> unmeasured + warning (renderer takes first via `next()`; we do not silently copy). Style miss -> unmeasured + warning. Tests for each.
- **C (cache isolation):** `_font` lru_cache is keyed (path, size). Context cache keys on file sha256 (path never trusted): `_font` called with a `(sha256, path)` key inside context. Leak test: same path, bytes rewritten between two `with` blocks -> second fit uses new bytes.
- **Extra mutants:** last-word weight rule skipped; cache not keyed by content; ambiguous duplicate takes first silently.
- **Claims limited to:** hook exists, default-off, no in-tree caller, official runs unaffected until render.py wired (human question open). No quality claim. Real-data comparison blocked. Reviewer probe: forcing Times Serif vs Sans changes geometry in 29/45 cases, so the hook can matter.

## 8. Caller + input shape (supersedes §2 "scan dir" and §3 ownership; parent addendum: a default-off hook with no caller is not a fix)
- **Input:** `text_fit.faces(records)`; records = iterable of `{"family", "weight": regular|bold, "style": regular|italic|bold|bolditalic, "path"}`, the same entries `scripts/lica_official/render.py:RealRenderer` builds (ExactManager, ~l.153) plus the blob path. Reason: filename round-trip is lossy (brand_fonts camel-splits "PTSans" -> "P T Sans"). A `str` dir (brand_kit layout) stays accepted via the same rules.
- **Index:** key `normalize_family(family)`; lookup replicates `FontManager.lookup` + `get_font_weight/style` last-word rule. Identical-sha256 duplicates (Archivo Black effective-weight entry) are deduped; distinct bytes for one key = AMBIGUOUS -> unmeasured + warning.
- **Caller (CLI Engineer, agent-2, owns render.py glue, P12b plan 4fddc8a):** in `run()` wrap `engine_resize.resize(...)` in `with text_fit.faces(records):`, gated on `getattr(text_fit,'faces',None)` so PR order is free. Existing `_path` monkeypatch kept; `_path(d,e)` signature kept. Engine3 owns engine/**; CLI Engineer2 owns the glue; neither edits the other.
- **Real caller test:** CLI Engineer's test builds a tiny local task (shipped Solstice files copied under new family names, no fontTools) and runs `run()`; mine is engine-level. End-to-end proof = their test + engine tests; real batch-1 zip/font cache NOT on host (searched), so no real-data claim.
- **Claims:** engine hook + one in-tree caller once both merge; no quality claim; unmeasured faces carry no metric assurance.

## 9. Amendments D1/D3/D5 (Reviewer; supersede §2/§8 on conflict)
- **D1:** records = `{family, weight, style, path, ttf_sha256}`. `faces()` hashes the file bytes and RAISES `ValueError` on mismatch BEFORE any measuring (no fallback, no warning-only); cache key = verified sha256. Table semantics mirror `ExactManager` (bold iff weight>=600 or "bold"; italic; exact match; NOT brand_fonts filename rules).
- **D3:** under the context `_path` returns the verified blob path, so render.py `metric_sha256` == renderer font-event sha256. RED test fails on b7548b2 (Solstice hash != fixture hash).
- **D5 mutants:** skip sha256 verify; weight>=600 rule wrong; identical-sha duplicate must NOT be ambiguous; distinct-bytes duplicate must be.
- Test faces: fontTools FontBuilder (PYTHONPATH lica-devdeps, as `tests_python/test_lica_shared_renderer.py`), advances e.g. 500 vs 800 per em, not renamed Solstice copies.
