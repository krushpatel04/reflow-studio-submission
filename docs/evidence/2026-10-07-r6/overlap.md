| case | text | image | source overlap | before (main) | after (R6) | z (text/image; JSON idx) | text px before/after |
|---|---|---|---|---|---|---|---|
| L3 | headline | bg | True | True | True | 5/0; 3/0 | 13.95/9.15 |
| L3 | headline | logo | False | False | False | 5/5; 3/1 | 13.95/9.15 |
| L3 | headline | product | False | True | False | 5/3; 3/2 | 13.95/9.15 |
| L3 | headline | holiday_watermark | False | False | False | 5/2; 3/15 | 13.95/9.15 |
| L3 | subhead | bg | True | True | True | 5/0; 4/0 | 7.67/6.00 |
| L3 | subhead | logo | False | False | False | 5/5; 4/1 | 7.67/6.00 |
| L3 | subhead | product | False | False | False | 5/3; 4/2 | 7.67/6.00 |
| L3 | subhead | holiday_watermark | False | False | False | 5/2; 4/15 | 7.67/6.00 |
| L3 | legal_text | bg | True | True | True | 6/0; 16/0 | 6.00/6.00 |
| L3 | legal_text | logo | False | False | False | 6/5; 16/1 | 6.00/6.00 |
| L3 | legal_text | product | False | False | False | 6/3; 16/2 | 6.00/6.00 |
| L3 | legal_text | holiday_watermark | True | False | False | 6/2; 16/15 | 6.00/6.00 |

R4 synthetic S1-S4 contain no images and cannot exercise this defect; the committed fixture tests_python/test_text_fit.py::ImageOcclusion does (rotated text and image).
Before/after PNGs viewed (L3, crop x 250-500): before headline runs across the bottle; after bottle clear, headline one line at 9.15px. Geometry/pixels only; no quality claim.
