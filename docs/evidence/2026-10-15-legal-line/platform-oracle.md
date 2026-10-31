# Platform oracle correction

D's full macOS canonical gate exposed five failures from hardcoded Linux pixel counts. This file was assigned to A for a focused correction. On baseline8ac29a0, the same five failures reproduce: CTA281 versus expected271 (two rows), ribbon181 versus180 (two rows), legal1385/lost84 versus expected889/lost0. Candidate legal ink is1384/lost0; label values are unchanged.

The repaired oracle explicitly renders the same output geometry/text at6px and5px on the actual platform. Both controls must have ink and must differ; the engine's returned ink must equal6px, with lost0 and overflowfalse. The legal test also retains exact font_size6. This checks the intended floor behavior without assuming identical rasterization across operating systems.

Evidence:

- `extreme-baseline.log`: original tests on original engine, five failures.
- `extreme-repaired-oracle-baseline.log`: repaired tests on original engine, **one genuine legal clipping failure**, lost84.
- `extreme-green.log`: candidate module11/11 passing, no skips.
- `extreme-five-pixel-mutation.log`: synthetic returned5px labels rejected in all four rows. Harness success means the mutant was rejected, not product correctness.

The real renderer and RF-01 probe are unchanged. This repair changes tests only and does not claim that #148 spacing is resolved. Source/package/full integration gates remain separate.
