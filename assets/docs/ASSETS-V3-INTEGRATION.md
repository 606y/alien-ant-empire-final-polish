# Assets v3 formal integration

The V3 package is installed. The original package specifications are `assets/docs/MANIFEST.json`, `assets/docs/INTEGRATION.md`, `assets/docs/COPY_DECK.md` and `assets/docs/ASSETS-V3-LICENSES.md`. V3 images are enabled, with V2 fallback retained. Three previously supplied V2 BGM and five SFX remain enabled because the V3 ZIP lists their paths but does not include audio payloads.

The menu uses the original 3840×2160 V3 background as a CSS background. Four independent ground sprites, three independent banners, and three body/wings flyer pairs are layered by `menu-art.js`. The three 3840×2160 V3 intro images are selected ahead of V2. Exact copy is wired in `app.js`.
