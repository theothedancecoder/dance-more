# Platform Subscription System

## Overview

This document describes the platform subscription system that allows dance school owners to pay monthly or yearly subscription fees instead of per-transaction percentage fees.

## Business Model

### Subscription Plans

1. **Starter Plan** - $29/month or $290/year
   - Up to 100 students
   - Basic class management
   - Payment processing
   - Email support

2. **Professional Plan** - $79/month or $790/year (Recommended)
   - Up to 500 students
   - Advanced class management
   - Payment processing
   - Analytics & reports
   - Priority support
   - Custom branding

3. **Enterprise Plan** - $199/month or $1990/year
   - Unlimited students
   - Full feature access
   - Payment processing
   - Advanced analytics
   - Dedicated support
   - White-label solution
   - API access

### Benefits Over Percentage Model

- **Predictable costs** for dance school owners
- **No transaction fees** on student payments
- **Higher revenue potential** for schools with high volume
- **Better cash flow planning** with fixed monthly costs

## Technical Implementation

### API Routes

#### 1. Create Subscription (`/api/platform/subscriptions/create`)
- **Method**: POST
- **Purpose**: Creates a new platform subscription for a tenant
- **Parameters**:
  - `tenantId`: The tenant's ID
  - `plan`: subscription plan (starter, professional, enterprise)
  - `billing`: billing cycle (monthly, yearly)
- **Returns**: Stripe Checkout URL for payment

#### 2. Manage Subscription (`/api/platform/subscriptions/manage`)
- **Methods**: GET, DELETE, PATCH
- **GET**: Retrieve current subscription status
- **DELETE**: Cancel subscription (at period end)
- **PATCH**: Reactivate canceled subscription

### Database Schema Updates

The tenant schema includes a `subscription` object with:

```typescript
subscription: {
  plan: 'free' | 'starter' | 'professional' | 'enterprise'
  stripeCustomerId: string
  subscriptionId: string
  status: 'active' | 'inactive' | 'canceling' | 'canceled'
  billing: 'monthly' | 'yearly'
  expiresAt: datetime
}
```

### Frontend Components

#### 1. PlatformSubscription Component
- Displays current subscription status
- Shows available plans with pricing
- Handles plan selection and billing cycle toggle
- Manages subscription actions (cancel, reactivate)

#### 2. Admin Pages
- `/[slug]/admin/subscription` - Main subscription management page
- `/[slug]/admin/subscription/success` - Post-purchase success page

## Integration with Stripe Connect

The platform subscription system works alongside Stripe Connect:

1. **Platform Subscriptions**: Tenants pay the platform directly
2. **Student Payments**: Go directly to tenant's Stripe Connect account
3. **No Transaction Fees**: Platform revenue comes from subscriptions, not transaction fees

## Webhook Handling

Platform subscription webhooks handle:
- `customer.subscription.created` - Activate new subscription
- `customer.subscription.updated` - Update subscription status
- `customer.subscription.deleted` - Handle subscription cancellation
- `invoice.payment_succeeded` - Confirm subscription renewal
- `invoice.payment_failed` - Handle failed payments

## Environment Variables Required

```env
# Stripe Price IDs for subscription plans
STRIPE_STARTER_PRICE_ID_MONTHLY=price_xxx
STRIPE_STARTER_PRICE_ID_YEARLY=price_xxx
STRIPE_PROFESSIONAL_PRICE_ID_MONTHLY=price_xxx
STRIPE_PROFESSIONAL_PRICE_ID_YEARLY=price_xxx
STRIPE_ENTERPRISE_PRICE_ID_MONTHLY=price_xxx
STRIPE_ENTERPRISE_PRICE_ID_YEARLY=price_xxx

# Base URL for redirect URLs
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

## Setup Instructions

### 1. Create Stripe Products and Prices

In your Stripe Dashboard:

1. Create products for each plan (Starter, Professional, Enterprise)
2. Create monthly and yearly prices for each product
3. Copy the price IDs to your environment variables

### 2. Configure Webhooks

Add these webhook endpoints:
- `https://yourdomain.com/api/stripe/webhook` (for platform subscriptions)
- Select the subscription-related events listed above

### 3. Update Tenant Schema

Ensure your Sanity tenant schema includes the subscription fields as shown above.

### 4. Test the Flow

1. Navigate to `/{tenant-slug}/admin/subscription`
2. Select a plan and billing cycle
3. Complete the Stripe Checkout process
4. Verify subscription activation

## Migration from Percentage Model

If migrating from a percentage-based model:

1. **Grandfather existing tenants** on the old model temporarily
2. **Offer migration incentives** (e.g., first month free)
3. **Provide clear communication** about the benefits
4. **Set a migration deadline** for all tenants to switch

## Revenue Projections

### Example Calculations

**100 tenants on Professional plan ($79/month)**:
- Monthly revenue: $7,900
- Annual revenue: $94,800

**Compared to 5% transaction fees**:
- Need $1,580/month in transactions per tenant to break even
- Most dance schools process $2,000-5,000/month
- Subscription model provides more predictable revenue

## Support and Billing

### Customer Support
- Starter: Email support
- Professional: Priority email support
- Enterprise: Dedicated support manager

### Billing Management
- Self-service subscription management
- Automatic renewals
- Prorated upgrades/downgrades
- Grace period for failed payments

## Future Enhancements

1. **Usage-based add-ons** (extra students, SMS notifications)
2. **Annual plan discounts** (already implemented - 17% savings)
3. **Multi-location support** for enterprise customers
4. **White-label options** for enterprise plans
5. **API access tiers** based on subscription level

## Monitoring and Analytics

Track key metrics:
- Monthly Recurring Revenue (MRR)
- Customer Lifetime Value (CLV)
- Churn rate by plan
- Upgrade/downgrade patterns
- Support ticket volume by plan

This subscription model provides a more sustainable and predictable revenue stream while offering better value to dance school owners.
