# Quick View — 本地文件即时预览

手机浏览器打开 → 选本地文件 → 秒级预览。文件不会上传到任何服务器，全部在浏览器内完成。

## 支持的格式

| 格式 | 预览方式 |
|------|---------|
| HTML | 沙箱 iframe 直接渲染 |
| Markdown | marked.js 转 HTML |
| Word .docx | Mammoth.js 转换 |
| Excel .xlsx | SheetJS 表格渲染，支持多 Sheet |
| TXT / CSV / JSON / XML | 纯文本显示 |

## 使用

1. 手机浏览器打开 `https://nyctocereusnicola.github.io/file-preview/`
2. 点「选择文件」或拖拽文件
3. 预览

## 添加主屏幕（PWA）

在手机浏览器菜单中选「添加到主屏幕」，之后像 App 一样打开使用。

## 技术

纯前端单页应用，零依赖后端。CDN 加载 marked.js、mammoth.js、SheetJS。
