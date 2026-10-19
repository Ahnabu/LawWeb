import sanitizeHtml from 'sanitize-html';

/*
  Rich-text fields (lawyer bio, case description, client-visible case notes)
  are stored as a small HTML subset produced by the dashboard editor. Every
  write goes through normalizeRichText so only allowlisted markup is stored.
  Legacy/plain-text input (old clients, API calls) is converted to escaped
  paragraphs so the stored value is always HTML.
*/

// Visible-character limits (markup not counted). Mirrored in frontend/lib/richText.ts.
export const RICH_TEXT_LIMITS = {
  bio: 5000,
  caseDescription: 5000,
  caseNotes: 5000,
} as const;

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h3', 'h4', 'a', 'blockquote'],
  allowedAttributes: { a: ['href', 'target', 'rel'] },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesByTag: {},
  allowedSchemesAppliedToAttributes: ['href'],
  allowProtocolRelative: false,
  disallowedTagsMode: 'discard',
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript', 'iframe', 'template', 'title'],
  transformTags: {
    // Normalise link attributes: external links always open safely in a new tab
    a: (tagName, attribs): sanitizeHtml.Tag => {
      const href = attribs.href;
      if (!href) return { tagName, attribs: {} };
      return /^https?:/i.test(href)
        ? { tagName, attribs: { href, target: '_blank', rel: 'noopener noreferrer nofollow' } }
        : { tagName, attribs: { href } };
    },
  },
};

const HTML_HINT_RE = /<\/?(p|br|strong|b|em|i|u|ul|ol|li|h[1-6]|a|blockquote|div|span)\b[^>]*>/i;

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const plainTextToHtml = (text: string) =>
  text
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p>${para.split('\n').map(escapeHtml).join('<br>')}</p>`)
    .join('');

const ENTITY_MAP: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'" };

/** Visible text of a stored rich-text value (for length checks, excerpts, emails). */
export const richTextToPlain = (html: string): string =>
  sanitizeHtml(html.replace(/<br\s*\/?>/gi, ' '), { allowedTags: [], allowedAttributes: {} })
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (match, body: string) => {
      if (body[0] === '#') {
        const code = body[1].toLowerCase() === 'x' ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
      }
      return ENTITY_MAP[body.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, ' ')
    .trim();

type NormalizeResult = { ok: true; value: string } | { ok: false; message: string };

/**
 * Sanitizes a rich-text value for storage. Returns '' for empty content
 * (e.g. '<p></p>'). Rejects non-strings and content over `max` visible characters.
 */
export const normalizeRichText = (value: unknown, label: string, max: number): NormalizeResult => {
  if (value === null || value === undefined) return { ok: true, value: '' };
  if (typeof value !== 'string') return { ok: false, message: `${label} must be text` };
  // Cheap guard before parsing: markup can't plausibly need more than this
  if (value.length > max * 6 + 2000) return { ok: false, message: `${label} is too long` };

  const html = HTML_HINT_RE.test(value)
    ? sanitizeHtml(value, SANITIZE_OPTIONS).trim()
    : plainTextToHtml(value);
  const plain = richTextToPlain(html);
  if (!plain) return { ok: true, value: '' };
  if (plain.length > max) {
    return { ok: false, message: `${label} must be at most ${max.toLocaleString('en-US')} characters` };
  }
  return { ok: true, value: html };
};
