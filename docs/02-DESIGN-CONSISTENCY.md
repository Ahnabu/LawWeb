# Design Consistency Guide

## Quick Reference

### Colors (Use These Only - No Hard-Coded Colors)

```
Primary:      #0a1628  → bg-primary, text-primary
Secondary:    #c9a84c  → bg-secondary, text-secondary
On-Primary:   #ffffff  → text-on-primary
On-Surface:   #1b1b1d  → text-on-surface (main text)
On-Variant:   #5a5f6d  → text-on-surface-variant (secondary text)
Surface:      #ffffff  → bg-surface (light mode)
Error:        #ba1a1a  → text-error (validation errors)
```

### Spacing Scale (Use Only These Values)

```
4px   → px-1, py-1, gap-1, mb-1, mt-1
8px   → px-2, py-2, gap-2, mb-2, mt-2
12px  → px-3, py-3, gap-3, mb-3, mt-3
16px  → px-4, py-4, gap-4, mb-4, mt-4
24px  → px-6, py-6, gap-6, mb-6, mt-6
32px  → px-8, py-8, gap-8, mb-8, mt-8
```

**Don't use**: px-5, py-7, mb-11, gap-9 (random values)

### Fonts

- **Headings**: `font-display` (Playfair Display)
- **Body**: `font-body` (Inter)
- **Bengali**: `font-bengali` (Hind Siliguri)

### Responsive Breakpoints

```
Mobile:   < 640px     (default)
Tablet:   640px+      (sm:)
Desktop:  1024px+     (lg:)
```

---

## Component Patterns

### Button

```tsx
// Primary
<button className="bg-primary text-on-primary px-4 py-2.5 rounded-lg font-semibold hover:opacity-95">
  Click Me
</button>

// Secondary
<button className="border border-outline text-on-surface px-4 py-2.5 rounded-lg hover:bg-surface-container">
  Cancel
</button>
```

### Form Input

```tsx
<label className="block text-sm font-medium text-on-surface-variant">
  Label
  <input
    type="text"
    className="mt-2 w-full rounded-lg border border-outline bg-surface px-3 py-2.5 text-on-surface focus:border-primary focus:ring-1 focus:ring-primary"
  />
</label>
```

### Card

```tsx
<div className="rounded-lg border border-outline-variant bg-surface-container p-4 sm:p-6">
  <h3 className="font-display text-lg font-bold text-on-surface">Title</h3>
  <p className="mt-2 text-sm text-on-surface-variant">Content</p>
</div>
```

### Responsive Grid

```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{/* Items */}</div>
```

---

## Rules

### ✅ DO

- Use design tokens: `bg-primary`, `text-on-surface`
- Use spacing scale: `p-4`, `gap-6`, `mb-8`
- Make components reusable (props-driven)
- Use `sm:`, `lg:` for responsive
- Add TypeScript types
- Test on mobile (320px)

### ❌ DON'T

- Hard-code colors: `bg-blue-600`, `text-white`
- Use random spacing: `mb-7`, `px-5`, `gap-9`
- Create page-only components (not reusable)
- Forget responsive prefixes
- Use implicit `any` in TypeScript
- Skip testing on mobile

---

## Testing Checklist

**Before committing:**

- [ ] Colors use design tokens only
- [ ] Spacing uses scale values only
- [ ] Responsive design works (320px, 640px, 1024px)
- [ ] No hard-coded colors
- [ ] No console errors
- [ ] ESLint passes (`npm run lint`)
- [ ] Mobile touch targets 44px+
- [ ] Text readable on mobile
