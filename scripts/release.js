#!/usr/bin/env node
/**
 * Cut a new documentation version.
 *
 *   node scripts/release.js v0.2 --label 0.2.0 --ref v0.2.0 --notes "…"
 *
 * Snapshots the current latest version into a new directory, marks the old one
 * archived, and points `latest` at the new one. The old directory is then
 * frozen: you keep editing the new one, and every published URL under the old
 * version keeps resolving to the docs as they were at that release.
 */

import fs from 'node:fs';
import path from 'node:path';

const CONTENT = path.resolve('content');
const MANIFEST = path.join(CONTENT, 'versions.json');

function parseArgs(argv) {
  const [id, ...rest] = argv;
  const opts = { id };
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i].replace(/^--/, '');
    opts[key] = rest[i + 1];
  }
  return opts;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (!opts.id || !/^v\d+\.\d+$/.test(opts.id)) {
    console.error(
      'Usage: node scripts/release.js v0.2 --label 0.2.0 [--ref v0.2.0] [--notes "…"]',
    );
    process.exit(1);
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

  if (manifest.versions.some((v) => v.id === opts.id)) {
    console.error(`Version ${opts.id} already exists in versions.json`);
    process.exit(1);
  }

  const current = manifest.versions.find((v) => v.id === manifest.latest);
  if (!current) {
    console.error(`versions.json names "${manifest.latest}" as latest, but no such entry exists`);
    process.exit(1);
  }

  const from = path.join(CONTENT, current.id);
  const to = path.join(CONTENT, opts.id);

  fs.cpSync(from, to, { recursive: true });

  // The previous version stops moving the moment the new one is cut.
  current.status = 'archived';

  manifest.versions.unshift({
    id: opts.id,
    label: opts.label || opts.id.slice(1),
    core: opts.core || opts.label || opts.id.slice(1),
    released: new Date().toISOString().slice(0, 10),
    status: 'current',
    ref: opts.ref || 'main',
    notes: opts.notes || '',
  });
  manifest.latest = opts.id;

  fs.writeFileSync(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`✓ snapshotted content/${current.id}/ → content/${opts.id}/`);
  console.log(`✓ ${current.id} marked archived; latest is now ${opts.id}`);
  console.log('');
  console.log('Next:');
  console.log(`  1. edit content/${opts.id}/ — it is the live version from here on`);
  console.log(`  2. node scripts/import-docs.js ../sysbot ${opts.id}   (to pull upstream guide changes)`);
  console.log('  3. npm run build && npm run serve');
}

main();
