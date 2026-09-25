# 《異星蟻國》V6.3 接入規格

## 本輪唯一美術變更
將目前 V6.2 Dreamina 片頭替換成：
`video/intro_cinematic_v6_3_capcut_badged.mp4`

影片已由 ChatGPT 完成最終影像處理：
- 1344×768
- 24 fps
- 約 10.125 秒
- H.264 + AAC
- 左上角《異星蟻國》品牌徽章已直接烙入影片
- 不需要 Codex 再疊 PNG 或做 CSS overlay

## 主選單
厚甲維持 V6.2 已修正完成的 V6.1 靜態 `heavy_hammer_v6.png`。
禁止重新啟用 WebP/APNG/sprite 厚甲動畫。

持旗兵、旗幟動畫、主飛蟻、主選單背景維持現況。

## 流程
主選單 → 建立新蟻國 → V6.3 CapCut 片頭 → V6 三幕 → 遊戲。
影片自然結束或按「跳過片頭」都進 V6 第一幕。

## 音訊
本片含 AAC 音軌。沿用既有規則：
- 播片時主選單 BGM 暫停
- 全域聲音關閉時影片 muted
- 播完後恢復既有三幕音訊流程

## 禁止
- 不重製影片
- 不重新裁切、縮放或加第二層徽章
- 不重做厚甲
- 不修改三幕文案
- 不修改 `engine.js`、`world.js`、`interaction.js`
