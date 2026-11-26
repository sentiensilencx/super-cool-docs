# super cool docs

A dark, warm, Word-replacement document editor in the browser. Plain HTML, CSS, and JavaScript — no build step, no dependencies (fonts via Google Fonts).

## Features
- Word-style start screen: new blank A4 / US Letter / US Legal documents, plus a recent-documents grid
- Paginated canvas with visible page-break markers and "Page X of Y" in the status bar
- Bitter (serif) document text, Plus Jakarta Sans UI, dark warm theme
- Toolbar: open (.html/.md/.txt), download as .html, print, cut/copy, bold/italic/underline, highlight, font size, alignment, lists, insert menu (+), find & replace
- Insert menu: headings, quote, code block, divider, checklist, table, link, image, date
- Markdown typing: `#`/`##`/`###` headings, `-`/`*` lists, `1.` lists, `>` quotes, ` ``` ` code blocks on Space; `**bold**`, `*italic*`, `` `code` `` convert as you type
- Editing / Preview modes, multi-document tabs, localStorage autosave
- Find & replace (Ctrl/⌘+F) with highlighting and replace-all
- Keyboard shortcuts: Ctrl+S download, Ctrl+O open, Ctrl+Alt+N new A4 document
- Print with correct paper size via @page

## Run
Open `index.html` in a browser, or serve statically:
```
python3 -m http.server 8000
```
