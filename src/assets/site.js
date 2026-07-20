/* SysBot docs — client behaviour. No framework, no dependencies. */
(function () {
  'use strict';

  const body = document.body;
  const BASE = body.dataset.base || '';
  const VERSION = body.dataset.version || '';
  const PAGE_PATH = body.dataset.pagePath || '';

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ------------------------------------------------------------------ */
  /* Theme                                                               */
  /* ------------------------------------------------------------------ */

  const themeToggle = $('[data-theme-toggle]');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const dark = document.documentElement.classList.toggle('dark');
      try {
        localStorage.setItem('sysbot-docs-theme', dark ? 'dark' : 'light');
      } catch (e) {
        /* private mode — the toggle still works for this page view */
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Mobile sidebar                                                      */
  /* ------------------------------------------------------------------ */

  const sidebar = $('[data-sidebar]');
  const backdrop = $('[data-sidebar-backdrop]');

  function setSidebar(open) {
    if (!sidebar) return;
    sidebar.dataset.open = open ? 'true' : 'false';
    if (backdrop) backdrop.hidden = !open;
    body.style.overflow = open ? 'hidden' : '';
    const toggle = $('[data-sidebar-toggle]');
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
  }

  const sidebarToggle = $('[data-sidebar-toggle]');
  if (sidebarToggle) sidebarToggle.addEventListener('click', () => setSidebar(true));
  if (backdrop) backdrop.addEventListener('click', () => setSidebar(false));
  const sidebarClose = $('[data-sidebar-close]');
  if (sidebarClose) sidebarClose.addEventListener('click', () => setSidebar(false));

  /* ------------------------------------------------------------------ */
  /* Version switcher                                                    */
  /* ------------------------------------------------------------------ */

  const switcher = $('[data-version-switcher]');
  if (switcher) {
    const toggle = $('[data-version-toggle]', switcher);
    const menu = $('[data-version-menu]', switcher);

    const closeMenu = () => {
      menu.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
    };

    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    });

    document.addEventListener('click', (e) => {
      if (!switcher.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });

    $$('[data-version]', menu).forEach((option) => {
      option.addEventListener('click', async () => {
        const target = option.dataset.version;
        if (!target || target === VERSION) return closeMenu();

        // Land on the same page in the target version when it exists there,
        // otherwise fall back to that version's home rather than a 404.
        let destination = BASE + '/' + target + '/';
        try {
          const res = await fetch(BASE + '/' + target + '/pages.json', {
            cache: 'no-store',
          });
          if (res.ok) {
            const pages = await res.json();
            if (PAGE_PATH && pages.includes(PAGE_PATH)) {
              destination = BASE + '/' + target + '/' + PAGE_PATH;
            }
          }
        } catch (e) {
          /* keep the home-page fallback */
        }
        location.href = destination;
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Copy buttons                                                        */
  /* ------------------------------------------------------------------ */

  $$('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const block = button.closest('.code-block');
      const code = block && block.querySelector('code');
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.innerText);
        const original = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => {
          button.textContent = original;
        }, 1400);
      } catch (e) {
        button.textContent = 'Press ⌘C';
      }
    });
  });

  /* ------------------------------------------------------------------ */
  /* Table-of-contents scrollspy                                         */
  /* ------------------------------------------------------------------ */

  const tocLinks = $$('.toc-link');
  if (tocLinks.length) {
    const byId = new Map(
      tocLinks.map((a) => [decodeURIComponent(a.hash.slice(1)), a]),
    );
    const headings = Array.from(byId.keys())
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    let active = null;
    const setActive = (id) => {
      if (id === active) return;
      if (active && byId.get(active)) byId.get(active).classList.remove('toc-link-active');
      active = id;
      if (byId.get(id)) byId.get(id).classList.add('toc-link-active');
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );
    headings.forEach((h) => observer.observe(h));
  }

  /* ------------------------------------------------------------------ */
  /* Catalog filtering                                                   */
  /* ------------------------------------------------------------------ */

  const catalogSearch = $('[data-catalog-search]');
  const filterChips = $$('[data-filter]');

  if (catalogSearch || filterChips.length) {
    const cards = $$('[data-tool-card]');
    const groups = $$('[data-group]');
    const empty = $('[data-catalog-empty]');
    let activeFilter = 'all';

    function apply() {
      const query = (catalogSearch ? catalogSearch.value : '').trim().toLowerCase();
      let shown = 0;

      cards.forEach((card) => {
        const matchesFilter =
          activeFilter === 'all' || card.dataset.collection === activeFilter;
        const matchesQuery = !query || card.dataset.search.includes(query);
        const visible = matchesFilter && matchesQuery;
        card.hidden = !visible;
        if (visible) shown += 1;
      });

      // Hide a collection heading entirely when nothing under it survives.
      groups.forEach((group) => {
        const anyVisible = $$('[data-tool-card]', group).some((c) => !c.hidden);
        group.hidden = !anyVisible;
      });

      if (empty) empty.hidden = shown > 0;
    }

    if (catalogSearch) catalogSearch.addEventListener('input', apply);

    filterChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        activeFilter = chip.dataset.filter;
        filterChips.forEach((c) =>
          c.classList.toggle('filter-chip-active', c === chip),
        );
        apply();
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Search                                                              */
  /* ------------------------------------------------------------------ */

  const modal = $('[data-search-modal]');
  if (modal) {
    const input = $('[data-search-input]', modal);
    const results = $('[data-search-results]', modal);
    let index = null;
    let hits = [];
    let cursor = 0;

    const escapeHtml = (s) =>
      String(s).replace(/[&<>"]/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]),
      );

    function mark(text, query) {
      const safe = escapeHtml(text);
      if (!query) return safe;
      const i = safe.toLowerCase().indexOf(query.toLowerCase());
      if (i < 0) return safe;
      return (
        safe.slice(0, i) +
        '<mark>' +
        safe.slice(i, i + query.length) +
        '</mark>' +
        safe.slice(i + query.length)
      );
    }

    async function ensureIndex() {
      if (index) return index;
      try {
        const res = await fetch(BASE + '/' + VERSION + '/search-index.json');
        index = await res.json();
      } catch (e) {
        index = [];
      }
      return index;
    }

    function score(entry, query) {
      const title = entry.t.toLowerCase();
      const desc = (entry.d || '').toLowerCase();
      const kind = (entry.k || '').toLowerCase();

      if (title === query) return 100;
      if (title.startsWith(query)) return 80;
      if (title.includes(query)) return 60;
      if (kind.includes(query)) return 35;
      if (desc.includes(query)) return 25;
      return 0;
    }

    function render(query) {
      if (!query) {
        results.innerHTML =
          '<p class="search-empty">Start typing to search guides and tools.</p>';
        hits = [];
        return;
      }

      hits = (index || [])
        .map((entry) => ({ entry, s: score(entry, query) }))
        .filter((r) => r.s > 0)
        .sort((a, b) => b.s - a.s)
        .slice(0, 12)
        .map((r) => r.entry);

      if (!hits.length) {
        results.innerHTML =
          '<p class="search-empty">No matches for “' +
          escapeHtml(query) +
          '”.</p>';
        return;
      }

      cursor = 0;
      results.innerHTML = hits
        .map(
          (h, i) =>
            '<a class="search-hit' +
            (i === 0 ? ' search-hit-active' : '') +
            '" href="' +
            BASE +
            '/' +
            VERSION +
            '/' +
            escapeHtml(h.u) +
            '">' +
            '<span class="search-hit-title">' +
            mark(h.t, query) +
            '<span class="search-hit-kind">' +
            escapeHtml(h.c) +
            '</span></span>' +
            '<span class="search-hit-desc">' +
            mark(h.d || '', query) +
            '</span>' +
            '</a>',
        )
        .join('');
    }

    function moveCursor(delta) {
      const nodes = $$('.search-hit', results);
      if (!nodes.length) return;
      nodes[cursor] && nodes[cursor].classList.remove('search-hit-active');
      cursor = (cursor + delta + nodes.length) % nodes.length;
      nodes[cursor].classList.add('search-hit-active');
      nodes[cursor].scrollIntoView({ block: 'nearest' });
    }

    async function open() {
      modal.hidden = false;
      body.style.overflow = 'hidden';
      input.value = '';
      render('');
      input.focus();
      await ensureIndex();
    }

    function close() {
      modal.hidden = true;
      body.style.overflow = '';
    }

    $$('[data-search-open]').forEach((b) => b.addEventListener('click', open));
    $$('[data-search-close]').forEach((b) => b.addEventListener('click', close));

    input.addEventListener('input', () => render(input.value.trim()));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveCursor(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveCursor(-1);
      } else if (e.key === 'Enter') {
        const nodes = $$('.search-hit', results);
        if (nodes[cursor]) {
          e.preventDefault();
          location.href = nodes[cursor].href;
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName);

      if (e.key === 'Escape' && !modal.hidden) return close();

      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        modal.hidden ? open() : close();
      }
    });
  }
})();
