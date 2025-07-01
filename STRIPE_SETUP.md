# Stripe Payment Integration Setup

This guide will help you set up Stripe payments for the Dance School CMS.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Access to your Stripe dashboard
3. A deployed application or ngrok for webhook testing

## Step 1: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/apikeys
2. Copy your **Publishable key** (starts with `pk_`)
3. Copy your **Secret key** (starts with `sk_`)

## Step 2: Set Up Environment Variables

Add these to your `.env.local` file:

```env
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
```

## Step 3: Configure Webhooks

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/api/stripe/webhook`
   - For local development with ngrok: `https://your-ngrok-url.ngrok.io/api/stripe/webhook`
4. Select these events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.failed`
5. Click "Add endpoint"
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to your environment variables:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 4: Test the Integration

1. Start your development server: `npm run dev`
2. Navigate to a class page
3. Click "Book Now" button
4. Complete the test payment using Stripe's test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Use any future expiry date and any 3-digit CVC

## Step 5: Currency Configuration

The system is configured for Norwegian Kroner (NOK). To change the currency:

1. Edit `src/lib/stripe.ts`
2. Change the `currency` field in `STRIPE_CONFIG`
3. Update price displays throughout the application

## Features Included

- ✅ Secure checkout with Stripe
- ✅ Automatic booking creation in Sanity
- ✅ User creation for new customers
- ✅ Payment success/failure handling
- ✅ Webhook verification for security
- ✅ Norwegian Kroner (NOK) support

## Production Deployment

1. Replace test keys with live keys from Stripe dashboard
2. Update webhook URL to your production domain
3. Ensure HTTPS is enabled for webhook security
4. Test thoroughly with small amounts before going live

## Troubleshooting

### Webhook Issues
- Check that your webhook URL is accessible
- Verify the webhook secret is correct
- Check Stripe dashboard for webhook delivery attempts

### Payment Issues
- Ensure API keys are correct and not mixed up
- Check browser console for JavaScript errors
- Verify user authentication is working

### Database Issues
- Ensure Sanity write permissions are configured
- Check that all schema types are deployed
- Verify SANITY_API_TOKEN has write access
