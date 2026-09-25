"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  availableLocales,
  defaultLocale,
  Locale,
} from "../lib/i18n";
import { usePathname, useRouter } from "next/navigation";
import { resolveString } from "../lib/content";
import { getRouteLocale, localizePath } from "../lib/locale";
import { useContent } from "./ContentProvider";

const STORAGE_KEY = "lawweb-lang";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
  /** A public path in the current language: `/about` → `/bn/about` in Bangla */
  localePath: (path: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  t: (key: string) => key,
  localePath: (path: string) => path,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // The URL decides the language on the public CMS pages (/about vs /bn/about),
  // so the server renders the right language. Other routes use the stored one.
  const pathname = usePathname();
  const router = useRouter();
  const routeLocale = getRouteLocale(pathname ?? "/");
  const [storedLocale, setStoredLocale] = useState<Locale>(defaultLocale);
  const locale = routeLocale ?? storedLocale;
  const { stringOverrides } = useContent();

  const storeLocale = useCallback((next: Locale) => {
    setStoredLocale(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage blocked: the language still follows the URL
    }
  }, []);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && availableLocales.includes(stored)) {
        setStoredLocale(stored);
        return;
      }

      const browserLocale = navigator.language.startsWith("bn") ? "bn" : "en";
      setStoredLocale(browserLocale);
    } catch {
      setStoredLocale(defaultLocale);
    }
  }, []);

  // Visiting /bn/... (or a plain public page) remembers that language for the
  // routes without a language in the URL
  useEffect(() => {
    if (routeLocale) storeLocale(routeLocale);
  }, [routeLocale, storeLocale]);

  // Sync lang attribute so :lang(bn) CSS selector works for letter-spacing fixes
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale: (next: Locale) => {
        storeLocale(next);
        if (routeLocale && next !== routeLocale) {
          const { search, hash } = window.location;
          router.push(localizePath(`${pathname ?? "/"}${search}${hash}`, next));
        }
      },
      t: (key: string) => resolveString(locale, key, stringOverrides),
      localePath: (path: string) => localizePath(path, locale),
    }),
    [locale, routeLocale, pathname, router, storeLocale, stringOverrides],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
