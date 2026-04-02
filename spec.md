# Live Now Recovery — UX Polish & Content Pass

## Current State
- ScrollToTop component exists in App.tsx but may not catch all routes
- Header has landscape fix (grid-cols-2) already
- BlogPage cards have basic `hover:border-primary/30` but no scale/lift
- BlogPostPage uses `text-navy` for h1 which is invisible on dark background
- 10 of 13 blog posts have empty content arrays in FULL_CONTENT
- No sitemap page or route exists
- index.css focus ring rules may be insufficient across all form types
- Loading/empty states vary in quality across pages

## Requested Changes (Diff)

### Add
- `SitemapPage.tsx` — new page at `/sitemap` listing all routes grouped by section
- `/sitemap` route in App.tsx
- Sitemap link in Header (desktop nav + mobile menu)
- Full written content for 10 empty blog posts

### Modify
- `index.css` — global focus-visible ring for inputs, selects, textareas, buttons
- `Header.tsx` — add Sitemap nav link
- `App.tsx` — add sitemap route
- `BlogPage.tsx` — larger/higher-contrast post titles, tighter layout, hover lift on cards
- `BlogPostPage.tsx` — fix h1 from text-navy to text-foreground, increase size, fill content
- `HomePage.tsx` — verify/add hover lift on cards, loading skeletons, empty states
- `EnhancedRecoveryMap.tsx` — verify map empty state messaging

### Remove
- Nothing removed

## Implementation Plan
1. Update index.css with global focus-visible ring
2. Fix BlogPostPage h1 color and prose styles
3. Fill in all 10 missing blog post content arrays with real, well-written content
4. Improve BlogPage card layout — larger title, hover lift (translate-y + shadow)
5. Verify/add loading skeleton and empty state on HomePage provider list
6. Verify EnhancedRecoveryMap empty state
7. Create SitemapPage.tsx with all routes grouped
8. Add /sitemap route to App.tsx
9. Add Sitemap link to Header desktop nav and mobile menu
