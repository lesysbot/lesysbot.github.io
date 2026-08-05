#!/usr/bin/env node
/**
 * Import guide markdown from a local checkout of the core LeSysBot repo.
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
    description:
      'From nothing to a working bot in about five minutes — install it, chat with it, write your first tool.',
  },
  models: {
    title: 'Choosing a model',
    section: 'Start here',
    description:
      'Which local model to run on the hardware you have, and how to point LeSysBot at it.',
  },
  usage: {
    title: 'Everyday use',
    section: 'Everyday use',
    description:
      'Asking in words versus running a tool directly, confirmations, memory, and turning tools on and off.',
  },
  adapters: {
    title: 'Telegram & Discord',
    section: 'Everyday use',
    description:
      'Reach the bot from your phone or your workspace — full token and app setup for both.',
  },
  'management-ui': {
    title: 'Control panel',
    section: 'Everyday use',
    description:
      'The always-on web page at http://127.0.0.1:8700 — settings, tools, and health, reachable from your machine only.',
  },
  configuration: {
    title: 'Settings',
    section: 'Everyday use',
    description:
      'Where your settings live, the ones you will actually change, and the full config.yaml reference.',
  },
  troubleshooting: {
    title: 'Troubleshooting',
    section: 'Everyday use',
    description:
      'Symptoms and fixes: the model unreachable, tools missing, service problems, Telegram and Discord setup.',
  },
  'installing-tools': {
    title: 'Install tools',
    section: 'Give it new abilities',
    description:
      'Add tools from any GitHub repo with one command — pinning, updating, and what you are trusting.',
  },
  'writing-tools': {
    title: 'Write a tool',
    section: 'Give it new abilities',
    description:
      'Turn a Python function or a shell command into something LeSysBot can do, in about a minute.',
  },
  'installing-dashboards': {
    title: 'Install dashboards',
    section: 'Give it new abilities',
    description:
      'Add Grafana dashboards with the same install command as tools — where they land, and when one is withheld.',
  },
  'sharing-tools': {
    title: 'Share your tools',
    section: 'Give it new abilities',
    description:
      'Publish your tools so other people can install them, and version them sensibly.',
  },
  'claude-code': {
    title: 'Write tools with Claude Code',
    section: 'Give it new abilities',
    description:
      'Use the lesysbot-tool-dev plugin to let an AI assistant scaffold tool packages for you.',
  },
  service: {
    title: 'Run as a service',
    section: 'Keep it running',
    description:
      'The background service every install gets — it keeps the control panel online, answers Telegram and Discord, and writes the logs.',
  },
  'building-windows-exe': {
    title: 'Build a Windows .exe',
    section: 'Keep it running',
    description:
      'Package LeSysBot into a standalone lesysbot.exe with PyInstaller, for people without Python.',
  },
  architecture: {
    title: 'How it works',
    section: 'Under the hood',
    description:
      'The life of a message, layer by layer — the technical page, for people modifying the code.',
  },
};

/** Authored in this repo — never clobbered by an import.
 * `monitoring` is derived from the core repo's dashboard/README.md but tuned
 * for the site, so it is maintained here by hand rather than imported. */
const KEEP = new Set(['overview', 'security', 'monitoring']);

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
}

main();
