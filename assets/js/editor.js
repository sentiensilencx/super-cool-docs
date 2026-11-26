/* ============================================================
   super cool docs — a dark, distraction-free document editor
   ============================================================ */

const STORAGE_KEY = "super-cool-docs.v1";

const state = { docs: [], activeId: null };

const $ = (sel) => document.querySelector(sel);
const editor = $("#editor");
const docTitle = $("#docTitle");
const docDate = $("#docDate");
const docAuthor = $("#docAuthor");
const tabbar = $("#tabbar");
const tabpanel = $("#tabpanel");
const toast = $("#toast");

/* ---------- Persistence ---------- */

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.docs) && parsed.docs.length) {
        state.docs = parsed.docs;
        state.activeId = parsed.docs.some((d) => d.id === parsed.activeId)
          ? parsed.activeId
          : parsed.docs[0].id;
        return;
      }
    }
  } catch {
    /* corrupt storage: fall through to fresh state */
  }
  const doc = makeDoc();
  state.docs = [doc];
  state.activeId = doc.id;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function makeDoc() {
  return {
    id: "d" + Date.now() + Math.random().toString(36).slice(2, 6),
    title: "",
    author: "",
    created: Date.now(),
    updated: Date.now(),
    html: "",
  };
}

function activeDoc() {
  return state.docs.find((d) => d.id === state.activeId);
}

/* ---------- Toast ---------- */

let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1800);
}

/* ---------- Document rendering ---------- */

function renderTabs() {
  tabbar.innerHTML = "";
  state.docs.forEach((doc) => {
    const tab = document.createElement("div");
    tab.className = "tab" + (doc.id === state.activeId ? " active" : "");
    tab.innerHTML = `<span></span><button class="tab-close" title="Close">×</button>`;
    tab.querySelector("span").textContent = doc.title || "Untitled";
    tab.addEventListener("click", (e) => {
      if (e.target.classList.contains("tab-close")) return;
      switchDoc(doc.id);
    });
    tab.querySelector(".tab-close").addEventListener("click", () => closeDoc(doc.id));
    tabbar.appendChild(tab);
  });
}

function renderTabPanel() {
  tabpanel.innerHTML = `<div class="tp-head">All documents · ${state.docs.length}</div>`;
  const sorted = [...state.docs].sort((a, b) => b.updated - a.updated);
  sorted.forEach((doc) => {
    const item = document.createElement("div");
    item.className = "tp-item" + (doc.id === state.activeId ? " active" : "");
    const date = new Date(doc.updated).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    item.innerHTML = `<span class="tp-title"></span><span class="tp-meta"></span><button class="tp-del" title="Delete">×</button>`;
    item.querySelector(".tp-title").textContent = doc.title || "Untitled";
    item.querySelector(".tp-meta").textContent = date;
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("tp-del")) return;
      switchDoc(doc.id);
      tabpanel.classList.remove("open");
    });
    item.querySelector(".tp-del").addEventListener("click", () => deleteDoc(doc.id));
    tabpanel.appendChild(item);
  });
}

function openDoc() {
  const doc = activeDoc();
  if (!doc) return;
  docTitle.textContent = doc.title;
  docAuthor.textContent = doc.author;
  docDate.textContent = new Date(doc.created).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });
  editor.innerHTML = doc.html || "<p><br></p>";
  renderTabs();
  renderTabPanel();
  updateCounts();
}

function switchDoc(id) {
  if (id === state.activeId) return;
  saveActiveDoc();
  state.activeId = id;
  persist();
  openDoc();
}

function saveActiveDoc() {
  const doc = activeDoc();
  if (!doc) return;
  doc.title = docTitle.textContent.trim();
  doc.author = docAuthor.textContent.trim();
  doc.html = editor.innerHTML;
  doc.updated = Date.now();
}

function newDoc() {
  saveActiveDoc();
  const doc = makeDoc();
  state.docs.push(doc);
  state.activeId = doc.id;
  persist();
  openDoc();
  docTitle.focus();
  showToast("New document created");
}

function deleteDoc(id) {
  state.docs = state.docs.filter((d) => d.id !== id);
  if (!state.docs.length) {
    const doc = makeDoc();
    state.docs.push(doc);
  }
  if (state.activeId === id) state.activeId = state.docs[0].id;
  persist();
  openDoc();
  showToast("Document deleted");
}

function closeDoc(id) {
  deleteDoc(id);
}

/* ---------- Autosave ---------- */

let saveTimer = null;
function scheduleSave() {
  $("#savedAt").textContent = "Editing…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveActiveDoc();
    persist();
    renderTabPanel();
    $("#savedAt").textContent = "Saved " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, 600);
}

/* ---------- Counts ---------- */

function updateCounts() {
  const text = editor.innerText.replace(/\u00a0/g, " ").trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  $("#wordCount").textContent = words + (words === 1 ? " word" : " words");
  $("#charCount").textContent = text.length + " characters";
}

/* ---------- Commands ---------- */

function exec(cmd, value) {
  editor.focus();
  document.execCommand(cmd, false, value);
  scheduleSave();
  updateCounts();
}

function insertBlock(html, selectPlaceholder) {
  editor.focus();
  document.execCommand("insertHTML", false, html);
  scheduleSave();
  updateCounts();
}

function insertLink() {
  const sel = window.getSelection();
  const selectedText = sel && sel.toString().trim();
  const url = prompt("Link URL:");
  if (!url) return;
  if (selectedText) {
    exec("createLink", url);
  } else {
    insertBlock(`<a href="${escapeAttr(url)}">${escapeHtml(url)}</a>&nbsp;`);
  }
}

function insertImage() {
  const url = prompt("Image URL (or leave empty to pick a local file):");
  if (url === null) return;
  if (url.trim() === "") {
    const pick = document.createElement("input");
    pick.type = "file";
    pick.accept = "image/*";
    pick.addEventListener("change", () => {
      const file = pick.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => insertBlock(`<img src="${reader.result}" alt="" />&nbsp;`);
      reader.readAsDataURL(file);
    });
    pick.click();
  } else {
    insertBlock(`<img src="${escapeAttr(url)}" alt="" />&nbsp;`);
  }
}

function insertChecklist() {
  insertBlock(
    `<ul class="checklist"><li class="done">Done item</li><li>Open item<br></li></ul><p><br></p>`
  );
}

function insertTable() {
  insertBlock(
    `<table><thead><tr><th>Column A</th><th>Column B</th><th>Column C</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>`
  );
}

function insertDate() {
  const now = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
  insertBlock(escapeHtml(now) + "&nbsp;");
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function runCommand(cmd) {
  switch (cmd) {
    case "newDoc": return newDoc();
    case "openDoc": return $("#fileInput").click();
    case "saveDoc": return downloadHtml();
    case "printDoc": return window.print();
    case "cut": return exec("cut");
    case "copy": return exec("copy");
    case "bold": return exec("bold");
    case "italic": return exec("italic");
    case "underline": return exec("underline");
    case "insertUnorderedList": return exec("insertUnorderedList");
    case "insertOrderedList": return exec("insertOrderedList");
    case "find": return openFind();
    default: return;
  }
}

function runInsert(kind) {
  switch (kind) {
    case "h1": return exec("formatBlock", "<h1>");
    case "h2": return exec("formatBlock", "<h2>");
    case "h3": return exec("formatBlock", "<h3>");
    case "quote": return exec("formatBlock", "<blockquote>");
    case "code": return insertBlock("<pre><code>// code</code></pre><p><br></p>");
    case "divider": return insertBlock("<hr><p><br></p>");
    case "checklist": return insertChecklist();
    case "table": return insertTable();
    case "link": return insertLink();
    case "image": return insertImage();
    case "date": return insertDate();
  }
}

/* ---------- Checklists ---------- */

editor.addEventListener("click", (e) => {
  const li = e.target.closest("ul.checklist li");
  if (!li) return;
  li.classList.toggle("done");
  scheduleSave();
});

/* ---------- Mode ---------- */

const modeBtn = $("#modeBtn");
function setMode(mode) {
  document.body.classList.toggle("mode-preview", mode === "preview");
  document.body.classList.toggle("mode-editing", mode === "editing");
  modeBtn.textContent = mode === "preview" ? "Preview ▾" : "Editing ▾";
  editor.contentEditable = mode === "preview" ? "false" : "true";
  docTitle.contentEditable = mode === "preview" ? "false" : "true";
  docAuthor.contentEditable = mode === "preview" ? "false" : "true";
}

/* ---------- Dropdown menus ---------- */

function wireMenu(btnSel, menuSel) {
  const btn = $(btnSel);
  const menu = $(menuSel);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains("open");
    closeMenus();
    if (!isOpen) menu.classList.add("open");
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) menu.classList.remove("open");
  });
}
function closeMenus() {
  document.querySelectorAll(".insert-menu, .mode-menu").forEach((m) => m.classList.remove("open"));
}

/* ---------- Find & replace ---------- */

const findModal = $("#findModal");
const findInput = $("#findInput");
const replaceInput = $("#replaceInput");

function openFind() {
  findModal.classList.add("open");
  findInput.focus();
  findInput.select();
}

function closeFind() {
  findModal.classList.remove("open");
  clearHighlights();
  $("#findCount").textContent = "";
}

function clearHighlights() {
  editor.querySelectorAll("mark.find-hl").forEach((mark) => {
    const parent = mark.parentNode;
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize();
  });
}

function textWalker(root) {
  return document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      n.parentNode && n.parentNode.closest && n.parentNode.closest("mark.find-hl")
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
}

function runFind() {
  clearHighlights();
  const q = findInput.value;
  if (!q) {
    $("#findCount").textContent = "";
    return 0;
  }
  const nodes = [];
  const walker = textWalker(editor);
  let node;
  while ((node = walker.nextNode())) nodes.push(node);

  let count = 0;
  nodes.forEach((textNode) => {
    const text = textNode.nodeValue;
    if (!text) return;
    const lower = text.toLowerCase();
    const ql = q.toLowerCase();
    let idx = lower.indexOf(ql);
    if (idx === -1) return;
    const frag = document.createDocumentFragment();
    let pos = 0;
    while (idx !== -1) {
      frag.appendChild(document.createTextNode(text.slice(pos, idx)));
      const mark = document.createElement("mark");
      mark.className = "find-hl";
      mark.textContent = text.slice(idx, idx + q.length);
      frag.appendChild(mark);
      count++;
      pos = idx + q.length;
      idx = lower.indexOf(ql, pos);
    }
    frag.appendChild(document.createTextNode(text.slice(pos)));
    textNode.parentNode.replaceChild(frag, textNode);
  });

  $("#findCount").textContent = count ? `${count} match${count === 1 ? "" : "es"}` : "No matches";
  return count;
}

function replaceAll() {
  clearHighlights();
  const q = findInput.value;
  const repl = replaceInput.value;
  if (!q) return;
  const nodes = [];
  const walker = textWalker(editor);
  let node;
  while ((node = walker.nextNode())) nodes.push(node);

  let count = 0;
  nodes.forEach((textNode) => {
    const parts = textNode.nodeValue.split(q);
    if (parts.length === 1) return;
    count += parts.length - 1;
    textNode.nodeValue = parts.join(repl);
  });

  $("#findCount").textContent = count ? `Replaced ${count} occurrence${count === 1 ? "" : "s"}` : "No matches";
  scheduleSave();
  updateCounts();
}

findInput.addEventListener("input", runFind);
findModal.addEventListener("click", (e) => {
  if (e.target === findModal) closeFind();
});
$("#findClearBtn").addEventListener("click", () => {
  findInput.value = "";
  replaceInput.value = "";
  runFind();
});
$("#replaceAllBtn").addEventListener("click", replaceAll);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && findModal.classList.contains("open")) closeFind();
});

/* ---------- Save / open files ---------- */

function downloadHtml() {
  saveActiveDoc();
  const doc = activeDoc();
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(doc.title || "Untitled")}</title>
<style>
body{max-width:720px;margin:40px auto;padding:0 20px;font-family:Georgia,serif;line-height:1.7;color:#222}
h1{line-height:1.25}blockquote{border-left:3px solid #ccc;margin:1.2em 0;padding-left:16px;color:#555}
pre{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;padding:12px;overflow-x:auto}
code{font-family:ui-monospace,Consolas,monospace;font-size:.9em}img{max-width:100%}
table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px}
ul.checklist{list-style:none;padding-left:4px}ul.checklist li.done{color:#999;text-decoration:line-through}
</style>
</head>
<body>
<h1>${escapeHtml(doc.title || "Untitled")}</h1>
<p><em>${escapeHtml(doc.author || "anonymous")} · ${new Date(doc.created).toLocaleDateString()}</em></p>
<hr>
${doc.html}
</body>
</html>`;
  triggerDownload(
    new Blob([html], { type: "text/html" }),
    (doc.title || "untitled").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").toLowerCase() + ".html"
  );
  showToast("Downloaded as .html");
}

function triggerDownload(blob, filename) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function mdToHtml(md) {
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  const out = [];
  let list = null;
  let inCode = false;
  let codeBuf = [];

  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const rawLine of md.split(/\r?\n/)) {
    const line = rawLine;
    if (line.trim().startsWith("```")) {
      if (inCode) {
        out.push(`<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`);
        codeBuf = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)/);
    if (h) {
      closeList();
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`);
      continue;
    }
    if (/^>\s?/.test(line)) {
      closeList();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      if (list !== "ul") {
        closeList();
        out.push("<ul>");
        list = "ul";
      }
      out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inline(line.replace(/^\s*\d+\.\s+/, ""))}</li>`);
      continue;
    }
    if (/^\s*(---|___|\*\*\*)\s*$/.test(line)) {
      closeList();
      out.push("<hr>");
      continue;
    }
    if (line.trim() === "") {
      closeList();
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  if (inCode) out.push(`<pre><code>${esc(codeBuf.join("\n"))}</code></pre>`);
  closeList();
  return out.join("\n");
}

$("#fileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result);
    const ext = file.name.split(".").pop().toLowerCase();
    let title = file.name.replace(/\.[^.]+$/, "");
    let html;

    if (ext === "html" || ext === "htm") {
      const parsed = new DOMParser().parseFromString(text, "text/html");
      const h1 = parsed.querySelector("h1");
      if (h1 && !docTitle.textContent.trim()) title = h1.textContent.trim();
      const source = parsed.querySelector("article") || parsed.body || parsed;
      html = source.innerHTML;
    } else if (ext === "md" || ext === "markdown") {
      html = mdToHtml(text);
    } else {
      html = text
        .split(/\n{2,}/)
        .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
        .join("\n");
    }

    saveActiveDoc();
    const doc = makeDoc();
    doc.title = title;
    doc.html = html;
    state.docs.push(doc);
    state.activeId = doc.id;
    persist();
    openDoc();
    showToast(`Opened “${title}”`);
  };
  reader.readAsText(file);
});

/* ---------- Keyboard shortcuts ---------- */

document.addEventListener("keydown", (e) => {
  const mod = e.ctrlKey || e.metaKey;
  if (!mod) return;
  const k = e.key.toLowerCase();

  if (k === "s") {
    e.preventDefault();
    downloadHtml();
  } else if (k === "f") {
    e.preventDefault();
    openFind();
  } else if (k === "n" && e.altKey) {
    e.preventDefault();
    newDoc();
  } else if (k === "o") {
    e.preventDefault();
    $("#fileInput").click();
  }
});

/* ---------- Toolbar wiring ---------- */

document.querySelectorAll(".tbtn[data-cmd]").forEach((btn) => {
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", () => runCommand(btn.dataset.cmd));
});

$("#insertBtn").addEventListener("mousedown", (e) => e.preventDefault());
document.querySelectorAll(".insert-menu [data-insert]").forEach((btn) => {
  btn.addEventListener("mousedown", (e) => e.preventDefault());
  btn.addEventListener("click", () => {
    closeMenus();
    runInsert(btn.dataset.insert);
  });
});

document.querySelectorAll(".mode-menu [data-mode]").forEach((btn) => {
  btn.addEventListener("click", () => {
    closeMenus();
    setMode(btn.dataset.mode);
  });
});

document.addEventListener("selectionchange", () => {
  if (document.body.classList.contains("mode-preview")) return;
  ["bold", "italic", "underline", "insertUnorderedList", "insertOrderedList"].forEach((cmd) => {
    const btn = document.querySelector(`.tbtn[data-cmd="${cmd}"]`);
    if (btn) btn.classList.toggle("active", document.queryCommandState(cmd));
  });
});

/* ---------- Title / author / editor input ---------- */

docTitle.addEventListener("input", () => {
  scheduleSave();
  const doc = activeDoc();
  if (doc) {
    doc.title = docTitle.textContent.trim();
    renderTabs();
  }
});
docTitle.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    editor.focus();
  }
});

docAuthor.addEventListener("input", scheduleSave);

editor.addEventListener("input", () => {
  scheduleSave();
  updateCounts();
});

/* Tab panel toggle */

$("#tabsBtn").addEventListener("click", () => {
  tabpanel.classList.toggle("open");
  renderTabPanel();
});
document.addEventListener("click", (e) => {
  if (
    tabpanel.classList.contains("open") &&
    !tabpanel.contains(e.target) &&
    !$("#tabsBtn").contains(e.target)
  ) {
    tabpanel.classList.remove("open");
  }
});

$("#newTabBtn").addEventListener("click", newDoc);

/* ---------- Boot ---------- */

wireMenu("#insertBtn", "#insertMenu");
wireMenu("#modeBtn", "#modeMenu");
loadState();
openDoc();
setMode("editing");
$("#savedAt").textContent = "Saved";
