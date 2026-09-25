# 《異星蟻國》V6.2 接入規格

## 本輪只做兩件事
1. 把 V6.1 的錯誤片頭影片替換成 V6.2 Dreamina 10 秒影片。
2. 把右側厚甲靜態素材替換成 ChatGPT 已製作完成的 V6.2 厚甲動畫。

## 電影片頭
正式檔：`video/intro_cinematic_v6_2_dreamina.mp4`

實測規格：
- 1248×704
- H.264
- 60fps
- 約 10.18 秒
- 免費版 Dreamina 浮水印：本版本接受，保留原樣

重要：
- 不要剪掉浮水印。
- 不要重新編碼成其他美術版本。
- 不要加 zoom / pan / blur / warp。
- 不要再使用 V6.1 的 `intro_cinematic_v6_10s.mp4`。
- 播放流程沿用 V6.1 已驗證成功的原生 `<video>` 架構。
- 播完或按「跳過片頭」後都進入 V6 第一幕敘事，不可直接進遊戲。
- 全域聲音關閉時照舊 muted。
- BGM 與影片音訊不得重疊。

## 厚甲動畫
優先：`heavy/heavy_attack_v6_2.webp`
備援：`heavy/heavy_attack_v6_2.png`
Sprite 備援：`heavy/heavy_attack_v6_2_sheet.png`

- 厚甲固定在主選單右側。
- 角色固定朝左，與左側持旗兵互相對峙。
- 禁止水平鏡像。
- 禁止拆武器、手臂、關節重新做 CSS 動畫。
- 直接播放 ChatGPT 已完成的動畫成品。
- 維持 V6.1 上移後的位置基準，不要再沉到底部。
- 動作循環：備戰 → 蓄力 → 抬鎚 → 高點 → 重擊 → 落點停頓 → 回位。

## 其他內容
- V6 主選單背景、持旗兵與旗幟動畫、主飛蟻全部維持現況。
- V6 三幕敘事維持現況。
- 不修改 Prototype 0.6.4.1 核心玩法。
- 不修改 `engine.js`、`world.js`、`interaction.js`。
