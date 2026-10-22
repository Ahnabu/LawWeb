"use client";

import { useMemo } from "react";
import { useContent } from "./ContentProvider";
import { useLanguage } from "./LanguageProvider";
import {
  resolveDefaultItem,
  resolvePublishedItem,
  type ContentPageKey,
  type DefaultItem,
  type ResolvedItem,
  type SiteSettingsOverride,
} from "../lib/content";
import { resolveSiteSettings, telUrl, whatsappUrl } from "../lib/siteConfig";

// Published list for this page if one exists (it replaces the default as a
// whole, even when empty), otherwise the code default from lib/data.ts.
export function useContentList<T extends DefaultItem>(
  page: ContentPageKey,
  listKey: string,
  defaults: readonly T[],
): ResolvedItem<T>[] {
  const { content } = useContent();
  const { t, locale } = useLanguage();

  return useMemo(() => {
    const published = content[page]?.[listKey];
    const items = Array.isArray(published)
      ? published.map((item, index) => resolvePublishedItem(item, index, locale))
      : defaults.map((item, index) => resolveDefaultItem(item, index, t));
    return items as ResolvedItem<T>[];
  }, [content, page, listKey, defaults, t, locale]);
}

// Firm contact details: published "site" settings over lib/siteConfig.ts
export function useSiteSettings() {
  const { content } = useContent();

  return useMemo(() => {
    const settings = resolveSiteSettings(content.site?.settings as SiteSettingsOverride | undefined);

    return {
      ...settings,
      whatsappHref: (message?: string) => whatsappUrl(message, settings.whatsappNumber),
      telHref: () => telUrl(settings.phone),
    };
  }, [content]);
}
