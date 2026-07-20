#!/usr/bin/env node
/**
 * Preview server for dist/.
 *
 * Serves under the site's base path so local URLs match production exactly —
 * without this, every absolute link would 404 in local preview.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');
const PORT = Number(process.env.PORT || 4173);
const BASE = JSON.parse(
  fs.readFileSync(path.resolve('content/site.json'), 'utf8'),
).base;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const send = (res, code, body, type) => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
};

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent(req.url.split('?')[0]);

    if (BASE && urlPath.startsWith(BASE)) urlPath = urlPath.slice(BASE.length);
    if (urlPath === '' || urlPath.endsWith('/')) urlPath += 'index.html';

    const file = path.join(DIST, urlPath);

    // Never serve outside dist/, whatever the request path claims.
    if (!file.startsWith(DIST)) return send(res, 403, 'Forbidden', 'text/plain');

    fs.readFile(file, (err, data) => {
      if (err) {
        const notFound = path.join(DIST, '404.html');
        if (fs.existsSync(notFound)) {
          return send(res, 404, fs.readFileSync(notFound), TYPES['.html']);
        }
        return send(res, 404, 'Not found', 'text/plain');
      }
      send(res, 200, data, TYPES[path.extname(file)] || 'application/octet-stream');
    });
  })
  .listen(PORT, () => {
    console.log(`→ http://localhost:${PORT}${BASE}/`);
  });
