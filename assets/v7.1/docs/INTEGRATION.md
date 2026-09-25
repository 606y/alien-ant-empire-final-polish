# 《異星蟻國》V7.1 主選單正式接入規格

## 目的
本輪只重整主選單的「視覺焦點與對峙構圖」。
V7 遊戲內美工工程若已進行，請保留，不要回退。
V6.3 CapCut 片頭、三幕敘事與 Prototype 0.6.4.1 核心玩法全部維持。

## 正式素材
- `menu/background/menu_bg_confrontation_v7_1.png`
- `menu/characters/flag_ant_v7_1.png`
- `menu/characters/heavy_hammer_v7_1.png`
- `menu/flyer/flyer_body_v7_1.png`
- `menu/flyer/flyer_wings_v7_1.png`
- `menu/placement_v7_1.json`

## 美術敘事鎖定
- 左側持旗兵：入侵方，面向右／中央。
- 右側厚甲：守城方，面向左／中央。
- 雙方必須形成一眼可讀的對峙。
- 背景仍是大規模戰場，但 V7.1 已在兩位主角背後降低局部密度與對比，請不要再額外提高背景亮度或銳利度。

## 桌面定位
讀取 `menu/placement_v7_1.json`：
- flag x=.45, bottom=.99, height=.31, lift=100px
- heavy x=.80, bottom=.99, height=.35, lift=88px
- flyer 維持 V6 motion，height=.115

這是相對 V6 的小幅聚焦：
- 兩位主角稍微靠近畫面中央。
- 兩位主角稍微放大。
- 讓視線／武器軸線形成更明顯交會。

## 手機
手機優先維持 V6 已通過的安全定位：
- flag x=.50, bottom=.56, height=.18, lift=68px
- heavy x=.84, bottom=.56, height=.19, lift=62px
- flyer mobileHeight=.105

不要為了桌面構圖把手機 UI 擠爆。

## 動態
### 持旗兵
保留現有 V6 旗布動畫。
不要重新拆身體或旗桿。

### 厚甲
正式靜態。
禁止重新啟用：
- heavy_attack_v6_2.webp
- APNG
- sprite sheet
- CSS 關節動畫
- 武器動畫
- 呼吸搖晃動畫

### 飛蟻
沿用現有 V6 body/wings 與巡航位置。
不新增第二套主飛蟻。

## 工程限制
Codex 只做接入、定位、RWD、測試、Git、Pages。
不得：
- 重畫背景
- 改角色造型
- mirror 角色
- 改主選單文案
- 自行改陣營色彩
- 自行增加巨大旗幟／雕像／前景角色
- 修改 `engine.js`、`interaction.js` 或核心玩法

## 驗收
桌面 1366×768：
1. 持旗兵第一眼可見。
2. 厚甲第一眼可見。
3. 左旗手朝右、右厚甲朝左。
4. 兩位主角的對峙關係清楚。
5. 角色背後背景不再密到吃掉輪廓。
6. 標題與兩顆按鈕清楚。
7. 旗幟正常飄動。
8. 厚甲完全靜態。
9. 飛蟻正常。
10. V6.3 片頭流程不受影響。

手機 390×844：
- 不遮 UI。
- 角色不被主要裁切。
- 朝向不被翻轉。
- 無整頁溢出。

完成後由使用者錄主選單 10–15 秒給 ChatGPT 做最終視覺驗收。
