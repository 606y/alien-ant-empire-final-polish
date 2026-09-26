# V9 scene reconstruction checkpoint — 2026-09-27

This checkpoint completes the resumed rendering integration. V9.1 gameplay additions follow separately.

- Continuous cave floor and wall topology derives from actual excavated cells and passable connections; partial excavation derives from tile work.
- Seven facilities use original equipment on real floors; three presentation levels increase equipment count. No room illustration discs remain.
- Four original transparent atlases: facilities, forest resources/objects, five faction worker/queen torsos, and six player caste torsos (flyer reserved).
- Ant movement uses actual displacement for heading and alternating six-leg gait. Initial motion-cache bug found by browser test and fixed.
- World-space material coordinates remain fixed under camera movement. No painted backdrop is used as navigable ground.
- engine.js and interaction.js remain byte-identical at this checkpoint. Existing menu/intro/audio preserved.

Validation:
- Full Node suite: 199/199 pass.
- Chrome 1366x768 and touch emulation 390x844: no page overflow, console errors/warnings or HTTP failures; movie/three slides/start/resume/audio/drag/box/pinch exercised.
- Separate mature-room rendering fixture: no serialized simulation mutation; movement/idle phase checks pass. Desktop median 3.2 ms, p95 14.2 ms; emulated-mobile median 4.6 ms, p95 20.5 ms. These are short machine-specific render samples, not 30–60 minute device performance results.
- Independent recording fixture: two selected ants moved to two rooms; food panel created harvesting assignment; .qa-v9/v9-world-acceptance.webm (local ignored QA artifact).
- Real artistic acceptance remains subjective. Additional V9.1 caste/ecology/instance work is not claimed complete here.
