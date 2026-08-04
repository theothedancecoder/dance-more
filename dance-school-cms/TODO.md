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

## New Scope: Calendar Instance Generation Fix

- [x] Update `src/app/api/admin/generate-instances/route.ts`
  - [x] Remove class-level skip based on any existing future instances
  - [x] Generate candidate dates from recurring schedules and dedupe by datetime
  - [x] Check/create per instance datetime so missing dates get created
  - [x] Keep safe duplicate handling and accurate created counts/messages

- [ ] Validate this scope
  - [ ] Run lint/type checks for touched API route
