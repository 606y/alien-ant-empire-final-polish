# AUDIO｜V8

## 主選單
正式新增：`audio/bgm_menu_v8.ogg`
- 原創合成戰場環境／低頻音樂循環。
- 包含低頻氛圍、遠戰鼓、風、微弱火焰／戰場質感。
- Loop。
- 建議 gain 0.45～0.55，避免蓋過片頭與 UI。

## 自動播放規則
1. 全域 soundEnabled 預設維持 `true`。
2. 主選單 mount 後立即嘗試 `play()`.
3. 若 Promise 被瀏覽器 autoplay policy 拒絕，不把 UI 改成「聲音：關」。
4. 在 `pointerdown` / `touchend` / `keydown` 的第一次正常使用者互動中呼叫既有 audio unlock，再自動啟動 menu BGM。
5. 使用者不需要特地按「聲音」開關。
6. 按成「聲音：關」後才真正 mute／pause。
7. 播 V6.3 電影片頭時主選單 BGM 暫停；影片結束／跳過後依既有流程切到巢穴／地表音樂。

這是瀏覽器相容處理，不是新增玩家操作步驟。
