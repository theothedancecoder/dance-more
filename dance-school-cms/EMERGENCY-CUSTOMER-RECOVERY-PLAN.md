# EMERGENCY CUSTOMER RECOVERY PLAN 🚨

## 🎯 SITUATION: 103+ Customers Paid But Have No Passes

After fixing the webhook system, we need to recover all missing subscriptions for customers who paid but never received their passes due to the webhook failures.

## 📋 RECOVERY STRATEGY

### PHASE 1: IMMEDIATE WEBHOOK RETRY (Easiest Solution)
**This should recover 80-90% of missing subscriptions automatically**

1. **Go to Stripe Dashboard**
   - Navigate to: Developers → Webhooks
   - Find webhook: `https://dancemore.app/api/stripe/webhook`
   - Click on the webhook endpoint

2. **Retry All Failed Events**
   - Look for "Failed" events (should see 103+ failures)
   - Select all failed events from the past week/month
   - Click "Retry" to resend them
   - The fixed webhook should now process them successfully

3. **Monitor Success Rate**
   - Watch for successful webhook deliveries
   - Each successful retry should create the missing subscription
   - Customers should immediately see their passes

### PHASE 2: MANUAL RECOVERY (For Any Remaining Issues)
**For customers whose webhooks still fail after retry**

#### Option A: Stripe Payment Recovery Script
```bash
# Run this script to find all successful payments without subscriptions
node recover-missing-subscriptions-from-stripe.mjs
```

#### Option B: Customer Email Recovery
```bash
# For customers who contact you directly
node create-subscription-by-email.mjs customer@email.com "Pass Name"
```

## 🔧 RECOVERY SCRIPTS TO CREATE

### 1. Stripe Payment Recovery Script
**File: `recover-missing-subscriptions-from-stripe.mjs`**
- Query Stripe for all successful payments in the last 30 days
- Cross-reference with existing subscriptions in Sanity
- Create missing subscriptions for payments without them
- Handle different pass types and pricing

### 2. Bulk Customer Recovery Script  
**File: `bulk-recover-customers.mjs`**
- Process a list of customer emails/payment IDs
- Automatically create their missing subscriptions
- Send confirmation emails

### 3. Customer Support Script
**File: `manual-customer-recovery.mjs`**
- Interactive script for customer support
- Input customer email → find their payment → create subscription
- Perfect for handling individual customer complaints

## ⚡ IMMEDIATE ACTION PLAN

### Step 1: Deploy Webhook Fix (DONE ✅)
- Webhook signature verification fixed
- Code pushed to production

### Step 2: Retry Failed Webhooks (DO THIS NOW)
1. Go to Stripe Dashboard → Webhooks
2. Find your webhook endpoint
3. Retry all 103+ failed events
4. Monitor success rate

### Step 3: Create Recovery Scripts (IF NEEDED)
- Only if webhook retries don't recover all customers
- Scripts to handle edge cases and manual recovery

### Step 4: Customer Communication
- Email all affected customers
- Explain the issue was resolved
- Provide direct support contact for any remaining issues

## 📊 SUCCESS METRICS

- **Target**: 100% of paying customers have their passes
- **Method**: Webhook retries should recover 90%+ automatically
- **Backup**: Manual scripts for remaining 10%
- **Timeline**: Complete recovery within 24 hours

## 🎯 EXPECTED OUTCOME

After webhook retries:
- Solomiya and all other affected customers see their passes
- New purchases work automatically
- Customer satisfaction restored
- Revenue protected

## 🚨 PRIORITY ORDER

1. **HIGHEST**: Retry failed webhooks in Stripe Dashboard
2. **HIGH**: Create Stripe payment recovery script
3. **MEDIUM**: Create customer support tools
4. **LOW**: Bulk communication to customers

The webhook retry should solve 90% of the problem immediately!
