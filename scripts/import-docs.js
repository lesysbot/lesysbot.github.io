#!/usr/bin/env node
/**
 * Import guide markdown and root-level static files from a local checkout of
 * the core LeSysBot repo.
 *
 *   node scripts/import-docs.js ../lesysbot v0.1
 *
 * The docs repo is self-contained — committed markdown under content/ is what
 * the build reads, so CI never needs the core repo. This script only exists to
 * refresh that content when upstream docs change. Files listed in KEEP are
 * authored here and are never overwritten.
 *
 * Frontmatter is rewritten on every import; the body is taken verbatim, with
 * the leading H1 stripped because the layout renders the title itself.
 */

import fs from 'node:fs';
import path from 'node:path';

/** slug → metadata. Order within a section comes from nav.json, not here.
 * `section` is the eyebrow shown above a page title and the search-result
 * grouping — keep it equal to the nav.json section the slug is listed in. */
const GUIDES = {
  'getting-started': {
    title: 'Getting started',
    section: 'Start here',
    description: 'Install it, say hello, and open the control panel — about five minutes.',
  },
  models: {
    title: 'Choosing a model',
    section: 'Start here',
    description: 'Which model fits your GPU, and how to switch.',
  },
  usage: {
    title: 'Everyday use',
    section: 'Use it',
    description: 'Asking in words, running tools yourself, and confirmations.',
  },
  adapters: {
    title: 'Telegram & Discord',
    section: 'Use it',
    description: 'Chat with your machine from your phone.',
  },
  'management-ui': {
    title: 'Control panel',
    section: 'Use it',
    description: 'Settings and tools in your browser, at http://127.0.0.1:8700.',
  },
  dashboards: {
    title: 'Dashboards',
    section: 'Use it',
    description: 'Graphs of your machine over time in Grafana — and how to share them.',
  },
  configuration: {
    title: 'Settings',
    section: 'Use it',
    description: 'Where settings live, the ones you will change, and the full reference.',
  },
  'installing-tools': {
    title: 'Install tools',
    section: 'Extend it',
    description: 'Add tools and dashboards from GitHub with one command.',
  },
  'writing-tools': {
    title: 'Write a tool',
    section: 'Extend it',
    description: 'Make your own tool in a minute, share it, or let Claude Code write it.',
  },
  service: {
    title: 'Background service',
    section: 'Run it',
    description: 'Start, stop, and read the logs of the service that keeps LeSysBot running.',
  },
  security: {
    title: 'Security',
    section: 'Run it',
    description: 'Who can use your bot, what a tool can do, and what is exposed.',
  },
  troubleshooting: {
    title: 'Troubleshooting',
    section: 'Run it',
    description: 'Common problems and how to fix them.',
  },
  architecture: {
    title: 'How it works',
    section: 'Under the hood',
    description: 'The code, layer by layer — for contributors.',
  },
};

/** Authored in this repo — never clobbered by an import. */
const KEEP = new Set(['overview']);

/** [source in the core repo, name at the site root] — copied verbatim into
 * content/static/, which src/build.js publishes at the site root.
 *
 * These are canonical *upstream*: install.sh is what shellcheck and the
 * installer end-to-end job run against, so editing the copy here would
 * silently ship an unlinted installer to everyone who runs
 * `curl -fsSL https://lesysbot.github.io/install.sh | sh`. */
const STATIC_FILES = [
  ['scripts/install.sh', 'install.sh'],
  ['catalog.json', 'catalog.json'],
];

function importStatic(coreRepo) {
  const outDir = path.resolve('content', 'static');
  fs.mkdirSync(outDir, { recursive: true });
  let copied = 0;
  for (const [src, name] of STATIC_FILES) {
    const srcFile = path.resolve(coreRepo, src);
    if (!fs.existsSync(srcFile)) {
      console.warn(`  ! missing upstream: ${src}`);
      continue;
    }
    const dest = path.join(outDir, name);
    fs.copyFileSync(srcFile, dest);
    if (name.endsWith('.sh')) fs.chmodSync(dest, 0o755);
    copied += 1;
  }
  console.log(`✓ synced ${copied} static files into content/static/`);
}

function main() {
  const [coreRepo = '../lesysbot', versionId = 'v0.1'] = process.argv.slice(2);
  const srcDir = path.resolve(coreRepo, 'docs');
  const outDir = path.resolve('content', versionId, 'guides');

  if (!fs.existsSync(srcDir)) {
    console.error(`No docs/ directory at ${srcDir}`);
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });

  let imported = 0;
  for (const [slug, meta] of Object.entries(GUIDES)) {
    const srcFile = path.join(srcDir, `${slug}.md`);
    if (!fs.existsSync(srcFile)) {
      console.warn(`  ! missing upstream: docs/${slug}.md`);
      continue;
    }
    if (KEEP.has(slug)) continue;

    const raw = fs.readFileSync(srcFile, 'utf8');

    // Drop any existing frontmatter and the leading H1 — the layout renders
    // the title from frontmatter, so keeping both would duplicate it.
    const body = raw
      .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
      .replace(/^\s*#\s+[^\n]*\n+/, '')
      .trimStart();

    const frontmatter = [
      '---',
      `title: ${meta.title}`,
      `description: ${meta.description}`,
      `section: ${meta.section}`,
      `source: docs/${slug}.md`,
      '---',
      '',
    ].join('\n');

    fs.writeFileSync(path.join(outDir, `${slug}.md`), frontmatter + body);
    imported += 1;
  }

  console.log(`✓ imported ${imported} guides into content/${versionId}/guides/`);
  importStatic(coreRepo);
}

main();
