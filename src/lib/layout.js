/**
 * The HTML shell every page shares: head, top bar, sidebar, content, footer.
 */

import { escapeHtml } from './highlight.js';

const ICONS = {
  github:
    '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>',
  search:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m12.8 12.8 4 4" stroke-linecap="round"/></svg>',
  sun: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="3.6"/><path d="M10 1.6v2M10 16.4v2M3.5 3.5l1.4 1.4M15.1 15.1l1.4 1.4M1.6 10h2M16.4 10h2M3.5 16.5l1.4-1.4M15.1 4.9l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M17 12.3A7.5 7.5 0 0 1 7.7 3a7.5 7.5 0 1 0 9.3 9.3Z"/></svg>',
  menu: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 6h14M3 10h14M3 14h14"/></svg>',
  close:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>',
  chevron:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 8 4 4 4-4"/></svg>',
  arrowLeft:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 10H4m0 0 5-5m-5 5 5 5"/></svg>',
  arrowRight:
    '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10h12m0 0-5-5m5 5-5 5"/></svg>',
};

/**
 * The 8-bit mark, referenced rather than inlined. It is ~1500 <rect> elements —
 * one per pixel run — so inlining it would add roughly 18 KB to every page
 * twice over. As an <img> the browser fetches and caches it once.
 * See ../../lesysbot/assets/brand/ for the generator that produces it.
 */
export function brandMark(src, cls = 'h-7 w-7') {
  return `<img src="${src}" alt="" class="${cls}" width="32" height="32" aria-hidden="true">`;
}

export function icon(name, cls = 'h-4 w-4') {
  const svg = ICONS[name];
  if (!svg) return '';
  return svg.replace('<svg ', `<svg class="${cls}" `);
}

const PLATFORM_LABEL = {
  linux: 'Linux',
  macos: 'macOS',
  windows: 'Windows',
};

export function platformBadges(platforms = []) {
  const all = ['linux', 'macos', 'windows'];
  const isEvery = all.every((p) => platforms.includes(p));
  if (isEvery) {
    return '<span class="badge badge-platform" title="Runs on Linux, macOS and Windows">All platforms</span>';
  }
  return platforms
    .map(
      (p) =>
        `<span class="badge badge-platform badge-${escapeHtml(p)}">${
          PLATFORM_LABEL[p] || escapeHtml(p)
        }</span>`,
    )
    .join('');
}

/** Renders the sidebar tree. `nav` is [{ title, items: [{label, href, badge}] }]. */
function renderSidebar(nav, currentPath) {
  return nav
    .map((section) => {
      const links = section.items
        .map((item) => {
          const active = item.href === currentPath;
          return [
            `<li><a href="${escapeHtml(item.href)}"`,
            ` class="nav-link${active ? ' nav-link-active' : ''}"`,
            active ? ' aria-current="page"' : '',
            `>${escapeHtml(item.label)}`,
            item.badge
              ? `<span class="nav-badge">${escapeHtml(item.badge)}</span>`
              : '',
            '</a></li>',
          ].join('');
        })
        .join('');

      return [
        '<div class="nav-section">',
        `<p class="nav-title">${escapeHtml(section.title)}</p>`,
        `<ul class="nav-list">${links}</ul>`,
        '</div>',
      ].join('');
    })
    .join('');
}

function renderVersionSwitcher({ versions, current, base, activeId }) {
  const options = versions
    .map((v) => {
      const active = v.id === activeId;
      return [
        `<button type="button" role="menuitem" class="version-option${
          active ? ' version-option-active' : ''
        }" data-version="${escapeHtml(v.id)}">`,
        `<span class="version-option-label">${escapeHtml(v.label)}</span>`,
        v.status === 'current'
          ? '<span class="version-tag version-tag-current">latest</span>'
          : '',
        v.status === 'archived'
          ? '<span class="version-tag">archived</span>'
          : '',
        '</button>',
      ].join('');
    })
    .join('');

  return [
    '<div class="version-switcher" data-version-switcher data-base="' +
      escapeHtml(base) +
      '">',
    '<button type="button" class="version-button" data-version-toggle aria-haspopup="menu" aria-expanded="false">',
    '<span class="version-button-dot"></span>',
    `<span>${escapeHtml(current.label)}</span>`,
    icon('chevron', 'h-3.5 w-3.5 opacity-60'),
    '</button>',
    '<div class="version-menu" data-version-menu role="menu" hidden>',
    '<p class="version-menu-title">Documentation version</p>',
    options,
    '<p class="version-menu-note">Older versions stay online at their own URLs.</p>',
    '</div>',
    '</div>',
  ].join('');
}

function renderToc(toc) {
  if (!toc || toc.length < 2) return '';
  const items = toc
    .map(
      (h) =>
        `<li class="toc-item toc-depth-${h.depth}"><a href="#${escapeHtml(
          h.id,
        )}" class="toc-link">${h.text}</a></li>`,
    )
    .join('');
  return [
    '<aside class="toc" aria-label="On this page">',
    '<div class="toc-inner">',
    '<p class="toc-title">On this page</p>',
    `<ul class="toc-list">${items}</ul>`,
    '</div>',
    '</aside>',
  ].join('');
}

function renderPager(prev, next) {
  if (!prev && !next) return '';
  const link = (page, dir) => {
    if (!page) return '<span></span>';
    return [
      `<a href="${escapeHtml(page.href)}" class="pager-link pager-${dir}">`,
      `<span class="pager-dir">${icon(
        dir === 'prev' ? 'arrowLeft' : 'arrowRight',
        'h-3.5 w-3.5',
      )}${dir === 'prev' ? 'Previous' : 'Next'}</span>`,
      `<span class="pager-label">${escapeHtml(page.label)}</span>`,
      '</a>',
    ].join('');
  };
  return `<nav class="pager" aria-label="Pagination">${link(prev, 'prev')}${link(
    next,
    'next',
  )}</nav>`;
}

/**
 * @param {object} o
 * @param {string} o.title      page <title> (site name is appended)
 * @param {string} o.body       main content HTML
 * @param {'doc'|'wide'|'bare'} o.variant
 */
export function layout(o) {
  const {
    site,
    version,
    versions,
    // The directory this page is published under. Equals version.id for an
    // archived build, but is "latest" for the alias copy of the newest
    // version — every URL on the page must stay inside the directory the
    // reader actually navigated to.
    urlId = version.id,
    title,
    description = site.description,
    body,
    nav = [],
    toc = [],
    currentPath = '',
    pagePath = '',
    prev = null,
    next = null,
    editUrl = null,
    variant = 'doc',
    hasMermaid = false,
    breadcrumbs = [],
  } = o;

  const base = site.base;
  const asset = (p) => `${base}${p}`;
  const canonical = `${site.url}${currentPath.replace(base, '')}`;

  const crumbs = breadcrumbs.length
    ? [
        '<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>',
        breadcrumbs
          .map((c, i) =>
            c.href && i < breadcrumbs.length - 1
              ? `<li><a href="${escapeHtml(c.href)}">${escapeHtml(c.label)}</a></li>`
              : `<li aria-current="page">${escapeHtml(c.label)}</li>`,
          )
          .join(''),
        '</ol></nav>',
      ].join('')
    : '';

  const showSidebar = variant === 'doc' || variant === 'wide';
  // Bare pages (version home, 404) have no desktop sidebar, but the topbar
  // toggle still needs something to open on small screens.
  const hasNav = nav.length > 0;
  const showDrawer = showSidebar || hasNav;

  return `<!doctype html>
<html lang="en" class="scroll-smooth">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · ${escapeHtml(site.title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${escapeHtml(canonical)}">
<meta property="og:title" content="${escapeHtml(title)} · ${escapeHtml(site.title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHtml(canonical)}">
<link rel="icon" href="${asset('/assets/favicon.svg')}" type="image/svg+xml">
<link rel="icon" href="${asset('/assets/favicon.ico')}" sizes="32x32">
<link rel="apple-touch-icon" href="${asset('/assets/apple-touch-icon.png')}">
<meta property="og:image" content="${escapeHtml(`${site.url}/assets/og-image.png`)}">
<meta property="og:image:alt" content="LeSysBot">
<link rel="stylesheet" href="${asset('/assets/site.css')}">
<script>
  // Applied before paint so a dark-mode reload never flashes white.
  (function () {
    try {
      var stored = localStorage.getItem('lesysbot-docs-theme');
      var dark = stored ? stored === 'dark'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', dark);
    } catch (e) {}
  })();
</script>
</head>
<body class="page" data-version="${escapeHtml(urlId)}" data-page-path="${escapeHtml(
    pagePath,
  )}" data-base="${escapeHtml(base)}">

<a href="#main" class="skip-link">Skip to content</a>

<header class="topbar">
  <div class="topbar-inner">
    ${
      showDrawer
        ? `<button type="button" class="icon-button lg:hidden" data-sidebar-toggle aria-label="Open navigation" aria-expanded="false">
      ${icon('menu', 'h-5 w-5')}
    </button>`
        : ''
    }

    <a href="${asset(`/${urlId}/`)}" class="brand">
      ${brandMark(asset('/assets/logo.svg'), 'h-7 w-7')}
      <span class="brand-name">LeSysBot</span>
      <span class="brand-sub">docs</span>
    </a>

    ${renderVersionSwitcher({ versions, current: version, base, activeId: version.id })}

    <div class="topbar-spacer"></div>

    <button type="button" class="search-button" data-search-open>
      ${icon('search', 'h-4 w-4')}
      <span class="search-button-text">Search</span>
      <kbd class="search-kbd">/</kbd>
    </button>

    <button type="button" class="icon-button" data-theme-toggle aria-label="Toggle dark mode">
      <span class="dark:hidden">${icon('moon', 'h-4.5 w-4.5')}</span>
      <span class="hidden dark:inline">${icon('sun', 'h-4.5 w-4.5')}</span>
    </button>

    <a href="https://github.com/${escapeHtml(site.repos.core)}" class="icon-button hidden sm:inline-flex" target="_blank" rel="noopener noreferrer" aria-label="LeSysBot on GitHub">
      ${icon('github', 'h-4.5 w-4.5')}
    </a>
  </div>
</header>

<div class="shell${showSidebar ? '' : ' shell-bare'}">
  ${
    showDrawer
      ? `<div class="sidebar-backdrop" data-sidebar-backdrop hidden></div>
  <nav class="sidebar${
    showSidebar ? '' : ' sidebar-drawer'
  }" data-sidebar aria-label="Documentation navigation">
    <div class="sidebar-inner">
      <div class="sidebar-mobile-head lg:hidden">
        <span class="text-sm font-semibold">Navigation</span>
        <button type="button" class="icon-button" data-sidebar-close aria-label="Close navigation">${icon(
          'close',
          'h-4.5 w-4.5',
        )}</button>
      </div>
      ${renderSidebar(nav, currentPath)}
    </div>
  </nav>`
      : ''
  }

  <main id="main" class="${
    variant === 'bare' ? 'main-bare' : variant === 'wide' ? 'main-wide' : 'main-doc'
  }">
    ${crumbs}
    ${body}
    ${
      variant === 'doc' || variant === 'wide'
        ? `${renderPager(prev, next)}
    ${
      editUrl
        ? `<p class="edit-link"><a href="${escapeHtml(
            editUrl,
          )}" target="_blank" rel="noopener noreferrer">Edit this page on GitHub</a></p>`
        : ''
    }`
        : ''
    }
  </main>

  ${variant === 'doc' ? renderToc(toc) : ''}
</div>

<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      ${brandMark(asset('/assets/logo.svg'), 'h-6 w-6')}
      <div>
        <p class="footer-name">LeSysBot</p>
        <p class="footer-tagline">A local AI assistant for the machine you own.</p>
      </div>
    </div>
    <div class="footer-cols">
      <div>
        <p class="footer-col-title">Docs</p>
        <a href="${asset(`/${urlId}/guides/getting-started/`)}">Getting started</a>
        <a href="${asset(`/${urlId}/tools/`)}">Tool reference</a>
        <a href="${asset(`/${urlId}/guides/configuration/`)}">Configuration</a>
      </div>
      <div>
        <p class="footer-col-title">Repositories</p>
        <a href="https://github.com/${escapeHtml(site.repos.core)}" target="_blank" rel="noopener noreferrer">lesysbot</a>
        <a href="https://github.com/${escapeHtml(site.repos.packages)}" target="_blank" rel="noopener noreferrer">packages-official</a>
      </div>
      <div>
        <p class="footer-col-title">This site</p>
        <a href="${asset('/versions/')}">All versions</a>
        <a href="https://github.com/${escapeHtml(site.repos.docs)}" target="_blank" rel="noopener noreferrer">Docs source</a>
        <a href="mailto:${escapeHtml(site.contact.email)}">Contact</a>
      </div>
    </div>
  </div>
  <div class="footer-legal">
    <p>Documentation for LeSysBot ${escapeHtml(version.label)}. Released under the MIT License.</p>
  </div>
</footer>

<div class="search-modal" data-search-modal hidden>
  <div class="search-backdrop" data-search-close></div>
  <div class="search-panel" role="dialog" aria-modal="true" aria-label="Search documentation">
    <div class="search-input-row">
      ${icon('search', 'h-4.5 w-4.5 shrink-0 opacity-50')}
      <input type="search" class="search-input" data-search-input placeholder="Search the ${escapeHtml(
        version.label,
      )} docs…" autocomplete="off" spellcheck="false">
      <button type="button" class="icon-button" data-search-close aria-label="Close search">${icon(
        'close',
        'h-4 w-4',
      )}</button>
    </div>
    <div class="search-results" data-search-results>
      <p class="search-empty">Start typing to search guides and tools.</p>
    </div>
  </div>
</div>

<script src="${asset('/assets/site.js')}" defer></script>
${
  hasMermaid
    ? `<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  const dark = document.documentElement.classList.contains('dark');
  mermaid.initialize({ startOnLoad: true, theme: dark ? 'dark' : 'default', fontFamily: 'inherit' });
</script>`
    : ''
}
</body>
</html>`;
}
