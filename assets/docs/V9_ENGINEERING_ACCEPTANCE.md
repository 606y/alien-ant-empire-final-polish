# V9 world geometry acceptance

V9 replaces the V8 painted gameplay backdrops with a renderer driven by existing simulation state. The official V8 package remains archived and unmodified; it is not a gameplay background.

- Underground: repeated natural soil texture; open, seen, unsealed neighbor edges form tunnels; room centers and sizes define chamber geometry. Maturity changes only the count of existing room markers.
- Surface: repeated natural ground texture; terrain, obstacles, resources, colonies and units are painted from their world coordinates.
- Units: independent V8 caste/colony sprites rotate from motion or attack target, retaining their last angle while idle. No mirroring is used.
- Camera, hitbox radii, input, save key and simulation files remain unchanged.

QA:
- `node --test tests/*.test.cjs`
- `node scripts/verify-v9-browser.cjs` with Chrome and Playwright Core; 1366×768 and 390×844.
- `node scripts/verify-v9-browser-extra.cjs` for active combat, camera extremes, intro skip and mute.
- `node scripts/record-v9-acceptance.cjs` records a disposable test-save Canvas video in `.qa-v9/v9-world-acceptance.webm`. A separate `scripts/record-v9-combat.cjs` records verified damage feedback in `.qa-v9/v9-combat-acceptance.webm`. These videos are engineering evidence and do not include official new art.

This is a geometry and interaction skeleton awaiting the user's official V9 art. Its visual finish is not independently approved.
