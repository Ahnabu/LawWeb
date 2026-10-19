"use client";

import type { CSSProperties } from "react";
import { Toaster } from "sonner";
import { useTheme } from "./ThemeProvider";

// Neutral toasts sit on the same paper as cards (success/error keep rich colours)
const paperToast = {
  "--normal-bg": "var(--clr-surface-raised)",
  "--normal-border": "var(--clr-outline-variant)",
  "--normal-text": "var(--clr-on-surface)",
  "--border-radius": "10px",
} as CSSProperties;

export function SonnerToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      style={paperToast}
      toastOptions={{ duration: 4000, style: { boxShadow: "var(--elev-raised)" } }}
    />
  );
}
