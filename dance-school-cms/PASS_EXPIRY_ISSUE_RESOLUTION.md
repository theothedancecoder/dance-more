# Pass Expiry Issue Resolution

## Problem Summary
A customer purchased a pass that should be valid for months, but it was showing as expired on their mobile device despite showing the correct expiry date in the admin panel.

## Root Cause Analysis

### Issue 1: Stripe Webhook Signature Verification Failure
- **Problem**: Webhook endpoint was failing with "No signatures found matching the expected signature for payload"
- **Cause**: Incorrect request body handling in signature verification
- **Impact**: New purchases weren't creating subscriptions properly

### Issue 2: Incorrect Pass Expiry Date Calculation
- **Problem**: Webhook was creating subscriptions with wrong expiry dates
- **Cause**: Webhook only handled `validityDays` but ignored `validityType` and `expiryDate` fields
- **Impact**: Passes that should last months were expiring in hours/days

## Technical Details

### Pass Validity System
The system supports two validity types:
1. **`validityType: 'days'`** - Uses `validityDays` to calculate expiry from purchase date
2. **`validityType: 'date'`** - Uses fixed `expiryDate` regardless of purchase date

### The Bug
The webhook was always using this logic:
```javascript
const endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
```

For passes with `validityType: 'date'` and `validityDays: null`, this resulted in:
```javascript
const endDate = new Date(now.getTime() + null * 24 * 60 * 60 * 1000); // = NaN
```

## Solutions Implemented

### 1. Fixed Stripe Webhook Signature Verification
**File**: `src/app/api/stripe/webhook/route.ts`

**Before**:
```javascript
const body = await req.arrayBuffer();
const bodyString = Buffer.from(body).toString('utf8');
event = stripe.webhooks.constructEvent(bodyString, sig, webhookSecret!);
```

**After**:
```javascript
body = await req.text();
event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
```

**Why this works**: `req.text()` preserves the exact raw body needed for signature verification.

### 2. Fixed Pass Expiry Date Calculation
**File**: `src/app/api/stripe/webhook/route.ts`

**Added proper validity type handling**:
```javascript
if (pass.validityType === 'date' && pass.expiryDate) {
  // Use fixed expiry date
  endDate = new Date(pass.expiryDate);
} else if (pass.validityType === 'days' && pass.validityDays) {
  // Use validity days from now
  endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
} else if (pass.validityDays) {
  // Fallback to validityDays if validityType is not set
  endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
} else {
  // Default fallback - 30 days
  endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
}
```

### 3. Fixed Existing Incorrect Subscriptions
**Script**: `fix-subscription-expiry-dates.mjs`

- Identified 13 recent subscriptions with potential issues
- Fixed 11 subscriptions with incorrect expiry dates
- Notable fixes:
  - "2 Course Pass": Fixed from 1 day to 49.8 days (should expire Oct 1, 2025)
  - Multiple "Open week Trial Pass": Fixed from same-day expiry to Aug 14, 2025
  - Solomiya's subscription: Fixed from Aug 18 to Aug 14 (correct fixed expiry date)

## Results

### Before Fix
- Webhook signature verification: ❌ Failing
- New purchases: ❌ Not creating subscriptions
- Pass expiry calculation: ❌ Incorrect (minutes/hours instead of months)
- Customer experience: ❌ Passes showing as expired immediately

### After Fix
- Webhook signature verification: ✅ Working
- New purchases: ✅ Creating subscriptions correctly
- Pass expiry calculation: ✅ Correct (respects both validity types)
- Customer experience: ✅ Passes show correct expiry dates

## Impact
- **11 customers** now have correct pass expiry dates
- **Future purchases** will calculate expiry dates correctly
- **Mobile app** will now show accurate pass validity
- **Admin panel** and mobile app are now consistent

## Prevention
1. **Enhanced logging** in webhook for better debugging
2. **Fallback logic** for edge cases (30-day default)
3. **Comprehensive pass validity handling** for both `days` and `date` types
4. **Better error handling** with detailed error messages

## Files Modified
1. `src/app/api/stripe/webhook/route.ts` - Main webhook handler
2. `fix-subscription-expiry-dates.mjs` - One-time fix script
3. `debug-pass-expiry-issue.mjs` - Diagnostic script
4. `debug-pass-validity-days.mjs` - Pass configuration analysis

## Testing
- ✅ Webhook signature verification tested with mock events
- ✅ Pass validity calculation tested with real pass data
- ✅ Existing subscriptions successfully updated
- ✅ Both validity types (`days` and `date`) now work correctly

The customer's pass should now show the correct expiry date on their mobile device.
