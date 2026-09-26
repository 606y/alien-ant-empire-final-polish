# MOBILE_TOUCH｜V8

## 目的
手機在世界 Canvas 長按約 0.4 秒做框選時，不得再觸發瀏覽器文字反白、藍色選取或 Copy / Select / Look Up 系統選單。

## CSS
只套用世界／Canvas：
```css
#world,.world-wrap,#map,canvas{
  -webkit-user-select:none;
  user-select:none;
  -webkit-touch-callout:none;
  -webkit-user-drag:none;
  -webkit-tap-highlight-color:transparent;
}
```

## 事件
在實際世界互動元素上：
- `contextmenu` → `preventDefault()`
- `selectstart` → `preventDefault()`
- `dragstart` → `preventDefault()`
- coarse pointer 的世界 `touchstart` / `touchmove` 使用 `{passive:false}`，只有進入既有平移／框選／雙指縮放流程時 `preventDefault()`。

不要在 `document` / `body` 全域禁止文字選取。

## 固定玩法
- tap：選取
- 單指拖曳：平移
- 長按約 0.4 秒後拖曳：框選
- 雙指：縮放
- 不改門檻、不改指令語意。
