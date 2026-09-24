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
import { siteConfig, telUrl, whatsappUrl } from "../lib/siteConfig";

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
    const settings = (content.site?.settings ?? {}) as SiteSettingsOverride;
    const phone = settings.phone || siteConfig.phone;
    const whatsappNumber = settings.whatsappNumber || siteConfig.whatsappNumber;

    return {
      phone,
      // A new phone without a display format shows as entered, not the old number
      phoneDisplay: settings.phoneDisplay || settings.phone || siteConfig.phoneDisplay,
      fax: settings.fax || siteConfig.fax,
      email: settings.email || siteConfig.email,
      whatsappNumber,
      socials: settings.socials ?? siteConfig.socials,
      whatsappHref: (message?: string) => whatsappUrl(message, whatsappNumber),
      telHref: () => telUrl(phone),
    };
  }, [content]);
}
