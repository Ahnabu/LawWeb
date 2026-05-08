"use client";

import { Toaster } from "sonner";
import { useTheme } from "./ThemeProvider";

export function SonnerToaster() {
  const { theme } = useTheme();
  return (
    <Toaster
      theme={theme}
      position="top-right"
      richColors
      closeButton
      toastOptions={{ duration: 4000 }}
    />
  );
}
