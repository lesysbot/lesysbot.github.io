/**
 * A small build-time syntax highlighter.
 *
 * Scope is intentionally narrow: the languages that actually appear in these
 * docs (shell, yaml, python, json, powershell, ini). Strings and comments are
 * consumed first so keywords inside them are never re-highlighted, which is
 * the failure mode naive regex highlighters have.
 */

const KEYWORDS = {
  python: [
    'False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break',
    'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally',
    'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal',
    'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
  ],
  shell: [
    'case', 'do', 'done', 'elif', 'else', 'esac', 'fi', 'for', 'function',
    'if', 'in', 'then', 'until', 'while', 'export', 'local', 'return', 'source',
  ],
  powershell: [
    'if', 'else', 'elseif', 'foreach', 'function', 'param', 'process', 'return',
    'switch', 'try', 'catch', 'finally', 'while', 'begin', 'end',
  ],
};

const ALIASES = {
  sh: 'shell', bash: 'shell', zsh: 'shell', console: 'shell', shell: 'shell',
  py: 'python', python: 'python',
  yml: 'yaml', yaml: 'yaml',
  json: 'json',
  ps1: 'powershell', powershell: 'powershell', pwsh: 'powershell',
  ini: 'ini', toml: 'ini', cfg: 'ini',
  text: 'text', txt: 'text', '': 'text',
};

export function normalizeLang(lang) {
  return ALIASES[(lang || '').toLowerCase().split(/[\s:]/)[0]] || 'text';
}

const escapeHtml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const span = (cls, text) => `<span class="tok-${cls}">${escapeHtml(text)}</span>`;

/**
 * Walk the source once, emitting either a matched token or a plain character.
 * `rules` is an ordered list of [regex-anchored-at-start, className|fn].
 */
function tokenize(code, rules) {
  let out = '';
  let rest = code;
  let plain = '';

  outer: while (rest.length > 0) {
    for (const [pattern, cls] of rules) {
      const m = rest.match(pattern);
      if (m && m[0].length > 0) {
        if (plain) {
          out += escapeHtml(plain);
          plain = '';
        }
        const resolved = typeof cls === 'function' ? cls(m) : cls;
        out += resolved ? span(resolved, m[0]) : escapeHtml(m[0]);
        rest = rest.slice(m[0].length);
        continue outer;
      }
    }
    plain += rest[0];
    rest = rest.slice(1);
  }

  return out + escapeHtml(plain);
}

const STRING_RULES = [
  [/^"""[\s\S]*?"""/, 'str'],
  [/^'''[\s\S]*?'''/, 'str'],
  [/^"(?:\\.|[^"\\])*"/, 'str'],
  [/^'(?:\\.|[^'\\])*'/, 'str'],
];

const NUMBER_RULE = [/^\b\d+(?:\.\d+)?\b/, 'num'];

function keywordRule(lang) {
  const words = KEYWORDS[lang];
  if (!words) return null;
  return [new RegExp(`^\\b(?:${words.join('|')})\\b`), 'kw'];
}

const HIGHLIGHTERS = {
  shell: (code) =>
    tokenize(code, [
      [/^#[^\n]*/, 'com'],
      ...STRING_RULES,
      [/^\$\{[^}]*\}/, 'var'],
      [/^\$[A-Za-z_][A-Za-z0-9_]*/, 'var'],
      [/^(?:^|(?<=\s))--?[A-Za-z][\w-]*/, 'flag'],
      keywordRule('shell'),
      // The first word of a line (after an optional prompt) is the command.
      [/^(?<=(?:^|\n)\s*(?:[$#]\s+)?)[A-Za-z_][\w.-]*/, 'fn'],
      NUMBER_RULE,
    ].filter(Boolean)),

  python: (code) =>
    tokenize(code, [
      [/^#[^\n]*/, 'com'],
      [/^@[A-Za-z_][\w.]*/, 'dec'],
      ...STRING_RULES,
      keywordRule('python'),
      [/^\b[A-Za-z_]\w*(?=\()/, 'fn'],
      NUMBER_RULE,
    ]),

  powershell: (code) =>
    tokenize(code, [
      [/^#[^\n]*/, 'com'],
      ...STRING_RULES,
      [/^\$[A-Za-z_][\w:]*/, 'var'],
      [/^-[A-Za-z][\w-]*/, 'flag'],
      keywordRule('powershell'),
      [/^\b[A-Z][a-z]+-[A-Z]\w+/, 'fn'],
      NUMBER_RULE,
    ]),

  yaml: (code) =>
    tokenize(code, [
      [/^#[^\n]*/, 'com'],
      ...STRING_RULES,
      [/^(?<=(?:^|\n)\s*(?:-\s+)?)[A-Za-z_][\w.-]*(?=\s*:)/, 'key'],
      [/^\$\{[^}]*\}/, 'var'],
      [/^\b(?:true|false|null|yes|no)\b/, 'kw'],
      NUMBER_RULE,
    ]),

  json: (code) =>
    tokenize(code, [
      [/^"(?:\\.|[^"\\])*"(?=\s*:)/, 'key'],
      [/^"(?:\\.|[^"\\])*"/, 'str'],
      [/^\b(?:true|false|null)\b/, 'kw'],
      NUMBER_RULE,
    ]),

  ini: (code) =>
    tokenize(code, [
      [/^[#;][^\n]*/, 'com'],
      [/^\[[^\]\n]*\]/, 'dec'],
      ...STRING_RULES,
      [/^(?<=(?:^|\n)\s*)[A-Za-z_][\w.-]*(?=\s*=)/, 'key'],
      NUMBER_RULE,
    ]),

  text: (code) => escapeHtml(code),
};

export function highlight(code, lang) {
  const normalized = normalizeLang(lang);
  const fn = HIGHLIGHTERS[normalized] || HIGHLIGHTERS.text;
  try {
    return fn(code);
  } catch {
    // Highlighting is cosmetic — never let it break a build.
    return escapeHtml(code);
  }
}

export { escapeHtml };
