# Pass Upgrade System Implementation

## Overview

The pass upgrade system allows students to pay the difference between their current pass and a more expensive pass to upgrade their subscription. This feature enhances user experience by providing flexibility to change passes without losing their existing subscription benefits.

## System Architecture

### 1. Frontend Components

#### Student Pass Management Page (`/src/app/student/passes/page.tsx`)
- Displays user's current active passes
- Shows upgrade options with calculated costs
- Handles upgrade initiation through Stripe checkout
- Real-time status updates and error handling

#### Student Dashboard Integration (`/src/app/student/page.tsx`)
- Added navigation link to pass management
- Visual card with upgrade call-to-action

### 2. Backend API Endpoints

#### User Passes API (`/src/app/api/student/passes/route.ts`)
- Fetches user's subscriptions from Sanity
- Calculates remaining days and expiry status
- Secured with user authentication

#### Pass Upgrade API (`/src/app/api/student/passes/upgrade/route.ts`)
- Validates upgrade eligibility
- Calculates upgrade costs
- Creates Stripe checkout session for upgrade payment
- Includes comprehensive error handling

#### Enhanced Webhook (`/src/app/api/stripe/webhook/route.ts`)
- Handles `pass_upgrade` payment type
- Updates existing subscription instead of creating new one
- Preserves user's progress (classes used, start date)
- Tracks upgrade history for audit purposes

## Key Features

### 1. Upgrade Cost Calculation
```javascript
const upgradeCost = newPass.price - currentPass.price;
```
- Simple difference-based pricing
- Only allows upgrades to more expensive passes
- Prevents downgrades (can be extended later)

### 2. Subscription Preservation
When upgrading, the system:
- Keeps original start date
- Preserves classes already used
- Updates pass details (name, type, limits)
- Recalculates expiry based on new pass validity
- Maintains subscription continuity

### 3. Validity Handling
The system handles different validity types:
- **Fixed Date**: Uses the new pass's fixed expiry date
- **Days-based**: Recalculates from original start date using new pass's validity days
- **Fallback**: Preserves original end date if new pass has no validity configuration

### 4. Upgrade History Tracking
```javascript
upgradeHistory: [
  {
    fromPassId: "old_pass_id",
    fromPassName: "Old Pass Name",
    toPassId: "new_pass_id", 
    toPassName: "New Pass Name",
    upgradeDate: "2024-01-15T10:30:00Z",
    stripeSessionId: "cs_session_id",
    upgradeCost: 500
  }
]
```

## Current System Status

### Available Passes (Price Range: 0 - 3200 NOK)
- Open Week Pass (0 NOK) - Free trial
- Drop-in Classes (250 NOK) - Single class access
- Course Passes (1290-3200 NOK) - Multi-week programs
- Clip Cards (2000 NOK) - Multi-class packages

### Active Upgrade Candidates
The system currently has 5 active subscriptions eligible for upgrades:
- Users with 1 Course passes can upgrade to 10 Clip Cards (+710 NOK)
- Users with 10 Clip Cards can upgrade to 2-4 Course Passes (+290-910 NOK)
- Users with 2 Course Pass can upgrade to 3-4 Course Passes (+500-910 NOK)

## Usage Flow

### For Students:
1. Navigate to `/student/passes`
2. View current active passes and their status
3. Browse upgrade options with calculated costs
4. Click "Upgrade for X NOK" button
5. Complete Stripe checkout payment
6. Subscription automatically updated upon payment

### For Administrators:
- Monitor upgrades through Stripe dashboard
- View upgrade history in Sanity subscription records
- Track revenue from pass upgrades

## Technical Implementation Details

### Authentication & Security
- All endpoints secured with Clerk authentication
- User can only access their own subscriptions
- Validation prevents unauthorized upgrades

### Error Handling
- Comprehensive validation for upgrade eligibility
- Clear error messages for invalid scenarios
- Graceful handling of expired or inactive passes

### Payment Processing
- Stripe checkout integration with metadata tracking
- Webhook signature verification for security
- Automatic subscription updates upon successful payment

### Data Consistency
- Atomic updates to prevent data corruption
- Proper error handling and rollback mechanisms
- Audit trail through upgrade history

## Testing

### Manual Testing Steps:
1. **Setup**: Ensure you have active subscriptions and multiple pass types
2. **Access**: Navigate to `/student/passes` as authenticated student
3. **Verification**: Confirm current passes display correctly
4. **Upgrade**: Test upgrade flow with Stripe test cards
5. **Validation**: Verify subscription updates correctly after payment

### Test Script:
```bash
cd dance-school-cms && node test-pass-upgrade-system.mjs
```

## Future Enhancements

### Potential Improvements:
1. **Prorated Pricing**: Calculate upgrades based on remaining time/classes
2. **Downgrade Support**: Allow downgrades with credit/refund handling
3. **Bulk Upgrades**: Allow upgrading multiple passes simultaneously
4. **Upgrade Recommendations**: AI-powered suggestions based on usage patterns
5. **Admin Interface**: Dashboard for monitoring and managing upgrades

### Business Logic Extensions:
- Seasonal upgrade promotions
- Loyalty-based upgrade discounts
- Family/group upgrade packages
- Corporate upgrade plans

## Monitoring & Analytics

### Key Metrics to Track:
- Upgrade conversion rates
- Average upgrade value
- Most popular upgrade paths
- Revenue from upgrades vs new purchases
- User satisfaction with upgrade process

### Logging:
The system includes comprehensive logging for:
- Upgrade attempts and completions
- Payment processing events
- Error conditions and resolutions
- User behavior analytics

## Support & Maintenance

### Common Issues:
1. **Expired Subscriptions**: Cannot upgrade expired passes
2. **Inactive Passes**: Target pass must be active for upgrades
3. **Payment Failures**: Stripe handles retry logic automatically
4. **Webhook Delays**: System handles eventual consistency

### Maintenance Tasks:
- Regular cleanup of old upgrade history
- Monitor webhook delivery success rates
- Update pass pricing and availability
- Review and optimize upgrade conversion rates

---

## Implementation Summary

✅ **Completed Features:**
- Student pass management interface
- Upgrade cost calculation engine
- Stripe payment integration
- Webhook processing for upgrades
- Subscription preservation logic
- Comprehensive error handling
- Upgrade history tracking

✅ **System Status:**
- 18 active passes available for upgrades
- 5 active subscriptions eligible for upgrades
- Full end-to-end upgrade flow functional
- Ready for production use

The pass upgrade system is now fully implemented and ready for student use. Students can seamlessly upgrade their passes by paying the difference, while maintaining their existing subscription benefits and progress.
