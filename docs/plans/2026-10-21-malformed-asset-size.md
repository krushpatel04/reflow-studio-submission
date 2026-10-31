# Malformed asset-size fallback

Problem/evidence: Issue #6 requires image previews to retain a visible fallback when intrinsic size is unknown. `assetSize` currently throws on malformed percent-encoded SVG or base64 PNG data URI bodies; a resolver can supply either, aborting preview rendering instead of returning unknown size.

Behavior/scope: Return `undefined` for malformed URI encoding and keep the existing unknown-size rendering fallback. Valid SVG and PNG dimensions remain unchanged. Limit exception handling to decoding, not crop/render logic.

Risk: Broad error handling could conceal unrelated defects; catching only decoder failures avoids that. Test malformed SVG and PNG inputs plus a valid-size control and preview fallback.

Steps/checks: Add focused tests, run red on current code, make the smallest decoder change, rerun focused tests, `npm test`, `npm run build`, `npm run verify`, `npm run benchmark`, and browser acceptance if the preview path changes. Inspect an affected preview where practical. No human/native Adobe acceptance claim.

Execution: The regression failed before the fix with `URIError: URI malformed` in `assetSize`. After narrow decoder handling, three focused tests passed, including valid bundled assets and an unknown-size preview control. Full browser verification passed 26 tests; Node passed 711 tests with zero skips, build and 30-layout verify passed, and the 30-case benchmark reported zero selected errors with eight selected warnings. The malformed preview returns the existing `xMaxYMid slice` fallback rather than claiming intrinsic crop geometry; this is not visual-quality or host-application acceptance.
