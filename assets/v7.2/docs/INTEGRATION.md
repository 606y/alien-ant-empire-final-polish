# 《異星蟻國》V7.2｜遊戲內美工正式修正版

## 目的
這是使用者實際試玩 V7 後的正式修正，不是新玩法版本。

### 必修 5 項
1. 上方資源列：取消所有圖示，只保留文字＋數字。
2. 蟻后／工蟻／兵蟻／敵國：改用 V7.2 raster sprite；停止正式使用 V7 簡易 SVG 單位。
3. context / 探索／事件 panel：單框，禁止文字與裝飾框重疊。
4. 巢穴／地表：加入正式環境 backdrop、texture、props，建立真正地下巢穴與森林場景感。
5. 手機 Canvas 長按：阻止瀏覽器 select/copy callout，但保留遊戲框選／平移／雙指縮放。

## 正式素材
### 世界
- `world/nest/nest_atmosphere_v7_2.jpg`
- `world/surface/surface_atmosphere_v7_2.jpg`
- `world/tiles/nest_soil_v7_2.jpg`
- `world/tiles/surface_floor_v7_2.jpg`
- `world/props/*_v7_2.png`
- `world/WORLD_STYLE_V7_2.json`

### 單位
玩家：
- `units/player/worker_v7_2.png`
- `units/player/soldier_normal_v7_2.png`
- `units/player/soldier_armor_v7_2.png`
- `units/player/soldier_jaw_v7_2.png`
- `units/player/soldier_acid_v7_2.png`
- `units/player/queen_v7_2.png`

敵國：
- `units/enemies/near_v7_2.png`
- `units/enemies/hunter_v7_2.png`
- `units/enemies/armored_v7_2.png`
- `units/enemies/deep_forest_v7_2.png`
- 各敵國 queen V7.2

### UI
- `ui/v7_2-ui-patch.css`
- `ui/panel_texture_v7_2.png`

## world.js
允許 V7.2 純繪圖修改：
- 載入/cache V7.2 JPG/PNG。
- backdrop 先畫，再畫 tiles/map/targets。
- 巢穴 backdrop opacity 建議 0.68；地表 0.62。
- 使用 `drawImage cover` 或等價計算鋪滿 Canvas。
- tile texture 低對比疊加，避免重複紋理太明顯。
- 已探索區可放少量正式 props，位置用既有 tile deterministic noise 決定，不能改 simulation。
- 單位 sprite 改用 V7.2 whole-image raster，依現有 angle rotate；禁止 mirror。
- target / hitbox / radius / world coordinate / camera constraint 不動。

## 面板
接入 `v7_2-ui-patch.css`，它是美術正式值。
若舊 V7 `panel_frame.svg` 造成第二層大黃框，V7.2 runtime 停用該裝飾層。
按鈕只能在內容流內，不得 absolute 疊到說明文字上。

## 資源列
`renderStatus()` 的文字內容可以完全沿用。
正式 CSS 必須移除 `.resource::before` icon，以及原本為 icon 預留的 left padding。

## 手機
依 `docs/MOBILE_TOUCH_FIX.md`。
這是 input/browser integration 修正，允許修改負責 DOM pointer/touch listener 的檔案；不得修改 `interaction.js` 的遊戲命令規則。

## 不可改
- Prototype 0.6.4.1 核心規則
- 四敵國數值／AI
- 食物／戰鬥／育幼／勝敗
- pathfinding
- target / hitbox
- 框選門檻約 0.4 秒
- 右鍵不下令規則
- V6.3 CapCut 片頭
- V7.1 主選單美術（等 V7.1 完成後保留）

## 驗收
桌面 1366×768：
- 資源列只見文字＋數字。
- 巢穴不再是一片綠黑底＋方格，而有地下世界空氣感。
- 地表不再只有植物 icon，而有森林地表、根系、岩塊、材質。
- 蟻后與螞蟻不再是簡易 SVG/icon 感。
- 探索 panel 文字清楚、不重疊。

手機 390×844：
- 長按框選不出現藍色網頁選取。
- 不出現 Copy / Select 系統 callout。
- 框選、平移、雙指縮放正常。
