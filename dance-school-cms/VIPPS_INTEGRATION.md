# Vipps Payment Integration

This document describes the Vipps payment integration implemented for the Dance School CMS.

## Overview

Vipps has been successfully integrated as an additional payment method alongside the existing Stripe integration. Users can now choose between Credit Card (Stripe) and Vipps when making payments for dance classes.

## Implementation Details

### Files Created/Modified

1. **`src/lib/vipps.ts`** - Vipps configuration and utility functions
2. **`src/app/api/vipps/checkout/route.ts`** - API endpoint for initiating Vipps payments
3. **`src/app/api/vipps/webhook/route.ts`** - Webhook endpoint for handling Vipps payment callbacks
4. **`src/components/PaymentButton.tsx`** - Updated to include payment method selection
5. **`test-vipps-integration.js`** - Test script to verify integration

### Test Environment Configuration

The integration uses Vipps test environment with the following credentials:

- **Base URL**: `https://apitest.vipps.no`
- **Client ID**: `960d9d2f-dd1d-44af-9fb1-51fb98217a46`
- **Client Secret**: `Ort8Q~WW6hCXO31KWdJApuia~4-io6twAhLcCaK8`
- **Subscription Key**: `0bb87cb8589841368b42df9d3469968c`
- **MSN**: `376194`
- **Test Phone Number**: `4799139625`
- **Currency**: `NOK` (Norwegian Kroner)

### Payment Flow

1. **User Selection**: User selects Vipps as payment method in the PaymentButton component
2. **Payment Initiation**: Frontend calls `/api/vipps/checkout` with class details
3. **Vipps Payment Creation**: Backend creates Vipps payment using test credentials
4. **User Redirect**: User is redirected to Vipps payment page
5. **Payment Completion**: User completes payment in Vipps app/web
6. **Webhook Callback**: Vipps sends payment status to `/api/vipps/webhook`
7. **Booking Creation**: Successful payments create booking records in Sanity

### Key Features

- **Payment Method Selection**: Dropdown to choose between Stripe and Vipps
- **Test Environment**: Uses Vipps test environment for safe testing
- **Webhook Handling**: Processes payment status updates from Vipps
- **Error Handling**: Comprehensive error handling for API failures
- **Status Mapping**: Maps Vipps payment statuses to internal booking statuses
- **Sanity Integration**: Creates booking records for successful payments

### API Endpoints

#### POST `/api/vipps/checkout`
Initiates a Vipps payment for a dance class.

**Request Body:**
```json
{
  "classId": "string",
  "successUrl": "string",
  "cancelUrl": "string"
}
```

**Response:**
```json
{
  "orderId": "string",
  "url": "string"
}
```

#### POST `/api/vipps/webhook`
Handles Vipps payment status callbacks.

**Request Body:**
```json
{
  "orderId": "string",
  "transactionInfo": {
    "status": "string",
    "transactionId": "string",
    "amount": "number"
  }
}
```

#### GET `/api/vipps/webhook`
Health check endpoint for webhook verification.

### Payment Status Mapping

| Vipps Status | Payment Status | Booking Status |
|--------------|----------------|----------------|
| SALE         | completed      | confirmed      |
| CAPTURED     | completed      | confirmed      |
| CANCELLED    | failed         | cancelled      |
| FAILED       | failed         | cancelled      |
| RESERVED     | pending        | pending        |

### Testing

The integration has been tested with:

1. **Vipps API Access**: Successfully obtains access tokens from test environment
2. **Local API Endpoints**: Checkout and webhook endpoints are accessible
3. **Authentication**: Proper user authentication required for payment initiation
4. **Error Handling**: Graceful handling of API errors and edge cases

### Environment Variables (Optional)

For production deployment, you can override test credentials with environment variables:

```env
VIPPS_CLIENT_ID=your_production_client_id
VIPPS_CLIENT_SECRET=your_production_client_secret
VIPPS_SUBSCRIPTION_KEY=your_production_subscription_key
VIPPS_MSN=your_production_msn
```

### Security Considerations

- All API credentials are configurable via environment variables
- Webhook endpoints validate payment details with Vipps API
- User authentication required for payment initiation
- Test environment used for safe development and testing

### Next Steps

1. **Production Setup**: Configure production Vipps credentials when ready
2. **User Testing**: Test complete payment flow with Vipps test app
3. **Error Monitoring**: Implement logging and monitoring for payment failures
4. **UI Enhancements**: Add Vipps branding and improved payment method selection
5. **Documentation**: Update user documentation with Vipps payment instructions

## Test Results

✅ Vipps access token obtained successfully  
✅ Local API endpoints accessible and responding  
✅ Webhook endpoint active and functional  
✅ Payment method selection UI implemented  
✅ Error handling and status mapping working  

The Vipps integration is ready for testing with the Vipps test app using the provided test phone number and verification code.
