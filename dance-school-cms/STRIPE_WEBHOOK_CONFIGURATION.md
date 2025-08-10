# 🎯 STRIPE WEBHOOK CONFIGURATION FOR LIVE MODE

## ✅ CORRECT WEBHOOK SETTINGS

Based on your Stripe Connect setup, here are the exact settings to use:

### 1. Events from:
**✅ SELECT: "Connected and v2 accounts"**
- This receives events from dance school connected accounts
- This is where your actual payments happen (through connected accounts)

**❌ DON'T SELECT: "Your account"**
- This would only receive platform-level events
- Your payments go through connected accounts, not your main account

### 2. API Version:
**✅ SELECT: "2025-05-28.basil"** (or latest available)
- This matches your code's API version
- Ensures compatibility with your webhook handler

### 3. Endpoint URL:
```
https://www.dancemore.app/api/stripe/webhook
```

### 4. Events to Select:
Select these specific events:

**✅ REQUIRED EVENTS:**
- `checkout.session.completed` - Creates subscriptions when purchases complete
- `payment_intent.succeeded` - Confirms successful payments
- `charge.succeeded` - Backup payment confirmation
- `invoice.payment_succeeded` - For subscription renewals (if applicable)

**✅ OPTIONAL BUT RECOMMENDED:**
- `payment_intent.payment_failed` - Handle failed payments
- `charge.dispute.created` - Handle chargebacks
- `account.updated` - Monitor connected account changes

### 5. After Creating Webhook:
1. **Copy the Signing Secret** (starts with `whsec_`)
2. **Add to Vercel Environment Variables:**
   ```
   STRIPE_WEBHOOK_SECRET_PROD=whsec_your_live_secret_here
   ```
3. **Deploy to production**

## 🔍 WHY "Connected and v2 accounts"?

Your platform architecture:
```
Customer Purchase → Dance School (Connected Account) → Your Platform (Fee)
```

The `checkout.session.completed` event fires in the **connected account** context, not your main account. That's why you need to listen to connected account events.

## 🧪 TESTING AFTER SETUP

1. **Make a small test purchase** (10 NOK)
2. **Check webhook delivery** in Stripe Dashboard
3. **Verify subscription creation** in your app
4. **Monitor server logs** for any errors

Your webhook handler is already configured to handle connected account events correctly! 🎉
