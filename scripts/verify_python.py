"""Run the full Python suite; a missing prerequisite must not become a skipped pass.

From the repository root: CHAMELEON_UPSTREAM=/path/to/pinned/starter python scripts/verify_python.py
Requires the Python test dependencies, npm ci and Playwright Chromium (LICA raster controls).
"""
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

if __name__ == '__main__':
    suite = unittest.defaultTestLoader.discover(str(ROOT / 'tests_python'), top_level_dir=str(ROOT))
    result = unittest.TextTestRunner(verbosity=2).run(suite)
    if result.skipped:
        print('Python verification is incomplete: skipped tests are failures in this gate.', file=sys.stderr)
    sys.exit(0 if result.wasSuccessful() and result.testsRun > 0 and not result.skipped else 1)
