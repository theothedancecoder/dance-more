# How Tenant Owners Pay Their Monthly Subscription

## 🔄 **Complete Payment Flow**

### **Step 1: Access Subscription Page**
Tenant owner navigates to:
```
https://www.dancemore.app/[their-tenant-slug]/admin/subscription
```

**What they see:**
- Current subscription status (if any)
- "Dance School Platform" plan at 600 NOK/month or 6000 NOK/year
- "Subscribe Now" button
- Complete feature list with "0% transaction fees" highlighted

### **Step 2: Choose Billing Period**
- **Monthly**: 600 NOK/month
- **Yearly**: 6000 NOK/year (saves 1200 NOK = 2 months free)

### **Step 3: Click "Subscribe Now"**
- Triggers API call to `/api/platform/subscriptions/create`
- Creates Stripe Checkout session
- Redirects to secure Stripe payment page

### **Step 4: Stripe Checkout Process**
**Tenant owner enters:**
- Credit/debit card details
- Billing address
- Email confirmation

**Stripe handles:**
- Payment processing
- PCI compliance
- Fraud detection
- Recurring billing setup

### **Step 5: Payment Confirmation**
- **Success**: Redirected to success page
- **Failure**: Returned to subscription page with error message
- **Subscription activated** immediately upon successful payment

### **Step 6: Ongoing Monthly Billing**
- **Automatic charges** every month on the same date
- **Email receipts** sent to tenant owner
- **Subscription management** available in admin panel

## 💳 **Payment Methods Supported**

### **Credit/Debit Cards**
- Visa, Mastercard, American Express
- European cards (since pricing is in NOK)
- 3D Secure authentication when required

### **Additional Methods** (can be enabled in Stripe)
- SEPA Direct Debit (for European customers)
- Bank transfers
- Digital wallets (Apple Pay, Google Pay)

## 🔧 **Technical Implementation**

### **Frontend Flow** (`PlatformSubscription.tsx`)
```typescript
const handleSubscribe = async (plan: string, billing: 'monthly' | 'yearly') => {
  // 1. Call API to create subscription
  const response = await fetch('/api/platform/subscriptions/create', {
    method: 'POST',
    body: JSON.stringify({
      tenantId: tenant?._id,
      plan: 'professional',
      billing: billing // 'monthly' or 'yearly'
    })
  });
  
  // 2. Redirect to Stripe Checkout
  const data = await response.json();
  window.location.href = data.checkoutUrl;
};
```

### **Backend API** (`/api/platform/subscriptions/create`)
```typescript
// 1. Validate tenant ownership
// 2. Create/retrieve Stripe customer
// 3. Create Stripe Checkout session with:
//    - 600 NOK monthly or 6000 NOK yearly price
//    - Recurring subscription mode
//    - Success/cancel URLs
// 4. Return checkout URL to frontend
```

### **Stripe Configuration Required**
```bash
# Create products in Stripe Dashboard:
Product: "Dance School Platform"
- Monthly Price: 600 NOK recurring
- Yearly Price: 6000 NOK recurring

# Environment variables needed:
STRIPE_PLATFORM_PRICE_ID=price_xxxxx  # Monthly price ID
STRIPE_PLATFORM_PRICE_ID_YEARLY=price_yyyyy  # Yearly price ID
```

## 📊 **Subscription Management Features**

### **For Active Subscribers**
- View current plan and billing cycle
- See next payment date and amount
- Cancel subscription (remains active until period end)
- Reactivate canceled subscription
- Update payment method
- Download invoices

### **Subscription States**
- **Active**: Currently subscribed and paying
- **Canceling**: Canceled but still active until period end
- **Past Due**: Payment failed, retry in progress
- **Canceled**: Subscription ended, no access

## 🎯 **User Experience**

### **First-Time Subscription**
1. Tenant owner sees clear pricing: "600 NOK/month"
2. Clicks "Subscribe Now"
3. Secure Stripe checkout (familiar payment flow)
4. Immediate access to platform features
5. Email confirmation with receipt

### **Ongoing Management**
1. Monthly automatic billing (no action required)
2. Email receipts for each payment
3. Can cancel anytime (remains active until period end)
4. Easy reactivation if canceled

### **Payment Failures**
1. Automatic retry attempts
2. Email notifications to update payment method
3. Grace period before service suspension
4. Easy payment method update process

## 💰 **Revenue Collection**

### **For Platform Owner**
- **Direct payments** to your Stripe account
- **Automatic recurring billing** reduces churn
- **Predictable revenue**: 600 NOK × active tenants
- **Stripe fees**: ~2.9% + 2 NOK per transaction

### **Monthly Revenue Calculation**
```
Monthly Revenue = (Active Tenants × 600 NOK) - Stripe Fees
Example: 100 tenants = 60,000 NOK - ~1,800 NOK fees = ~58,200 NOK net
```

## 🔐 **Security & Compliance**

### **Payment Security**
- **PCI DSS compliant** through Stripe
- **No card details** stored on your servers
- **3D Secure** authentication when required
- **Fraud detection** built-in

### **Data Protection**
- **GDPR compliant** billing data handling
- **Encrypted** payment processing
- **Secure** webhook endpoints for subscription updates

This system provides a professional, secure, and user-friendly way for tenant owners to pay their monthly platform subscription while ensuring predictable revenue for the platform owner.
