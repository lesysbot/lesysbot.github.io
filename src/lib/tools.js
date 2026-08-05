/**
 * Renders the tool reference: the searchable catalog and one page per package.
 */

import { escapeHtml, highlight } from './highlight.js';
import { icon, platformBadges } from './layout.js';

export function packageHref(base, versionId, pkg) {
  return `${base}/${versionId}/tools/${pkg.collection}/${pkg.slug}/`;
}

function installCommand(pkg, collection) {
  if (collection.id === 'core') return null;
  return `lesysbot tools install ${collection.repo}/${collection.path}/${pkg.slug}`;
}

function codeBlock(code, lang = 'shell') {
  return [
    '<figure class="code-block group">',
    `<figcaption class="code-lang">${escapeHtml(lang)}</figcaption>`,
    '<button type="button" class="code-copy" data-copy aria-label="Copy code">Copy</button>',
    `<pre><code class="lang-${escapeHtml(lang)}">${highlight(code, lang)}</code></pre>`,
    '</figure>',
  ].join('');
}

function chip(text, kind = '') {
  return `<span class="chip${kind ? ` chip-${kind}` : ''}">${escapeHtml(text)}</span>`;
}

/* --------------------------------------------------------------------- */
/* Catalog                                                                */
/* --------------------------------------------------------------------- */

function catalogCard(pkg, collection, base, versionId) {
  const href = packageHref(base, versionId, pkg);
  const toolNames = pkg.tools.map((t) => t.name);
  const needsConfirm = pkg.tools.some((t) => t.confirm);

  return [
    `<a href="${escapeHtml(href)}" class="tool-card" data-tool-card`,
    ` data-collection="${escapeHtml(pkg.collection)}"`,
    ` data-platforms="${escapeHtml(pkg.platforms.join(' '))}"`,
    ` data-search="${escapeHtml(
      [pkg.name, pkg.summary, ...toolNames, ...(pkg.requires || [])]
        .join(' ')
        .toLowerCase(),
    )}">`,
    '<div class="tool-card-head">',
    `<span class="tool-card-name">${escapeHtml(pkg.name)}</span>`,
    `<span class="collection-dot collection-${escapeHtml(pkg.collection)}" title="${escapeHtml(
      collection.short,
    )}"></span>`,
    '</div>',
    `<p class="tool-card-summary">${escapeHtml(pkg.summary)}</p>`,
    '<div class="tool-card-tools">',
    toolNames
      .map((n) => `<code class="tool-pill">${escapeHtml(n)}</code>`)
      .join(''),
    '</div>',
    '<div class="tool-card-foot">',
    platformBadges(pkg.platforms),
    needsConfirm ? chip('confirms', 'warn') : '',
    pkg.deps && pkg.deps.length ? chip(`needs ${pkg.deps.join(', ')}`, 'muted') : '',
    '</div>',
    '</a>',
  ].join('');
}

export function renderCatalog({ site, version, catalog }) {
  const { collections, packages } = catalog;
  const byId = new Map(collections.map((c) => [c.id, c]));
  const base = site.base;

  const totalTools = packages.reduce((n, p) => n + p.tools.length, 0);

  const filterButtons = [
    '<button type="button" class="filter-chip filter-chip-active" data-filter="all">All<span class="filter-count">' +
      packages.length +
      '</span></button>',
    ...collections.map(
      (c) =>
        `<button type="button" class="filter-chip" data-filter="${escapeHtml(
          c.id,
        )}"><span class="collection-dot collection-${escapeHtml(
          c.id,
        )}"></span>${escapeHtml(c.name)}<span class="filter-count">${
          packages.filter((p) => p.collection === c.id).length
        }</span></button>`,
    ),
  ].join('');

  const groups = collections
    .map((collection) => {
      const items = packages.filter((p) => p.collection === collection.id);
      if (!items.length) return '';
      return [
        `<section class="catalog-group" data-group="${escapeHtml(collection.id)}">`,
        '<div class="catalog-group-head">',
        `<h2 id="${escapeHtml(collection.id)}" class="catalog-group-title">`,
        `<span class="collection-dot collection-${escapeHtml(collection.id)}"></span>`,
        `${escapeHtml(collection.name)}`,
        '</h2>',
        `<p class="catalog-group-desc">${escapeHtml(collection.description)}</p>`,
        collection.install
          ? `<div class="catalog-group-install">${codeBlock(collection.install)}</div>`
          : '<p class="catalog-group-note">Included with LeSysBot — nothing to install.</p>',
        '</div>',
        '<div class="tool-grid">',
        items.map((p) => catalogCard(p, collection, base, version.id)).join(''),
        '</div>',
        '</section>',
      ].join('');
    })
    .join('');

  const body = [
    '<div class="page-header">',
    '<p class="eyebrow">Reference</p>',
    '<h1 class="page-title">Tool reference</h1>',
    `<p class="page-lede">Every tool LeSysBot can call, across the bundled set and the official cross-platform collection — ${packages.length} packages exposing ${totalTools} tools. Each page documents the parameters, the command actually run, and whether it asks you to confirm first.</p>`,
    '</div>',

    '<div class="catalog-controls">',
    `<div class="catalog-search"><span class="catalog-search-icon">${icon(
      'search',
      'h-4 w-4',
    )}</span><input type="search" class="catalog-search-input" data-catalog-search placeholder="Filter ${
      packages.length
    } packages by name, tool, or requirement…" autocomplete="off"></div>`,
    `<div class="filter-row">${filterButtons}</div>`,
    '</div>',

    '<p class="catalog-empty" data-catalog-empty hidden>No packages match that filter.</p>',
    groups,

    '<section class="callout callout-info mt-14">',
    '<p class="callout-title">One package per capability, every OS</p>',
    '<p>Packages in the official collection are capability-shaped, not OS-shaped: the <a href="' +
      escapeHtml(base) +
      '/' +
      escapeHtml(version.id) +
      '/tools/packages/network/"><code>network</code> package</a> carries <code>ping&nbsp;-c</code>/<code>ping&nbsp;-n</code> and <code>traceroute</code>/<code>tracert</code> as per-OS variants of the same tools, and <code>temperature</code> picks the right reader (hwmon, SMC, or WMI) at call time. Install once; the right variant runs wherever it lands.</p>',
    '</section>',
  ].join('');

  return { body, byId };
}

/* --------------------------------------------------------------------- */
/* Package page                                                           */
/* --------------------------------------------------------------------- */

function renderToolEntry(tool, pkg) {
  const params = tool.params || [];

  const signature =
    params.length === 0
      ? `${tool.name}()`
      : `${tool.name}(${params
          .map((p) => (p.required ? p.name : `${p.name}=${p.default ?? 'None'}`))
          .join(', ')})`;

  const paramTable = params.length
    ? [
        '<div class="table-wrap"><table class="param-table">',
        '<thead><tr><th>Parameter</th><th>Type</th><th>Default</th><th>Description</th></tr></thead>',
        '<tbody>',
        params
          .map((p) =>
            [
              '<tr>',
              `<td><code>${escapeHtml(p.name)}</code>${
                p.required ? '<span class="req">required</span>' : ''
              }</td>`,
              `<td><code class="type">${escapeHtml(p.type)}</code></td>`,
              `<td>${p.required ? '<span class="dash">—</span>' : `<code>${escapeHtml(String(p.default))}</code>`}</td>`,
              `<td>${escapeHtml(p.description)}</td>`,
              '</tr>',
            ].join(''),
          )
          .join(''),
        '</tbody></table></div>',
      ].join('')
    : '<p class="no-params">Takes no parameters.</p>';

  return [
    `<div class="tool-entry" id="${escapeHtml(tool.name)}">`,
    '<div class="tool-entry-head">',
    `<h3 class="tool-entry-name"><code>${escapeHtml(signature)}</code>`,
    `<a href="#${escapeHtml(tool.name)}" class="anchor-link" aria-label="Link to this tool">#</a>`,
    '</h3>',
    '<div class="tool-entry-flags">',
    tool.confirm ? chip('asks to confirm', 'warn') : '',
    tool.privileged ? chip('needs elevation', 'danger') : '',
    tool.kind === 'cli' ? chip('shell command', 'muted') : '',
    tool.timeout ? chip(`timeout ${tool.timeout}`, 'muted') : '',
    '</div>',
    '</div>',
    `<p class="tool-entry-summary">${escapeHtml(tool.summary)}</p>`,
    tool.command
      ? `<div class="tool-entry-command"><p class="field-label">Runs</p>${codeBlock(
          tool.command,
          'shell',
        )}</div>`
      : '',
    `<div class="tool-entry-params"><p class="field-label">Parameters</p>${paramTable}</div>`,
    tool.confirmText
      ? [
          '<div class="tool-entry-confirm">',
          '<p class="field-label">Confirmation prompt</p>',
          `<blockquote class="confirm-quote">${escapeHtml(tool.confirmText)}</blockquote>`,
          '</div>',
        ].join('')
      : '',
    '</div>',
  ].join('');
}

export function renderPackagePage({ site, version, pkg, collection }) {
  const base = site.base;
  const install = installCommand(pkg, collection);
  const repoUrl = `https://github.com/${collection.repo}`;
  const sourceUrl =
    collection.id === 'core'
      ? `${repoUrl}/tree/${version.ref}/tools/${pkg.slug}`
      : `${repoUrl}/tree/main/${collection.path}/${pkg.slug}`;

  const meta = [
    ['Collection', `<a href="${escapeHtml(repoUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(collection.short)}</a>`],
    ['Package version', pkg.version ? `<code>${escapeHtml(pkg.version)}</code>` : '<span class="dash">not declared</span>'],
    ['Platforms', platformBadges(pkg.platforms)],
    [
      'Requires on PATH',
      pkg.requires && pkg.requires.length
        ? pkg.requires.map((r) => `<code>${escapeHtml(r)}</code>`).join(' ')
        : '<span class="dash">nothing</span>',
    ],
    [
      'Python dependencies',
      pkg.deps && pkg.deps.length
        ? pkg.deps.map((d) => `<code>${escapeHtml(d)}</code>`).join(' ')
        : '<span class="dash">none</span>',
    ],
  ];

  const body = [
    '<div class="page-header">',
    `<p class="eyebrow"><span class="collection-dot collection-${escapeHtml(
      pkg.collection,
    )}"></span>${escapeHtml(collection.short)}</p>`,
    `<h1 class="page-title"><code class="title-code">${escapeHtml(pkg.name)}</code></h1>`,
    `<p class="page-lede">${escapeHtml(pkg.summary)}</p>`,
    pkg.danger
      ? '<p class="danger-flag">This package can power the machine down. Read the notes before wiring it to an unattended chat.</p>'
      : '',
    '</div>',

    '<div class="meta-grid">',
    meta
      .map(
        ([label, value]) =>
          `<div class="meta-item"><p class="meta-label">${escapeHtml(
            label,
          )}</p><div class="meta-value">${value}</div></div>`,
      )
      .join(''),
    '</div>',

    install
      ? [
          '<section class="section">',
          '<h2 id="install" class="heading-anchor">Install<a href="#install" class="anchor-link" aria-label="Link to this section">#</a></h2>',
          `<p>Install just this package:</p>`,
          codeBlock(install),
          `<p>Or take the whole ${escapeHtml(collection.name)} collection at once:</p>`,
          codeBlock(collection.install),
          '</section>',
        ].join('')
      : [
          '<section class="section">',
          '<h2 id="install" class="heading-anchor">Install<a href="#install" class="anchor-link" aria-label="Link to this section">#</a></h2>',
          '<p>Nothing to do — this package ships inside LeSysBot and is available as soon as the installer finishes.</p>',
          '</section>',
        ].join(''),

    '<section class="section">',
    `<h2 id="tools" class="heading-anchor">Tools<a href="#tools" class="anchor-link" aria-label="Link to this section">#</a></h2>`,
    `<p>This package exposes ${pkg.tools.length} tool${pkg.tools.length === 1 ? '' : 's'}.</p>`,
    pkg.tools.map((t) => renderToolEntry(t, pkg)).join(''),
    '</section>',

    pkg.notes && pkg.notes.length
      ? [
          '<section class="section">',
          '<h2 id="notes" class="heading-anchor">Notes<a href="#notes" class="anchor-link" aria-label="Link to this section">#</a></h2>',
          '<ul class="note-list">',
          pkg.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join(''),
          '</ul>',
          '</section>',
        ].join('')
      : '',

    pkg.troubleshooting && pkg.troubleshooting.length
      ? [
          '<section class="section">',
          '<h2 id="troubleshooting" class="heading-anchor">Troubleshooting<a href="#troubleshooting" class="anchor-link" aria-label="Link to this section">#</a></h2>',
          pkg.troubleshooting
            .map((t) =>
              [
                '<div class="trouble">',
                `<p class="trouble-symptom">${escapeHtml(t.symptom)}</p>`,
                `<p class="trouble-line"><span class="trouble-key">Why</span>${escapeHtml(t.cause)}</p>`,
                `<p class="trouble-line"><span class="trouble-key">Fix</span>${escapeHtml(t.fix)}</p>`,
                t.verify
                  ? `<div class="trouble-verify"><p class="field-label">Check it yourself</p>${codeBlock(
                      t.verify,
                    )}</div>`
                  : '',
                '</div>',
              ].join(''),
            )
            .join(''),
          '</section>',
        ].join('')
      : '',

    '<section class="section">',
    '<h2 id="source" class="heading-anchor">Source<a href="#source" class="anchor-link" aria-label="Link to this section">#</a></h2>',
    `<p>Every package is a folder holding a <code>README.md</code> and a <code>tool.py</code>. Read this one on GitHub: <a href="${escapeHtml(
      sourceUrl,
    )}" target="_blank" rel="noopener noreferrer">${escapeHtml(
      `${collection.repo}/${collection.id === 'core' ? 'tools' : collection.path}/${pkg.slug}`,
    )}</a>.</p>`,
    `<p>To write your own, see <a href="${escapeHtml(base)}/${escapeHtml(
      version.id,
    )}/guides/writing-tools/">Writing tools</a>.</p>`,
    '</section>',
  ].join('');

  return body;
}
