# 異星蟻國 Assets v1 接入說明

所有正式素材槽位集中在 `assets/manifest.js`。載入或解碼失敗時，遊戲會安全回退，不會阻止進入遊戲。

## 正式片頭圖片替換

三幕正式圖片路徑：

- `assets/intro/intro_01_fall.png`
- `assets/intro/intro_02_mutation.png`
- `assets/intro/intro_03_empires.png`

目前三個檔案是 1×1 透明安全佔位檔，不含正式美術。直接用同名正式 PNG 覆蓋即可，不需修改程式或 manifest。`menu-art.js` 只把寬高均大於 16px 的檔案視為正式片頭；佔位或載入失敗時顯示無插畫的暗色 fallback。正式圖片啟用後會使用極慢縮放、輕微平移、淡入淡出所需的畫布層與少量粒子，不再繪製舊版程式化螞蟻、土丘或森林剪影。

## 其他素材替換

1. 將授權已確認的 PNG 或 OGG 放入 manifest 指定路徑。
2. 除三張已啟用片頭插槽外，其他素材預設為 `enabled: false`；放入檔案後改為 `enabled: true`。
3. 在 `assets/LICENSES.md` 記錄素材名稱、來源、授權類型與是否需要署名。
4. 啟動遊戲並檢查瀏覽器 Console；載入或解碼失敗時會使用既有 fallback。

## 接入點

- 主選單背景與動態層：`menu-art.js` 的 `drawMenu()`。
- 三段片頭圖片與安全 fallback：`menu-art.js` 的 `drawIntro()`；順序由 `assets/manifest.js` 的 `introSequence` 控制。
- 主 Logo：`app.js` 啟動時掛載到 `#menuLogo`；失敗時保留文字標題。
- BGM、環境循環與 SFX：`audio.js`；正式 OGG 可用時優先播放，否則保留現有原創合成音樂與音效。

## 其他預留路徑

- `assets/menu/menu_bg_main.png`
- `assets/menu/menu_fog_overlay.png`
- `assets/menu/menu_foreground_overlay.png`
- `assets/logo/logo_main.png`
- `assets/audio/bgm/bgm_nest.ogg`
- `assets/audio/bgm/bgm_surface.ogg`
- `assets/audio/bgm/bgm_combat.ogg`
- `assets/audio/sfx/` 下的各 UI、戰鬥與環境音槽位，詳見 `assets/manifest.js`。
