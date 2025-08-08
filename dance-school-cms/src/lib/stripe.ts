import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// Client-side Stripe instance
export const getStripe = () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// Stripe configuration
export const STRIPE_CONFIG = {
  currency: 'nok', // Norwegian Kroner
  payment_method_types: ['card'],
  connect: {
    application_fee_percent: 5, // Default platform fee
    country: 'NO', // Norway
  },
};

// Stripe Connect helper functions
export const stripeConnect = {
  // Create a Connect Express account
  async createAccount(params: {
    email: string;
    country?: string;
    type?: 'express' | 'standard';
    businessType?: 'individual' | 'company';
  }) {
    const { email, country = 'NO', type = 'express', businessType = 'individual' } = params;
    
    return await stripe.accounts.create({
      type,
      country,
      email,
      business_type: businessType,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      settings: {
        payouts: {
          schedule: {
            interval: 'daily',
          },
        },
      },
    });
  },

  // Create account link for onboarding
  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    return await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
  },

  // Get account details
  async getAccount(accountId: string) {
    return await stripe.accounts.retrieve(accountId);
  },

  // Create payment intent with application fee
  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    connectedAccountId: string;
    applicationFeeAmount?: number;
    metadata?: Record<string, string>;
  }) {
    const { amount, currency, connectedAccountId, applicationFeeAmount, metadata } = params;
    
    return await stripe.paymentIntents.create({
      amount,
      currency,
      application_fee_amount: applicationFeeAmount,
      metadata,
    }, {
      stripeAccount: connectedAccountId,
    });
  },

  // Create checkout session with Connect account
  async createCheckoutSession(params: {
    line_items: Stripe.Checkout.SessionCreateParams.LineItem[];
    connectedAccountId: string;
    applicationFeePercent: number;
    success_url: string;
    cancel_url: string;
    customer_email?: string;
    metadata?: Record<string, string>;
  }) {
    const { 
      line_items, 
      connectedAccountId, 
      applicationFeePercent, 
      success_url, 
      cancel_url, 
      customer_email, 
      metadata 
    } = params;

    // Calculate application fee amount
    const totalAmount = line_items.reduce((sum, item) => {
      const price = item.price_data?.unit_amount || 0;
      const quantity = item.quantity || 1;
      return sum + (price * quantity);
    }, 0);
    
    const applicationFeeAmount = Math.round(totalAmount * (applicationFeePercent / 100));

    return await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url,
      cancel_url,
      customer_email,
      metadata,
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
      },
    }, {
      stripeAccount: connectedAccountId,
    });
  },

  // Update account information
  async updateAccount(accountId: string, params: Stripe.AccountUpdateParams) {
    return await stripe.accounts.update(accountId, params);
  },

  // Delete/deactivate account
  async deleteAccount(accountId: string) {
    return await stripe.accounts.del(accountId);
  },

  // Get account balance
  async getBalance(accountId: string) {
    return await stripe.balance.retrieve({
      stripeAccount: accountId,
    });
  },

  // List transfers for an account
  async listTransfers(accountId: string, limit = 10) {
    return await stripe.transfers.list({
      destination: accountId,
      limit,
    });
  },

  // Create login link for Express Dashboard
  async createLoginLink(accountId: string) {
    return await stripe.accounts.createLoginLink(accountId);
  },
};

// Helper to get tenant's Stripe account
export async function getTenantStripeAccount(tenantId: string) {
  // This would typically fetch from your database
  // For now, we'll assume you have a function to get tenant data
  // You'll need to implement this based on your data layer
  throw new Error('getTenantStripeAccount not implemented - integrate with your tenant data source');
}

// Webhook signature verification for Connect
export function verifyConnectWebhook(payload: string, signature: string, endpointSecret: string) {
  return stripe.webhooks.constructEvent(payload, signature, endpointSecret);
}
