# 異星蟻國 Assets v1 接入說明

所有正式素材槽位集中在 `assets/manifest.js`。預設 `enabled: false`，因此尚未提供正式檔案時不會發出缺檔請求，遊戲會繼續使用目前的 Canvas、CSS 與 Web Audio 程式化素材。

## 替換流程

1. 將授權已確認的 PNG 或 OGG 放入清單指定路徑，檔名必須完全一致。
2. 在 `assets/manifest.js` 將該素材的 `enabled` 改為 `true`。
3. 在 `assets/LICENSES.md` 記錄素材名稱、來源、授權類型與是否需要署名。
4. 啟動遊戲並檢查瀏覽器 console。載入或解碼失敗時，該項會自動回到程式化版本。

## 接入點

- 主選單背景與前後景：`menu-art.js` 的 `drawMenu()`。
- 三段片頭：`menu-art.js` 的 `drawIntro()`；目前三段映射由 manifest 的 `introSequence` 控制，五張片頭圖皆已預留。
- 主 Logo：`app.js` 啟動時掛載到 `#menuLogo`；失敗時保留文字標題。
- BGM、環境循環與 SFX：`audio.js`；正式 OGG 可用時優先播放，否則保留現有原創合成音樂與音效。

## 預留檔案

### 主選單與 Logo

- `assets/menu/menu_bg_main.png`
- `assets/menu/menu_fog_overlay.png`
- `assets/menu/menu_foreground_overlay.png`
- `assets/logo/logo_main.png`

### 片頭

- `assets/intro/intro_01_forest_stirring.png`
- `assets/intro/intro_02_ant_emerges.png`
- `assets/intro/intro_03_winged_rise.png`
- `assets/intro/intro_04_empire_reveal.png`
- `assets/intro/intro_05_title_card.png`

### BGM

- `assets/audio/bgm/bgm_nest.ogg`
- `assets/audio/bgm/bgm_surface.ogg`
- `assets/audio/bgm/bgm_combat.ogg`

### SFX 與環境音

- `assets/audio/sfx/sfx_click.ogg`
- `assets/audio/sfx/sfx_confirm.ogg`
- `assets/audio/sfx/sfx_cancel.ogg`
- `assets/audio/sfx/sfx_move.ogg`
- `assets/audio/sfx/sfx_attack.ogg`
- `assets/audio/sfx/sfx_alert.ogg`
- `assets/audio/sfx/sfx_warning.ogg`
- `assets/audio/sfx/sfx_victory.ogg`
- `assets/audio/sfx/sfx_defeat.ogg`
- `assets/audio/sfx/sfx_dig.ogg`
- `assets/audio/sfx/sfx_ant_march.ogg`
- `assets/audio/sfx/sfx_chitin_hit.ogg`
- `assets/audio/sfx/sfx_bite.ogg`
- `assets/audio/sfx/sfx_mutation_pulse.ogg`
- `assets/audio/sfx/sfx_queen_move.ogg`
- `assets/audio/sfx/sfx_larva_care.ogg`
- `assets/audio/sfx/sfx_wing_flap.ogg`
- `assets/audio/sfx/amb_nest_loop.ogg`
- `assets/audio/sfx/amb_forest_loop.ogg`
- `assets/audio/sfx/amb_combat_tension_loop.ogg`

不要以空白、零位元或錯誤格式檔案佔位；這會造成瀏覽器解碼錯誤。資料夾由 `.gitkeep` 保留，實際槽位由 manifest 與本文件預留。
