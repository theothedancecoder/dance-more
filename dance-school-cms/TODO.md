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

## New Scope: Subscription Recovery Fix (Purchased passes not showing)

- [ ] Update `src/app/api/user/sync-subscriptions/route.ts`
  - [ ] Recover both `pass_purchase` and `pass_upgrade` checkout sessions when webhook processing is missed
  - [ ] Make user/tenant session matching more robust against metadata variations
  - [ ] Add clearer diagnostics for skipped sessions (missing metadata/pass/type mismatch)
  - [ ] Preserve idempotency by checking existing subscriptions with session/payment IDs before create

- [ ] Validate this scope
  - [ ] Run lint/type checks for touched API route
