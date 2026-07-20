#!/usr/bin/env node
/**
 * Verify every internal link in dist/ resolves to a file that exists.
 *
 * Cheap insurance: the generator rewrites links between versions, guides, and
 * tool pages, and a typo in nav.json or a renamed guide would otherwise ship a
 * dead link silently. External URLs are not checked — this must stay offline
 * so it can run in CI without flaking.
 */

import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const BASE = JSON.parse(
  fs.readFileSync(path.resolve('content/site.json'), 'utf8'),
).base;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function targetExists(href) {
  let rel = href.split('#')[0].split('?')[0];
  if (!rel.startsWith(BASE)) return true; // not ours to check
  rel = rel.slice(BASE.length);
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';

  return fs.existsSync(path.join(DIST, rel));
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.error('dist/ does not exist — run `npm run build` first.');
    process.exit(1);
  }

  const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
  const broken = [];
  let checked = 0;

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);

    for (const href of hrefs) {
      if (/^(https?:|mailto:|tel:|#|data:)/.test(href)) continue;
      checked += 1;
      if (!targetExists(href)) {
        broken.push({ file: path.relative(DIST, file), href });
      }
    }
  }

  if (broken.length) {
    console.error(`✗ ${broken.length} broken internal link(s):\n`);
    for (const b of broken) console.error(`  ${b.file}\n    → ${b.href}`);
    process.exit(1);
  }

  console.log(
    `✓ ${checked} internal links across ${htmlFiles.length} pages all resolve`,
  );
}

main();
