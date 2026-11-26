/* ============================================================
   Papyra Docs — shared chrome, navigation, search, theme
   ============================================================ */

const NAV = [
  {
    label: "Getting started",
    items: [
      { id: "index", title: "Welcome" },
      { id: "quickstart", title: "Quickstart" },
    ],
  },
  {
    label: "Using Papyra",
    items: [
      { id: "editor-basics", title: "Editor basics" },
      { id: "formatting", title: "Formatting text" },
      { id: "tables", title: "Tables" },
      { id: "collaboration", title: "Collaboration" },
      { id: "templates", title: "Templates" },
    ],
  },
  {
    label: "Beyond the editor",
    items: [
      { id: "export-share", title: "Export & sharing" },
      { id: "shortcuts", title: "Keyboard shortcuts" },
    ],
  },
  {
    label: "Developers",
    items: [
      { id: "api-plugins", title: "API & plugins" },
      { id: "self-hosting", title: "Self-hosting" },
    ],
  },
  {
    label: "Resources",
    items: [
      { id: "faq", title: "FAQ" },
      { id: "changelog", title: "Changelog" },
    ],
  },
];

const pageId = document.body.dataset.page;
const crumbSection = document.body.dataset.section || "";

/* ---------- Theme ---------- */

const savedTheme = localStorage.getItem("papyra-theme");
if (savedTheme === "dark") document.documentElement.dataset.theme = "dark";

function setTheme(theme) {
  if (theme === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  localStorage.setItem("papyra-theme", theme);
  const btn = document.querySelector(".theme-toggle");
  if (btn) btn.textContent = theme === "dark" ? "☀" : "☾";
}

/* ---------- Chrome injection ---------- */

function buildHeader() {
  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <button class="menu-btn" aria-label="Toggle navigation">☰</button>
    <a class="brand" href="index.html">
      <span class="brand-mark">P</span>
      <span>Papyra <span class="docs-label docs">Docs</span></span>
    </a>
    <div class="search-wrap">
      <span class="search-icon">⌕</span>
      <input type="text" class="search-input" placeholder="Search docs…" aria-label="Search documentation" autocomplete="off" />
      <div class="search-results" role="listbox"></div>
    </div>
    <button class="theme-toggle" aria-label="Toggle dark mode">☾</button>
  `;
  document.body.prepend(header);

  header.querySelector(".menu-btn").addEventListener("click", () => {
    document.querySelector(".sidebar").classList.toggle("open");
    document.querySelector(".backdrop").classList.toggle("open");
  });
  header.querySelector(".theme-toggle").addEventListener("click", () => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });
  setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
}

function buildSidebar() {
  const aside = document.createElement("aside");
  aside.className = "sidebar";
  let html = "";
  for (const group of NAV) {
    html += `<div class="nav-group-label">${group.label}</div>`;
    for (const item of group.items) {
      const active = item.id === pageId ? " active" : "";
      html += `<a class="nav-link${active}" href="${item.id}.html">${item.title}</a>`;
    }
  }
  html += `
    <div class="sidebar-footer">
      Papyra is open source under the AGPL-3.0 license.
      <br />
      <a href="https://github.com/papyra/papyra" target="_blank" rel="noopener">★ Star on GitHub</a>
    </div>
  `;
  aside.innerHTML = html;
  document.querySelector(".layout").prepend(aside);

  const backdrop = document.createElement("div");
  backdrop.className = "backdrop";
  document.body.append(backdrop);
  backdrop.addEventListener("click", closeMobileNav);
}

function closeMobileNav() {
  document.querySelector(".sidebar").classList.remove("open");
  document.querySelector(".backdrop").classList.remove("open");
}

function buildBreadcrumb() {
  const inner = document.querySelector(".content-inner");
  if (!inner || !crumbSection) return;
  const box = document.createElement("div");
  box.className = "content-header";
  box.innerHTML = `<nav class="breadcrumb"><a href="index.html">Docs</a> / <span>${crumbSection}</span> / <span class="crumb-here">${document.title}</span></nav>`;
  inner.prepend(box);
}

function buildTOC() {
  const article = document.querySelector("article");
  if (!article) return;
  const headings = [...article.querySelectorAll("h2")];
  if (headings.length < 2) return;

  const toc = document.createElement("aside");
  toc.className = "toc";
  let html = `<div class="toc-title">On this page</div>`;
  headings.forEach((h, i) => {
    if (!h.id) h.id = h.textContent.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `section-${i}`;
    html += `<a href="#${h.id}" data-target="${h.id}">${h.textContent}</a>`;
  });
  toc.innerHTML = html;
  document.querySelector(".content").append(toc);

  const links = [...toc.querySelectorAll("a")];
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.toggle("active", l.dataset.target === entry.target.id));
      });
    },
    { rootMargin: "-80px 0px -70% 0px" }
  );
  headings.forEach((h) => observer.observe(h));
}

function buildFooter() {
  const inner = document.querySelector(".content-inner");
  if (!inner) return;
  let prev = null;
  let next = null;
  const flat = NAV.flatMap((g) => g.items);
  const idx = flat.findIndex((p) => p.id === pageId);
  if (idx > 0) prev = flat[idx - 1];
  if (idx >= 0 && idx < flat.length - 1) next = flat[idx + 1];

  const footer = document.createElement("div");
  footer.className = "page-footer";
  footer.innerHTML = `
    <span>© ${new Date().getFullYear()} The Papyra Contributors</span>
    <span>
      ${prev ? `<a href="${prev.id}.html">← ${prev.title}</a>` : ""}
      ${prev && next ? " · " : ""}
      ${next ? `<a href="${next.id}.html">${next.title} →</a>` : ""}
    </span>
  `;
  inner.append(footer);
}

/* ---------- Copy buttons ---------- */

function enhanceCodeBlocks() {
  document.querySelectorAll("pre").forEach((pre) => {
    const block = document.createElement("div");
    block.className = "codeblock";
    pre.parentNode.insertBefore(block, pre);
    block.appendChild(pre);

    const label = pre.dataset.label;
    if (label) {
      const lab = document.createElement("div");
      lab.className = "code-label";
      lab.textContent = label;
      block.prepend(lab);
    }

    const btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.textContent = "Copy";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.innerText);
        btn.textContent = "Copied!";
        btn.classList.add("copied");
      } catch {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        btn.textContent = "Ctrl+C";
      }
      setTimeout(() => {
        btn.textContent = "Copy";
        btn.classList.remove("copied");
      }, 1600);
    });
    block.appendChild(btn);
  });
}

/* ---------- Search ---------- */

function initSearch() {
  const input = document.querySelector(".search-input");
  const panel = document.querySelector(".search-results");
  if (!input || !panel || typeof SEARCH_DATA === "undefined") return;

  let activeIdx = -1;

  function close() {
    panel.classList.remove("open");
    activeIdx = -1;
  }

  function esc(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  function highlight(text, q) {
    const i = text.toLowerCase().indexOf(q.toLowerCase());
    if (i === -1) return esc(text.slice(0, 70));
    const start = Math.max(0, i - 24);
    const frag = text.slice(start, start + 80);
    const rel = frag.toLowerCase().indexOf(q.toLowerCase());
    return (
      esc(frag.slice(0, rel)) +
      "<mark>" + esc(frag.slice(rel, rel + q.length)) + "</mark>" +
      esc(frag.slice(rel + q.length))
    );
  }

  function render(q) {
    const query = q.trim().toLowerCase();
    if (query.length < 2) { close(); return; }

    const matches = SEARCH_DATA.filter(
      (e) => e.title.toLowerCase().includes(query) || e.text.toLowerCase().includes(query)
    ).slice(0, 12);

    if (!matches.length) {
      panel.innerHTML = `<div class="search-empty">No results for “${esc(q)}”</div>`;
      panel.classList.add("open");
      return;
    }

    panel.innerHTML = matches
      .map(
        (m, i) => `
        <div class="search-result" data-page="${m.page}" role="option" tabindex="0">
          <div class="sr-title">${highlight(m.title, query)}</div>
          <div class="sr-section">${m.section ? esc(m.section) + " · " : ""}${highlight(m.text, query)}</div>
        </div>`
      )
      .join("");
    panel.classList.add("open");
    activeIdx = -1;

    panel.querySelectorAll(".search-result").forEach((el) => {
      el.addEventListener("click", () => {
        window.location.href = el.dataset.page + ".html";
      });
    });
  }

  input.addEventListener("input", () => render(input.value));
  input.addEventListener("focus", () => render(input.value));
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) close();
  });
  input.addEventListener("keydown", (e) => {
    const items = [...panel.querySelectorAll(".search-result")];
    if (e.key === "Escape") { close(); input.blur(); }
    if (!items.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      activeIdx = (activeIdx + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items.forEach((el, i) => el.classList.toggle("active", i === activeIdx));
      items[activeIdx].scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter" && activeIdx >= 0) {
      window.location.href = items[activeIdx].dataset.page + ".html";
    }
  });

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      input.focus();
    }
  });
}

/* ---------- Boot ---------- */

buildHeader();
buildSidebar();
buildBreadcrumb();
buildTOC();
buildFooter();
enhanceCodeBlocks();
initSearch();
