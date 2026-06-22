# Mobile UI Improvement TODO

- [x] Update `src/components/Navigation.tsx`
  - [x] Add body scroll lock when mobile menu is open
  - [x] Improve mobile brand row responsiveness
  - [x] Improve mobile menu tap targets and spacing

- [x] Update `src/app/[slug]/page.tsx`
  - [x] Apply mobile spacing, typography, and CTA improvements

- [x] Update `src/app/[slug]/classes/page.tsx`
  - [x] Improve filter and card mobile layout
  - [x] Prevent overflow/squeezing on small screens

- [x] Update `src/app/subscriptions/page.tsx`
  - [x] Improve pass card layout and mobile actions
  - [x] Improve stacked mobile layout/readability

- [x] Update `src/app/admin/passes/page.tsx`
  - [x] Improve mobile form and action button usability

- [x] Validate and deploy (partial)
  - [x] Commit and push to `main` to trigger Vercel

## New Scope: Calendar + Admin Schedule Mobile Improvements

- [ ] Update `src/app/[slug]/calendar/page.tsx`
  - [ ] Tighten mobile spacing in hero/content sections
  - [ ] Improve view-switch button layout/tap targets
  - [ ] Improve daily card metadata wrapping and action grouping
  - [ ] Improve confirmation modal spacing and small-screen button layout

- [ ] Update `src/app/[slug]/admin/schedule/page.tsx`
  - [ ] Improve header/action bar stacking on mobile
  - [ ] Convert class rows to mobile-friendly stacked cards
  - [ ] Improve long metadata readability/wrapping
  - [ ] Stack row action buttons on mobile
  - [ ] Improve inactive section and quick actions spacing

- [ ] Validate this scope
  - [ ] Run lint checks
  - [ ] Runtime mobile verification where env permits
  - [ ] Commit and push to `main`
