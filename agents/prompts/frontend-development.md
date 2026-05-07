# Frontend Development Prompt

## Quick Context

- **Tech**: Next.js, TypeScript, Tailwind CSS
- **Design**: Material Design 3 tokens (see docs/02-DESIGN-CONSISTENCY.md)
- **Languages**: English & Bengali (i18n context)
- **Goal**: Build responsive, accessible pages using design tokens

## Rules (Never Compromise)

1. **No hard-coded colors** — use only: `bg-primary`, `text-on-surface`, `text-secondary`, etc.
2. **Use spacing scale** — only: `px-4`, `py-6`, `gap-8`, `mb-4` (4px, 8px, 12px, 16px, 24px, 32px)
3. **Responsive always** — test at 320px, 640px, 1024px
4. **TypeScript** — all types defined, no `any`
5. **Accessibility** — keyboard navigation, ARIA labels, 44px touch targets

## When Building Pages

### Checklist

- [ ] All form labels have proper `<label>` tags
- [ ] Error messages display clearly
- [ ] Colors use design tokens only
- [ ] Spacing uses scale only (no random px values)
- [ ] Mobile responsive (test with DevTools)
- [ ] Keyboard accessible (Tab through all controls)
- [ ] No console errors
- [ ] TypeScript types defined
- [ ] Forms handle loading/error states

## Page Pattern

```tsx
"use client";

import { useEffect, useState } from "react";

interface PageProps {
  params: { id: string };
}

export default function Page({ params }: PageProps) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        setIsLoading(true);
        // API call
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div className="text-error">{error}</div>;

  return <main className="space-y-6">{/* Content */}</main>;
}
```

## Components You Can Reference

- `frontend/components/Navbar.tsx` — responsive navigation
- `frontend/components/Footer.tsx` — footer layout
- `frontend/app/register/page.tsx` — form pattern
- `frontend/components/AuthProvider.tsx` — auth context

## Files to Update

- `frontend/app/globals.css` — design tokens (don't edit)
- `frontend/lib/data.ts` — static content
- `frontend/lib/translations.ts` — i18n strings
