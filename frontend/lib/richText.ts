/*
  Rich-text helpers shared by the editor, the renderer and excerpt/SEO code.

  Stored values are HTML produced by <RichTextEditor>, but older records are
  plain text with newlines, so everything here accepts both. No DOM APIs are
  used, so these work in server components, client components and tests.

  The sanitizer is defence-in-depth (the backend sanitizes on write with
  sanitize-html). It rebuilds the markup from an allowlist instead of passing
  the original through, so anything it does not recognise is dropped or escaped.
*/

// Visible-character limits for rich-text fields (markup not counted). Keep in
// step with backend/src/utils/richText.ts, which enforces them.
export const BIO_MAX = 5000;
export const CASE_DESCRIPTION_MAX = 5000;
export const CASE_NOTES_MAX = 5000;

/**
 * Typography for rich text, shared by <RichText> and the editor surface so
 * what an author sees is what visitors get. The prose colour variables point at
 * the theme tokens, which already switch with the `.dark` class.
 */
export const RICH_TEXT_PROSE_CLASS = [
  'prose max-w-none break-words',
  '[--tw-prose-headings:var(--color-heading)]',
  '[--tw-prose-bold:var(--color-on-surface)]',
  '[--tw-prose-links:var(--color-gold-ink)]',
  '[--tw-prose-bullets:var(--color-secondary)]',
  '[--tw-prose-counters:var(--color-on-surface-variant)]',
  '[--tw-prose-quotes:var(--color-on-surface)]',
  '[--tw-prose-quote-borders:var(--color-secondary)]',
  'prose-p:my-2 prose-p:leading-7 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5',
  'prose-headings:font-display prose-headings:font-semibold prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-base prose-h4:mt-3 prose-h4:mb-1 prose-h4:text-sm',
  'prose-a:underline-offset-2 hover:prose-a:opacity-80',
  'prose-blockquote:font-normal prose-blockquote:not-italic',
  '[&>:first-child]:mt-0 [&>:last-child]:mb-0',
].join(' ');

/** Body text colour: pick exactly one (two arbitrary --tw-prose-body classes would conflict). */
export const RICH_TEXT_BODY = {
  muted: '[--tw-prose-body:var(--color-on-surface-variant)]',
  strong: '[--tw-prose-body:var(--color-on-surface)]',
} as const;

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h3', 'h4', 'a', 'blockquote',
]);
const VOID_TAGS = new Set(['br']);
// Tags whose content must go too, not only the tag itself
const DROP_WITH_CONTENT = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'textarea', 'title', 'svg', 'math', 'select',
]);
const BLOCK_TAGS = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'div', 'ul', 'ol', 'tr']);

const TAG_RE = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTR_RE = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const BLOCK_HINT_RE = /<(p|br|ul|ol|li|h[1-6]|blockquote|div)\b/i;
const HTML_HINT_RE = /<\/?(p|br|strong|b|em|i|u|ul|ol|li|h[1-6]|a|blockquote|div|span)\b[^>]*>/i;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'",
};

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, body: string) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return '';
      try {
        return String.fromCodePoint(code);
      } catch {
        return '';
      }
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? match;
  });
}

/** Escapes text while keeping entities that are already encoded. */
function escapeText(text: string): string {
  return text
    .replace(/&(?!(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);)/gi, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** True when the value looks like HTML markup rather than legacy plain text. */
export function isHtml(value: string | null | undefined): boolean {
  return Boolean(value) && HTML_HINT_RE.test(value as string);
}

function safeHref(raw: string): string | null {
  // Decode first so `jav&#x61;script:` cannot slip through, then strip control chars and spaces
  const href = decodeEntities(raw).replace(/[\u0000- \u007f-\u009f]/g, '');
  if (!href) return null;
  return /^(https?:|mailto:)/i.test(href) ? href : null;
}

/** Allowlist sanitizer for stored rich text. Unknown tags are dropped (their text kept). */
export function sanitizeRichHtml(html: string): string {
  let out = '';
  const stack: string[] = [];
  let last = 0;
  TAG_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = TAG_RE.exec(html)) !== null) {
    out += escapeText(html.slice(last, match.index));
    last = TAG_RE.lastIndex;

    const [full, slash, rawName = '', rawAttrs = ''] = match;
    if (full.startsWith('<!--')) continue;
    const name = rawName.toLowerCase();
    const closing = slash === '/';

    if (!closing && DROP_WITH_CONTENT.has(name)) {
      const closeRe = new RegExp(`</${name}\\s*>`, 'ig');
      closeRe.lastIndex = last;
      const end = closeRe.exec(html);
      last = end ? closeRe.lastIndex : html.length;
      TAG_RE.lastIndex = last;
      continue;
    }
    if (!ALLOWED_TAGS.has(name)) continue;

    if (closing) {
      const idx = stack.lastIndexOf(name);
      if (idx === -1) continue;
      while (stack.length > idx) out += `</${stack.pop()}>`;
      continue;
    }

    if (VOID_TAGS.has(name)) {
      out += `<${name}>`;
      continue;
    }

    if (name === 'a') {
      let href: string | null = null;
      ATTR_RE.lastIndex = 0;
      let attr: RegExpExecArray | null;
      while ((attr = ATTR_RE.exec(rawAttrs)) !== null) {
        if (attr[1].toLowerCase() === 'href') {
          href = safeHref(attr[2] ?? attr[3] ?? attr[4] ?? '');
          break;
        }
      }
      if (!href) continue; // keep the link text, drop the link
      const external = /^https?:/i.test(href);
      out += external
        ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer nofollow">`
        : `<a href="${escapeHtml(href)}">`;
      stack.push('a');
      continue;
    }

    // <li> and <p> cannot nest in themselves: close the open one first, as browsers do
    if ((name === 'li' || name === 'p') && stack[stack.length - 1] === name) out += `</${stack.pop()}>`;
    out += `<${name}>`;
    stack.push(name);
  }

  out += escapeText(html.slice(last));
  while (stack.length) out += `</${stack.pop()}>`;
  return out;
}

/** Legacy plain text → paragraphs (blank line) and line breaks (single newline), escaped. */
export function plainTextToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para.split('\n').map(escapeHtml).join('<br>')}</p>`)
    .join('');
}

/** Any stored value (HTML or legacy plain text) → safe HTML ready to render. */
export function toSafeRichHtml(value: string | null | undefined): string {
  if (!value) return '';
  if (!isHtml(value)) return plainTextToHtml(value);
  // Inline-only markup with newlines (e.g. legacy text that mentions <b>): keep the line breaks
  if (!BLOCK_HINT_RE.test(value) && value.includes('\n')) {
    const paragraphs = sanitizeRichHtml(value.replace(/\r\n?/g, '\n').trim())
      .split(/\n{2,}/)
      .map((para) => para.trim().replace(/\n/g, '<br>'));
    return sanitizeRichHtml(`<p>${paragraphs.join('</p><p>')}</p>`);
  }
  return sanitizeRichHtml(value);
}

/**
 * Any stored value → plain text for excerpts, cards, meta descriptions and
 * length checks. Pass maxLength to truncate on a word boundary with an ellipsis.
 */
export function richTextToPlain(value: string | null | undefined, maxLength?: number): string {
  if (!value) return '';
  let text = value;
  if (isHtml(value)) {
    text = value
      .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b(?:[^>"']|"[^"]*"|'[^']*')*>/g, (_m, tag: string) =>
        BLOCK_TAGS.has(tag.toLowerCase()) ? '\n' : '',
      )
      .replace(/<!--[\s\S]*?-->/g, '');
    text = decodeEntities(text);
  }
  text = text.replace(/[ \t ]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  if (maxLength === undefined) return text;

  const flat = text.replace(/\n+/g, ' ');
  if (flat.length <= maxLength) return flat;
  const cut = flat.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** True when the value has no visible text (e.g. '' or '<p></p>'). */
export function isRichTextEmpty(value: string | null | undefined): boolean {
  return richTextToPlain(value).length === 0;
}
