/*
  Renders a stored rich-text value (HTML from <RichTextEditor>, or legacy plain
  text with newlines) safely with the site's typography. No hooks or browser
  APIs, so it works in server and client components alike.
*/

import { RICH_TEXT_BODY, RICH_TEXT_PROSE_CLASS, isRichTextEmpty, toSafeRichHtml } from "../lib/richText";

type RichTextProps = {
  value: string | null | undefined;
  className?: string;
  /** Shown when the value has no content; nothing is rendered by default. */
  fallback?: React.ReactNode;
  as?: "div" | "section" | "article";
  lang?: string;
  /** Type scale: "sm" (14px, dashboards) or "base" (16px, public reading). */
  size?: "sm" | "base";
  /** Body text colour: "muted" (on-surface-variant) or "strong" (on-surface). */
  tone?: keyof typeof RICH_TEXT_BODY;
};

export function RichText({
  value,
  className,
  fallback = null,
  as: Tag = "div",
  lang,
  size = "sm",
  tone = "muted",
}: RichTextProps) {
  const html = toSafeRichHtml(value);
  if (!html || isRichTextEmpty(html)) return <>{fallback}</>;
  const classes = [RICH_TEXT_PROSE_CLASS, size === "base" ? "prose-base" : "prose-sm", RICH_TEXT_BODY[tone], className]
    .filter(Boolean)
    .join(" ");
  return <Tag lang={lang} className={classes} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default RichText;
