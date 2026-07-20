#!/usr/bin/env node
/**
 * Static site generator for the SysBot docs.
 *
 * Every published version is built into its own directory (/v0.1/, /v0.2/ …)
 * and stays there forever, so old links keep working. /latest/ is an alias
 * for the newest one and /  redirects there.
 *
 *   node src/build.js            build once into dist/
 *   node src/build.js --watch    rebuild on content or template changes
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseFrontmatter } from './lib/frontmatter.js';
import { renderMarkdown, toPlainText } from './lib/markdown.js';
import { layout, icon } from './lib/layout.js';
import { renderCatalog, renderPackagePage } from './lib/tools.js';
import { escapeHtml } from './lib/highlight.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'content');
const DIST = path.join(ROOT, 'dist');
const STATIC = path.join(ROOT, 'src', 'assets');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function write(relPath, contents) {
  const full = path.join(DIST, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
}

/* --------------------------------------------------------------------- */
/* Content loading                                                        */
/* --------------------------------------------------------------------- */

function loadGuides(versionDir) {
  const guidesDir = path.join(versionDir, 'guides');
  if (!fs.existsSync(guidesDir)) return [];

  return fs
    .readdirSync(guidesDir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const source = fs.readFileSync(path.join(guidesDir, file), 'utf8');
      const { data, body } = parseFrontmatter(source);
      const slug = data.slug || file.replace(/\.md$/, '');
      return {
        slug,
        file,
        title: data.title || slug,
        description: data.description || '',
        section: data.section || 'Guides',
        source: data.source || null,
        body,
      };
    });
}

/** Order guides by nav.json, appending anything the file forgot to list. */
function buildNavOrder(guides, navSpec) {
  const bySlug = new Map(guides.map((g) => [g.slug, g]));
  const ordered = [];
  const seen = new Set();

  for (const section of navSpec) {
    const items = [];
    for (const slug of section.items) {
      const guide = bySlug.get(slug);
      if (!guide) {
        console.warn(`  ! nav.json lists "${slug}" but no guide file matches`);
        continue;
      }
      items.push(guide);
      seen.add(slug);
    }
    if (items.length) ordered.push({ title: section.title, guides: items });
  }

  const orphans = guides.filter((g) => !seen.has(g.slug));
  if (orphans.length) {
    ordered.push({ title: 'More', guides: orphans });
  }
  return ordered;
}

/* --------------------------------------------------------------------- */
/* Version home page                                                      */
/* --------------------------------------------------------------------- */

function renderVersionHome({ site, version, urlId, sections, catalog }) {
  const base = site.base;
  const v = (p) => `${base}/${urlId}${p}`;
  const totalTools = catalog.packages.reduce((n, p) => n + p.tools.length, 0);

  const startCards = [
    {
      title: 'Install SysBot',
      body: 'Run the guided wizard: pick a model, connect a chat app, install the background service.',
      href: v('/guides/getting-started/'),
      cta: 'Getting started',
    },
    {
      title: 'Browse the tools',
      body: `${catalog.packages.length} packages and ${totalTools} tools, from disk usage to scheduled wake-ups.`,
      href: v('/tools/'),
      cta: 'Tool reference',
    },
    {
      title: 'Write your own tool',
      body: 'A folder with a README and a tool.py is a tool. Hot reload picks it up without a restart.',
      href: v('/guides/writing-tools/'),
      cta: 'Writing tools',
    },
  ];

  const journey = sections.map((section) => ({
    title: section.title,
    items: section.guides.map((g) => ({
      label: g.title,
      href: v(`/guides/${g.slug}/`),
      description: g.description,
    })),
  }));

  const body = [
    '<section class="hero">',
    '<div class="hero-copy">',
    `<span class="hero-badge">Version ${escapeHtml(version.label)}</span>`,
    '<h1 class="hero-title">A local AI assistant for the machine you own.</h1>',
    `<p class="hero-lede">${escapeHtml(site.tagline)} SysBot runs against a local model, so the machine it controls and the model reading your messages are both yours.</p>`,
    '<div class="hero-actions">',
    `<a href="${v('/guides/getting-started/')}" class="btn btn-primary">Get started ${icon(
      'arrowRight',
      'h-4 w-4',
    )}</a>`,
    `<a href="${v('/tools/')}" class="btn btn-ghost">Tool reference</a>`,
    '</div>',
    '</div>',
    '<div class="hero-demo">',
    '<div class="terminal">',
    '<div class="terminal-bar"><span></span><span></span><span></span><p class="terminal-title">Telegram · SysBot</p></div>',
    '<div class="terminal-body">',
    '<p class="chat chat-you">how hot is the machine right now?</p>',
    '<p class="chat chat-bot"><span class="chat-tool">temperature()</span>CPU 41–47°C across 16 cores · GPU 38°C. Nothing to worry about.</p>',
    '<p class="chat chat-you">turn it off and bring it back in 30 minutes</p>',
    '<p class="chat chat-bot"><span class="chat-tool">shutdown_and_wake(30)</span>⚠️ This will POWER OFF the machine in 1 minute and auto-start it again later. Proceed?</p>',
    '<p class="chat chat-you">yes</p>',
    '<p class="chat chat-bot">Wake alarm armed for 01:42. Powering off in 60 seconds — see you soon.</p>',
    '</div>',
    '</div>',
    '</div>',
    '</section>',

    '<section class="start-grid">',
    startCards
      .map((c) =>
        [
          `<a href="${escapeHtml(c.href)}" class="start-card">`,
          `<h2 class="start-card-title">${escapeHtml(c.title)}</h2>`,
          `<p class="start-card-body">${escapeHtml(c.body)}</p>`,
          `<span class="start-card-cta">${escapeHtml(c.cta)} ${icon('arrowRight', 'h-3.5 w-3.5')}</span>`,
          '</a>',
        ].join(''),
      )
      .join(''),
    '</section>',

    '<section class="quickstart">',
    '<h2 class="section-title">Four steps to a working bot</h2>',
    '<ol class="steps">',
    [
      ['Run a model locally', 'Install Ollama and pull a model sized for your GPU.', 'ollama pull llama3.2'],
      ['Install SysBot', 'The wizard writes your config and sets up the background service.', './scripts/install.sh'],
      ['Say hello', 'Talk to it in the terminal before wiring up a chat app.', 'sysbot --provider cli'],
      [
        'Add tools for your OS',
        'Pull in the official collection that matches the machine.',
        'sysbot tools install syan-dev/sysbot-linux-tools-official',
      ],
    ]
      .map(([title, desc, cmd], i) =>
        [
          '<li class="step">',
          `<span class="step-num">${i + 1}</span>`,
          '<div class="step-body">',
          `<p class="step-title">${escapeHtml(title)}</p>`,
          `<p class="step-desc">${escapeHtml(desc)}</p>`,
          `<code class="step-cmd">${escapeHtml(cmd)}</code>`,
          '</div>',
          '</li>',
        ].join(''),
      )
      .join(''),
    '</ol>',
    '</section>',

    '<section class="platforms">',
    '<h2 class="section-title">Tools for every platform</h2>',
    '<p class="section-lede">The bundled set works everywhere. Beyond that, each OS gets a collection built on its own interfaces — hwmon and rtcwake on Linux, pmset and powermetrics on macOS, WMI and Task Scheduler on Windows.</p>',
    '<div class="platform-grid">',
    catalog.collections
      .map((c) => {
        const items = catalog.packages.filter((p) => p.collection === c.id);
        const count = items.reduce((n, p) => n + p.tools.length, 0);
        return [
          `<a href="${v(`/tools/#${escapeHtml(c.id)}`)}" class="platform-card">`,
          `<span class="collection-dot collection-${escapeHtml(c.id)}"></span>`,
          `<p class="platform-name">${escapeHtml(c.name)}</p>`,
          `<p class="platform-count">${items.length} packages · ${count} tools</p>`,
          `<p class="platform-list">${items.map((p) => escapeHtml(p.name)).join(', ')}</p>`,
          '</a>',
        ].join('');
      })
      .join(''),
    '</div>',
    '</section>',

    '<section class="journey">',
    '<h2 class="section-title">All documentation</h2>',
    '<div class="journey-grid">',
    journey
      .map((group) =>
        [
          '<div class="journey-col">',
          `<p class="journey-title">${escapeHtml(group.title)}</p>`,
          '<ul class="journey-list">',
          group.items
            .map(
              (i) =>
                `<li><a href="${escapeHtml(i.href)}"><span class="journey-label">${escapeHtml(
                  i.label,
                )}</span>${
                  i.description
                    ? `<span class="journey-desc">${escapeHtml(i.description)}</span>`
                    : ''
                }</a></li>`,
            )
            .join(''),
          '</ul>',
          '</div>',
        ].join(''),
      )
      .join(''),
    '</div>',
    '</section>',
  ].join('');

  return body;
}

/* --------------------------------------------------------------------- */
/* Build one version                                                      */
/* --------------------------------------------------------------------- */

function buildVersion({ site, version, versions, urlId }) {
  const versionDir = path.join(CONTENT, version.id);
  const guides = loadGuides(versionDir);
  const navSpec = readJson(path.join(versionDir, 'nav.json'));
  const catalog = readJson(path.join(versionDir, 'tools.json'));
  const sections = buildNavOrder(guides, navSpec);

  const base = site.base;
  const versionBase = `${base}/${urlId}`;
  const guideSlugs = new Map(guides.map((g) => [g.slug, g.slug]));
  const collectionsById = new Map(catalog.collections.map((c) => [c.id, c]));

  const mdCtx = {
    guideSlugs,
    versionBase,
    repo: site.repos.core,
    ref: version.ref,
  };

  /* Sidebar ---------------------------------------------------------- */
  const nav = [
    ...sections.map((s) => ({
      title: s.title,
      items: s.guides.map((g) => ({
        label: g.title,
        href: `${versionBase}/guides/${g.slug}/`,
      })),
    })),
    {
      title: 'Tool reference',
      items: [
        { label: 'All tools', href: `${versionBase}/tools/` },
        ...catalog.collections.map((c) => ({
          label: c.name,
          href: `${versionBase}/tools/#${c.id}`,
          badge: String(catalog.packages.filter((p) => p.collection === c.id).length),
        })),
      ],
    },
  ];

  const pagePaths = [];
  const searchIndex = [];

  /* Flat page order drives prev/next across guides then tools --------- */
  const flatGuides = sections.flatMap((s) =>
    s.guides.map((g) => ({
      label: g.title,
      href: `${versionBase}/guides/${g.slug}/`,
    })),
  );

  /* Version home ------------------------------------------------------ */
  write(
    `${urlId}/index.html`,
    layout({
      site,
      version,
      versions,
      urlId,
      title: `SysBot ${version.label} documentation`,
      description: site.description,
      body: renderVersionHome({ site, version, urlId, sections, catalog }),
      nav,
      currentPath: `${versionBase}/`,
      pagePath: '',
      variant: 'bare',
    }),
  );
  pagePaths.push('');

  /* Guides ------------------------------------------------------------ */
  guides.forEach((guide) => {
    const { html, toc, hasMermaid } = renderMarkdown(guide.body, mdCtx);
    const href = `${versionBase}/guides/${guide.slug}/`;
    const idx = flatGuides.findIndex((g) => g.href === href);

    const next =
      idx >= 0 && idx < flatGuides.length - 1
        ? flatGuides[idx + 1]
        : { label: 'Tool reference', href: `${versionBase}/tools/` };

    const heading = [
      '<div class="page-header">',
      `<p class="eyebrow">${escapeHtml(guide.section)}</p>`,
      `<h1 class="page-title">${escapeHtml(guide.title)}</h1>`,
      guide.description
        ? `<p class="page-lede">${escapeHtml(guide.description)}</p>`
        : '',
      '</div>',
    ].join('');

    write(
      `${urlId}/guides/${guide.slug}/index.html`,
      layout({
        site,
        version,
        versions,
        urlId,
        title: guide.title,
        description: guide.description || toPlainText(guide.body, 155),
        body: `${heading}<article class="prose">${html}</article>`,
        nav,
        toc,
        currentPath: href,
        pagePath: `guides/${guide.slug}/`,
        prev: idx > 0 ? flatGuides[idx - 1] : null,
        next,
        editUrl: guide.source
          ? `https://github.com/${site.repos.core}/blob/${version.ref}/${guide.source}`
          : `https://github.com/${site.repos.docs}/blob/main/content/${version.id}/guides/${guide.file}`,
        hasMermaid,
        variant: 'doc',
      }),
    );

    pagePaths.push(`guides/${guide.slug}/`);
    searchIndex.push({
      t: guide.title,
      d: guide.description || toPlainText(guide.body, 150),
      u: `guides/${guide.slug}/`,
      k: guide.section,
      c: 'guide',
    });
  });

  /* Tool catalog ------------------------------------------------------ */
  const { body: catalogBody } = renderCatalog({
    site: { ...site, base },
    version: { ...version, id: urlId },
    catalog,
  });

  write(
    `${urlId}/tools/index.html`,
    layout({
      site,
      version,
      versions,
      urlId,
      title: 'Tool reference',
      description: `Every tool SysBot can call in version ${version.label} — ${catalog.packages.length} packages across the bundled set and the Linux, macOS, and Windows collections.`,
      body: catalogBody,
      nav,
      currentPath: `${versionBase}/tools/`,
      pagePath: 'tools/',
      prev: flatGuides[flatGuides.length - 1] || null,
      next: null,
      variant: 'wide',
      breadcrumbs: [
        { label: 'Docs', href: `${versionBase}/` },
        { label: 'Tool reference' },
      ],
    }),
  );
  pagePaths.push('tools/');
  searchIndex.push({
    t: 'Tool reference',
    d: 'The full catalog of packages and tools.',
    u: 'tools/',
    k: 'Reference',
    c: 'guide',
  });

  /* Package pages ----------------------------------------------------- */
  catalog.packages.forEach((pkg) => {
    const collection = collectionsById.get(pkg.collection);
    const rel = `tools/${pkg.collection}/${pkg.slug}/`;

    write(
      `${urlId}/${rel}index.html`,
      layout({
        site,
        version,
        versions,
        urlId,
        title: `${pkg.name} · ${collection.name} tools`,
        description: pkg.summary,
        body: renderPackagePage({
          site,
          version: { ...version, id: urlId },
          pkg,
          collection,
        }),
        nav,
        currentPath: `${versionBase}/${rel}`,
        pagePath: rel,
        variant: 'wide',
        breadcrumbs: [
          { label: 'Docs', href: `${versionBase}/` },
          { label: 'Tools', href: `${versionBase}/tools/` },
          { label: pkg.name },
        ],
      }),
    );

    pagePaths.push(rel);
    searchIndex.push({
      t: pkg.name,
      d: pkg.summary,
      u: rel,
      k: `${collection.name} tools`,
      c: 'package',
    });

    pkg.tools.forEach((tool) => {
      searchIndex.push({
        t: `${tool.name}()`,
        d: tool.summary,
        u: `${rel}#${tool.name}`,
        k: `${pkg.name} · ${collection.name}`,
        c: 'tool',
      });
    });
  });

  write(`${urlId}/search-index.json`, JSON.stringify(searchIndex));
  write(`${urlId}/pages.json`, JSON.stringify(pagePaths));

  return { guides, catalog, pagePaths };
}

/* --------------------------------------------------------------------- */
/* Site-level pages                                                       */
/* --------------------------------------------------------------------- */

function renderVersionsPage({ site, versions, latest }) {
  const base = site.base;
  const rows = versions
    .map((v) => {
      const isLatest = v.id === latest.id;
      return [
        '<div class="version-row">',
        '<div class="version-row-head">',
        `<a href="${base}/${v.id}/" class="version-row-label">${escapeHtml(v.label)}</a>`,
        isLatest
          ? '<span class="version-tag version-tag-current">latest</span>'
          : '<span class="version-tag">archived</span>',
        `<span class="version-row-date">${escapeHtml(v.released)}</span>`,
        '</div>',
        `<p class="version-row-notes">${escapeHtml(v.notes || '')}</p>`,
        '<div class="version-row-links">',
        `<a href="${base}/${v.id}/">Documentation</a>`,
        `<a href="${base}/${v.id}/tools/">Tools</a>`,
        `<a href="https://github.com/${site.repos.core}/tree/${escapeHtml(
          v.ref,
        )}" target="_blank" rel="noopener noreferrer">Source</a>`,
        '</div>',
        '</div>',
      ].join('');
    })
    .join('');

  return [
    '<div class="page-header">',
    '<p class="eyebrow">Versions</p>',
    '<h1 class="page-title">Documentation versions</h1>',
    `<p class="page-lede">Every release keeps its own copy of the docs at a permanent URL. <code>${escapeHtml(
      base,
    )}/latest/</code> always points at the newest.</p>`,
    '</div>',
    `<div class="version-rows">${rows}</div>`,
    '<section class="callout callout-info mt-10">',
    '<p class="callout-title">Pinning a tool collection</p>',
    '<p>Site versions track SysBot releases. Tool packages carry their own version in their README frontmatter, and you can pin an install to any git ref:</p>',
    '<figure class="code-block"><pre><code class="lang-shell">sysbot tools install syan-dev/sysbot-linux-tools-official@v1.0.0</code></pre></figure>',
    '<p>Installed packages are recorded in <code>tools.lock.json</code> with the package version and the exact commit SHA, so you can always tell what is running.</p>',
    '</section>',
  ].join('');
}

function buildSiteLevel({ site, versions, latest, latestData }) {
  const base = site.base;

  /* Root redirect ----------------------------------------------------- */
  write(
    'index.html',
    `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>SysBot Docs</title>
<link rel="canonical" href="${site.url}/latest/">
<meta http-equiv="refresh" content="0; url=${base}/latest/">
<script>location.replace(${JSON.stringify(`${base}/latest/`)});</script>
</head>
<body>
<p>Redirecting to <a href="${base}/latest/">the latest documentation</a>.</p>
</body>
</html>`,
  );

  /* Versions index ---------------------------------------------------- */
  const navForVersions = [
    {
      title: 'This site',
      items: [
        { label: 'Latest docs', href: `${base}/latest/` },
        { label: 'All versions', href: `${base}/versions/` },
      ],
    },
  ];

  write(
    'versions/index.html',
    layout({
      site,
      version: latest,
      versions,
      urlId: 'latest',
      title: 'Documentation versions',
      description: 'Every published version of the SysBot documentation.',
      body: renderVersionsPage({ site, versions, latest }),
      nav: navForVersions,
      currentPath: `${base}/versions/`,
      pagePath: '',
      variant: 'wide',
    }),
  );

  /* 404 --------------------------------------------------------------- */
  write(
    '404.html',
    layout({
      site,
      version: latest,
      versions,
      urlId: 'latest',
      title: 'Page not found',
      description: 'That page does not exist.',
      body: [
        '<div class="notfound">',
        '<p class="notfound-code">404</p>',
        '<h1 class="page-title">That page moved, or never existed.</h1>',
        '<p class="page-lede">If you followed a link to an older version, the page may have been renamed since. The latest docs are a good place to restart.</p>',
        '<div class="hero-actions">',
        `<a href="${base}/latest/" class="btn btn-primary">Latest documentation</a>`,
        `<a href="${base}/versions/" class="btn btn-ghost">All versions</a>`,
        '</div>',
        '</div>',
      ].join(''),
      currentPath: `${base}/404`,
      pagePath: '',
      variant: 'bare',
    }),
  );

  /* Machine-readable version manifest --------------------------------- */
  write(
    'versions.json',
    JSON.stringify({ latest: latest.id, versions }, null, 2),
  );

  /* Sitemap ----------------------------------------------------------- */
  const urls = [
    `${site.url}/`,
    `${site.url}/versions/`,
    ...latestData.pagePaths.map((p) => `${site.url}/latest/${p}`),
    ...versions.flatMap((v) => [`${site.url}/${v.id}/`]),
  ];
  write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`,
  );

  write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${site.url}/sitemap.xml\n`);

  /* GitHub Pages must not run these through Jekyll --------------------- */
  write('.nojekyll', '');
}

/* --------------------------------------------------------------------- */
/* Entry                                                                  */
/* --------------------------------------------------------------------- */

function build() {
  const started = Date.now();
  const site = readJson(path.join(CONTENT, 'site.json'));
  const manifest = readJson(path.join(CONTENT, 'versions.json'));

  // Allow the deploy workflow to override the base path (custom domains).
  if (process.env.SITE_BASE !== undefined) site.base = process.env.SITE_BASE;
  if (process.env.SITE_URL) site.url = process.env.SITE_URL;

  const versions = manifest.versions;
  const latest =
    versions.find((v) => v.id === manifest.latest) || versions[0];

  fs.rmSync(DIST, { recursive: true, force: true });

  let latestData = null;
  for (const version of versions) {
    const result = buildVersion({ site, version, versions, urlId: version.id });
    console.log(`  · ${version.id} — ${result.pagePaths.length} pages`);
    if (version.id === latest.id) {
      latestData = buildVersion({
        site,
        version,
        versions,
        urlId: 'latest',
      });
      console.log(`  · latest → ${version.id}`);
    }
  }

  buildSiteLevel({ site, versions, latest, latestData });

  /* Static assets ------------------------------------------------------ */
  if (fs.existsSync(STATIC)) {
    fs.cpSync(STATIC, path.join(DIST, 'assets'), { recursive: true });
  }

  console.log(`✓ built in ${Date.now() - started}ms → dist/`);
}

build();

if (process.argv.includes('--watch')) {
  const watched = [CONTENT, path.join(ROOT, 'src')];
  let timer = null;
  for (const dir of watched) {
    fs.watch(dir, { recursive: true }, () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          build();
        } catch (err) {
          console.error('build failed:', err.message);
        }
      }, 80);
    });
  }
  console.log('watching content/ and src/ …');
}
