# 異星蟻國正式素材接入說明

所有正式素材槽位集中在 `assets/manifest.js`。未啟用或載入失敗的素材會安全回退；角色素材缺席時不顯示角色，音訊素材缺席時保持靜音。

## 主選單

正式背景固定使用：

- `assets/menu/menu_bg_main.png`

可選疊圖：

- `assets/menu/menu_fog_overlay.png`
- `assets/menu/menu_foreground_overlay.png`

程式不再從背景圖裁切旗幟或角色，也不生成替代飛蟻。

## 正式飛行蟻族

預留路徑：

- `assets/menu/animated/flyer_guard_01.png`
- `assets/menu/animated/flyer_heavy_01.png`
- `assets/menu/animated/flyer_scout_01.png`

放入透明 PNG 後，在 `assets/manifest.js` 把對應項目的 `enabled: false` 改為 `enabled: true`。單幀圖保持 `animation.frames: 1`；橫向 sprite sheet 則填入實際幀數與 `fps`。程式只負責位移、轉向、上下漂移及切換素材幀，不會重畫角色造型。

## 三幕片頭

- `assets/intro/intro_01_fall.png`
- `assets/intro/intro_02_mutation.png`
- `assets/intro/intro_03_empires.png`

目前三個檔案是 1×1 透明安全佔位檔。直接以同名正式 PNG 覆蓋即可，不需修改 manifest。寬高均大於 16px 的檔案會自動作為正式片頭，套用極慢 zoom、輕微 pan 與既有 UI 過場；否則顯示簡潔暗色背景。

片頭文字保留在 `app.js` 的 `introSlides` 資料結構，之後可直接替換三筆內容。

## BGM 與 SFX

正式路徑位於：

- `assets/audio/bgm/`
- `assets/audio/sfx/`

檔名與 key 詳見 `assets/manifest.js`。放入授權確認的 OGG 後，將對應項目改為 `enabled: true`。載入成功後播放器會優先使用正式音訊；缺檔時保持安靜，不會合成替代音效。

## 授權紀錄

任何正式素材接入時，都必須在 `assets/LICENSES.md` 記錄名稱、來源、授權類型與署名需求。授權不明的素材不得接入。
