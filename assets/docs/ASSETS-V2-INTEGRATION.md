# Alien Ant Empire Assets v2 — Integration

## 核心原則
這一包的美術與文案視為正式素材。Codex 僅負責工程接入、動畫播放、RWD、測試與部署。
不要重新設計角色、美術、文案或音訊。

## 主選單
### 動畫專用底圖
`menu/base/menu_bg_animation_base.png`

此底圖已預留左側 UI 空間，並移除主要前景 UI / 大型角色干擾。
請用它取代目前「含大量烘焙動態物件」的主背景。

### 飛行蟻族
- `menu/animated/flyer_scout_01.png`
- `menu/animated/flyer_guard_01.png`
- `menu/animated/flyer_heavy_01.png`

規則：
- 每種最多 1 隻同時可見，總數 2~3 隻。
- 必須保持大尺寸與清楚輪廓，不可縮成蒼蠅般的小點。
- 只做穩定巡航、緩慢升降、輕微轉向。
- 不准用 Canvas 重畫角色本體。
- 不准補任何程式生成小蟲。
- 振翅若只有單張 PNG，不要假裝高頻變形翅膀；先用整體姿態漂移，待後續 sprite 版再做真振翅。
- 不與背景中的城市尖塔或 UI 文字重疊。

## 主選單氣氛
允許：
- 2~4 個局部城市窗孔 / 入口亮度脈動
- 極少量遠景薄霧
- 非常少量微塵

禁止：
- 全畫面 haze
- blur
- 背景切片扭曲
- 從背景裁旗幟再做波動
- 近景角色局部扭曲

## 片頭
使用：
- `intro/intro_01_fall.png`
- `intro/intro_02_mutation.png`
- `intro/intro_03_empires.png`

每幕只允許：
- 極慢 zoom
- 極輕 pan
- fade in / fade out
- 很少量局部粒子

文案以 `docs/COPY_DECK.md` 為唯一正式版本。

## Audio
BGM:
- `audio/bgm/bgm_nest.ogg`
- `audio/bgm/bgm_surface.ogg`
- `audio/bgm/bgm_combat.ogg`

SFX:
- `audio/sfx/ui_confirm.ogg`
- `audio/sfx/ui_back.ogg`
- `audio/sfx/wing_pass.ogg`
- `audio/sfx/colony_pulse.ogg`
- `audio/sfx/impact_mutation.ogg`

請處理瀏覽器 autoplay 限制：第一次使用者互動後才啟動音訊。
主選單預設音量需克制，不可壓過 UI。

## Responsive acceptance
- Desktop 1366×768
- Mobile 390×844
- 無整頁溢出
- 所有按鈕至少 44px
- 主圖不得因 filter 失焦
- Console: 0 error / 0 warning
