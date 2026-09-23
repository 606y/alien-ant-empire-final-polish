# Assets v3 工程接入

目前只有接入程式與資料夾，**沒有正式 v3 圖片**。`assets/manifest.js` 中所有 v3 圖片項目保持 `enabled:false`，因此不會請求缺席檔案或產生 404。收到正式圖片並確認授權後，將同名檔案放在下列路徑，再把對應項目改為 `enabled:true`。

## 正式背景

`assets/menu/v3/menu_bg_v3.png`。優先於 v2 的 `assets/menu/menu_bg_animation_base.png`，後者載入失敗時再退回 `menu_bg_main.png`。靜態背景由瀏覽器 CSS 直接顯示，Canvas 僅畫透明動態層；來源尺寸足夠時以 `cover` 顯示，尺寸不足時限制為原始 CSS 像素尺寸並露出暗色安全背景，不會先縮成低解析中間圖。背景本身不含需要被裁切的角色或旗幟動畫。

## 飛行蟻族

- `assets/menu/v3/flyers/flyer_scout_body.png`、`flyer_scout_wings.png`
- `assets/menu/v3/flyers/flyer_guard_body.png`、`flyer_guard_wings.png`
- `assets/menu/v3/flyers/flyer_heavy_body.png`、`flyer_heavy_wings.png`

三組 body / wings 全部就緒後，才切換至 v3 分層播放，以免混用新舊造型。每個身體沿自己的路線緩慢巡航；翅膀圖片是獨立層，以不同頻率繞可設定支點小幅擺動。程式不繪製角色形體，也不拉伸整張角色圖來模擬振翅。未齊備時保留現有 v2 單幀飛蟻作備援；其翅膀仍是靜態，待正式分層素材到位才能達到 v3 動態效果。

單張透明圖可用 `frames:1, columns:1, rows:1`。Sprite sheet 支援規則格狀排列：在各 body / wings 項目的 `animation` 設定 `frames`、`columns`、`rows`、`fps`。建議身體與翅膀使用相同畫布尺寸與中心對齊；若正式圖的支點不同，可在 `menuFlyersV3` 的 `wing` 設定 `pivotX`、`pivotY`、`offsetX`、`offsetY`、`scale`、`order`、`frequency`、`angle`。三種巡航參數也集中在該陣列。

## 片頭

- `assets/intro/v3/intro_01_fall_v3.png`
- `assets/intro/v3/intro_02_mutation_v3.png`
- `assets/intro/v3/intro_03_empires_v3.png`

每幕優先使用對應 v3 圖；未就緒則使用現有 v2 圖。保留三幕文案資料結構與流程，未改寫文案。片頭 Canvas 按實際 `devicePixelRatio` 設定 backing resolution，直接取原圖單次繪製；不使用 blur 或低解析中間圖。`cover` 不把圖片放大超過其原始 CSS 像素尺寸，不足部分維持暗色安全背景。

## 音訊與授權

Assets v2 的三首 BGM、五個 SFX、互動後播放及靜音控制維持不變。本輪沒有新增任何外部圖片、音訊、字型或其他第三方素材。收到正式 v3 檔案時需同步更新 `assets/LICENSES.md`。
