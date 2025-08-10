# 🚀 STRIPE LIVE MODE SETUP GUIDE

## ⚠️ CRITICAL: Pre-Launch Checklist

Before switching to live mode, ensure you have:
- [ ] Completed Stripe account verification
- [ ] Added bank account for payouts
- [ ] Set up tax settings
- [ ] Reviewed pricing and terms
- [ ] Tested webhook system thoroughly (✅ DONE)

## 🔑 STEP 1: Get Live Stripe Keys

### 1.1 Main Stripe Account (Platform)
Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **API Keys**

**Switch to LIVE mode** (toggle in top-left corner)

Copy these keys:
```
STRIPE_SECRET_KEY=sk_live_...  (replace sk_test_...)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...  (replace pk_test_...)
```

### 1.2 Stripe Connect Accounts (Tenants)
Each dance school will need to:
1. Complete Stripe Express onboarding
2. Get their live account activated
3. Update their Connect account IDs in Sanity

## 🔗 STEP 2: Update Webhook Endpoints

### 2.1 Create Live Webhook Endpoint
1. Go to **Stripe Dashboard** → **Webhooks** (in LIVE mode)
2. Click **Add endpoint**
3. Set endpoint URL: `https://www.dancemore.app/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `invoice.payment_succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_`)

### 2.2 Update Environment Variables
Add to your production environment:
```
STRIPE_WEBHOOK_SECRET_PROD=whsec_...  (from step 2.1)
```

## 🌍 STEP 3: Update Production Environment Variables

### 3.1 Vercel Environment Variables
Go to [Vercel Dashboard](https://vercel.com) → Your Project → **Settings** → **Environment Variables**

Update these variables for **Production** environment:

```bash
# Stripe Live Keys
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET_PROD=whsec_...

# Keep existing variables
SANITY_API_TOKEN=sk...  (ensure it has Editor permissions)
NEXT_PUBLIC_SANITY_PROJECT_ID=a2qsy4v6
NEXT_PUBLIC_SANITY_DATASET=production
CLERK_SECRET_KEY=sk_live_...  (also switch Clerk to live if needed)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
```

### 3.2 Local Development (.env.local)
Keep test keys for local development:
```bash
# Keep test keys for local development
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET_LOCAL=whsec_...  (from Stripe CLI)

# Production webhook secret for reference
STRIPE_WEBHOOK_SECRET_PROD=whsec_...
```

## 🏢 STEP 4: Update Stripe Connect Settings

### 4.1 Platform Settings
1. Go to **Stripe Dashboard** → **Connect** → **Settings**
2. Ensure your platform is approved for live mode
3. Update branding and business information

### 4.2 Tenant Onboarding
Each dance school needs to:
1. Complete identity verification
2. Add bank account details
3. Activate their Express account
4. Test a small transaction

## 🧪 STEP 5: Testing Live Mode

### 5.1 Test with Small Amounts
1. Create a test pass with small amount (e.g., 10 NOK)
2. Make a real purchase using a real card
3. Verify webhook creates subscription
4. Check Stripe Dashboard for successful payment
5. Confirm payout schedule

### 5.2 Webhook Verification
```bash
# Check webhook delivery in Stripe Dashboard
# Look for successful 200 responses
# Monitor for any failed deliveries
```

## 🚨 STEP 6: Go-Live Checklist

### Before Launch:
- [ ] All environment variables updated
- [ ] Webhook endpoint responding with 200
- [ ] Test purchase completed successfully
- [ ] Subscription created automatically
- [ ] Stripe Connect accounts activated
- [ ] Bank accounts verified
- [ ] Tax settings configured

### After Launch:
- [ ] Monitor webhook delivery logs
- [ ] Check for failed payments
- [ ] Verify subscription creation
- [ ] Monitor Stripe Dashboard for issues
- [ ] Set up alerts for failed webhooks

## 🔧 STEP 7: Rollback Plan

If issues occur, quickly rollback:

1. **Revert environment variables** to test keys
2. **Disable live webhook** in Stripe Dashboard
3. **Re-enable test webhook** endpoint
4. **Investigate issues** in test mode
5. **Fix problems** before re-attempting live mode

## 📞 STEP 8: Support & Monitoring

### Stripe Dashboard Monitoring:
- **Payments** → Monitor successful/failed transactions
- **Webhooks** → Check delivery status
- **Connect** → Monitor tenant account status
- **Disputes** → Handle any chargebacks

### Application Monitoring:
- Check server logs for webhook errors
- Monitor subscription creation rates
- Verify user experience in production

## 🎯 DEPLOYMENT COMMAND

After updating all environment variables:

```bash
# Deploy to production
vercel --prod

# Or trigger deployment through Git
git add .
git commit -m "Switch to Stripe live mode"
git push origin main
```

---

## ⚡ QUICK REFERENCE

**Test Mode → Live Mode Changes:**
- `sk_test_` → `sk_live_`
- `pk_test_` → `pk_live_`
- `whsec_test_` → `whsec_live_`
- Test webhook → Live webhook endpoint

**Critical URLs:**
- Webhook: `https://www.dancemore.app/api/stripe/webhook`
- Stripe Dashboard: `https://dashboard.stripe.com`
- Vercel Dashboard: `https://vercel.com/dashboard`

**Emergency Contacts:**
- Stripe Support: Available in Dashboard
- Your webhook is working perfectly! 🎉
