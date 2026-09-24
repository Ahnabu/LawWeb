"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  buildStringOverrides,
  type PublishedContent,
  type StringOverrides,
} from "../lib/content";

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

// Receives the published CMS content fetched by the root layout (server side)
export function ContentProvider({
  content,
  children,
}: {
  content: PublishedContent;
  children: ReactNode;
}) {
  const value = useMemo(
    () => ({ content, stringOverrides: buildStringOverrides(content) }),
    [content],
  );

  return (
    <ContentContext.Provider value={value}>{children}</ContentContext.Provider>
  );
}
