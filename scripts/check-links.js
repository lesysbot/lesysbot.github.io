#!/usr/bin/env node
/**
 * Verify every internal link in dist/ resolves — both the page and, when the
 * link carries one, the `#fragment` inside it.
 *
 * Cheap insurance: the generator rewrites links between versions, guides, and
 * tool pages, and a typo in nav.json or a renamed guide would otherwise ship a
 * dead link silently. Fragments are checked because the guide markdown is read
 * in two places — GitHub and here — and a heading whose slug differs between
 * them produces a link that works in the repo and 404s on the site (or lands
 * silently at the top of the page, which is worse). External URLs are not
 * checked: this must stay offline so it can run in CI without flaking.
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

/** Absolute path of the file a site-relative href resolves to, or null when
 *  the href is not ours to check. */
function targetFile(href, fromFile) {
  let rel = href.split('#')[0].split('?')[0];
  if (rel === '') return fromFile; // a bare fragment: same page
  if (!rel.startsWith(BASE)) return null;
  rel = rel.slice(BASE.length);
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  return path.join(DIST, rel);
}

const idCache = new Map();

/** Every `id`/`name` a page offers as an anchor target. */
function anchorsIn(file) {
  if (idCache.has(file)) return idCache.get(file);
  const html = fs.readFileSync(file, 'utf8');
  const ids = new Set([
    ...[...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]),
    ...[...html.matchAll(/<a\b[^>]*\bname="([^"]+)"/g)].map((m) => m[1]),
  ]);
  idCache.set(file, ids);
  return ids;
}

function main() {
  if (!fs.existsSync(DIST)) {
    console.error('dist/ does not exist — run `npm run build` first.');
    process.exit(1);
  }

  const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));
  const broken = [];
  const deadAnchors = [];
  let checked = 0;
  let fragments = 0;

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, 'utf8');
    const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);

    for (const href of hrefs) {
      if (/^(https?:|mailto:|tel:|data:)/.test(href)) continue;
      if (href === '#') continue; // a button wearing a link's clothes

      const target = targetFile(href, file);
      if (target === null) continue; // not ours

      checked += 1;
      if (!fs.existsSync(target)) {
        broken.push({ file: path.relative(DIST, file), href });
        continue;
      }

      const fragment = decodeURIComponent(href.split('#')[1] || '');
      if (!fragment) continue;
      fragments += 1;
      if (!anchorsIn(target).has(fragment)) {
        deadAnchors.push({ file: path.relative(DIST, file), href });
      }
    }
  }

  if (broken.length || deadAnchors.length) {
    if (broken.length) {
      console.error(`✗ ${broken.length} broken internal link(s):\n`);
      for (const b of broken) console.error(`  ${b.file}\n    → ${b.href}`);
    }
    if (deadAnchors.length) {
      console.error(
        `\n✗ ${deadAnchors.length} link(s) to a heading that does not exist:\n`,
      );
      for (const b of deadAnchors) console.error(`  ${b.file}\n    → ${b.href}`);
    }
    process.exit(1);
  }

  console.log(
    `✓ ${checked} internal links (${fragments} with anchors) across ` +
      `${htmlFiles.length} pages all resolve`,
  );
}

main();
