# 《異星蟻國》V8｜場景化 2.5D 世界正式重構

## 0. 版本目的
V8 不是新增玩法，而是把 Prototype 0.6.4.1 的遊戲內畫面從「平面圖板＋符號」改成真正可辨識的 2.5D 蟻族世界。

本版直接吸收使用者實機驗收後的問題：
1. 螞蟻像蟑螂／蟻后只是放大。
2. 己方與四敵國長得太像。
3. 地下巢穴沒有世界感、單位與背景同色。
4. 地表像貼圖牆，種子／昆蟲／植物只是符號。
5. 功能巢沒有物理空間與進化感。
6. 地表上下拖曳會露黑條，不像同一張世界地圖。
7. 上方資源 icon 佔空間且難懂。
8. 探索／事件 panel 框中框、文字重疊。
9. 手機長按框選被瀏覽器選字／Copy 搶走。
10. 主選單顯示「聲音：開」但沒有主選單聲音。

---

## 1. 正式素材來源

Google Drive：
`AlienAntEmpire_Assets/v8/`

必讀：
- `MANIFEST.json`
- `docs/INTEGRATION.md`
- `docs/ART_DIRECTION_V8.md`
- `docs/FACTIONS_AND_UNITS.md`
- `docs/ROOM_EVOLUTION.md`
- `docs/AUDIO.md`
- `docs/MOBILE_TOUCH.md`
- `docs/COPY_DECK.md`
- `docs/LICENSES.md`
- `world/WORLD_STYLE_V8.json`

Codex 不自行重畫、不自行找圖、不自行設計角色。

---

## 2. 既有版本保留

保留目前已完成且已驗收的開頭流程：
- loading
- V7.1 主選單構圖／持旗兵／靜態厚甲／主飛蟻
- V6.3 CapCut 片頭
- V6 三幕
- Prototype 0.6.4.1 核心玩法與存檔

V8 主要重構：
- 遊戲內巢穴
- 遊戲內地表
- 單位
- 四敵國
- 功能巢
- 地表資源／障礙物
- UI 可讀性
- 主選單聲音行為
- 手機長按瀏覽器衝突

---

## 3. 世界繪製共同原則

### 世界一定先填滿整個 Canvas
每幀繪圖第一層必須畫「世界空間背景」，再畫房間／地形／資源／單位。

禁止：
- 先 clear 成黑色後只畫有限地圖塊。
- Camera 拖到上／下／左右時露黑條。
- 背景固定不動、只有地圖塊上下滑。

### 世界座標
環境紋理與背景要跟世界座標／camera 一起移動。
不能像固定桌布。

若現有 camera 可移到地圖邊界以外：
- 不改玩法 camera 行為也可以；
- 直接以 `nest_unexplored_v8.jpg` / `surface_unexplored_v8.jpg` 在所有未覆蓋像素補滿。
- 未探索區是暗化環境，不是黑 void。

不需要改 pathfinding 或遊戲世界座標。

---

## 4. 地下巢穴

正式素材：
- `world/nest/nest_world_v8.png`
- `world/tiles/nest_ground_v8.jpg`
- `world/tiles/nest_unexplored_v8.jpg`

視覺層級：
1. `nest_unexplored_v8.jpg` 填滿 viewport。
2. 依 camera/world offset 鋪 `nest_ground_v8.jpg`。
3. 現有已探索／通道／房間幾何疊上。
4. 功能巢 scene sprite。
5. props。
6. 單位。
7. label / selection / command feedback。

`nest_world_v8.png` 是 V8 世界藝術基準／可作低透明度環境 matte，不得直接固定在螢幕不動。

建議：
- matte opacity 0.22～0.34
- tile opacity 0.78～0.92
- 房間與單位保持最高可讀性。

角色腳下保留柔和接地陰影。

---

## 5. 地表森林

正式素材：
- `world/surface/surface_battle_world_v8.png`
- `world/surface/surface_explore_reference_v8.jpg`
- `world/tiles/surface_ground_v8.jpg`
- `world/tiles/surface_unexplored_v8.jpg`

目標：
- 地面是泥土／苔蘚／根木／葉片／石頭／森林光影。
- 不是淺色矩形貼在深綠底板。
- 玩家 Camera 上下拖時看到的始終是森林世界。

`surface_battle_world_v8.png` 是戰鬥尺度與色彩基準。
`surface_explore_reference_v8.jpg` 是日常探索尺度基準。

不要把整張參考圖當固定 screen background。
應使用 world-space tile／matte 的方式讓 Camera 與世界一起移動。

---

## 6. 地表資源／障礙物實體化

正式素材：
- `world/props/seeds_v8.png`
- `world/props/insect_carcass_v8.png`
- `world/props/fungi_v8.png`
- `world/props/resin_v8.png`
- `world/props/ore_v8.png`
- `world/props/log_v8.png`
- `world/props/plant_v8.png`
- `world/props/rock_v8.png`
- `world/props/root_v8.png`
- `world/props/water_v8.png`

對應原有 terrain / resource state：
- food seed → seeds
- prey / insect food → insect_carcass
- fungi → fungi
- special / mutation resin → resin
- rock / mineral → ore 或 rock
- log → log
- plant → plant
- root → root
- water/stream visual → water

重要：
這些只是 visual mapping。
現有採集數值、可走不可走、hitbox、resource amount 全部不改。

每個物件要：
- 依世界座標 draw。
- 有接地陰影。
- 不使用 UI icon 外框。
- 不把文字直接烙在 sprite 上。

---

## 7. 玩家蟻族

正式 whole-sprite：
- `units/player/worker_v8.png`
- `units/player/soldier_normal_v8.png`
- `units/player/soldier_armor_v8.png`
- `units/player/soldier_jaw_v8.png`
- `units/player/soldier_acid_v8.png`
- `units/player/queen_v8.png`

禁止正式 runtime 再用 V7 幾何／SVG 螞蟻。

### 蟻后
`queen_v8.png` 必須當成獨立 caste。
不要用 worker/soldier 等比 scale 充當 Queen。

### 繪製
- 依現有單位 angle `rotate()`。
- whole-image `drawImage()`。
- 禁止 `scaleX(-1)`。
- 不拆 body part。
- 不改 selection radius / target / hitbox。

來源 PNG 設計基準是向右或右前；旋轉即可。

---

## 8. 四敵國

正式 whole-sprite：
- 近鄰：`units/enemies/near_v8.png`
- 獵殺：`units/enemies/hunter_v8.png`
- 甲殼：`units/enemies/armored_v8.png`
- 深林：`units/enemies/deep_forest_v8.png`

敵后：
- `near_queen_v8.png`
- `hunter_queen_v8.png`
- `armored_queen_v8.png`
- `deep_forest_queen_v8.png`

UI crest（若敵國 panel 需要）：
- `*_crest_v8.png`

四敵國不是 recolor 功能層。
正式 sprite 輪廓本身已不同：
- 近鄰：土金厚實。
- 獵殺：黑紅、長顎、尖刺。
- 甲殼：冷黑寬甲。
- 深林：綠黑菌絲／共生感。

敵國 AI / combat / queen location / win condition 一律維持 Prototype。

---

## 9. 功能巢與進化

正式房間：
- `rooms/nursery_lv1_v8.png` ～ `lv3`
- `rooms/store_lv1_v8.png` ～ `lv3`
- `rooms/prey_lv1_v8.png` ～ `lv3`
- `rooms/rest_lv1_v8.png` ～ `lv3`
- `rooms/military_lv1_v8.png` ～ `lv3`
- `rooms/mutation_lv1_v8.png` ～ `lv3`
- `rooms/royal_lv1_v8.png` ～ `lv3`

原本只畫一個符號的方式退出正式 runtime。

### maturity 對應
請依目前 room maturity / level state 映射：
- early / low → Lv1
- middle → Lv2
- mature / high → Lv3

若原程式不是 3 段：
只做 visual threshold mapping，不改 maturity 數值。

### 繪製
- 使用現有 room center / room size / hitbox。
- 房間 scene 圖可 `clip()` 到目前巢室輪廓，再 `drawImage cover`。
- label 放上層。
- 不能因美術圖改變點擊區。

---

## 10. 上方資源列

正式：
只顯示文字＋數字。

例如：
- 工蟻 9
- 兵蟻 3
- 食物 → 120
- 敵國 4
- 幼體 12

停用：
- 工蟻 icon
- 兵蟻 icon
- 食物 icon
- 敵國 icon
- 幼體 icon

接入：
`ui/v8-ui.css`

數值與趨勢箭頭邏輯保持。

---

## 11. Context / 探索 / 事件 panel

接入：
`ui/v8-ui.css`

原則：
- 一個主要外框。
- 不使用大型第二裝飾框壓在內容中間。
- 標題 → 說明 → 插圖（若有）→ actions。
- action button 正常 document flow。
- 禁止用 absolute 把「派蟻探索」壓到文字上。

---

## 12. 手機長按框選

依：
`docs/MOBILE_TOUCH.md`

只修瀏覽器預設行為。
Prototype 操作不改：
- tap select
- one-finger pan
- long-press ~0.4s box select
- two-finger zoom

禁止整頁變藍或跳 Copy / Select / Look Up。

---

## 13. 主選單聲音

正式新增：
`audio/bgm_menu_v8.ogg`

### 行為
全域聲音預設仍為 ON。

進主選單：
立即嘗試播放 `bgm_menu_v8.ogg`。

若 `audio.play()` 因 autoplay policy reject：
- 不改成「聲音：關」。
- 不顯示「請點擊開聲音」。
- 註冊一次性 unlock。
- 玩家第一次正常 `pointerdown` / `touchend` / `keydown` 時，自動解鎖並開始 menu BGM。
- 玩家不需要特地點聲音開關。

聲音按鈕：
只有玩家自己切成 OFF 時才 mute / pause。

進 V6.3 電影片頭：
menu BGM 暫停。

進遊戲：
沿用 nest / surface / combat 既有 audio scene。

---

## 14. 效能

- 所有 PNG / JPG 只建立一次 `Image` 並 cache。
- 不得每 frame `new Image()`.
- ground pattern 可建立一次 pattern cache。
- 房間 scene 只依 maturity 變更時換來源。
- 手機低 zoom 時允許 sprite 降採樣，但不能改回幾何螞蟻。
- DPR 上限沿用現況。
- 不新增大量 DOM sprite；世界仍用 Canvas。

---

## 15. 核心檔案限制

不要修改 `engine.js` 的 simulation / AI / combat / resources。
不要修改 `interaction.js` 的命令規則。

若手機 browser suppression listener 現在在 `interaction.js`：
優先放在 DOM/input adapter 檔案，不改 interaction 的 gameplay decision。

`world.js` 允許修改純繪製區：
- image cache
- pattern
- draw order
- visual clipping
- shadows
- world background fill

不得修改：
- world coordinate
- target radius
- hitbox
- pathfinding
- unit speed
- combat range
- food values
- AI
- victory/defeat

---

## 16. 存檔

localStorage key 與 save schema 不變。
既有「繼續蟻國」存檔必須可以繼續讀取。

V8 只改 rendering，不做 save migration。

---

## 17. 桌面驗收 1366×768

必測：
1. loading。
2. V7.1 主選單。
3. 主選單顯示聲音 ON 時，在可播放環境立即有 menu 聲音；被瀏覽器擋時第一次正常互動後自動開始。
4. 建立新蟻國 → V6.3 → 三幕 → 遊戲。
5. 巢穴是場景，不是平面圖板。
6. 蟻后外型明顯不同於普通蟻。
7. 工蟻／普通兵／重甲／巨顎／酸液輪廓可分。
8. 七種功能巢有實體空間。
9. room maturity 變化能切 Lv1/2/3。
10. 地表是連續森林世界。
11. 上下左右拖 camera 不露黑條。
12. 種子／昆蟲／岩礦／樹根／倒木等看起來是世界物件。
13. 四敵國肉眼可分。
14. 敵后不是一般敵蟻放大。
15. 資源列只剩文字＋數字。
16. 探索 panel 不重疊。
17. 原操作與戰鬥正常。

---

## 18. 手機驗收 390×844

必測：
1. loading。
2. 主選單。
3. 主選單第一次正常觸碰後音樂自動解鎖（若 autoplay 被 browser 擋）。
4. 巢穴。
5. 地表。
6. 長按約 0.4 秒＋拖曳：遊戲框選。
7. 不出現藍色網頁 selection。
8. 不出現 Copy / Select / Look Up。
9. 單指 pan。
10. 雙指 zoom。
11. UI button 正常。
12. 世界畫面拖到任何方向不露黑 void。

---

## 19. 自動測試至少新增

- V8 asset manifest path。
- 6 player unit PNG。
- 4 enemy faction PNG。
- 4 enemy queen PNG。
- 21 room level PNG。
- 10 world props。
- resource icons runtime disabled。
- room SVG/icon runtime disabled。
- no generic ant geometry runtime。
- world first paint fills entire viewport。
- unexplored surface/nest texture exists。
- menu BGM source exists。
- sound default ON remains.
- autoplay reject has first-interaction unlock path。
- mobile `selectstart/contextmenu` suppressed only on world。
- long-press threshold unchanged。
- localStorage key unchanged。
- core gameplay values unchanged。
- V7.1 menu and V6.3 intro remain.

---

## 20. Git / Pages

完成：
- tests
- commit
- push main
- deploy GitHub Pages

建議 cache key：
`?v=assets-v8-world-rebuild`

---

## 21. Codex 回報格式

回報標題：
`《異星蟻國 V8｜場景化世界正式整合驗收》`

至少回報：
1. Drive v8 是否成功讀取。
2. V8 runtime 素材實際本機路徑。
3. 巢穴 world-space background 實作方式。
4. 地表 world-space background 實作方式。
5. Camera 上下左右是否完全不露黑條。
6. 6 種己方單位是否使用 V8 PNG。
7. 蟻后是否為獨立 V8 queen。
8. 四敵國是否使用不同 V8 sprite。
9. 四敵后是否使用不同 queen sprite。
10. 七種功能巢是否有 Lv1/Lv2/Lv3 scene。
11. room maturity mapping。
12. 地表 props mapping。
13. 上方資源 icon 是否停用。
14. context panel 是否無框中框／重疊。
15. 手機長按是否不再觸發 browser selection/copy。
16. 主選單 BGM 是否載入。
17. autoplay 被擋時是否第一次正常互動自動 unlock。
18. V7.1 主選單是否保留。
19. V6.3 片頭是否保留。
20. localStorage key 是否不變。
21. engine.js 是否未改 simulation。
22. interaction.js 是否未改 gameplay command semantics。
23. desktop 1366×768 結果。
24. mobile 390×844 結果。
25. Console / Network。
26. tests。
27. 修改檔案。
28. Git SHA。
29. GitHub Pages URL。

這只是工程驗收。最終美術通過仍需使用者實際錄影後由 ChatGPT 檢查。
