# Stripe Connect Multi-Tenant Implementation

This document outlines the implementation of Stripe Connect for multi-tenant payment processing in the Dance School CMS.

## Overview

The system now supports **Stripe Connect Express accounts** for each dance school tenant, allowing them to:
- Receive payments directly to their own bank accounts
- Access their own Stripe dashboard
- Handle their own compliance and tax reporting
- Set their own payout schedules

The platform takes a configurable application fee (default 5%) from each transaction.

## Architecture

### 1. Database Schema Updates

**Tenant Schema (`src/sanity/schemaTypes/tenantType.ts`)**
```typescript
stripeConnect: {
  accountId: string;                    // Stripe Connect account ID
  accountStatus: string;                // not_connected, pending, active, restricted, rejected
  onboardingCompleted: boolean;         // Whether onboarding is complete
  chargesEnabled: boolean;              // Can accept payments
  payoutsEnabled: boolean;              // Can receive payouts
  country: string;                      // Account country (default: NO)
  currency: string;                     // Account currency (default: nok)
  applicationFeePercent: number;        // Platform fee % (default: 5)
  connectedAt: datetime;                // When account was first connected
  lastSyncAt: datetime;                 // Last status sync with Stripe
}
```

### 2. API Routes

**Stripe Connect Management**
- `POST /api/stripe/connect/create-account` - Create new Connect account
- `POST /api/stripe/connect/onboard` - Generate onboarding link
- `GET /api/stripe/connect/status` - Get account status and sync with Stripe

**Updated Payment Processing**
- `POST /api/stripe/checkout` - Now uses Connect accounts with application fees
- `POST /api/stripe/checkout-pass` - Updated for Connect (needs implementation)

### 3. Frontend Components

**StripeConnectSetup Component (`src/components/StripeConnectSetup.tsx`)**
- Account creation and onboarding flow
- Status monitoring and requirements display
- Account management interface

**Admin Payments Page (`src/app/[slug]/admin/payments/page.tsx`)**
- Integrated Stripe Connect setup
- Payment overview and transaction history
- Settings management

## Implementation Details

### Account Creation Flow

1. **Admin clicks "Connect with Stripe"**
   - Calls `POST /api/stripe/connect/create-account`
   - Creates Stripe Express account
   - Updates tenant record with account ID

2. **Onboarding Process**
   - Calls `POST /api/stripe/connect/onboard`
   - Generates Stripe onboarding link
   - Redirects to Stripe for account setup

3. **Status Monitoring**
   - Regular calls to `GET /api/stripe/connect/status`
   - Syncs account capabilities and requirements
   - Updates tenant record with latest status

### Payment Processing

**Before (Single Account)**
```typescript
// All payments went to platform account
const session = await stripe.checkout.sessions.create({
  // ... session config
});
```

**After (Connect Accounts)**
```typescript
// Payments go to tenant's Connect account with platform fee
const session = await stripeConnect.createCheckoutSession({
  connectedAccountId: tenant.stripeConnect.accountId,
  applicationFeePercent: tenant.stripeConnect.applicationFeePercent,
  // ... other config
});
```

### Application Fees

- **Default**: 5% of transaction amount
- **Configurable**: Per tenant in database
- **Automatic**: Deducted by Stripe and sent to platform account
- **Transparent**: Shown to customers during checkout

## Configuration

### Environment Variables

```bash
# Existing Stripe keys (for platform account)
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Additional webhook secret for Connect events (optional)
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
```

### Stripe Dashboard Setup

1. **Enable Connect in Stripe Dashboard**
   - Go to Connect settings
   - Enable Express accounts
   - Set up application details

2. **Configure Webhooks**
   - Add webhook endpoint: `https://yourdomain.com/api/stripe/webhook`
   - Enable Connect-related events:
     - `account.updated`
     - `account.application.deauthorized`
     - `payment_intent.succeeded`
     - `checkout.session.completed`

## Usage Guide

### For Platform Administrators

1. **Initial Setup**
   - Ensure Stripe Connect is enabled in dashboard
   - Configure webhook endpoints
   - Set default application fee percentage

2. **Tenant Management**
   - Monitor tenant onboarding status
   - Handle support requests for account issues
   - Manage application fees if needed

### For Dance School Administrators

1. **Connect Stripe Account**
   - Go to Admin → Payments → Stripe Connect
   - Click "Connect with Stripe"
   - Complete Stripe onboarding process

2. **Monitor Status**
   - Check account status regularly
   - Complete any required information
   - Ensure charges and payouts are enabled

3. **Manage Settings**
   - View transaction history
   - Access Stripe dashboard (when available)
   - Configure payout preferences in Stripe

## Security Considerations

### Data Protection
- Stripe account IDs are stored securely
- No sensitive financial data stored locally
- All payments processed through Stripe's secure infrastructure

### Access Control
- Only tenant admins can manage Connect accounts
- API routes protected with proper authentication
- Tenant isolation enforced at all levels

### Compliance
- Each tenant handles their own compliance
- Platform fee structure is transparent
- All transactions logged and auditable

## Testing

### Test Mode Setup
1. Use Stripe test keys
2. Create test Connect accounts
3. Use test payment methods
4. Verify application fees are calculated correctly

### Test Scenarios
- [ ] Account creation and onboarding
- [ ] Payment processing with application fees
- [ ] Account status updates and requirements
- [ ] Error handling for inactive accounts
- [ ] Webhook processing for Connect events

## Troubleshooting

### Common Issues

**Account Not Active**
- Check onboarding completion status
- Verify required information submitted
- Review Stripe account requirements

**Payments Failing**
- Ensure charges_enabled is true
- Check account restrictions
- Verify application fee calculation

**Onboarding Issues**
- Check return/refresh URLs
- Verify account link expiration
- Review Stripe Connect settings

### Monitoring

**Key Metrics to Track**
- Account creation success rate
- Onboarding completion rate
- Payment success rate per tenant
- Application fee collection
- Account status distribution

## Future Enhancements

### Planned Features
- [ ] Automatic account status monitoring
- [ ] Enhanced transaction reporting
- [ ] Multi-currency support
- [ ] Custom application fee per tenant
- [ ] Stripe Express dashboard integration
- [ ] Automated payout reporting

### Considerations
- **Standard vs Express**: Currently using Express accounts for simplicity
- **Multi-party payments**: For classes with multiple instructors
- **Subscription billing**: For recurring platform fees
- **International expansion**: Additional country support

## Migration Notes

### From Single Account to Connect

1. **Existing Payments**: Continue to work with platform account
2. **New Tenants**: Must set up Connect accounts
3. **Existing Tenants**: Can migrate gradually
4. **Data Migration**: No payment data needs migration

### Rollback Plan

If needed to rollback:
1. Update checkout routes to use platform account
2. Disable Connect account creation
3. Continue processing through single account
4. Preserve Connect account data for future use

## Support

### For Developers
- Review Stripe Connect documentation
- Test thoroughly in Stripe test mode
- Monitor webhook events and logs
- Use Stripe CLI for local development

### For Users
- Provide clear onboarding instructions
- Document common issues and solutions
- Offer support for Stripe account setup
- Monitor and respond to payment issues

---

**Implementation Status**: ✅ Core functionality complete
**Testing Status**: ⏳ Requires thorough testing
**Documentation Status**: ✅ Complete
**Deployment Status**: ⏳ Ready for staging deployment
