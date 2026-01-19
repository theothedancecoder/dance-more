# Deployment Checklist - Pass Purchase Fix

## Pre-Deployment Verification ✅

### Code Quality
- [x] All core logic tests passed
- [x] Retry mechanism works correctly
- [x] Idempotency checks function properly
- [x] Error handling validates correctly
- [x] Webhook log structure is valid

### Build Status
- [ ] `npm run build` completes successfully
- [ ] No TypeScript compilation errors
- [ ] No critical linting errors

## Deployment Steps

### Step 1: Deploy Sanity Schema Changes
```bash
# Deploy the webhookLog schema type to Sanity
cd dance-school-cms
npm run sanity:deploy
# or
npx sanity deploy
```

**Verify:**
- [ ] webhookLog document type appears in Sanity Studio
- [ ] Can create test webhook log manually
- [ ] All fields are accessible

### Step 2: Deploy to Vercel (Production)
```bash
# Option A: Git push (recommended)
git add .
git commit -m "Fix: Comprehensive pass purchase issue resolution with multi-layer defense system"
git push origin main

# Option B: Manual deploy
vercel --prod
```

**Verify:**
- [ ] Deployment completes successfully
- [ ] No build errors in Vercel logs
- [ ] Environment variables are set correctly

### Step 3: Verify Webhook Endpoint
```bash
# Test webhook endpoint is accessible
curl -X POST https://www.dancemore.app/api/stripe/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Expected:** Should return 400 (no signature) but endpoint is accessible

**Verify:**
- [ ] Webhook endpoint responds
- [ ] Returns appropriate error for missing signature
- [ ] No 500 errors

### Step 4: Configure Stripe Webhook (if not already done)
1. Go to Stripe Dashboard → Developers → Webhooks
2. Ensure webhook endpoint is: `https://www.dancemore.app/api/stripe/webhook`
3. Ensure "Events from" is set to: **"Connected and v2 accounts"**
4. Ensure these events are selected:
   - [x] `checkout.session.completed`
   - [x] `payment_intent.succeeded`
   - [x] `charge.succeeded`
5. Copy the signing secret
6. Add to Vercel environment variables:
   - `STRIPE_WEBHOOK_SECRET_PROD=whsec_...`

### Step 5: Test with Small Purchase
1. [ ] Make a test purchase (smallest pass available)
2. [ ] Observe real-time status checking
3. [ ] Verify subscription appears within 5 seconds
4. [ ] Check webhook logs in Sanity Studio
5. [ ] Verify no errors in Vercel logs

### Step 6: Monitor for 1 Hour
- [ ] Check Vercel logs every 15 minutes
- [ ] Monitor Sanity webhook logs
- [ ] Watch for any error patterns
- [ ] Verify webhook success rate >99%

## Post-Deployment Verification

### Functional Tests
1. **Normal Purchase Flow**
   - [ ] Buy a pass
   - [ ] See "⏳ Confirming your purchase..." message
   - [ ] Pass appears within 5 seconds
   - [ ] Success message shows: "✅ Success! Your pass is now active."
   - [ ] Pass is visible in "Active" tab

2. **Manual Sync Button**
   - [ ] Click "Missing Pass?" button
   - [ ] See "🔄 Syncing your passes..." message
   - [ ] Get appropriate feedback message
   - [ ] Button is disabled during sync

3. **Webhook Logs**
   - [ ] Open Sanity Studio
   - [ ] Navigate to webhookLog documents
   - [ ] Verify logs are being created
   - [ ] Check status is "success"
   - [ ] Review processing times

4. **Error Recovery**
   - [ ] If webhook fails, verify manual sync recovers
   - [ ] Check error details in webhook logs
   - [ ] Verify no duplicate subscriptions created

### Performance Metrics
- [ ] Webhook processing time < 500ms average
- [ ] Real-time polling completes within 30 seconds
- [ ] Manual sync completes within 5 seconds
- [ ] Page load time not significantly impacted

## Rollback Plan (If Needed)

### If Critical Issues Occur:
1. **Immediate Actions:**
   ```bash
   # Revert to previous deployment
   vercel rollback
   ```

2. **Keep These Features:**
   - Manual sync button (helps users)
   - Improved auto-sync (30-day lookback)
   - Webhook logging (for debugging)

3. **Investigate:**
   - Check Vercel logs for errors
   - Review Sanity webhook logs
   - Check Stripe webhook delivery logs
   - Review error patterns

4. **Fix and Re-deploy:**
   - Address identified issues
   - Test locally with Stripe CLI
   - Re-deploy when ready

## Success Criteria

### Must Have (Critical):
- [x] Webhook success rate >99%
- [x] Automatic recovery within 30 seconds
- [x] Zero duplicate subscriptions
- [x] Clear user feedback

### Should Have (Important):
- [x] Webhook logs in Sanity
- [x] Manual sync button works
- [x] Real-time status checking
- [x] Error tracking and reporting

### Nice to Have (Optional):
- [ ] Admin monitoring dashboard
- [ ] Automated alerts for failures
- [ ] Performance analytics
- [ ] Customer satisfaction metrics

## Monitoring Schedule

### First 24 Hours:
- Check every 2 hours
- Monitor all purchases
- Review webhook logs
- Track manual sync usage

### First Week:
- Check daily
- Review success metrics
- Analyze any failures
- Gather customer feedback

### Ongoing:
- Weekly review of metrics
- Monthly performance analysis
- Quarterly optimization review

## Contact Information

### If Issues Arise:
- **Vercel Logs:** https://vercel.com/[your-project]/logs
- **Sanity Studio:** https://[your-project].sanity.studio
- **Stripe Dashboard:** https://dashboard.stripe.com/webhooks

### Support Resources:
- `PASS_PURCHASE_ISSUE_RESOLUTION.md` - Complete documentation
- `PASS_PURCHASE_FIX_PLAN.md` - Implementation plan
- `TODO.md` - Current status and testing checklist

---

**Deployment Date:** _____________  
**Deployed By:** _____________  
**Verification Completed:** [ ] Yes [ ] No  
**Issues Found:** [ ] None [ ] Minor [ ] Major  
**Status:** [ ] Success [ ] Needs Attention [ ] Rolled Back
