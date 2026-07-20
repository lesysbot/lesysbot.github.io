#!/usr/bin/env node
/**
 * Import guide markdown from a local checkout of the core SysBot repo.
 *
 *   node scripts/import-docs.js ../sysbot v0.1
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

/** slug → metadata. Order within a section comes from nav.json, not here. */
const GUIDES = {
  architecture: {
    title: 'Architecture',
    section: 'Introduction',
    description:
      'How the messaging, agent, and tool layers fit together — and where to change what.',
  },
  'getting-started': {
    title: 'Getting started',
    section: 'Get started',
    description:
      'From nothing to a working bot: prerequisites, the guided installer, your first conversation, and your first tool.',
  },
  models: {
    title: 'Choosing a model',
    section: 'Get started',
    description:
      'Which local model to run for the GPU you have, and how to point SysBot at it.',
  },
  service: {
    title: 'Running as a service',
    section: 'Get started',
    description:
      'Keep SysBot running in the background and start it on boot, on Linux, macOS, and Windows.',
  },
  usage: {
    title: 'Everyday use',
    section: 'Everyday use',
    description:
      'Chatting, slash commands, calling tools directly, confirmations, history, and reading the logs.',
  },
  adapters: {
    title: 'Messaging adapters',
    section: 'Everyday use',
    description:
      'Set up the CLI, Telegram, or Slack front end — or write an adapter of your own.',
  },
  configuration: {
    title: 'Configuration',
    section: 'Everyday use',
    description:
      'The full config.yaml reference, environment variable overrides, and CLI flags.',
  },
  dashboard: {
    title: 'Dashboard',
    section: 'Everyday use',
    description:
      'The local web dashboard: what it shows, how to enable and manage tools from it, and its security boundaries.',
  },
  'installing-tools': {
    title: 'Installing tools',
    section: 'Tools',
    description:
      'Install tool packages from GitHub, pin them to a ref, and understand the trust model.',
  },
  'writing-tools': {
    title: 'Writing tools',
    section: 'Tools',
    description:
      'Author your own tools with @tool and CLITool — schemas, confirmation, and cross-platform gating.',
  },
  'sharing-tools': {
    title: 'Sharing tools',
    section: 'Tools',
    description:
      'Publish your tools so other people can install them, and version them sensibly.',
  },
  'claude-code': {
    title: 'Claude Code plugin',
    section: 'Tools',
    description:
      'Use the sysbot-tool-dev plugin to scaffold tool packages from your editor.',
  },
  'building-windows-exe': {
    title: 'Building a Windows executable',
    section: 'Deploy',
    description:
      'Package SysBot into a standalone sysbot.exe with PyInstaller.',
  },
};

/** Authored in this repo — never clobbered by an import. */
const KEEP = new Set(['overview', 'security']);

function main() {
  const [coreRepo = '../sysbot', versionId = 'v0.1'] = process.argv.slice(2);
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
