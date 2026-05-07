# UI Refinement Runbook

## Goal

Fix design inconsistencies, improve responsive behavior, and polish UI elements for better user experience.

## When to Use

- Design inconsistencies reported (colors, spacing, fonts)
- UI doesn't look good on mobile/tablet
- Component styling doesn't match design system
- Accessibility issues found
- Performance issues on certain pages

## Step-by-Step Process

### 1. Identify the Problem (5 min)

**Action**: Take screenshots at multiple breakpoints

- Mobile (320px - Chrome DevTools)
- Tablet (768px)
- Desktop (1280px)
- Note the specific issue

**Questions to ask**:

- Is this a color inconsistency?
- Is the spacing inconsistent?
- Does it break the responsive design?
- Is it an accessibility issue?
- Does it only appear on certain devices?

**Example**:

```
Issue: "Register page has a white bar at the top that looks out of place"
Cause: Body background color visible behind navbar
Solution: Fixed background layer behind navbar
```

### 2. Analyze the Root Cause (10 min)

**Action**: Inspect the code

```bash
# Look at the affected component/page
code frontend/app/[page]/page.tsx

# Check globals.css for tokens
code frontend/app/globals.css

# Check component file for hard-coded styles
grep -r "bg-\|text-\|px-\|py-" frontend/components/[Component].tsx
```

**Checklist**:

- [ ] Any hard-coded colors (e.g., `bg-blue-600`)?
- [ ] Any random spacing values (e.g., `mb-7`)?
- [ ] Responsive classes used correctly (e.g., `sm:`, `lg:`)?
- [ ] Colors use design tokens?
- [ ] Spacing follows scale?

### 3. Fix the Issue (15 min)

**Action**: Update the code

**For Color Issues**:

```tsx
// ❌ Before: Hard-coded color
<button className="bg-blue-600">Button</button>

// ✅ After: Use design token
<button className="bg-primary">Button</button>
```

**For Spacing Issues**:

```tsx
// ❌ Before: Random value
<div className="mb-7 px-5">Content</div>

// ✅ After: Use spacing scale
<div className="mb-6 px-4 sm:px-6 lg:px-8">Content</div>
```

**For Responsive Issues**:

```tsx
// ❌ Before: Not responsive
<div className="text-2xl">Heading</div>

// ✅ After: Responsive sizing
<div className="text-xl sm:text-2xl lg:text-3xl">Heading</div>
```

### 4. Test the Fix (10 min)

**Action**: Verify changes across all breakpoints

```bash
# 1. Take screenshots at multiple sizes
# Chrome DevTools: Toggle device toolbar (Ctrl+Shift+M)
# Test at: 320px, 640px, 1024px, 1280px

# 2. Check for visual regressions
# Look for:
# - Overflow or horizontal scroll
# - Text cutoff
# - Misaligned elements
# - Color inconsistencies
# - Touch target sizes (44px minimum)

# 3. Test keyboard navigation
# Tab through all interactive elements
# Verify focus states visible
# Verify Enter/Space work on buttons
```

### 5. Verify No Regressions (5 min)

**Action**: Check surrounding pages/components

```bash
# 1. Navigate to related pages
# Check if similar components look consistent

# 2. Visual inspection checklist
# [ ] Same color scheme throughout
# [ ] Spacing consistent with other pages
# [ ] Typography consistent
# [ ] Interactive elements work same way

# 3. Run linting
npm run lint
```

### 6. Document and Commit (5 min)

**Action**: Create clear commit message

```bash
git add frontend/app/[page]/page.tsx
git commit -m "fix: improve register page UI consistency

- Removed hard-coded spacing (mb-7 -> mb-6)
- Fixed white bar at top by adding fixed bg layer
- Improved responsive padding (px-4 -> px-4 sm:px-6 lg:px-10)
- Verified mobile, tablet, and desktop layouts"
```

## Common Issues & Solutions

### Issue: White/wrong color bar at top

**Root Cause**: Body background visible behind fixed navbar
**Solution**:

```tsx
<div className="fixed inset-0 -z-10 bg-[color]" />
```

### Issue: Text too large on mobile

**Root Cause**: Heading using clamp() with large max size
**Solution**: Replace `<h1>` with `<p>` styled with Tailwind

```tsx
// Instead of: <h1 className="text-lg">
// Use:
<p className="font-display text-xl font-bold">
```

### Issue: Spacing inconsistent between pages

**Root Cause**: Using arbitrary spacing values
**Solution**: Use Tailwind spacing scale

```
Spacing scale: px-4, px-6, px-8 (NOT px-5, px-7)
```

### Issue: Not responsive on mobile

**Root Cause**: Missing responsive prefixes
**Solution**: Add breakpoint prefixes

```tsx
className = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";
```

### Issue: Form labels hard to read

**Root Cause**: Insufficient contrast or font size
**Solution**: Increase contrast and size

```tsx
<label className="text-sm font-medium text-on-surface-variant">
  Label Text
</label>
```

## Accessibility Checks

### Color Contrast

- Use: https://webaim.org/resources/contrastchecker/
- Minimum: 4.5:1 for normal text, 3:1 for large text
- Test: All text on background colors

### Keyboard Navigation

- Tab through entire page
- Verify focus visible
- Verify logical tab order
- Verify buttons work with Enter/Space

### Screen Reader

- Test with NVDA (Windows) or VoiceOver (Mac)
- Verify semantic HTML used
- Verify ARIA labels where needed

## Performance Checks

### Mobile Performance

- Open DevTools → Lighthouse
- Run Performance audit
- Check: Largest Contentful Paint (LCP)
- Target: < 2.5 seconds

### Bundle Size

- Check for unused classes
- Remove dead CSS
- Optimize images

## Checklist Before Committing

- [ ] Visual changes tested at 320px, 640px, 1024px, 1280px
- [ ] No hard-coded colors (use design tokens)
- [ ] Spacing uses scale values only
- [ ] Keyboard navigation works
- [ ] Color contrast meets WCAG AA (> 4.5:1)
- [ ] No console errors or warnings
- [ ] ESLint passes
- [ ] Similar components look consistent
- [ ] Commit message explains the fix
