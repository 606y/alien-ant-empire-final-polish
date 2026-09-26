# V7.2｜手機長按框選瀏覽器干擾修正

問題：手機在遊戲世界長按約 0.4 秒準備框選時，瀏覽器會啟動文字反白、整頁藍色選取或「拷貝／複製」系統選單。

這是工程事件衝突，不是玩法問題。

## CSS
只套用到遊戲世界／Canvas，不套用一般面板與表單：

```css
#world,.world-wrap,#map,canvas#map{
  -webkit-user-select:none;
  user-select:none;
  -webkit-touch-callout:none;
  -webkit-user-drag:none;
  touch-action:none;
  -webkit-tap-highlight-color:transparent;
}
```

## JS
在實際接收遊戲世界 pointer/touch 的元素上：
- `contextmenu` → `preventDefault()`
- `selectstart` → `preventDefault()`
- `dragstart` → `preventDefault()`
- coarse pointer 的 `touchstart` / `touchmove` 若屬於世界拖曳、長按框選、雙指縮放流程，使用 `{passive:false}` 並 `preventDefault()`。
- 不要在 document/body 全域禁止，避免 UI 按鈕、輸入欄位受到影響。
- 現有 0.4 秒長按框選門檻、雙指縮放、單指平移邏輯都保留，不改玩法。

## 驗收
iPhone/Safari 或 Chrome 行動模擬：
1. 在地圖空白處長按 0.4 秒後拖曳：只出現遊戲框選。
2. 不出現藍色文字選取。
3. 不出現 Copy/Select/Look Up 系統選單。
4. 單指平移正常。
5. 雙指縮放正常。
6. UI 面板中的按鈕仍可正常點擊。
