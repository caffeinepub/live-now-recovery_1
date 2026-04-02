# Live Now Recovery — Unified Home + Dashboard Merge

## Current State
- `/` renders `HomePage.tsx` — hero section, search bar, map, provider list, mission blurb, cities
- `/dashboard` renders `DashboardPage.tsx` — Live Toggle, provider status table, Live Now panel, quick filters, admin drawer, EnhancedRecoveryMap
- Both pages have their own `EnhancedRecoveryMap` instance — duplicated logic
- `Header.tsx` has a `Dashboard` link in navLinks and a `Dashboard` dropdown item under My Account
- No role-based rendering on the home page — all users see the same content

## Requested Changes (Diff)

### Add
- Role-based rendering blocks in `HomePage.tsx`:
  - When NOT authenticated: show search, map, public provider list, basic providerType filter chips
  - When authenticated as provider (not admin): show Live Toggle for their provider, "Your Status" card, advanced filter chips, "Live Right Now" side panel
  - When authenticated as admin: show all of the above plus the collapsible Admin Canister State/Risk Scores drawer
- A redirect: `/dashboard` → `/` in `App.tsx`

### Modify
- `HomePage.tsx` — merge all dashboard panel content into the home page with conditional rendering based on auth state (`useInternetIdentity`, `useIsAdmin`)
- `App.tsx` — replace `dashboardRoute` with a redirect component that navigates to `/`
- `Header.tsx`:
  - Remove `{ to: "/dashboard", label: "Dashboard" }` from `navLinks`
  - In the `My Account` dropdown, replace the `Dashboard` item with nothing (drop it); keep `Admin Panel` and `Sign Out`
  - In mobile menu, remove the Dashboard link

### Remove
- `DashboardPage.tsx` — its logic is fully absorbed into `HomePage.tsx`; the file can stay but be unused, or be deleted from the route tree

## Implementation Plan
1. Update `HomePage.tsx`:
   - Import `useIsAdmin`, `useInternetIdentity`, `useToggleLive`, `useCanisterState` hooks
   - Keep existing hero section and search bar for everyone
   - Keep existing map for everyone
   - Below map / in side panel: render role-based sections:
     - Public: basic provider list + basic providerType filter chips
     - Authenticated provider: add "Your Status" toggle card + "Live Right Now" panel + advanced filters + full provider status table
     - Authenticated admin: additionally render collapsible Admin Canister State drawer
   - Absorb `handleToggle` logic from DashboardPage
   - Keep `StatCard` helper inline or as local component
   - The live count badge / High-Risk Alert from DashboardPage should appear for authenticated users
2. Update `App.tsx`:
   - Replace `DashboardPage` import and `dashboardRoute` component with a `Navigate` redirect to `/`
3. Update `Header.tsx`:
   - Remove `Dashboard` from `navLinks` array
   - Remove `Dashboard` DropdownMenuItem from My Account menu
   - Remove Dashboard link from mobile menu
