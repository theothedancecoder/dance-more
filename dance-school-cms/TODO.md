# Pass Grouping on Purchase Screen (Current Task)

## Goal
Allow grouping passes on the purchase screen under group names like "Salsa", "Kizomba", etc.

## Implementation Plan
- [ ] Update pass update API
  - [ ] Add optional `category` field handling in `src/app/api/admin/passes/[id]/route.ts` PUT payload
  - [ ] Persist `category` in Sanity patch updates
- [ ] Update subscriptions page data model + grouping
  - [ ] Add optional `category` field to `PassData` in `src/app/[slug]/subscriptions/page.tsx`
  - [ ] Add grouping helper for passes by category with fallback group ("Other Passes")
  - [ ] Render purchase cards by grouped sections instead of a flat list
- [ ] Keep purchase/checkout logic unchanged
  - [ ] Ensure existing `handlePurchase` flow remains exactly as-is
- [ ] Validate behavior
  - [ ] Confirm grouped rendering still supports Sign In / Purchase actions

## Progress
- [x] Plan approved
- [x] Read relevant files (`subscriptions/page.tsx`, `api/admin/passes/[id]/route.ts`)
- [x] Apply API and UI grouping changes
- [x] Verify and summarize
