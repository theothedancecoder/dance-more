# Platform Subscription Model - 600 NOK Monthly

## Overview
Updated the platform subscription model to a single plan at 600 NOK monthly with no transaction fees for tenant owners.

## Key Features
- **Single Plan**: "Dance School Platform" at 600 NOK/month or 6000 NOK/year (2 months free)
- **No Transaction Fees**: Tenants keep 100% of their student payments
- **Complete Solution**: All features included in one comprehensive plan

## Implementation Details

### 1. Frontend Component (`src/components/PlatformSubscription.tsx`)
- Updated to show single plan pricing model
- Displays 600 NOK monthly / 6000 NOK yearly pricing
- Highlights "0% transaction fees" as key value proposition
- Clean, focused UI for single plan selection

### 2. API Endpoints Updated

#### Create Subscription (`src/app/api/platform/subscriptions/create/route.ts`)
- Updated `SUBSCRIPTION_PLANS` to single "professional" plan
- Pricing: 600 NOK monthly, 6000 NOK yearly
- Uses `STRIPE_PLATFORM_PRICE_ID` environment variable

#### Manage Subscription (`src/app/api/platform/subscriptions/manage/route.ts`)
- Compatible with new pricing model
- Handles subscription status, cancellation, and reactivation
- Displays amounts in NOK currency

### 3. Required Environment Variables
Add to your `.env.local`:
```bash
# Platform subscription Stripe price IDs
STRIPE_PLATFORM_PRICE_ID=price_xxxxx  # Your Stripe price ID for the platform subscription
```

### 4. Stripe Setup Required

#### Create Stripe Products & Prices
1. **Go to Stripe Dashboard** → Products
2. **Create Product**: "Dance School Platform"
3. **Create Prices**:
   - Monthly: 600 NOK recurring monthly
   - Yearly: 6000 NOK recurring yearly
4. **Copy Price IDs** and add to environment variables

#### Example Stripe CLI Commands:
```bash
# Create product
stripe products create --name "Dance School Platform" --description "Complete dance school management platform"

# Create monthly price (replace prod_xxx with your product ID)
stripe prices create --product prod_xxx --unit-amount 60000 --currency nok --recurring-interval month

# Create yearly price
stripe prices create --product prod_xxx --unit-amount 600000 --currency nok --recurring-interval year
```

### 5. Value Proposition
- **No Transaction Fees**: Unlike competitors, tenants keep 100% of student payments
- **Complete Platform**: Everything needed to run a dance school
- **Professional Features**: Custom branding, analytics, priority support
- **Stripe Connect**: Direct payments to tenant bank accounts

### 6. Revenue Model
- **Platform Revenue**: 600 NOK × number of active tenants per month
- **Tenant Revenue**: 100% of their student payments (no platform fees)
- **Scalable**: Revenue grows with tenant acquisition, not transaction volume

## Testing the Implementation

### 1. Test Subscription Flow
```bash
# Navigate to tenant admin subscription page
https://www.dancemore.app/[tenant-slug]/admin/subscription

# Should show:
# - Single plan at 600 NOK/month or 6000 NOK/year
# - "0% transaction fees" highlighted
# - Complete feature list
# - Subscribe button leading to Stripe Checkout
```

### 2. Verify Pricing Display
- Monthly: 600 NOK/month
- Yearly: 6000 NOK/year (with "Save 1200 NOK/year" message)
- Currency displayed as "NOK" throughout

### 3. Test Subscription Management
- Subscribe to plan
- View active subscription status
- Cancel subscription (remains active until period end)
- Reactivate canceled subscription

## Migration from Old Plans
If you have existing subscriptions on old plans, you may need to:
1. Migrate existing customers to new plan
2. Update any hardcoded plan references
3. Ensure billing displays correctly in NOK

## Benefits of This Model
1. **Predictable Revenue**: Fixed monthly fee per tenant
2. **Competitive Advantage**: No transaction fees attracts more tenants
3. **Simplified Pricing**: Single plan reduces decision complexity
4. **Higher Value Perception**: All features included, no upselling needed
5. **Better Margins**: Direct subscription revenue vs. transaction percentage

## Next Steps
1. Set up Stripe products and prices
2. Add environment variables
3. Test subscription flow end-to-end
4. Update any marketing materials with new pricing
5. Consider migration strategy for existing customers
