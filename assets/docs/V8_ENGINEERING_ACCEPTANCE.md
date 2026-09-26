# V8 engineering acceptance — 2026-09-26

## Scope and source
Integrated the owner-supplied Google Drive archive AlienAntEmpire_Assets_v8.zip (23,423,024 bytes), folder 1J-3_-6zJKedm6ctYyaKMh4qXPHrTwvDw, file 16TkW78kusbP13Quk1a1e9CQcEvtWZWFx.
All 69 MANIFEST files under assets/v8 remain byte-identical. No replacement artwork, external fonts or audio was created or fetched.

## Runtime
- 51 cached V8 images: 14 units/queens, 21 room scenes, 10 props, 6 environmental images.
- Full-viewport, world-anchored repeated unexplored texture plus 0.28-opacity matte before explored cells. Ground texture opacity 0.86. Camera and selection coordinates are unchanged.
- Supplied tile black footers are excluded only while creating repeat-pattern canvases: nest source rectangle 512×398, surface 512×458. Original files remain intact. Patterns are created once.
- Props with large transparent padding use content source rectangles, retaining the supplied pixels and adding the existing contact shadow. No source is redrawn.
- Whole unit sprites rotate without mirroring or body splitting.
- Room scenes cover and clip to the existing ellipse; maturity <34 → Lv1, 34–66 → Lv2, >=67 → Lv3. No simulation values change.
- Resource mapping: seed/fruit → seeds; insect/prey/queen remains → insect_carcass; fungi → fungi; sap/resin → resin; deposits/mineral → ore; log/plant/rock/root/water → corresponding PNG.
- Resource chips are text-only. Context actions remain in normal flow. Existing 430ms world-only touch handling and saved one-time hint are retained.
- Menu BGM: stereo Vorbis, 48kHz, 36 seconds, verified from Ogg identification and final granule. Early Chrome duration estimates can show ~32.23 seconds before full download. Loop/default ON, respects persisted mute. Autoplay denial keeps ON and the first pointerdown/touchend/keydown unlocks playback. Menu BGM stops on cinematic or Continue.
- V7.1 menu, V6.3 cinematic, V6 copy, engine.js, interaction.js, save keys/schema, targets and camera methods are unchanged.

## Validation
Full node:test suite: 191/191 passed.
Chrome desktop 1366×768 and touch-emulated 390×844: fresh isolated QA save, loading, menu, audio unlock, complete cinematic, three scenes, nest/surface, exploration panel, save/reload, no page overflow.
All 51 runtime images loaded. Normal flow: zero console errors/warnings and zero HTTP errors.
Camera four directions and minimum/maximum zoom: no empty canvas or full-width black bands.
Touch: pan, pinch zoom, 500ms press to activate the unchanged 430ms box threshold, selection rectangle, no document text selection.
A separate Chrome case verifies allowed autoplay, persisted mute, muted video, Skip → first scene, and a right-click attack with actual combat/HP loss in a seeded QA fixture.
A rendering contact sheet checks all 14 unit/queen images, all 21 room stages and all 10 prop paths. This is a rendering fixture, not a claim of naturally playing every room to maturity.

Physical iOS/Android native Copy/Look Up menus have NOT been tested on a physical device. Browser emulation alone cannot certify those OS menus.

## Supplied-art limitations — not an art approval
- plant_v8.png and rock_v8.png contain a detached shadow but no opaque plant/rock body (zero pixels with alpha >180). Runtime loads the actual supplied files; no substitute art was invented. These two props need corrected source files.
- Several supplied unit PNGs retain baked background edges, and rest room scenes retain a dark right area. These are visible in the full-size rendering contact sheet; source artwork has not been retouched.
- Ground tiles already contain illustrated ants/chambers, so repeated environment art can be mistaken for real units/rooms. Rendering follows the supplied pack, but visual clarity still requires owner review.
- Therefore this is an engineering integration, not final visual acceptance.

## Repeat browser QA
Install/use an available playwright-core runtime and Chrome; set PLAYWRIGHT_PATH (module path), CHROME_PATH (browser executable), and optionally V8_URL (base URL with trailing slash). Default URL is http://127.0.0.1:4174/.
Run:
- node scripts/verify-v8-browser.cjs
- node scripts/verify-v8-browser-extra.cjs

Contexts are fresh and use ?test=1. Screenshots are local-only under .qa-v8/ (gitignored). They do not overwrite production saves.
Public deployment uses existing GitHub Pages, main branch / root:
https://606y.github.io/alien-ant-empire-final-polish/?v=assets-v8-world-rebuild

Please record menu ~10s → new game → cinematic → three scenes → nest/queen/rooms/units → surface pan/resources/enemy/combat → mobile box selection for the separate visual review.

