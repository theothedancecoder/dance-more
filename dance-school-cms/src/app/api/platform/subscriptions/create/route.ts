import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Platform subscription plans
const SUBSCRIPTION_PLANS = {
  starter: {
    name: 'Starter',
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      'Up to 100 students',
      'Basic class management',
      'Payment processing',
      'Email support'
    ]
  },
  professional: {
    name: 'Professional', 
    priceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID,
    monthlyPrice: 79,
    yearlyPrice: 790,
    features: [
      'Up to 500 students',
      'Advanced class management',
      'Payment processing',
      'Analytics & reports',
      'Priority support',
      'Custom branding'
    ]
  },
  enterprise: {
    name: 'Enterprise',
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    monthlyPrice: 199,
    yearlyPrice: 1990,
    features: [
      'Unlimited students',
      'Full feature access',
      'Payment processing',
      'Advanced analytics',
      'Dedicated support',
      'White-label solution',
      'API access'
    ]
  }
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId, plan, billing } = await request.json();

    if (!tenantId || !plan || !billing) {
      return NextResponse.json({ 
        error: 'Missing required fields: tenantId, plan, billing' 
      }, { status: 400 });
    }

    if (!SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS]) {
      return NextResponse.json({ error: 'Invalid subscription plan' }, { status: 400 });
    }

    if (!['monthly', 'yearly'].includes(billing)) {
      return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
    }

    // Get tenant and verify ownership
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && _id == $tenantId && ownerId == $userId][0] {
        _id,
        schoolName,
        contactEmail,
        subscription
      }`,
      { tenantId, userId }
    );

    if (!tenant) {
      return NextResponse.json({ 
        error: 'Tenant not found or access denied' 
      }, { status: 404 });
    }

    // Check if tenant already has an active subscription
    if (tenant.subscription?.subscriptionId && tenant.subscription?.status === 'active') {
      return NextResponse.json({ 
        error: 'Tenant already has an active subscription' 
      }, { status: 400 });
    }

    const selectedPlan = SUBSCRIPTION_PLANS[plan as keyof typeof SUBSCRIPTION_PLANS];
    
    // Create or get Stripe customer
    let customerId = tenant.subscription?.stripeCustomerId;
    
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.contactEmail,
        name: tenant.schoolName,
        metadata: {
          tenantId: tenant._id,
          userId: userId
        }
      });
      customerId = customer.id;
    }

    // Create Stripe Checkout session for subscription
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: billing === 'monthly' ? selectedPlan.priceId + '_monthly' : selectedPlan.priceId + '_yearly',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${tenant.slug?.current}/admin/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/${tenant.slug?.current}/admin/subscription`,
      metadata: {
        tenantId: tenant._id,
        plan: plan,
        billing: billing
      }
    });

    // Update tenant with customer ID if new
    if (!tenant.subscription?.stripeCustomerId) {
      await writeClient
        .patch(tenant._id)
        .set({
          'subscription.stripeCustomerId': customerId,
          'subscription.plan': plan,
          'subscription.billing': billing,
          'subscription.status': 'pending'
        })
        .commit();
    }

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Error creating platform subscription:', error);
    return NextResponse.json(
      { error: 'Failed to create subscription', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
