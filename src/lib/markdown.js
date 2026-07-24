/**
 * Markdown → HTML for the docs site.
 *
 * Beyond plain rendering this does three things the source docs need:
 *   1. rewrites relative links, which in the source repos point at sibling
 *      markdown files and at source code that does not exist on this site
 *   2. collects a table of contents while rendering
 *   3. hands fenced code to the build-time highlighter
 */

import { Marked } from 'marked';
import { highlight, normalizeLang, escapeHtml } from './highlight.js';

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

/**
 * Repo files that are a guide here under a different path. The core docs link
 * to `../monitoring/README.md` because that is where the stack lives in the
 * repo; on the site it is the `monitoring` guide, so keep the reader here.
 */
const REPO_PAGE_ALIASES = new Map([['monitoring/README.md', 'monitoring']]);

/**
 * Source docs link to files by repo-relative path. Map those onto the site
 * where an equivalent page exists, and onto GitHub otherwise, so nothing 404s.
 */
function rewriteHref(href, ctx) {
  if (!href) return href;

  // Anchors, absolute URLs, and mail links pass through untouched.
  if (/^(#|https?:|mailto:|tel:)/.test(href)) return href;

  const [rawPath, hash = ''] = href.split('#');
  const anchor = hash ? `#${hash}` : '';
  const clean = rawPath.replace(/^\.\//, '');

  if (!clean) return anchor;

  // A sibling guide that exists on the site becomes an internal page link.
  if (clean.endsWith('.md')) {
    const slug = clean.replace(/^.*\//, '').replace(/\.md$/, '');
    const known = clean.startsWith('../') ? null : ctx.guideSlugs.get(slug);
    if (known) return `${ctx.versionBase}/guides/${known}/${anchor}`;
  }

  const repoPath = clean.replace(/^(\.\.\/)+/, '');

  // A repo path that is a guide here under another name (see the alias map).
  const aliased = REPO_PAGE_ALIASES.get(repoPath);
  if (aliased && ctx.guideSlugs.has(aliased)) {
    return `${ctx.versionBase}/guides/${aliased}/${anchor}`;
  }

  // Everything else — source files, CONTRIBUTING, skills — lives on GitHub.
  return `https://github.com/${ctx.repo}/blob/${ctx.ref}/${repoPath}${anchor}`;
}

export function renderMarkdown(source, ctx) {
  const toc = [];
  const usedIds = new Map();
  let hasMermaid = false;

  const uniqueId = (base) => {
    const seen = usedIds.get(base) || 0;
    usedIds.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen}`;
  };

  const renderer = {
    code({ text, lang }) {
      if (normalizeLang(lang) === 'text' && /^mermaid\b/.test(lang || '')) {
        hasMermaid = true;
        return `<pre class="mermaid">${escapeHtml(text)}</pre>`;
      }
      if ((lang || '').toLowerCase().startsWith('mermaid')) {
        hasMermaid = true;
        return `<pre class="mermaid">${escapeHtml(text)}</pre>`;
      }

      const label = (lang || '').split(/[\s:]/)[0];
      return [
        '<figure class="code-block group">',
        label ? `<figcaption class="code-lang">${escapeHtml(label)}</figcaption>` : '',
        `<button type="button" class="code-copy" data-copy aria-label="Copy code">Copy</button>`,
        `<pre><code class="lang-${escapeHtml(normalizeLang(lang))}">${highlight(text, lang)}</code></pre>`,
        '</figure>',
      ].join('');
    },

    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens);
      const id = uniqueId(slugify(text));
      if (depth === 2 || depth === 3) {
        toc.push({ id, depth, text: text.replace(/<[^>]*>/g, '') });
      }
      return (
        `<h${depth} id="${id}" class="heading-anchor">` +
        `${text}` +
        `<a href="#${id}" class="anchor-link" aria-label="Link to this section">#</a>` +
        `</h${depth}>`
      );
    },

    link({ href, title, tokens }) {
      const text = this.parser.parseInline(tokens);
      const resolved = rewriteHref(href, ctx);
      const external = /^https?:/.test(resolved);
      const attrs = [
        `href="${escapeHtml(resolved)}"`,
        title ? `title="${escapeHtml(title)}"` : '',
        external ? 'target="_blank" rel="noopener noreferrer"' : '',
      ].filter(Boolean).join(' ');
      return `<a ${attrs}>${text}</a>`;
    },

    table({ header, rows }) {
      const head = header
        .map((cell) => `<th>${this.parser.parseInline(cell.tokens)}</th>`)
        .join('');
      const body = rows
        .map(
          (row) =>
            `<tr>${row
              .map((cell) => `<td>${this.parser.parseInline(cell.tokens)}</td>`)
              .join('')}</tr>`,
        )
        .join('');
      return (
        '<div class="table-wrap"><table>' +
        `<thead><tr>${head}</tr></thead><tbody>${body}</tbody>` +
        '</table></div>'
      );
    },
  };

  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({ renderer });

  const html = marked.parse(source);
  return { html, toc, hasMermaid };
}

/** Strip markdown down to plain prose, for search snippets and meta tags. */
export function toPlainText(source, limit = 260) {
  const text = source
    .replace(/^---[\s\S]*?---/, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^[>*-]\s+/gm, '')
    .replace(/[*_~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= limit) return text;
  return `${text.slice(0, text.lastIndexOf(' ', limit) || limit)}…`;
}
