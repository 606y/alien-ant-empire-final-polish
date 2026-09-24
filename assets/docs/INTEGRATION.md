# 《異星蟻國》Assets v4 整合規格

## 分工
本包內美術、文案與素材配置為正式內容。
Codex 僅負責工程接入、動畫實作、RWD、效能、測試與部署。
不得重新設計角色、背景、片頭或文案。

## 主選單背景
正式背景：
`menu/v4/background/menu_bg_battle_v4.png`

畫面定位：
- 蟻國城邦正遭受攻擊
- 部分建築損毀與燃燒
- 黑煙直衝天際
- 背景有兩軍戰線、遠方飛蟻交戰與墜落痕跡
- 背景兵種全部視為靜態戰場內容

注意：
- 不要再從背景裁切任何角色做動畫
- 不要從背景裁旗幟做動畫
- 不要讓背景中的靜態飛蟻被誤當成主動態元素
- 真正動態只用下面三組獨立素材

## 三組主動態

### A. 前景持旗兵蟻
`menu/v4/foreground/flag_soldier_back.png`

動畫：
- 角色本體只做極小呼吸 / 站姿重心變化
- 旗幟區域可做輕微 sway / cloth deformation
- 不可讓整個角色晃動
- 不可把旗杆一起扭曲
- 位置以畫面前景偏左或偏右為主，避免遮住 UI

### B. 敵方厚甲重裝
`menu/v4/foreground/heavy_enemy.png`

動畫：
- 小幅度揮舞或提起重型兵器
- 動作慢、有重量感
- 可做 2~4 秒一個循環
- 不可高頻抖動或大幅位移

### C. 主飛蟻
Body:
`menu/v4/flyer/flyer_body.png`

Wings:
`menu/v4/flyer/flyer_wings.png`

只保留這一隻作為主要可動飛蟻。
- Body：穩定巡航、小幅升降、緩慢轉向
- Wings：獨立振翅
- 不做整體飄浮
- 不加第二、第三隻大型動態飛蟻
- 背景遠方飛蟻全部保持靜態即可

## 比例
因為主選單是遠景戰場：
- 持旗兵蟻：畫面高 18%~24%
- 厚甲重裝：20%~27%
- 主飛蟻：9%~13%
不得巨大到破壞城市尺度。

## 片頭 V4
- `intro/v4/intro_01_fall_v4.png`
- `intro/v4/intro_02_mutation_v4.png`
- `intro/v4/intro_03_empires_v4.png`

三張皆 3840×2160。
只允許：
- 極慢 zoom
- 輕 pan
- fade in / fade out

不要：
- blur
- motion blur
- 大幅縮放
- 圖片切片
- 廉價粒子特效

## 文案
`docs/COPY_DECK.md` 為唯一正式版本。

## 音訊
沿用前版已核准 BGM / SFX。
如包內已附，直接使用，不重新生成。

## 真實驗收
完成後必須：
1. Chrome 桌面 1366×768 主選單停留至少 20 秒
2. 確認只有三組主動態
3. 確認背景不再被切片做動畫
4. 確認主飛蟻翅膀真的獨立振動
5. 確認持旗兵蟻旗面自然飄動
6. 確認厚甲揮武器有重量感
7. 完整播放三幕片頭
8. 手機 390×844 實測
9. Console 0 error / 0 warning
10. Network 0 failed resource
