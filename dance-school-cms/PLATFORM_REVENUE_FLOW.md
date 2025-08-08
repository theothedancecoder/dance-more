# Platform Revenue Flow - How You Get Paid

## 💰 **Revenue Model Overview**

Your dance school platform now operates on a **dual revenue system**:

### 1. **Platform Subscriptions** (Your Revenue)
- **Who pays**: Dance school owners (tenants)
- **How much**: $29-199/month per school
- **Where it goes**: Directly to your main Stripe account
- **Payment method**: Stripe subscriptions

### 2. **Student Payments** (Dance School Revenue)
- **Who pays**: Students buying classes/passes
- **How much**: Whatever the dance school charges
- **Where it goes**: Directly to dance school's Stripe Connect account
- **Your cut**: 0% (they keep 100%)

## 🏦 **How Platform Revenue Works**

### **Subscription Payment Flow:**
```
Dance School Owner → Stripe Checkout → Your Main Stripe Account
```

### **Student Payment Flow:**
```
Student → Stripe Connect → Dance School's Bank Account
```

## 📊 **Revenue Tracking**

### **In Your Stripe Dashboard:**
1. **Main Account**: Shows all platform subscription revenue
2. **Connect Dashboard**: Shows all dance school transactions (for monitoring)

### **Subscription Plans & Revenue:**
- **Starter**: $29/month × number of schools
- **Professional**: $79/month × number of schools  
- **Enterprise**: $199/month × number of schools

### **Example Monthly Revenue:**
- 10 schools on Professional plan: $790/month
- 5 schools on Starter plan: $145/month
- 2 schools on Enterprise plan: $398/month
- **Total**: $1,333/month recurring revenue

## 🔧 **Technical Implementation**

### **Platform Subscription System:**
- **API**: `/api/platform/subscriptions/create` - Creates subscription checkout
- **Webhook**: `/api/stripe/platform-webhook` - Processes subscription events
- **Database**: Tenant records track subscription status
- **Frontend**: `/admin/subscription` - Subscription management UI

### **Revenue Recognition:**
- **Immediate**: When subscription payment succeeds
- **Recurring**: Monthly/yearly automatic renewals
- **Tracking**: All revenue logged in Sanity database

## 💳 **Stripe Setup Required**

### **1. Create Subscription Products in Stripe:**
```bash
# In your main Stripe account, create:
- Starter Plan: $29/month, $290/year
- Professional Plan: $79/month, $790/year  
- Enterprise Plan: $199/month, $1990/year
```

### **2. Environment Variables:**
```env
# Add these to your .env.local:
STRIPE_STARTER_PRICE_ID_MONTHLY=price_xxx
STRIPE_STARTER_PRICE_ID_YEARLY=price_xxx
STRIPE_PROFESSIONAL_PRICE_ID_MONTHLY=price_xxx
STRIPE_PROFESSIONAL_PRICE_ID_YEARLY=price_xxx
STRIPE_ENTERPRISE_PRICE_ID_MONTHLY=price_xxx
STRIPE_ENTERPRISE_PRICE_ID_YEARLY=price_xxx
STRIPE_PLATFORM_WEBHOOK_SECRET=whsec_xxx
```

### **3. Webhook Endpoint:**
```
Add to Stripe: https://yourdomain.com/api/stripe/platform-webhook
Events: customer.subscription.*, invoice.payment_*
```

## 📈 **Business Benefits**

### **Predictable Revenue:**
- Fixed monthly recurring revenue
- No dependency on transaction volume
- Easier financial planning and forecasting

### **Higher Margins:**
- No payment processing fees on your revenue
- Subscription model typically has 80%+ gross margins
- Scales with number of schools, not transaction volume

### **Customer Value:**
- Dance schools keep 100% of student payments
- Predictable costs for school owners
- Better value proposition than percentage fees

## 🎯 **Next Steps**

1. **Set up Stripe products** with the pricing above
2. **Configure webhook endpoint** for subscription events
3. **Test subscription flow** with a test school
4. **Monitor revenue** in Stripe dashboard
5. **Scale by acquiring more dance schools**

## 💡 **Revenue Optimization Tips**

### **Pricing Strategy:**
- **Starter**: Perfect for new/small schools
- **Professional**: Best value (recommended)
- **Enterprise**: High-volume schools with custom needs

### **Growth Tactics:**
- Offer first month free for new schools
- Annual plans save 17% (already implemented)
- Referral bonuses for existing customers
- Tiered pricing based on student count

This subscription model provides sustainable, predictable revenue while offering excellent value to dance schools!
