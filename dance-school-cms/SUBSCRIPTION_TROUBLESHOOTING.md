# Subscription Troubleshooting Guide

This document helps diagnose and fix issues where customers' purchased passes or subscriptions don't appear in their "Active Passes" section.

## Quick Fix Summary

The main issues have been identified and fixed:

1. **User ID Mismatch**: Fixed inconsistent user ID handling between webhook and queries
2. **Missing Session Tracking**: Added `stripeSessionId` field for proper deduplication
3. **Improved Error Handling**: Enhanced logging and fallback mechanisms
4. **Better Sync Mechanism**: Improved the sync-subscriptions fallback

## How the System Works

### Normal Flow (When Everything Works)
1. Customer purchases a pass → Stripe checkout session created
2. Payment completes → Stripe webhook fires
3. Webhook creates subscription in Sanity
4. Customer visits subscriptions page → sees their active passes

### Fallback Flow (When Webhook Fails)
1. Customer visits subscriptions page
2. Sync mechanism checks for missing subscriptions
3. Creates any missing subscriptions from recent Stripe sessions
4. Customer sees their active passes

## Debugging Steps

### 1. Check Browser Console
When a customer reports missing passes, have them:
1. Go to the subscriptions page
2. Open browser developer tools (F12)
3. Check the Console tab for errors
4. Look for these log messages:
   - `✅ User authenticated with ID: [userId]`
   - `✅ Found tenant: [schoolName]`
   - `📊 Found active subscriptions: [number]`

### 2. Check Server Logs
Look for these patterns in your server logs:

#### Successful Webhook Processing
```
🔔 Stripe webhook received
✅ Webhook signature verified
💳 Checkout session completed
🎫 Processing pass purchase
✅ User found in Sanity
🎉 SUCCESS! Created subscription
```

#### Failed Webhook Processing
```
❌ CRITICAL ERROR: Failed to create subscription
🔒 SANITY PERMISSIONS ERROR DETECTED!
```

#### Successful Sync Recovery
```
🔄 Syncing subscriptions for user
💳 Found recent paid sessions for user: [number]
🎉 Created missing subscription
```

### 3. Common Issues and Solutions

#### Issue: "No active passes" but payment was successful

**Diagnosis:**
1. Check if webhook is receiving events: Look for `🔔 Stripe webhook received` in logs
2. Check if user exists in Sanity: Look for `✅ User found in Sanity` or `⚠️ User not found in Sanity`
3. Check for permission errors: Look for `🔒 SANITY PERMISSIONS ERROR`

**Solutions:**
1. **Webhook not firing**: Check Stripe webhook configuration
2. **User not in Sanity**: The sync mechanism will create the user
3. **Permission errors**: Update `SANITY_API_TOKEN` to have Editor permissions
4. **Manual trigger**: Customer can refresh the subscriptions page to trigger sync

#### Issue: Subscriptions appear but then disappear

**Diagnosis:**
- Check if `endDate` is in the past
- Check if `isActive` is false
- Look for duplicate subscriptions

**Solution:**
- Verify pass validity periods are correct
- Check for data corruption in Sanity

#### Issue: Multiple duplicate subscriptions

**Diagnosis:**
- Missing `stripeSessionId` in older subscriptions
- Webhook and sync both creating subscriptions

**Solution:**
- The new code prevents duplicates using session ID tracking
- Clean up existing duplicates manually in Sanity Studio

## Manual Recovery Steps

### For Individual Customers

1. **Trigger Sync Manually:**
   - Customer visits `/{tenant-slug}/subscriptions` page
   - Sync runs automatically on page load
   - Check browser console for sync results

2. **Create Subscription Manually:**
   - Go to Sanity Studio
   - Create new subscription document
   - Fill in required fields (user, tenant, pass details)

### For System-Wide Issues

1. **Check Webhook Status:**
   ```bash
   # Check if webhooks are being received
   curl -X GET https://api.stripe.com/v1/webhook_endpoints \
     -H "Authorization: Bearer sk_test_..."
   ```

2. **Bulk Sync Script:**
   - Use the existing `fix-missing-subscription.mjs` script
   - Or create a new bulk sync endpoint

## Environment Variables to Check

Ensure these are properly configured:

```env
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
SANITY_API_TOKEN=... (must have Editor permissions)
SANITY_PROJECT_ID=...
SANITY_DATASET=...
```

## Monitoring and Prevention

### Set Up Alerts
1. Monitor webhook failure rates in Stripe dashboard
2. Set up alerts for Sanity permission errors
3. Monitor subscription creation rates vs payment rates

### Regular Health Checks
1. Compare Stripe payment count vs Sanity subscription count
2. Check for users without subscriptions who have recent payments
3. Monitor sync mechanism usage (should be minimal if webhooks work)

## Testing the Fix

### Test Webhook Flow
1. Make a test purchase
2. Check logs for successful webhook processing
3. Verify subscription appears immediately

### Test Sync Flow
1. Temporarily disable webhook
2. Make a test purchase
3. Visit subscriptions page
4. Verify sync creates missing subscription

### Test Edge Cases
1. User doesn't exist in Sanity
2. Duplicate webhook events
3. Network timeouts during webhook processing

## Support Workflow

When a customer reports missing passes:

1. **Immediate Fix**: Ask them to refresh the subscriptions page
2. **Verify Payment**: Check Stripe dashboard for successful payment
3. **Check Logs**: Look for webhook and sync activity
4. **Manual Creation**: Create subscription manually if needed
5. **Root Cause**: Investigate why automatic creation failed

## Code Changes Made

### Files Modified:
- `src/app/api/stripe/webhook/route.ts` - Fixed user ID handling, added session tracking
- `src/app/api/user/sync-subscriptions/route.ts` - Improved fallback mechanism
- `src/app/api/user/subscriptions/route.ts` - Enhanced debugging and logging
- `src/sanity/schemaTypes/subscriptionType.ts` - Added stripeSessionId field

### Key Improvements:
1. Consistent user ID handling across all endpoints
2. Proper session ID tracking to prevent duplicates
3. Enhanced error handling and logging
4. Improved sync mechanism as fallback
5. Better debugging information

The system is now much more robust and should handle edge cases gracefully while providing clear debugging information when issues occur.
