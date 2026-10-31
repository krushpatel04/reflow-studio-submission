# Correction to RF04 next-action handoff map

Applies to `next-action-handoff.md`, 5972 bytes, SHA256 `48b7eac4835c0d712ad1fab526e12ceebbd6262ddea18394aa3e5ee049b3a8bc`, committed in `94e2b811427005a0d44998df16a4aba52be475d7`. That file is preserved unchanged; this note supersedes one statement in it.

## Superseded statement

Line 21:

> Native authors retain write authority (dispatch-reported current state; the earlier release's no-further-writes statement remains history).

This was stale information in the coordinator dispatch the map was built from.

## Corrected fact

Root-verified: the latest explicit corrected-file releases from the native authors returned the corrected RF04 claims `ef0e8f87` and `ebe6bdd2` to CLI2. No further native writes. Only these prefixes were supplied; no full digests are invented here. This note records root's verification and does not independently check it.

## Unchanged

Every other row, owner, input, gate, wake condition and outcome in the map is unchanged. All 21 expected RF04 task outcomes remain UNKNOWN.
