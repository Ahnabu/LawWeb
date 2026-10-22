/*
  Lays out a plain-text CMS write-up (e.g. a practice area's details) the way
  the author typed it: an opening tagline, paragraphs, short heading lines and
  "1. Title / description" service lists. Line breaks in the stored text are
  the only structure there is, so this reads them instead of collapsing the
  whole value into one paragraph.
*/

type ListItem = { marker: string; title: string; body: string[] }
type Block =
  | { kind: 'lead'; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'list'; ordered: boolean; items: ListItem[] }

const NUMBERED = /^(\d{1,2})[.)]\s+(.+)$/
const BULLET = /^[-•*–]\s+(.+)$/
// A heading is a short line that doesn't end like a sentence
const isHeadingLine = (line: string) => line.length <= 70 && !/[.!?:;,।…]$/.test(line)

export function parseStructuredText(value: string): Block[] {
  const lines = value.replace(/\r\n?/g, '\n').split('\n').map((line) => line.trim())
  const blocks: Block[] = []
  let list: Extract<Block, { kind: 'list' }> | null = null

  for (const line of lines) {
    if (!line) continue

    const numbered = NUMBERED.exec(line)
    const bullet = numbered ? null : BULLET.exec(line)
    if (numbered || bullet) {
      const ordered = Boolean(numbered)
      if (!list || list.ordered !== ordered) {
        list = { kind: 'list', ordered, items: [] }
        blocks.push(list)
      }
      list.items.push(
        numbered
          ? { marker: numbered[1], title: numbered[2], body: [] }
          : { marker: '', title: bullet![1], body: [] },
      )
      continue
    }

    // Text under a numbered service describes it, until a heading starts a new section
    const lastItem = list?.items[list.items.length - 1]
    if (list?.ordered && lastItem && (lastItem.body.length === 0 || !isHeadingLine(line))) {
      lastItem.body.push(line)
      continue
    }
    list = null

    if (blocks.length === 0 && line.length <= 120) {
      blocks.push({ kind: 'lead', text: line })
    } else if (isHeadingLine(line)) {
      blocks.push({ kind: 'heading', text: line })
    } else {
      blocks.push({ kind: 'paragraph', text: line })
    }
  }

  // A lone short line is just the text, not a tagline
  if (blocks.length === 1 && blocks[0].kind === 'lead') {
    return [{ kind: 'paragraph', text: blocks[0].text }]
  }
  return blocks
}

/** Plain-text teaser of a write-up (its tagline and paragraphs) for cards; the card clamps the length */
export function structuredTextExcerpt(value: string, maxLength = 400): string {
  const blocks = parseStructuredText(value)
  const prose = blocks.flatMap((block) => (block.kind === 'lead' || block.kind === 'paragraph' ? [block.text] : []))
  // A write-up that is only a list reads as its service names
  const text = prose.length
    ? prose.join(' ')
    : blocks.flatMap((block) => (block.kind === 'list' ? block.items.map((item) => item.title) : [])).join(', ')
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text
}

export function StructuredText({ value, className = '' }: { value: string; className?: string }) {
  const blocks = parseStructuredText(value)
  if (blocks.length === 0) return null

  return (
    <div className={`space-y-4 ${className}`}>
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'lead':
            return (
              <p key={index} className="font-display text-lg font-semibold leading-snug text-heading">
                {block.text}
              </p>
            )
          case 'heading':
            return (
              <h3 key={index} className="flex items-center gap-3 pt-2 font-display text-base font-semibold text-heading">
                <span aria-hidden="true" className="h-px w-6 bg-secondary" />
                {block.text}
              </h3>
            )
          case 'paragraph':
            return (
              <p key={index} className="text-base leading-7 text-on-surface-variant">
                {block.text}
              </p>
            )
          case 'list':
            return block.ordered ? (
              <ol key={index} className="grid gap-x-10 gap-y-5 md:grid-cols-2">
                {block.items.map((item, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-secondary/60 text-xs font-semibold text-gold-ink"
                    >
                      {item.marker}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold leading-6 text-on-surface">{item.title}</p>
                      {item.body.map((text, j) => (
                        <p key={j} className="mt-1 text-sm leading-6 text-on-surface-variant">
                          {text}
                        </p>
                      ))}
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <ul key={index} className="list-disc space-y-1.5 pl-5 text-base leading-7 text-on-surface-variant marker:text-secondary">
                {block.items.map((item, i) => (
                  <li key={i}>{item.title}</li>
                ))}
              </ul>
            )
        }
      })}
    </div>
  )
}
