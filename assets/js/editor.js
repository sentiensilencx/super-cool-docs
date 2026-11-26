/* ============================================================
   super cool docs — Google Docs structure, dark warm theme
   ============================================================ */

const STORAGE_KEY = "super-cool-docs.v2";
const PROFILE_KEY = "super-cool-docs.profile.v1";
const PREFS_KEY = "super-cool-docs.prefs.v1";

const PAGE_DIMS = {
  a4: { w: 210, h: 297, atPage: "A4" },
  letter: { w: 215.9, h: 279.4, atPage: "letter" },
  legal: { w: 215.9, h: 355.6, atPage: "legal" },
};

const HIGHLIGHT_RGB = "rgb(230, 195, 92)";
const HIGHLIGHT_HEX = "#e6c35c";
const BODY_TEXT_HEX = "#ece7db";

function loadProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY)) || { author: "" };
  } catch {
    return { author: "" };
  }
}

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY)) || { view: "grid", sort: "opened" };
  } catch {
    return { view: "grid", sort: "opened" };
  }
}

const profile = loadProfile();
const prefs = loadPrefs();

function saveProfile() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

function savePrefs() {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

const state = { docs: [], activeId: null };

const $ = (sel) => document.querySelector(sel);
const editor = $("#editor");
const docTitle = $("#docTitle");
const sheet = $("#sheet");
const toast = $("#toast");
const editorShell = $(".editor-shell");

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
    /* corrupt storage: start fresh */
  }
  const doc = makeDoc("a4");
  state.docs = [doc];
  state.activeId = doc.id;
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function makeDoc(pageSize, html) {
  return {
    id: "d" + Date.now() + Math.random().toString(36).slice(2, 6),
    title: "",
    author: profile.author || "",
    starred: false,
    pageSize: PAGE_DIMS[pageSize] ? pageSize : "a4",
    created: Date.now(),
    updated: Date.now(),
    openedAt: Date.now(),
    html: html || "",
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

/* ---------- Info modal ---------- */

function showInfo(title, html) {
  $("#infoTitle").textContent = title;
  $("#infoBody").innerHTML = html;
  $("#infoModal").classList.add("open");
}

$("#infoCloseBtn").addEventListener("click", () => $("#infoModal").classList.remove("open"));
$("#infoModal").addEventListener("click", (e) => {
  if (e.target === $("#infoModal")) $("#infoModal").classList.remove("open");
});

/* ---------- View switching ---------- */

function showHome() {
  saveActiveDoc();
  persist();
  document.body.classList.remove("view-editor");
  document.body.classList.add("view-home");
  $("#editorView").hidden = true;
  renderHome();
}

function showEditor() {
  document.body.classList.remove("view-home");
  document.body.classList.add("view-editor");
  $("#editorView").hidden = false;
  if (window.innerWidth < 1100) editorShell.classList.add("side-collapsed");
  requestAnimationFrame(updatePageBreaks);
}

/* ---------- Home rendering ---------- */

function docSnippet(doc) {
  const tmp = document.createElement("div");
  tmp.innerHTML = doc.html || "";
  const text = (tmp.textContent || "").replace(/\s+/g, " ").trim();
  return text || "Empty document";
}

function renderHome() {
  renderTemplates();
  renderRecent();
  renderDrawer();
  renderProfile();
}

/* ---------- Templates ---------- */

const RESUME_HTML = `<h1>Full Name</h1>
<p><em>City, Country · you@example.com · +1 555 010 0000</em></p>
<h2>Experience</h2>
<p><strong>Job Title</strong> — Company Name, 2022–Present</p>
<ul><li>Led a project that improved a key metric by a measurable amount</li><li>Shipped a feature used by many people</li><li>Mentored teammates and improved the team's process</li></ul>
<h2>Education</h2>
<p><strong>Degree Name</strong> — University Name, 2022</p>
<h2>Skills</h2>
<p>Skill One · Skill Two · Skill Three</p>`;

const PROPOSAL_HTML = `<h1>Project Proposal</h1>
<p><strong>Prepared by:</strong> anonymous · <strong>Date:</strong> —</p>
<h2>Overview</h2>
<p>Describe the problem, the proposed solution, and the expected outcome in two or three sentences.</p>
<h2>Timeline</h2>
<table><thead><tr><th>Phase</th><th>Dates</th><th>Deliverable</th></tr></thead><tbody><tr><td>Phase 1</td><td>Weeks 1–2</td><td>&nbsp;</td></tr><tr><td>Phase 2</td><td>Weeks 3–4</td><td>&nbsp;</td></tr><tr><td>Phase 3</td><td>Weeks 5–6</td><td>&nbsp;</td></tr></tbody></table>
<h2>Budget</h2>
<table><thead><tr><th>Item</th><th>Cost</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table>
<h2>Approval</h2>
<p>Signed: ____________________</p>`;

const LETTER_HTML = `<p>October 14, 2026</p>
<p>Recipient Name<br>Street Address<br>City, Country</p>
<p>Dear Recipient,</p>
<p>Open with the purpose of your letter in the first sentence, then give the details in one or two short paragraphs.</p>
<p>Close with what you would like to happen next.</p>
<p>Sincerely,</p>
<p>&nbsp;</p>
<p>Your Name</p>`;

const REPORT_HTML = `<h1>Project Report</h1>
<p><em>Prepared by anonymous · status: draft</em></p>
<h2>Summary</h2>
<p>One paragraph summarizing what happened, what was learned, and what is next.</p>
<h2>What was done</h2>
<ul><li>Milestone or task one</li><li>Milestone or task two</li><li>Milestone or task three</li></ul>
<h2>Results</h2>
<p>Describe outcomes, including numbers where possible.</p>
<h2>Next steps</h2>
<ol><li>First next step</li><li>Second next step</li></ol>`;

const MEETING_HTML = `<h1>Meeting Notes</h1>
<p><em>Date: — · Attendees: —</em></p>
<h2>Agenda</h2>
<ol><li>Topic one</li><li>Topic two</li></ol>
<h2>Decisions</h2>
<ul><li>Decision one — owner, deadline</li></ul>
<h2>Action items</h2>
<ul class="checklist"><li>Action item — owner</li><li class="done">Send these notes</li></ul>`;

const TEMPLATES = [
  { id: "blank-a4", name: "Blank document", sub: "A4", size: "a4", thumb: "blank", html: "" },
  { id: "blank-letter", name: "Blank document", sub: "Letter", size: "letter", thumb: "blank", html: "" },
  { id: "blank-legal", name: "Blank document", sub: "Legal", size: "legal", thumb: "blank", html: "" },
  { id: "resume-serif", name: "Resume", sub: "Serif", size: "letter", thumb: "resume", html: RESUME_HTML },
  { id: "resume-coral", name: "Resume", sub: "Coral", size: "letter", thumb: "resume-coral", html: RESUME_HTML },
  { id: "proposal", name: "Project proposal", sub: "Tropic", size: "a4", thumb: "proposal", html: PROPOSAL_HTML },
  { id: "letter", name: "Letter", sub: "Spearmint", size: "a4", thumb: "letter", html: LETTER_HTML },
  { id: "report", name: "Report", sub: "Slate", size: "a4", thumb: "report", html: REPORT_HTML },
  { id: "meeting", name: "Meeting notes", sub: "Geometric", size: "a4", thumb: "meeting", html: MEETING_HTML },
];

const MAIN_TEMPLATE_IDS = ["blank-a4", "blank-letter", "blank-legal", "resume-serif", "resume-coral", "proposal"];

function thumbHtml(type) {
  const L = (cls) => `<span class="thumb-line ${cls || ""}"></span>`;
  switch (type) {
    case "resume":
    case "resume-coral":
      return L("mid") + L("short") + L("wide") + L("wide") + L("mid") + L("wide") + L("short");
    case "proposal":
      return `<span class="thumb-band tropic"></span>` + L("wide") + L("mid") + `<span class="thumb-cols">${L()}${L()}${L()}</span><br>` + L("wide") + L("wide");
    case "letter":
      return L("short") + L("wide") + L("wide") + L("mid") + L("wide") + L("short");
    case "report":
      return `<span class="thumb-band slate"></span>` + L("wide") + L("wide") + L("mid") + `<span class="thumb-cols">${L()}${L()}</span><br>` + L("wide");
    case "meeting":
      return `<span class="thumb-band geometric"></span>` + L("mid") + L("wide") + L("wide") + L("short");
    default:
      return "";
  }
}

function templateCard(t) {
  const card = document.createElement("button");
  card.className = "template-card";
  const band =
    t.thumb === "resume-coral" ? `<span class="thumb-band coral"></span>` :
    t.thumb === "resume" ? `<span class="thumb-band slate"></span>` : "";
  card.innerHTML = `
    <span class="template-thumb">${band}${thumbHtml(t.thumb)}</span>
    <span class="template-name"></span>
    <span class="template-sub"></span>
  `;
  card.querySelector(".template-name").textContent = t.name;
  card.querySelector(".template-sub").textContent = t.sub;
  card.addEventListener("click", () => newDoc(t.size, t.html || ""));
  return card;
}

function renderTemplates() {
  const row = $("#templateRow");
  row.innerHTML = "";
  MAIN_TEMPLATE_IDS.forEach((id) => {
    const t = TEMPLATES.find((x) => x.id === id);
    row.appendChild(templateCard(t));
  });
  const gallery = $("#galleryRow");
  gallery.innerHTML = "";
  TEMPLATES.filter((t) => !MAIN_TEMPLATE_IDS.includes(t.id)).forEach((t) => {
    gallery.appendChild(templateCard(t));
  });
}

/* ---------- Recent documents ---------- */

function renderRecent() {
  const grid = $("#docGrid");
  grid.innerHTML = "";
  grid.classList.toggle("list-view", prefs.view === "list");
  $("#viewGridBtn").classList.toggle("active", prefs.view === "grid");
  $("#viewListBtn").classList.toggle("active", prefs.view === "list");

  const q = $("#homeSearch").value.trim().toLowerCase();
  let docs = [...state.docs].sort((a, b) => {
    if (prefs.sort === "title") return (a.title || "Untitled").localeCompare(b.title || "Untitled");
    if (prefs.sort === "oldest") return a.updated - b.updated;
    if (prefs.sort === "starred") return (b.starred - a.starred) || ((b.openedAt || b.updated) - (a.openedAt || a.updated));
    return (b.openedAt || b.updated) - (a.openedAt || a.updated);
  });
  if (q) {
    docs = docs.filter(
      (d) => (d.title || "untitled").toLowerCase().includes(q) || docSnippet(d).toLowerCase().includes(q)
    );
  }

  if (!docs.length) {
    grid.innerHTML = `<div class="home-empty">${q ? `No documents match “${q}”` : "No documents yet — start one above."}</div>`;
    return;
  }

  docs.forEach((doc) => {
    const card = document.createElement("button");
    card.className = "doc-card";
    const when = new Date(doc.openedAt || doc.updated).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
    card.innerHTML = `
      <svg class="doc-icon" viewBox="0 0 20 20"><path d="M4 1.5h8L16.5 6v12.5h-13V1.5z" fill="#d97757"/></svg>
      <div class="dc-body">
        <div class="dc-title"></div>
        <div class="dc-snippet"></div>
        <div class="dc-meta"><span class="dc-size"></span><span class="dc-date"></span></div>
      </div>
      <button class="dc-del" title="Delete">×</button>
    `;
    card.querySelector(".dc-title").textContent = doc.title || "Untitled document";
    card.querySelector(".dc-snippet").textContent = docSnippet(doc);
    card.querySelector(".dc-size").textContent = doc.pageSize || "a4";
    card.querySelector(".dc-date").textContent = "Opened " + when;
    card.addEventListener("click", (e) => {
      if (e.target.classList.contains("dc-del")) return;
      openDocId(doc.id);
    });
    card.querySelector(".dc-del").addEventListener("click", () => deleteDoc(doc.id));
    grid.appendChild(card);
  });
}

/* ---------- Drawer & profile ---------- */

function renderDrawer() {
  const list = $("#drawerList");
  list.innerHTML = "";
  [...state.docs].sort((a, b) => (b.openedAt || b.updated) - (a.openedAt || a.updated)).forEach((doc) => {
    const item = document.createElement("div");
    item.className = "tp-item";
    const date = new Date(doc.openedAt || doc.updated).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    item.innerHTML = `<span class="tp-title"></span><span class="tp-meta"></span><button class="tp-del" title="Delete">×</button>`;
    item.querySelector(".tp-title").textContent = doc.title || "Untitled";
    item.querySelector(".tp-meta").textContent = date;
    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("tp-del")) return;
      toggleDrawer(false);
      openDocId(doc.id);
    });
    item.querySelector(".tp-del").addEventListener("click", () => deleteDoc(doc.id));
    list.appendChild(item);
  });
}

function toggleDrawer(open) {
  const drawer = $("#homeDrawer");
  const backdrop = $("#homeBackdrop");
  const willOpen = open === undefined ? !drawer.classList.contains("open") : open;
  drawer.classList.toggle("open", willOpen);
  backdrop.classList.toggle("open", willOpen);
  if (willOpen) renderDrawer();
}

function renderProfile(updateInput) {
  const btn = $("#profileBtn");
  const name = profile.author || "you";
  btn.textContent = name.charAt(0).toUpperCase();
  if (updateInput) $("#defaultAuthorInput").value = profile.author;
  const bytes = new Blob([JSON.stringify(state)]).size;
  $("#storageInfo").textContent = `${state.docs.length} document${state.docs.length === 1 ? "" : "s"} · ${(bytes / 1024).toFixed(1)} KB stored locally`;
}

/* ---------- Sidebar tabs & outline ---------- */

function renderTabs() {
  const wrap = $("#sideTabs");
  wrap.innerHTML = "";
  state.docs.forEach((doc) => {
    const tab = document.createElement("div");
    tab.className = "side-tab" + (doc.id === state.activeId ? " active" : "");
    tab.innerHTML = `<span></span><button class="tab-close" title="Close document">×</button>`;
    tab.querySelector("span").textContent = doc.title || "Untitled";
    tab.addEventListener("click", (e) => {
      if (e.target.classList.contains("tab-close")) return;
      switchDoc(doc.id);
    });
    tab.querySelector(".tab-close").addEventListener("click", () => deleteDoc(doc.id));
    wrap.appendChild(tab);
  });
}

function renderOutline() {
  const box = $("#outline");
  const headings = [...editor.querySelectorAll("h1, h2, h3")];
  if (!headings.length) {
    box.innerHTML = `<div class="outline-empty">Headings you add to the document will appear here.</div>`;
    return;
  }
  box.innerHTML = "";
  headings.forEach((h) => {
    const item = document.createElement("button");
    item.className = "outline-item";
    item.dataset.level = h.tagName[1];
    item.textContent = h.textContent || "—";
    item.addEventListener("click", () => {
      h.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    box.appendChild(item);
  });
}

/* ---------- Document lifecycle ---------- */

function openDoc() {
  const doc = activeDoc();
  if (!doc) return;
  docTitle.textContent = doc.title;
  $("#starBtn").classList.toggle("starred", !!doc.starred);
  editor.innerHTML = doc.html || "<p><br></p>";
  sheet.dataset.size = doc.pageSize || "a4";
  applyAtPage();
  renderTabs();
  renderOutline();
  updateCounts();
  requestAnimationFrame(updatePageBreaks);
}

function openDocId(id) {
  saveActiveDoc();
  state.activeId = id;
  const doc = activeDoc();
  if (doc) doc.openedAt = Date.now();
  persist();
  openDoc();
  showEditor();
}

function switchDoc(id) {
  if (id === state.activeId) return;
  saveActiveDoc();
  state.activeId = id;
  const doc = activeDoc();
  if (doc) doc.openedAt = Date.now();
  persist();
  openDoc();
}

function saveActiveDoc() {
  const doc = activeDoc();
  if (!doc) return;
  doc.title = docTitle.textContent.trim();
  doc.pageSize = sheet.dataset.size;
  doc.html = editor.innerHTML;
  doc.updated = Date.now();
}

function newDoc(pageSize, html) {
  saveActiveDoc();
  const doc = makeDoc(pageSize || "a4", html);
  state.docs.push(doc);
  state.activeId = doc.id;
  persist();
  openDoc();
  showEditor();
  if (!html) docTitle.focus();
  showToast(`New ${PAGE_DIMS[doc.pageSize].atPage} document`);
}

function deleteDoc(id) {
  state.docs = state.docs.filter((d) => d.id !== id);
  if (!state.docs.length) {
    const doc = makeDoc("a4");
    state.docs.push(doc);
  }
  if (state.activeId === id) state.activeId = state.docs[0].id;
  persist();
  if (document.body.classList.contains("view-editor")) openDoc();
  renderHome();
  showToast("Document deleted");
}

/* ---------- Autosave ---------- */

let saveTimer = null;
function scheduleSave() {
  $("#savedAt").textContent = "Editing…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveActiveDoc();
    persist();
    renderTabs();
    $("#savedAt").textContent =
      "Saved " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, 600);
}

/* ---------- Counts & pagination ---------- */

function updateCounts() {
  const text = editor.innerText.replace(/\u00a0/g, " ").trim();
  const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
  $("#wordCount").textContent = words + (words === 1 ? " word" : " words");
  $("#charCount").textContent = text.length + " characters";
}

function updatePageBreaks() {
  if (document.body.classList.contains("view-home")) return;
  const d = PAGE_DIMS[sheet.dataset.size] || PAGE_DIMS.a4;
  const sheetW = sheet.getBoundingClientRect().width;
  if (!sheetW) return;
  const pxmm = sheetW / d.w;
  const marginPx = parseFloat(getComputedStyle(sheet).paddingTop) || 0;
  const pageHpx = d.h * pxmm;
  const contentHpx = Math.max(50, pageHpx - 2 * marginPx);
  const contentH = editor.scrollHeight;

  const total = Math.max(1, Math.ceil(Math.max(contentH, 1) / contentHpx));
  const markers = $("#pageMarkers");
  markers.innerHTML = "";
  for (let i = 1; i < total; i++) {
    const marker = document.createElement("div");
    marker.className = "page-break-marker";
    marker.style.top = marginPx + i * contentHpx + "px";
    markers.appendChild(marker);
  }

  let current = 1;
  try {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.height || rect.width) {
        const sheetTop = sheet.getBoundingClientRect().top;
        current = Math.min(total, Math.max(1, Math.floor((rect.top - sheetTop - marginPx) / contentHpx) + 1));
      }
    }
  } catch {
    current = 1;
  }
  $("#pageCount").textContent = `Page ${current} of ${total}`;
}

function applyAtPage() {
  const size = sheet.dataset.size;
  $("#pageStyle").textContent = `@page { size: ${PAGE_DIMS[size].atPage} portrait; margin: 25.4mm; }`;
}

/* ---------- Commands ---------- */

function exec(cmd, value) {
  editor.focus();
  document.execCommand(cmd, false, value);
  scheduleSave();
  updateCounts();
  updatePageBreaks();
}

function insertBlock(html) {
  editor.focus();
  document.execCommand("insertHTML", false, html);
  scheduleSave();
  updateCounts();
  updatePageBreaks();
  renderOutline();
}

function insertLink() {
  const sel = window.getSelection();
  const selectedText = sel && sel.toString().trim();
  const url = prompt("Link URL:");
  if (!url) return;
  if (selectedText) exec("createLink", url);
  else insertBlock(`<a href="${escapeAttr(url)}">${escapeHtml(url)}</a>&nbsp;`);
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

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

function toggleHighlight() {
  let color;
  try {
    color = document.queryCommandValue("backColor");
  } catch {
    color = "";
  }
  editor.focus();
  document.execCommand("styleWithCSS", false, true);
  if (color === HIGHLIGHT_RGB) {
    document.execCommand("backColor", false, "transparent");
    document.execCommand("foreColor", false, BODY_TEXT_HEX);
  } else {
    document.execCommand("backColor", false, HIGHLIGHT_HEX);
    document.execCommand("foreColor", false, "#221c10");
  }
  document.execCommand("styleWithCSS", false, false);
  scheduleSave();
}

function showWordCount() {
  updateCounts();
  showInfo(
    "Document statistics",
    `<table>
      <tr><td>Pages</td><td>${$("#pageCount").textContent.replace("Page ", "").split(" of ")[1] || 1}</td></tr>
      <tr><td>Words</td><td>${$("#wordCount").textContent}</td></tr>
      <tr><td>Characters</td><td>${$("#charCount").textContent}</td></tr>
    </table>`
  );
}

function showShortcuts() {
  const row = (keys, label) => `<tr><td><kbd>${keys}</kbd></td><td>${label}</td></tr>`;
  showInfo(
    "Keyboard shortcuts",
    `<table>
      ${row("Ctrl+B", "Bold")}${row("Ctrl+I", "Italic")}${row("Ctrl+U", "Underline")}
      ${row("Ctrl+Z / Ctrl+Y", "Undo / Redo")}
      ${row("Ctrl+F", "Find & replace")}
      ${row("Ctrl+S", "Download as .html")}
      ${row("Ctrl+O", "Open file")}
      ${row("Ctrl+P", "Print")}
      ${row("Ctrl+Alt+N", "New document")}
    </table>`
  );
}

function runCommand(cmd) {
  switch (cmd) {
    case "openDoc": return $("#fileInput").click();
    case "saveDoc": return downloadHtml();
    case "printDoc": return window.print();
    case "cut": return exec("cut");
    case "copy": return exec("copy");
    case "bold": return exec("bold");
    case "italic": return exec("italic");
    case "underline": return exec("underline");
    case "highlight": return toggleHighlight();
    case "insertUnorderedList": return exec("insertUnorderedList");
    case "insertOrderedList": return exec("insertOrderedList");
    case "indent": return exec("indent");
    case "outdent": return exec("outdent");
    case "undo": return exec("undo");
    case "redo": return exec("redo");
    case "selectAll":
      editor.focus();
      document.execCommand("selectAll");
      return;
    case "find": return openFind();
    case "home": return showHome();
    case "toggleSide": return editorShell.classList.toggle("side-collapsed");
    case "wordCount": return showWordCount();
    case "shortcuts": return showShortcuts();
    case "about":
      return showInfo("About", `<strong>super cool docs</strong><br>A dark, distraction-free document editor. Plain HTML, CSS, and JavaScript — no dependencies. Documents are stored locally in your browser.`);
    case "deleteDoc": {
      const doc = activeDoc();
      if (doc && confirm(`Delete “${doc.title || "Untitled"}”? This cannot be undone.`)) {
        deleteDoc(doc.id);
      }
      return;
    }
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
    case "checklist":
      return insertBlock('<ul class="checklist"><li class="done">Done item</li><li>Open item<br></li></ul><p><br></p>');
    case "table":
      return insertBlock(
        "<table><thead><tr><th>Column A</th><th>Column B</th><th>Column C</th></tr></thead><tbody><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr></tbody></table><p><br></p>"
      );
    case "link": return insertLink();
    case "image": return insertImage();
    case "date": {
      const now = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
      return insertBlock(escapeHtml(now) + "&nbsp;");
    }
  }
}

/* ---------- Markdown typing ---------- */

const BLOCK_MD = {
  "#": "<h1>",
  "##": "<h2>",
  "###": "<h3>",
  ">": "<blockquote>",
  "-": "insertUnorderedList",
  "*": "insertUnorderedList",
  "1.": "insertOrderedList",
  "1)": "insertOrderedList",
  "```": "pre",
};

function currentBlock(el) {
  let node = el;
  while (node && node !== editor) {
    if (node.nodeType === 1 && /^(P|H1|H2|H3|H4|LI|BLOCKQUOTE|PRE|DIV)$/.test(node.tagName)) return node;
    node = node.parentNode;
  }
  return null;
}

function tryBlockFormat() {
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed || !sel.rangeCount) return false;
  const block = currentBlock(sel.anchorNode);
  if (!block) return false;
  const range = sel.getRangeAt(0);
  const pre = document.createRange();
  pre.selectNodeContents(block);
  pre.setEnd(range.endContainer, range.endOffset);
  const text = pre.toString().trim();
  const fmt = BLOCK_MD[text];
  if (!fmt) return false;

  pre.deleteContents();
  if (fmt === "pre") {
    document.execCommand("formatBlock", false, "<pre>");
  } else if (fmt.startsWith("<")) {
    document.execCommand("formatBlock", false, fmt);
  } else {
    document.execCommand(fmt, false);
  }
  scheduleSave();
  updateCounts();
  updatePageBreaks();
  return true;
}

function tryInlineFormat(ch) {
  const sel = window.getSelection();
  if (!sel || !sel.isCollapsed || !sel.rangeCount) return false;
  const node = sel.anchorNode;
  if (!node || node.nodeType !== 3) return false;
  const off = sel.anchorOffset;
  const before = node.nodeValue.slice(0, off);
  if (!before.endsWith(ch)) return false;
  const tokenMatch = before.match(/(^|\s)([^\s]+)$/);
  const tail = tokenMatch ? tokenMatch[2] : before;

  let m = null;
  let tag = null;
  if (ch === "`") {
    m = tail.match(/^`([^`\s][^`]*)`$/);
    tag = "code";
  } else if (ch === "*") {
    m = tail.match(/^\*\*([^*\s][^*]*)\*\*$/);
    if (m) tag = "strong";
    else {
      m = tail.match(/^\*([^*\s][^*]*)\*$/);
      tag = "em";
    }
  }
  if (!m || !tag) return false;

  const full = m[0];
  const range = document.createRange();
  range.setStart(node, off - full.length);
  range.setEnd(node, off);
  range.deleteContents();
  const el = document.createElement(tag);
  el.textContent = m[1];
  range.insertNode(el);
  const after = document.createRange();
  after.setStartAfter(el);
  after.collapse(true);
  const s = window.getSelection();
  s.removeAllRanges();
  s.addRange(after);
  return true;
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
  requestAnimationFrame(updatePageBreaks);
}

/* ---------- Menus ---------- */

function closeMenus() {
  document.querySelectorAll(".menu").forEach((m) => m.classList.remove("open"));
  document.querySelectorAll(".menu-wrap").forEach((w) => w.classList.remove("open"));
}

function wireMenu(btnSel, menuSel) {
  const btn = $(btnSel);
  const menu = $(menuSel);
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains("open");
    closeMenus();
    if (!isOpen) {
      menu.classList.add("open");
      btn.closest(".menu-wrap").classList.add("open");
    }
  });
  document.addEventListener("click", (e) => {
    if (!menu.contains(e.target)) {
      menu.classList.remove("open");
      btn.closest(".menu-wrap").classList.remove("open");
    }
  });
}

document.querySelectorAll(".menubar .menu-wrap").forEach((wrap) => {
  const label = wrap.querySelector(".menu-label");
  const menu = wrap.querySelector(".menu");
  if (!label || !menu) return;
  label.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.contains("open");
    closeMenus();
    if (!isOpen) {
      menu.classList.add("open");
      wrap.classList.add("open");
    }
  });
  document.addEventListener("click", (e) => {
    if (!wrap.contains(e.target)) {
      menu.classList.remove("open");
      wrap.classList.remove("open");
    }
  });
});

/* ---------- Delegated action dispatch ---------- */

document.addEventListener("click", (e) => {
  const cmdEl = e.target.closest("[data-cmd]");
  if (cmdEl) {
    closeMenus();
    runCommand(cmdEl.dataset.cmd);
    return;
  }
  const insertEl = e.target.closest("[data-insert]");
  if (insertEl) {
    closeMenus();
    runInsert(insertEl.dataset.insert);
    return;
  }
  const alignEl = e.target.closest("[data-align]");
  if (alignEl) {
    closeMenus();
    exec(alignEl.dataset.align);
    return;
  }
  const newSizeEl = e.target.closest("[data-new-size]");
  if (newSizeEl) {
    closeMenus();
    newDoc(newSizeEl.dataset.newSize);
    return;
  }
  const pageSizeEl = e.target.closest("[data-page-size]");
  if (pageSizeEl) {
    closeMenus();
    sheet.dataset.size = pageSizeEl.dataset.pageSize;
    saveActiveDoc();
    persist();
    applyAtPage();
    updatePageBreaks();
    showToast(`Page size: ${PAGE_DIMS[sheet.dataset.size].atPage}`);
    return;
  }
  const modeEl = e.target.closest("[data-mode]");
  if (modeEl) {
    closeMenus();
    setMode(modeEl.dataset.mode);
    return;
  }
});

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
    return;
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

  $("#findCount").textContent = count
    ? `Replaced ${count} occurrence${count === 1 ? "" : "s"}`
    : "No matches";
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
  if (e.key === "Escape") {
    if (findModal.classList.contains("open")) closeFind();
    if ($("#infoModal").classList.contains("open")) $("#infoModal").classList.remove("open");
    closeMenus();
  }
});

/* ---------- Save / open files ---------- */

function downloadHtml() {
  saveActiveDoc();
  const doc = activeDoc();
  const atPage = PAGE_DIMS[doc.pageSize || "a4"].atPage;
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${escapeHtml(doc.title || "Untitled")}</title>
<style>
@page{size:${atPage} portrait;margin:25.4mm}
body{max-width:720px;margin:40px auto;padding:0 20px;font-family:Bitter,Georgia,serif;line-height:1.7;color:#222}
h1{line-height:1.25}blockquote{border-left:3px solid #ccc;margin:1.2em 0;padding-left:16px;color:#555}
pre{background:#f5f5f5;border:1px solid #e0e0e0;border-radius:8px;padding:12px;overflow-x:auto}
code{font-family:ui-monospace,Consolas,monospace;font-size:.9em}img{max-width:100%}
table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px}
ul.checklist{list-style:none;padding-left:4px}ul.checklist li.done{color:#999;text-decoration:line-through}
@media print{body{margin:0;max-width:none}}
</style>
</head>
<body>
<h1>${escapeHtml(doc.title || "Untitled")}</h1>
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

  for (const line of md.split(/\r?\n/)) {
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
    if (/^\s*\d+[.)]\s+/.test(line)) {
      if (list !== "ol") {
        closeList();
        out.push("<ol>");
        list = "ol";
      }
      out.push(`<li>${inline(line.replace(/^\s*\d+[.)]\s+/, ""))}</li>`);
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
      if (h1) title = h1.textContent.trim();
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
    const doc = makeDoc("a4", html);
    doc.title = title;
    state.docs.push(doc);
    state.activeId = doc.id;
    persist();
    openDoc();
    showEditor();
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
    if (document.body.classList.contains("view-editor")) openFind();
  } else if (k === "n" && e.altKey) {
    e.preventDefault();
    newDoc("a4");
  } else if (k === "o") {
    e.preventDefault();
    $("#fileInput").click();
  }
});

/* ---------- Editor input wiring ---------- */

editor.addEventListener("keydown", (e) => {
  if (document.body.classList.contains("mode-preview")) return;
  if (e.key === " " && tryBlockFormat()) e.preventDefault();
});

editor.addEventListener("input", (e) => {
  scheduleSave();
  updateCounts();
  updatePageBreaks();
  renderOutline();
  if (e.inputType === "insertText" && (e.data === "*" || e.data === "`")) {
    if (tryInlineFormat(e.data)) {
      scheduleSave();
      updateCounts();
    }
  }
});

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

window.addEventListener("resize", () => {
  requestAnimationFrame(updatePageBreaks);
});

/* ---------- Chrome wiring ---------- */

$("#sideToggle").addEventListener("click", () => editorShell.classList.toggle("side-collapsed"));
$("#homeBtn").addEventListener("click", showHome);
$("#newTabBtn").addEventListener("click", () => newDoc("a4"));

$("#starBtn").addEventListener("click", () => {
  const doc = activeDoc();
  if (!doc) return;
  doc.starred = !doc.starred;
  $("#starBtn").classList.toggle("starred", doc.starred);
  persist();
  showToast(doc.starred ? "Starred" : "Star removed");
});

$("#fontSizeSel").addEventListener("mousedown", () => editor.focus());
$("#fontSizeSel").addEventListener("change", (e) => {
  if (!e.target.value) return;
  exec("fontSize", e.target.value);
  e.target.value = "";
});

$("#fontFamilySel").addEventListener("mousedown", () => editor.focus());
$("#fontFamilySel").addEventListener("change", (e) => {
  if (!e.target.value) return;
  exec("fontName", e.target.value);
  e.target.value = "";
});

$("#textColor").addEventListener("input", (e) => {
  exec("foreColor", e.target.value);
});

/* ---------- Home wiring ---------- */

$("#hamburgerBtn").addEventListener("click", () => toggleDrawer());
$("#homeBackdrop").addEventListener("click", () => toggleDrawer(false));

$("#galleryToggle").addEventListener("click", () => {
  const row = $("#galleryRow");
  const willOpen = row.hidden;
  row.hidden = !willOpen;
  $("#galleryToggle").classList.toggle("open", willOpen);
});

wireMenu("#sortBtn", "#sortMenu");

function sortLabel() {
  return { opened: "Last opened", starred: "Starred first", title: "Title A–Z", oldest: "Oldest first" }[prefs.sort] || "Last opened";
}

function refreshSortLabel() {
  const btn = $("#sortBtn");
  btn.innerHTML = "";
  btn.append(sortLabel(), " ");
  const chev = document.createElement("span");
  chev.className = "chev";
  chev.textContent = "▾";
  btn.appendChild(chev);
}

document.querySelectorAll(".sort-menu [data-sort]").forEach((btn) => {
  btn.addEventListener("click", () => {
    prefs.sort = btn.dataset.sort;
    savePrefs();
    closeMenus();
    refreshSortLabel();
    renderRecent();
  });
});

$("#viewGridBtn").addEventListener("click", () => {
  prefs.view = "grid";
  savePrefs();
  renderRecent();
});
$("#viewListBtn").addEventListener("click", () => {
  prefs.view = "list";
  savePrefs();
  renderRecent();
});

$("#homeSearch").addEventListener("input", renderRecent);

wireMenu("#profileBtn", "#profileMenu");

$("#defaultAuthorInput").addEventListener("input", (e) => {
  profile.author = e.target.value.trim();
  saveProfile();
  renderProfile(false);
});

$("#clearAllBtn").addEventListener("click", () => {
  if (!confirm("Delete all documents? This cannot be undone.")) return;
  const doc = makeDoc("a4");
  state.docs = [doc];
  state.activeId = doc.id;
  persist();
  renderHome();
  showToast("All documents deleted");
});

/* ---------- Boot ---------- */

wireMenu("#modeBtn", "#modeMenu");
loadState();
refreshSortLabel();
renderHome();
