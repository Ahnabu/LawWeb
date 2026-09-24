"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Eye, X } from "lucide-react";
import {
  buildStringOverrides,
  type PublishedContent,
  type StringOverrides,
} from "../lib/content";
import { getAdminContentPages } from "../lib/adminContent";
import { useAuth } from "./AuthProvider";

interface ContentContextValue {
  content: PublishedContent;
  stringOverrides: StringOverrides;
}

const ContentContext = createContext<ContentContextValue>({
  content: {},
  stringOverrides: {},
});

export function useContent() {
  return useContext(ContentContext);
}

// ── Draft preview ─────────────────────────────────────────────────────────────
// An admin opening any public page with ?preview=1 sees the saved drafts
// instead of the published content. The flag is kept for the browser tab so
// they can click around the site; "Exit preview" clears it. Drafts are
// fetched client-side from the admin API, so visitors never receive them.
const PREVIEW_KEY = "lawweb-content-preview";

function readPreviewFlag(): boolean {
  try {
    if (new URLSearchParams(window.location.search).get("preview") === "1") {
      window.sessionStorage.setItem(PREVIEW_KEY, "1");
      return true;
    }
    return window.sessionStorage.getItem(PREVIEW_KEY) === "1";
  } catch {
    return false;
  }
}

function clearPreviewFlag() {
  try {
    window.sessionStorage.removeItem(PREVIEW_KEY);
  } catch {}
  const url = new URL(window.location.href);
  if (url.searchParams.has("preview")) {
    url.searchParams.delete("preview");
    window.history.replaceState(window.history.state, "", url);
  }
}

// Receives the published CMS content fetched by the root layout (server side)
export function ContentProvider({
  content,
  children,
}: {
  content: PublishedContent;
  children: ReactNode;
}) {
  const { user, status } = useAuth();
  const [drafts, setDrafts] = useState<PublishedContent | null>(null);

  useEffect(() => {
    if (status === "loading" || !readPreviewFlag()) return;
    if (user?.role !== "admin") {
      clearPreviewFlag();
      return;
    }
    let cancelled = false;
    getAdminContentPages()
      .then((pages) => {
        if (!cancelled) setDrafts(Object.fromEntries(pages.map((page) => [page.key, page.draft ?? {}])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, status]);

  const exitPreview = () => {
    clearPreviewFlag();
    setDrafts(null);
  };

  const value = useMemo(() => {
    const active = drafts ?? content;
    return { content: active, stringOverrides: buildStringOverrides(active) };
  }, [content, drafts]);

  return (
    <ContentContext.Provider value={value}>
      {children}
      {drafts && (
        <div role="status"
          className="fixed bottom-4 left-1/2 z-100 flex -translate-x-1/2 items-center gap-3 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-on-primary shadow-lg">
          <Eye className="h-4 w-4 text-secondary" />
          <span>Previewing unpublished drafts</span>
          <button type="button" onClick={exitPreview}
            className="flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 hover:bg-white/20 transition">
            <X className="h-3 w-3" /> Exit preview
          </button>
        </div>
      )}
    </ContentContext.Provider>
  );
}
