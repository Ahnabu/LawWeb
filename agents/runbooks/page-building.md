# Quick Page Building Guide

## When to Use

Building any new page (Home, About, Lawyers, Dashboard, etc.)

---

## Step 1: Plan (5 min)

- What content goes on page?
- What data from API?
- What user actions?

---

## Step 2: Build (30 min)

### Create file: `frontend/app/[page]/page.tsx`

```tsx
"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const response = await fetch("/api/[endpoint]");
        if (!response.ok) throw new Error("Failed to fetch");
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <h1 className="font-display text-3xl font-bold text-on-surface">
        Page Title
      </h1>

      {isLoading && <div>Loading...</div>}
      {error && <div className="text-error">{error}</div>}

      {data && <div>{/* Content here */}</div>}
    </main>
  );
}
```

---

## Step 3: Check Checklist

- [ ] Colors use design tokens (no `bg-blue-600`)
- [ ] Spacing uses scale (no `mb-7`)
- [ ] Responsive (test 320px, 640px, 1024px)
- [ ] Keyboard accessible
- [ ] No console errors
- [ ] TypeScript types defined
- [ ] ESLint passes (`npm run lint`)

---

## Step 4: Commit

```bash
git add frontend/app/[page]/
git commit -m "feat: add [page] page with [feature]"
```

---

## Components to Reuse

- `Navbar.tsx` — top navigation
- `Footer.tsx` — footer
- `AuthProvider.tsx` — auth context
- Existing pages — copy pattern

---

## Common Patterns

### List with cards

```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {items.map((item) => (
    <div
      key={item.id}
      className="rounded-lg border border-outline-variant bg-surface-container p-4"
    >
      <h3 className="font-semibold text-on-surface">{item.name}</h3>
      <p className="text-sm text-on-surface-variant">{item.description}</p>
    </div>
  ))}
</div>
```

### Button with WhatsApp link

```tsx
<a
  href={`https://wa.me/${phoneNumber}?text=${message}`}
  target="_blank"
  rel="noopener noreferrer"
  className="inline-block bg-secondary text-on-primary px-4 py-2.5 rounded-lg font-semibold hover:opacity-95"
>
  Chat on WhatsApp
</a>
```

### Form

```tsx
<form onSubmit={handleSubmit} className="space-y-4">
  <label className="block text-sm font-medium text-on-surface-variant">
    Email
    <input
      type="email"
      required
      className="mt-2 w-full rounded-lg border border-outline bg-surface px-3 py-2.5 focus:border-primary"
    />
  </label>
  <button
    type="submit"
    className="w-full bg-primary text-on-primary px-4 py-2.5 rounded-lg font-semibold"
  >
    Submit
  </button>
</form>
```
