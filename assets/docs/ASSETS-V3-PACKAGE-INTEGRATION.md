# 《異星蟻國》Assets v3 整合規格

## 0. 分工
本包內美術、角色、旗幟、片頭與文案視為正式素材。
Codex 只負責：解壓、路徑放置、工程接入、動畫播放、RWD、效能、測試、部署。
不要自行重畫角色、改文案或添加第三方素材。

## 1. 主選單背景
正式背景：
`menu/v3/menu_bg_v3.png`

- 以 CSS 原圖方式顯示，優先保持清晰。
- 桌面遠景構圖，禁止把背景拉伸到失真。
- 左側 UI 暗化僅做局部柔和漸層。
- 不加全畫面 blur / haze。

## 2. 遠景比例
畫面是遠眺帝國，因此獨立角色不能過大。
桌面 1366×768 建議顯示高度（以 viewport 高度百分比）：
- 遠景兵蟻：4.5%～6.5%
- 遠景厚甲／巨顎：5.5%～8%
- 中景王族護衛：8%～11%
- Scout 飛蟻：7%～9%
- Guard 飛蟻：8%～10.5%
- Heavy 飛蟻：9%～12%
任何角色不得大到比主城入口或塔樓尺度更誇張。

## 3. 地面單位
素材：
- `menu/v3/ground/soldier_01.png`
- `menu/v3/ground/heavy_01.png`
- `menu/v3/ground/mandible_01.png`
- `menu/v3/ground/royal_guard_01.png`

動畫只做克制生命感：
- 兵蟻：短距離巡邏 / 走停
- 厚甲：慢速重心轉移
- 巨顎：頭部與前肢小幅警戒
- 王族護衛：站姿呼吸、觸角與武器微動

角色必須分散在橋梁、平台、前景崖台等合理位置。
不要全部集中在畫面正中央。

## 4. 飛行蟻族
每種由 body + wings 兩層組成：
- Scout
- Guard
- Heavy

身體：巡航、緩慢升降、轉向、傾斜。
翅膀：獨立振動；不要讓整個身體一起抖。

建議振翅：
- Scout：快，約 16～22 Hz 視覺切換
- Guard：約 12～17 Hz
- Heavy：約 8～13 Hz

若使用 requestAnimationFrame，不必逐真實 Hz 物理模擬；視覺上需清楚看到翅膀振動，但不能糊成扇形。

同時最多 2～3 隻飛蟻。
不允許程式生成額外小飛蟲。

## 5. 旗幟
素材：
- `menu/v3/banners/banner_01.png`
- `banner_02.png`
- `banner_03.png`

旗幟是獨立素材，可做小角度 sway + 輕微 cloth warp。
禁止從背景圖裁旗幟。
禁止產生背景分裂、接縫或切片錯位。

## 6. 片頭
正式 V3：
- `intro/v3/intro_01_fall_v3.png`
- `intro/v3/intro_02_mutation_v3.png`
- `intro/v3/intro_03_empires_v3.png`

這三張已輸出為 3840×2160。
優先直接使用原圖，不要先縮成低解析 Canvas 再放大。

只允許：
- 極慢 zoom
- 輕 pan
- fade
- 很少量局部粒子

文案以 `docs/COPY_DECK.md` 為唯一正式版本。

## 7. 音訊
沿用 V2 音訊。
主選單／蟻巢：bgm_nest
地表：bgm_surface
戰鬥：bgm_combat
第一次使用者互動後再啟動。
切換時淡出／淡入，不疊播。

## 8. 真實驗收
Codex 的自動測試不是最終視覺驗收。
完成後：
1. 桌面 1366×768 實際播放
2. 手機 390×844 實際播放
3. 主選單停留至少 15 秒觀察所有兵種動態
4. 完整播放三幕片頭
5. Console 0 error / 0 warning
6. 部署 GitHub Pages
7. 使用者錄影後由 ChatGPT 做最終視覺驗收
