# Rotated-bleed baseline RED receipt

Exact available source: `c027c2bde1c4b12f68d432dafac708cbc4809c94`; engine unchanged while preparing the new untracked plan/test/evidence files. Resize blob `af4ee21c1793878a09f75d9f4cb22d045e1e7b1f`, text_fit blob `8a5637716d7f29924f5a3e9a0d57eee0787c13e6`. These match Coordinator's independently inspected available `13dae00ca` engine blobs. Root subsequently authenticated an empty diff `c027c2bd..3d1f77cf -- engine scripts/quality` (exit 0): exact scope equivalence to published `3d1f77cf` is root-reported, not locally checked; no whole-tree equivalence claimed.

Plan: `docs/plans/rotated-bleed-2026-10-09.md`. Test: `tests_python/test_rotated_bleed.py`.

## Boundary and command
`engine/resize.py:110-114` `_covers` checks the unrotated source frame. `:124-125` stretches eligible frames to the target while preserving rotation. A 100x100 square at 90 degrees actually covers the source; stretching its frame to 200x100 at the same rotation creates corner bounds [50,-50,150,150]. Unsupported rotated bleed should retain the existing uniform transform, not receive this anisotropic exception.

Pinned Python environment, repo root:

```sh
python -m unittest tests_python.test_rotated_bleed -v
```

Executed with the existing pinned venv Python 3.11, no text/fonts/assets/renderer. Exit 1. Seven test methods, 16 subtest failures, zero errors/skips, 0.003 seconds. No full suite, qualification or expensive validation.

## Genuine failing checks
For both `shape` rectangle and `image` with `fit="cover"`, rotation +90/-90, targets 200x100/201x100:
- `test_quarter_turn_full_canvas_frames_use_uniform_fallback`: eight failures. Actual (x,y,width,height) is (0,0,200,100) or (0,0,201,100), expected preserved uniform (50,0,100,100) or (50.5,0,100,100).
- `test_quarter_turn_source_inside_does_not_gain_target_overhang`: eight failures. Independently rotated source corners are inside source; target corners exceed target height, e.g. (150,-50), (150.5,-50.5), (50,150), (50.5,150.5).

No manufactured assertion or production monkeypatch. Geometry-only image asset ID is a placeholder; no public asset, pixel, renderer or general layout-quality claim.

## Passing positive controls
Five methods pass on baseline:
- Axis-aligned rectangular footprints, rotations 0/180/-180/360, keep existing full-bleed stretch (supplied angle unchanged).
- Grouped +90/-90 shape/image keep uniform transform.
- Identity 100x100 returns exact geometry/data.
- Partial frames remain uniform.
- Source unchanged; IDs/order/z/paint/opacity/rotation/assets/group data preserved.

## Incremental Reviewer-requested checks
Only the two added methods were executed (prior seven not repeated):

```sh
python -m unittest tests_python.test_rotated_bleed.RotatedBleed.test_absent_rotation_keeps_existing_bleed tests_python.test_rotated_bleed.RotatedBleed.test_oversized_rotated_identity_keeps_source_overhang -v
```

Two methods, 0.002 seconds, exit 1, four subtest failures, zero errors/skips. Absent rotation passes as existing full-bleed behavior. Oversized rotated identity is an additional genuine RED of the same classifier, not a passing baseline control: source frame (-10,-10,120,120), +90/-90, at identity100x100 is clamped to (0,0,100,100) for shape and cover-image. Proposed uniform fallback preserves its intentional overhang exactly. Reviewer notified of this distinction.

Original raw output remains at `/tmp/rotated-bleed-red.log`, SHA256 `72c7d9acf5c46769a47cfa4c810930f3b345849fcc28d971201199d472763528`; shell exit receipt is 1. Added-controls raw output: `/tmp/rotated-bleed-added-red.log`, SHA256 `a80d852ff2da5ba845dcf55df5b9fbd26d2440470f758d49d2d4a9836368aca4`; shell exit receipt is 1. Reviewer received these retained files; no log-recovery rerun.

A final requested tiny-angle control (+/-1e-12) was run alone against the exact `git show c027c2bd:engine/resize.py` baseline loaded in memory, without reverting tracked files: one method, four genuine frame failures, 0.001 seconds, exit 1. Raw `/tmp/rotated-bleed-tiny-red.log`, SHA256 `0a1733789210f11f72cf44c63b63490b79165e3e988bf162e2b2301d9d3eff75`. Candidate execution of only that new method passes (exit 0, 0.000 seconds). No original seven-method rerun.

Across separate baseline runs: ten distinct methods; four failing methods (24 subtest failures), six passing methods. No combined rerun implied.

## Proposed slice and gates
Eligibility only: `_covers` may stretch exact multiples of 180 degrees; omitted rotation means 0. All other rotation values retain the uniform path, with no fuzzy normalization. The fallback intentionally leaves side strips on wide targets; no full-target fill claim. Existing source overhang remains allowed.

Coordinator authorized the sole-writer `_covers` patch after independent Reviewer5 exact-scope review and genuine baseline RED; no extra permission gate. Reviewer confirmed modulo-180 eligibility and the original defect. The requested oversized-identity case is an additional same-classifier RED (not a baseline-positive); that distinction was reported before the patch. Current engine/quality scope binding is root-verified as recorded above. No text_fit, resources, typography, human A/B or RF04 change.

## Focused GREEN after the bounded patch
Only `_covers`'s return condition changed: `e.get("rotation", 0) % 180 == 0`. All downstream transforms remain intact. Supplied angles are neither snapped nor normalized.

One run of `python -m unittest tests_python.test_rotated_bleed -v`: nine methods, exit 0, 0.001 seconds, all pass, zero skips/errors. Raw `/tmp/rotated-bleed-green.log`, SHA256 `b694b14063061fcfe93a835fe4ec23441dd691b2ce1e107bce9fe3c200ba2219`. Tiny-angle method was added later and passed separately, as recorded above; no combined eleven-method rerun claimed. Previously failing +90/-90 shape/image frames and corners now follow uniform fallback; oversized rotated identity retains its original overhang. Existing absent/0/180/-180/360/grouped/partial/preservation controls pass. No full suite or qualification repeated. No commit or push yet; actual diff returned for review.

Coordinator's final requested non-cover/non-rectangle controls were added with -360 in the existing axis-aligned control. Only these two methods were run against the exact baseline module and candidate: both executions exit 0, two methods, 0.000 seconds each. Raw `/tmp/rotated-bleed-new-controls.log`. Non-cover contain/fill images and ellipse/line shapes retain uniform frames; -360 retains bleed and its supplied angle. The final test file has eleven methods, SHA256 `775e161147dd7703764fd8b1baeef69726bc52449a9f58e760da9f668bff39f0`; all candidate methods are covered by incremental focused runs, not a combined rerun. The only engine diff remains `_covers` eligibility plus its axis-aligned-fallback docstring.

## Retained raw execution outputs

Copied from the existing raw files, not regenerated. Original raw SHA256 values above bind the unmodified local logs; only absolute worktree prefixes are removed below to avoid publishing human paths. Exit values were captured in the original shell output; no new execution is implied.

### rotated-bleed-red: retained exit 1

```text
test_axis_aligned_full_bleed_keeps_filling_target (tests_python.test_rotated_bleed.RotatedBleed.test_axis_aligned_full_bleed_keeps_filling_target) ... ok
test_grouped_quarter_turn_frames_keep_uniform_transform (tests_python.test_rotated_bleed.RotatedBleed.test_grouped_quarter_turn_frames_keep_uniform_transform) ... ok
test_identity_is_exact (tests_python.test_rotated_bleed.RotatedBleed.test_identity_is_exact) ... ok
test_partial_frames_keep_uniform_transform (tests_python.test_rotated_bleed.RotatedBleed.test_partial_frames_keep_uniform_transform) ... ok
test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) ... 
  test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='shape', rotation=90, width=200) ... FAIL
  test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='shape', rotation=90, width=201) ... FAIL
  test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='shape', rotation=-90, width=200) ... FAIL
  test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='shape', rotation=-90, width=201) ... FAIL
  test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='image', rotation=90, width=200) ... FAIL
  test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='image', rotation=90, width=201) ... FAIL
  test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='image', rotation=-90, width=200) ... FAIL
  test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='image', rotation=-90, width=201) ... FAIL
test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) ... 
  test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='shape', rotation=90, width=200) ... FAIL
  test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='shape', rotation=90, width=201) ... FAIL
  test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='shape', rotation=-90, width=200) ... FAIL
  test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='shape', rotation=-90, width=201) ... FAIL
  test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='image', rotation=90, width=200) ... FAIL
  test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='image', rotation=90, width=201) ... FAIL
  test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='image', rotation=-90, width=200) ... FAIL
  test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='image', rotation=-90, width=201) ... FAIL
test_source_order_and_protected_values_are_preserved (tests_python.test_rotated_bleed.RotatedBleed.test_source_order_and_protected_values_are_preserved) ... ok

======================================================================
FAIL: test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='shape', rotation=90, width=200)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 40, in test_quarter_turn_full_canvas_frames_use_uniform_fallback
    self.assertEqual((e["x"], e["y"], e["width"], e["height"]), ((width - 100) / 2, 0, 100, 100))
AssertionError: Tuples differ: (0, 0, 200, 100) != (50.0, 0, 100, 100)

First differing element 0:
0
50.0

- (0, 0, 200, 100)
?        ^

+ (50.0, 0, 100, 100)
?  +++      ^


======================================================================
FAIL: test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='shape', rotation=90, width=201)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 40, in test_quarter_turn_full_canvas_frames_use_uniform_fallback
    self.assertEqual((e["x"], e["y"], e["width"], e["height"]), ((width - 100) / 2, 0, 100, 100))
AssertionError: Tuples differ: (0, 0, 201, 100) != (50.5, 0, 100, 100)

First differing element 0:
0
50.5

- (0, 0, 201, 100)
+ (50.5, 0, 100, 100)

======================================================================
FAIL: test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='shape', rotation=-90, width=200)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 40, in test_quarter_turn_full_canvas_frames_use_uniform_fallback
    self.assertEqual((e["x"], e["y"], e["width"], e["height"]), ((width - 100) / 2, 0, 100, 100))
AssertionError: Tuples differ: (0, 0, 200, 100) != (50.0, 0, 100, 100)

First differing element 0:
0
50.0

- (0, 0, 200, 100)
?        ^

+ (50.0, 0, 100, 100)
?  +++      ^


======================================================================
FAIL: test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='shape', rotation=-90, width=201)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 40, in test_quarter_turn_full_canvas_frames_use_uniform_fallback
    self.assertEqual((e["x"], e["y"], e["width"], e["height"]), ((width - 100) / 2, 0, 100, 100))
AssertionError: Tuples differ: (0, 0, 201, 100) != (50.5, 0, 100, 100)

First differing element 0:
0
50.5

- (0, 0, 201, 100)
+ (50.5, 0, 100, 100)

======================================================================
FAIL: test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='image', rotation=90, width=200)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 40, in test_quarter_turn_full_canvas_frames_use_uniform_fallback
    self.assertEqual((e["x"], e["y"], e["width"], e["height"]), ((width - 100) / 2, 0, 100, 100))
AssertionError: Tuples differ: (0, 0, 200, 100) != (50.0, 0, 100, 100)

First differing element 0:
0
50.0

- (0, 0, 200, 100)
?        ^

+ (50.0, 0, 100, 100)
?  +++      ^


======================================================================
FAIL: test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='image', rotation=90, width=201)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 40, in test_quarter_turn_full_canvas_frames_use_uniform_fallback
    self.assertEqual((e["x"], e["y"], e["width"], e["height"]), ((width - 100) / 2, 0, 100, 100))
AssertionError: Tuples differ: (0, 0, 201, 100) != (50.5, 0, 100, 100)

First differing element 0:
0
50.5

- (0, 0, 201, 100)
+ (50.5, 0, 100, 100)

======================================================================
FAIL: test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='image', rotation=-90, width=200)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 40, in test_quarter_turn_full_canvas_frames_use_uniform_fallback
    self.assertEqual((e["x"], e["y"], e["width"], e["height"]), ((width - 100) / 2, 0, 100, 100))
AssertionError: Tuples differ: (0, 0, 200, 100) != (50.0, 0, 100, 100)

First differing element 0:
0
50.0

- (0, 0, 200, 100)
?        ^

+ (50.0, 0, 100, 100)
?  +++      ^


======================================================================
FAIL: test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) (kind='image', rotation=-90, width=201)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 40, in test_quarter_turn_full_canvas_frames_use_uniform_fallback
    self.assertEqual((e["x"], e["y"], e["width"], e["height"]), ((width - 100) / 2, 0, 100, 100))
AssertionError: Tuples differ: (0, 0, 201, 100) != (50.5, 0, 100, 100)

First differing element 0:
0
50.5

- (0, 0, 201, 100)
+ (50.5, 0, 100, 100)

======================================================================
FAIL: test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='shape', rotation=90, width=200)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 52, in test_quarter_turn_source_inside_does_not_gain_target_overhang
    self.assertTrue(-1e-9 <= x <= width + 1e-9 and -1e-9 <= y <= 100 + 1e-9, (x, y))
AssertionError: False is not true : (150.0, -50.0)

======================================================================
FAIL: test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='shape', rotation=90, width=201)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 52, in test_quarter_turn_source_inside_does_not_gain_target_overhang
    self.assertTrue(-1e-9 <= x <= width + 1e-9 and -1e-9 <= y <= 100 + 1e-9, (x, y))
AssertionError: False is not true : (150.5, -50.5)

======================================================================
FAIL: test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='shape', rotation=-90, width=200)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 52, in test_quarter_turn_source_inside_does_not_gain_target_overhang
    self.assertTrue(-1e-9 <= x <= width + 1e-9 and -1e-9 <= y <= 100 + 1e-9, (x, y))
AssertionError: False is not true : (50.0, 150.0)

======================================================================
FAIL: test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='shape', rotation=-90, width=201)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 52, in test_quarter_turn_source_inside_does_not_gain_target_overhang
    self.assertTrue(-1e-9 <= x <= width + 1e-9 and -1e-9 <= y <= 100 + 1e-9, (x, y))
AssertionError: False is not true : (50.5, 150.5)

======================================================================
FAIL: test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='image', rotation=90, width=200)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 52, in test_quarter_turn_source_inside_does_not_gain_target_overhang
    self.assertTrue(-1e-9 <= x <= width + 1e-9 and -1e-9 <= y <= 100 + 1e-9, (x, y))
AssertionError: False is not true : (150.0, -50.0)

======================================================================
FAIL: test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='image', rotation=90, width=201)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 52, in test_quarter_turn_source_inside_does_not_gain_target_overhang
    self.assertTrue(-1e-9 <= x <= width + 1e-9 and -1e-9 <= y <= 100 + 1e-9, (x, y))
AssertionError: False is not true : (150.5, -50.5)

======================================================================
FAIL: test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='image', rotation=-90, width=200)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 52, in test_quarter_turn_source_inside_does_not_gain_target_overhang
    self.assertTrue(-1e-9 <= x <= width + 1e-9 and -1e-9 <= y <= 100 + 1e-9, (x, y))
AssertionError: False is not true : (50.0, 150.0)

======================================================================
FAIL: test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) (kind='image', rotation=-90, width=201)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 52, in test_quarter_turn_source_inside_does_not_gain_target_overhang
    self.assertTrue(-1e-9 <= x <= width + 1e-9 and -1e-9 <= y <= 100 + 1e-9, (x, y))
AssertionError: False is not true : (50.5, 150.5)

----------------------------------------------------------------------
Ran 7 tests in 0.003s

FAILED (failures=16)
```

### rotated-bleed-added-red: retained exit 1

```text
test_absent_rotation_keeps_existing_bleed (tests_python.test_rotated_bleed.RotatedBleed.test_absent_rotation_keeps_existing_bleed) ... ok
test_oversized_rotated_identity_keeps_source_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_oversized_rotated_identity_keeps_source_overhang) ... 
  test_oversized_rotated_identity_keeps_source_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_oversized_rotated_identity_keeps_source_overhang) (kind='shape', rotation=90) ... FAIL
  test_oversized_rotated_identity_keeps_source_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_oversized_rotated_identity_keeps_source_overhang) (kind='shape', rotation=-90) ... FAIL
  test_oversized_rotated_identity_keeps_source_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_oversized_rotated_identity_keeps_source_overhang) (kind='image', rotation=90) ... FAIL
  test_oversized_rotated_identity_keeps_source_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_oversized_rotated_identity_keeps_source_overhang) (kind='image', rotation=-90) ... FAIL

======================================================================
FAIL: test_oversized_rotated_identity_keeps_source_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_oversized_rotated_identity_keeps_source_overhang) (kind='shape', rotation=90)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 75, in test_oversized_rotated_identity_keeps_source_overhang
    self.assertEqual(resize(src, {"width": 100, "height": 100}), src)
AssertionError: {'can[83 chars]'x': 0, 'y': 0, 'width': 100, 'height': 100, '[123 chars].0}]} != {'can[83 chars]'x': -10, 'y': -10, 'width': 120, 'height': 12[125 chars] 0}]}
Diff is 821 characters long. Set self.maxDiff to None to see it.

======================================================================
FAIL: test_oversized_rotated_identity_keeps_source_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_oversized_rotated_identity_keeps_source_overhang) (kind='shape', rotation=-90)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 75, in test_oversized_rotated_identity_keeps_source_overhang
    self.assertEqual(resize(src, {"width": 100, "height": 100}), src)
AssertionError: {'can[83 chars]'x': 0, 'y': 0, 'width': 100, 'height': 100, '[124 chars].0}]} != {'can[83 chars]'x': -10, 'y': -10, 'width': 120, 'height': 12[126 chars] 0}]}
Diff is 822 characters long. Set self.maxDiff to None to see it.

======================================================================
FAIL: test_oversized_rotated_identity_keeps_source_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_oversized_rotated_identity_keeps_source_overhang) (kind='image', rotation=90)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 75, in test_oversized_rotated_identity_keeps_source_overhang
    self.assertEqual(resize(src, {"width": 100, "height": 100}), src)
AssertionError: {'can[83 chars]'x': 0, 'y': 0, 'width': 100, 'height': 100, '[90 chars]r'}]} != {'can[83 chars]'x': -10, 'y': -10, 'width': 120, 'height': 12[94 chars]r'}]}
Diff is 696 characters long. Set self.maxDiff to None to see it.

======================================================================
FAIL: test_oversized_rotated_identity_keeps_source_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_oversized_rotated_identity_keeps_source_overhang) (kind='image', rotation=-90)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 75, in test_oversized_rotated_identity_keeps_source_overhang
    self.assertEqual(resize(src, {"width": 100, "height": 100}), src)
AssertionError: {'can[83 chars]'x': 0, 'y': 0, 'width': 100, 'height': 100, '[91 chars]r'}]} != {'can[83 chars]'x': -10, 'y': -10, 'width': 120, 'height': 12[95 chars]r'}]}
Diff is 697 characters long. Set self.maxDiff to None to see it.

----------------------------------------------------------------------
Ran 2 tests in 0.002s

FAILED (failures=4)
```

### rotated-bleed-tiny-red: retained exit 1

```text
test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment (tests_python.test_rotated_bleed.RotatedBleed.test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment) ... 
  test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment (tests_python.test_rotated_bleed.RotatedBleed.test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment) (kind='shape', rotation=1e-12) ... FAIL
  test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment (tests_python.test_rotated_bleed.RotatedBleed.test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment) (kind='shape', rotation=-1e-12) ... FAIL
  test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment (tests_python.test_rotated_bleed.RotatedBleed.test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment) (kind='image', rotation=1e-12) ... FAIL
  test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment (tests_python.test_rotated_bleed.RotatedBleed.test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment) (kind='image', rotation=-1e-12) ... FAIL

======================================================================
FAIL: test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment (tests_python.test_rotated_bleed.RotatedBleed.test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment) (kind='shape', rotation=1e-12)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 82, in test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment
    self.assertEqual((out["x"], out["y"], out["width"], out["height"]), (50, 0, 100, 100))
AssertionError: Tuples differ: (0, 0, 200, 100) != (50, 0, 100, 100)

First differing element 0:
0
50

- (0, 0, 200, 100)
?        ^

+ (50, 0, 100, 100)
?  +      ^


======================================================================
FAIL: test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment (tests_python.test_rotated_bleed.RotatedBleed.test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment) (kind='shape', rotation=-1e-12)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 82, in test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment
    self.assertEqual((out["x"], out["y"], out["width"], out["height"]), (50, 0, 100, 100))
AssertionError: Tuples differ: (0, 0, 200, 100) != (50, 0, 100, 100)

First differing element 0:
0
50

- (0, 0, 200, 100)
?        ^

+ (50, 0, 100, 100)
?  +      ^


======================================================================
FAIL: test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment (tests_python.test_rotated_bleed.RotatedBleed.test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment) (kind='image', rotation=1e-12)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 82, in test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment
    self.assertEqual((out["x"], out["y"], out["width"], out["height"]), (50, 0, 100, 100))
AssertionError: Tuples differ: (0, 0, 200, 100) != (50, 0, 100, 100)

First differing element 0:
0
50

- (0, 0, 200, 100)
?        ^

+ (50, 0, 100, 100)
?  +      ^


======================================================================
FAIL: test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment (tests_python.test_rotated_bleed.RotatedBleed.test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment) (kind='image', rotation=-1e-12)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "tests_python/test_rotated_bleed.py", line 82, in test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment
    self.assertEqual((out["x"], out["y"], out["width"], out["height"]), (50, 0, 100, 100))
AssertionError: Tuples differ: (0, 0, 200, 100) != (50, 0, 100, 100)

First differing element 0:
0
50

- (0, 0, 200, 100)
?        ^

+ (50, 0, 100, 100)
?  +      ^


----------------------------------------------------------------------
Ran 1 test in 0.001s

FAILED (failures=4)
```

### rotated-bleed-green: retained exit 0

```text
test_absent_rotation_keeps_existing_bleed (tests_python.test_rotated_bleed.RotatedBleed.test_absent_rotation_keeps_existing_bleed) ... ok
test_axis_aligned_full_bleed_keeps_filling_target (tests_python.test_rotated_bleed.RotatedBleed.test_axis_aligned_full_bleed_keeps_filling_target) ... ok
test_grouped_quarter_turn_frames_keep_uniform_transform (tests_python.test_rotated_bleed.RotatedBleed.test_grouped_quarter_turn_frames_keep_uniform_transform) ... ok
test_identity_is_exact (tests_python.test_rotated_bleed.RotatedBleed.test_identity_is_exact) ... ok
test_oversized_rotated_identity_keeps_source_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_oversized_rotated_identity_keeps_source_overhang) ... ok
test_partial_frames_keep_uniform_transform (tests_python.test_rotated_bleed.RotatedBleed.test_partial_frames_keep_uniform_transform) ... ok
test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) ... ok
test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) ... ok
test_source_order_and_protected_values_are_preserved (tests_python.test_rotated_bleed.RotatedBleed.test_source_order_and_protected_values_are_preserved) ... ok

----------------------------------------------------------------------
Ran 9 tests in 0.001s

OK
```

### rotated-bleed-new-controls: retained exit 0

```text
baseline
test_noncover_images_and_nonrectangle_shapes_keep_uniform_transform (tests_python.test_rotated_bleed.RotatedBleed.test_noncover_images_and_nonrectangle_shapes_keep_uniform_transform) ... ok
test_axis_aligned_full_bleed_keeps_filling_target (tests_python.test_rotated_bleed.RotatedBleed.test_axis_aligned_full_bleed_keeps_filling_target) ... ok

----------------------------------------------------------------------
Ran 2 tests in 0.000s

OK
exit 0
candidate
test_noncover_images_and_nonrectangle_shapes_keep_uniform_transform (tests_python.test_rotated_bleed.RotatedBleed.test_noncover_images_and_nonrectangle_shapes_keep_uniform_transform) ... ok
test_axis_aligned_full_bleed_keeps_filling_target (tests_python.test_rotated_bleed.RotatedBleed.test_axis_aligned_full_bleed_keeps_filling_target) ... ok

----------------------------------------------------------------------
Ran 2 tests in 0.000s

OK
exit 0
```

## Frozen final focused GREEN

Coordinator requested consolidation after the incremental control additions. Final unchanged test SHA256 `775e161147dd7703764fd8b1baeef69726bc52449a9f58e760da9f668bff39f0`; candidate resize SHA256 `513eb546ab448ef7dfb12e6029f71e4a9f3976e4ef59db047319932913839e5f`. One final focused execution of `python -m unittest tests_python.test_rotated_bleed -v`: exit 0, eleven methods, 0.002 seconds, zero skips/errors. No historical RED, full-suite or qualification rerun. Raw SHA256 `775cc4429ea16001834a590f08d8c2b1668cae9407da59b7dca96262c361c319`.

```text
test_absent_rotation_keeps_existing_bleed (tests_python.test_rotated_bleed.RotatedBleed.test_absent_rotation_keeps_existing_bleed) ... ok
test_axis_aligned_full_bleed_keeps_filling_target (tests_python.test_rotated_bleed.RotatedBleed.test_axis_aligned_full_bleed_keeps_filling_target) ... ok
test_grouped_quarter_turn_frames_keep_uniform_transform (tests_python.test_rotated_bleed.RotatedBleed.test_grouped_quarter_turn_frames_keep_uniform_transform) ... ok
test_identity_is_exact (tests_python.test_rotated_bleed.RotatedBleed.test_identity_is_exact) ... ok
test_noncover_images_and_nonrectangle_shapes_keep_uniform_transform (tests_python.test_rotated_bleed.RotatedBleed.test_noncover_images_and_nonrectangle_shapes_keep_uniform_transform) ... ok
test_oversized_rotated_identity_keeps_source_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_oversized_rotated_identity_keeps_source_overhang) ... ok
test_partial_frames_keep_uniform_transform (tests_python.test_rotated_bleed.RotatedBleed.test_partial_frames_keep_uniform_transform) ... ok
test_quarter_turn_full_canvas_frames_use_uniform_fallback (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_full_canvas_frames_use_uniform_fallback) ... ok
test_quarter_turn_source_inside_does_not_gain_target_overhang (tests_python.test_rotated_bleed.RotatedBleed.test_quarter_turn_source_inside_does_not_gain_target_overhang) ... ok
test_source_order_and_protected_values_are_preserved (tests_python.test_rotated_bleed.RotatedBleed.test_source_order_and_protected_values_are_preserved) ... ok
test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment (tests_python.test_rotated_bleed.RotatedBleed.test_tiny_nonzero_rotation_is_not_snapped_to_axis_alignment) ... ok

----------------------------------------------------------------------
Ran 11 tests in 0.002s

OK
```
