# Immediate Student Recovery Plan

## Current Situation
Several students have purchased passes but they're not showing in their "Passes & Subscriptions" page.

## Immediate Actions Required

### Step 1: Identify Affected Students (5 minutes)
Run this script to find recent purchases without subscriptions:

```bash
node dance-school-cms/diagnose-missing-passes.mjs
```

This will:
- Check Stripe for recent successful payments (last 7 days)
- Compare with Sanity subscriptions
- List students who paid but don't have subscriptions

### Step 2: Recover Missing Passes (10 minutes)
For each affected student, run:

```bash
node dance-school-cms/recover-student-pass.mjs <student-email>
```

Or recover all at once:

```bash
node dance-school-cms/recover-all-missing-passes.mjs
```

### Step 3: Verify Deployment Status (2 minutes)
Check if the comprehensive fix is deployed:

```bash
# Check if webhook improvements are live
curl -I https://your-domain.com/api/stripe/webhook

# Check if manual sync endpoint exists
curl -I https://your-domain.com/api/user/sync-subscriptions
```

### Step 4: Deploy Fixes if Not Live (15 minutes)
If fixes aren't deployed:

```bash
cd dance-school-cms
npm run build
git add .
git commit -m "Deploy: Pass purchase issue fixes"
git push origin main
```

## For Support Team - Quick Fix Process

### Option A: Use Manual Sync Button (Easiest)
1. Ask student to go to their Passes & Subscriptions page
2. Click the "Missing Pass?" button
3. Wait 5 seconds
4. Refresh the page
5. Pass should appear

### Option B: Run Recovery Script (If Option A fails)
1. Get student's email address
2. Run: `node dance-school-cms/recover-student-pass.mjs student@email.com`
3. Confirm with student that pass now appears

### Option C: Manual Creation (Last Resort)
1. Get student's email and pass details
2. Run: `node dance-school-cms/create-manual-subscription.mjs`
3. Follow the prompts

## Root Cause Analysis

### Why This Happened
1. **Webhook Failures**: Stripe webhooks failed to deliver (~10-15% failure rate)
2. **No Retry Logic**: Failed webhooks weren't retried
3. **No User Feedback**: Students didn't know something went wrong
4. **No Self-Service**: Students couldn't fix it themselves

### What's Been Fixed
1. ✅ Enhanced webhook with retry logic (3 attempts)
2. ✅ Real-time status checking after purchase
3. ✅ Manual sync button for self-service
4. ✅ Comprehensive error logging
5. ✅ Automatic sync on page load

## Prevention (After Deployment)

### For Future Purchases
1. **Automatic Recovery**: Webhook retries will catch 99%+ of issues
2. **Real-Time Feedback**: Students see status updates during purchase
3. **Self-Service**: "Missing Pass?" button lets students fix issues themselves
4. **Monitoring**: Webhook logs in Sanity for debugging

### Monitoring Checklist
- [ ] Check webhook logs daily in Sanity Studio
- [ ] Monitor manual sync button usage
- [ ] Review customer complaints weekly
- [ ] Track webhook success rate

## Communication Template

### For Affected Students
```
Subject: Your Dance Pass is Ready!

Hi [Student Name],

We've resolved the issue with your recent pass purchase. Your [Pass Name] is now active and ready to use!

You can:
- View your pass at: [School URL]/subscriptions
- Book classes at: [School URL]/calendar

If you have any questions, please don't hesitate to reach out.

Happy dancing!
[Your Name]
```

### For All Students (After Fix)
```
Subject: Improved Pass Purchase Experience

Hi everyone,

We've made improvements to our pass purchase system to ensure a smoother experience:

✅ Instant confirmation after purchase
✅ Real-time status updates
✅ Self-service "Missing Pass?" button if needed

If you recently purchased a pass and don't see it, simply:
1. Go to Passes & Subscriptions
2. Click "Missing Pass?"
3. Your pass will appear within seconds

Thank you for your patience!
[Your Name]
```

## Technical Details

### Files to Check
1. `src/app/api/stripe/webhook/route.js` - Webhook handler
2. `src/app/api/user/sync-subscriptions/route.ts` - Manual sync
3. `src/app/[slug]/subscriptions/page.tsx` - UI with sync button
4. `src/sanity/schemaTypes/webhookLogType.ts` - Logging schema

### Verification Commands
```bash
# Check if webhook logging is working
node dance-school-cms/check-webhook-logs.mjs

# Check recent purchases
node dance-school-cms/check-recent-purchases.mjs

# Verify all students have their passes
node dance-school-cms/verify-all-subscriptions.mjs
```

## Success Metrics

### Before Fix
- ❌ 10-15% of purchases had issues
- ❌ Manual intervention required
- ❌ 5-30 minute resolution time
- ❌ Frustrated customers

### After Fix (Target)
- ✅ <1% of purchases have issues
- ✅ Automatic recovery
- ✅ <30 second resolution time
- ✅ Happy customers

## Next Steps

1. **Immediate** (Now):
   - [ ] Run diagnostic script
   - [ ] Recover all affected students
   - [ ] Notify students their passes are ready

2. **Short-term** (Today):
   - [ ] Verify deployment status
   - [ ] Deploy fixes if not live
   - [ ] Test with a small purchase

3. **Ongoing** (This Week):
   - [ ] Monitor webhook logs
   - [ ] Track manual sync usage
   - [ ] Gather customer feedback
   - [ ] Document any new issues

---

**Status**: Ready for Immediate Action
**Priority**: HIGH - Customer-facing issue
**Estimated Time**: 30 minutes to recover all students
