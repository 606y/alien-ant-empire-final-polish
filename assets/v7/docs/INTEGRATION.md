# 《異星蟻國》V7｜遊戲內美工第一正式版

## 本版目的
把 Prototype 0.6.4.1 的「網站感／原型感」改成與主選單一致的《異星蟻國》正式遊戲視覺：
黑金、深褐、暗紅、焦土橙、琥珀光、甲殼、巢穴、根系、帝國文明。

本版同時加入「真正依關鍵資源 ready 狀態消失」的載入畫面。
不要為載入畫面另開獨立版本。

---

## A. 載入畫面

正式素材：
- `loading/loading_backdrop.svg`
- `loading/loading_crest.svg`
- `loading/loading_progress_frame.svg`
- `loading/brand_badge.png`（若檔案存在）

畫面：
- 全螢幕黑暗巢穴背景。
- 中央 `loading_crest.svg`。
- 下方文字：`蟻國甦醒中……`
- 下方細進度條使用 `loading_progress_frame.svg`。
- 不要一般網站 spinner。
- 不顯示假的百分比。

### Ready 判斷
不要只用 `window.onload`。

請新增工程層級 `appReady`，只負責「何時隱藏 loading」，不改玩法。

Critical readiness：
1. DOM 可用。
2. 正式 asset manifest 已完成初始化。
3. 主選單必要圖片已成功載入或已進入明確 fallback。
4. `AntMenuArt` 已完成第一幀 draw。
5. 連續兩次 `requestAnimationFrame` 後再淡出 loading。

最低顯示時間：約 450ms，避免高速裝置閃一下。
淡出：300–400ms。
最長等待：8 秒；超時後以 warning 進入主選單 fallback，不可以永遠黑屏。

影片 `preload=none` 不屬於首頁 critical ready。
遊戲世界較大的資源可在主選單顯示後繼續背景預載。

---

## B. HUD／UI

正式美術：
- `ui/v7-ui-theme.css`
- `ui/frames/*`
- `ui/icons/resources/*`
- `ui/icons/nav/*`

以 `ui/v7-ui-theme.css` 為固定視覺值，不要由 Codex 自行重新配色。
可以為既有 DOM selector 做必要合併，但視覺值與風格不可自行改案。

資源列 icon：
1. 工蟻 → `worker.svg`
2. 兵蟻 → `soldier.svg`
3. 食物 → `food.svg`
4. 敵國 → `enemy.svg`
5. 幼體 → `brood.svg`
6. 蟻后危險狀態 → `queen.svg`

底部 nav icon：
- 巢穴 → `nest.svg`
- 地表 → `surface.svg`
- 蟻群 → `colony.svg`
- 記事 → `journal.svg`
- 設定 → `settings.svg`

保留目前可讀性與 44px 最低觸控尺寸。

---

## C. 巢穴／地表世界視覺

正式素材：
- `world/textures/nest_soil_tile.svg`
- `world/textures/surface_ground_tile.svg`
- `world/textures/tunnel_rim_overlay.svg`
- `world/WORLD_STYLE.json`

可以修改 `world.js` 的「純繪圖區」，但只允許：
- 載入／快取正式 SVG 素材
- `createPattern`
- drawImage
- 顏色、陰影、描邊、粒子與視覺層級

禁止改：
- camera 數值與限制
- target / hitbox / radius
- 位置轉換
- pathfinding
- engine state
- AI
- 戰鬥數值
- 資源數值
- 移動速度
- 遊戲規則

`engine.js`、`interaction.js` 不修改。

---

## D. 單位正式外觀

玩家：
- `units/player/worker.svg`
- `units/player/soldier_normal.svg`
- `units/player/soldier_armor.svg`
- `units/player/soldier_jaw.svg`
- `units/player/soldier_acid.svg`
- `units/player/queen.svg`

敵國：
- `units/enemies/near.svg`
- `units/enemies/hunter.svg`
- `units/enemies/armored.svg`
- `units/enemies/deep_forest.svg`
- 各敵國 queen 版本

所有素材來源方向固定為「向右」。
Canvas 只使用 `rotate(angle)` 對準移動／交戰方向。
禁止 `scaleX(-1)`，避免徽記與光影翻轉。

單位 sprite 只取代視覺，不改 touch target。
低 zoom 時可以依效能退回簡化 silhouette，但角色類型辨識要保留。

---

## E. 巢室

正式 icon：
- nursery
- store
- prey
- rest
- military
- mutation
- royal

遊戲中的巢室實體仍保留目前大小、位置、成熟度與點擊區。
把現在純色橢圓改成「原有底色＋甲殼環＋中央正式 room icon」。
成熟度升級可以增加外圈厚度／琥珀亮度，但不要改功能。

---

## F. 選取與命令

正式素材：
- `world/effects/selection_ring.svg`
- `world/effects/command_move.svg`
- `command_attack.svg`
- `command_gather.svg`
- `command_build.svg`
- `command_cross.svg`

保留現在約 1.2 秒命令回饋壽命與事件語意，只替換視覺。
不可改點擊規則。

---

## G. RWD / 效能

桌面基準：1366×768
手機基準：390×844

- 首頁 loader 必須立即出現，不等大圖。
- SVG 只 load 一次並快取 Image。
- Canvas 不得每幀重新 new Image。
- texture pattern 初始化一次，resize 時更新必要 cache。
- 手機 DPR 上限沿用現況，不需提高。
- `prefers-reduced-motion` 時 loading crest 不做脈動，只保留靜態。

---

## H. 驗收

需錄影：
1. 全新網址／無快取第一次開啟。
2. loading 畫面立即出現。
3. 主選單真正 ready 才淡入。
4. 主選單 → 建立新蟻國 → V6.3 CapCut → 三幕 → 遊戲。
5. 巢穴 20 秒。
6. 地表 20 秒。
7. 選工蟻、兵蟻、不同兵種。
8. 開巢室 panel。
9. 開蟻群／記事／設定。
10. 手機版重複 loader、巢穴與地表。

Codex 測試通過後仍不代表視覺驗收完成；使用者錄影交給 ChatGPT 實際觀看後再決定。
