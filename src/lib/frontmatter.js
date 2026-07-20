/**
 * Minimal YAML frontmatter reader.
 *
 * Deliberately not a YAML parser — docs frontmatter here only ever holds
 * scalars, inline arrays (`[a, b]`) and dash lists, so a real dependency
 * would buy nothing.
 */

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

function coerce(value) {
  const v = value.trim();
  if (v === '') return '';
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null' || v === '~') return null;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (/^-?\d*\.\d+$/.test(v)) return Number(v);
  if (/^\[.*\]$/.test(v)) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((item) => coerce(item));
  }
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

export function parseFrontmatter(source) {
  const match = source.match(FENCE);
  if (!match) return { data: {}, body: source };

  const data = {};
  let currentKey = null;

  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;

    const listItem = line.match(/^\s*-\s+(.*)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(coerce(listItem[1]));
      continue;
    }

    const pair = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!pair) continue;

    const [, key, rawValue] = pair;
    currentKey = key;
    data[key] = rawValue.trim() === '' ? [] : coerce(rawValue);
  }

  return { data, body: source.slice(match[0].length) };
}
