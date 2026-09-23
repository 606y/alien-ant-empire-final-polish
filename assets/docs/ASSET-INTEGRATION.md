# 異星蟻國 Assets v2 接入狀態

本版正式素材由專案持有人提供，原始清單與文案記錄於 `ASSETS-V2-MANIFEST.json`、`ASSETS-V2-INTEGRATION.md`、`ASSETS-V2-COPY-DECK.md`。

- 主選單優先載入 `assets/menu/menu_bg_animation_base.png`；載入失敗才退回 `assets/menu/menu_bg_main.png`，再退回暗色安全背景。
- 飛行蟻族載入 `assets/menu/animated/flyer_scout_01.png`、`flyer_guard_01.png`、`flyer_heavy_01.png`。每種至多一隻。單幀 PNG 只做巡航、漂移與輕微轉向；若日後改成橫向 sprite sheet，可於 `assets/manifest.js` 設定 `animation.frames` 與 `fps`。
- 三幕片頭依序載入 `assets/intro/intro_01_fall.png`、`intro_02_mutation.png`、`intro_03_empires.png`。每幕只做極慢縮放、平移與淡入淡出。缺檔時顯示暗色安全背景，仍可繼續或跳過。
- 正式文案取自 `ASSETS-V2-COPY-DECK.md`，UI 資料位於 `app.js` 的 `introSlides`。
- BGM 使用 `assets/audio/bgm/bgm_nest.ogg`、`bgm_surface.ogg`、`bgm_combat.ogg`。第一次使用者互動後啟動；場景切換先淡出前一首，再淡入下一首。
- SFX 使用 `assets/audio/sfx/ui_confirm.ogg`、`ui_back.ogg`、`wing_pass.ogg`、`colony_pulse.ogg`、`impact_mutation.ogg`。聲音開關同時控制 BGM 與 SFX。缺檔時安靜回退。

替換素材時，以同名檔案覆蓋，保持透明背景或 16:9 比例與檔名，重新部署即可。新增或更換素材時須同步更新 `assets/LICENSES.md`。不得使用授權不明的第三方素材。
