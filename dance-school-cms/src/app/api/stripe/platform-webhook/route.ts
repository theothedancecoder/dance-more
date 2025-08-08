import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { sanityClient, writeClient } from '@/lib/sanity';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_PLATFORM_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const sig = headersList.get('stripe-signature');

    if (!sig) {
      console.error('No Stripe signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Platform webhook event:', event.type);

    // Handle platform subscription events
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled platform webhook event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Platform webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log('Platform subscription created:', subscription.id);
  
  const tenantId = subscription.metadata.tenantId;
  const plan = subscription.metadata.plan;
  const billing = subscription.metadata.billing;

  if (!tenantId) {
    console.error('No tenant ID in subscription metadata');
    return;
  }

  try {
    // Update tenant with active subscription
    await writeClient
      .patch(tenantId)
      .set({
        'subscription.subscriptionId': subscription.id,
        'subscription.status': 'active',
        'subscription.plan': plan,
        'subscription.billing': billing,
        'subscription.currentPeriodStart': new Date(subscription.current_period_start * 1000).toISOString(),
        'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000).toISOString(),
        'subscription.activatedAt': new Date().toISOString(),
      })
      .commit();

    console.log(`Tenant ${tenantId} subscription activated`);

    // Log platform revenue
    await logPlatformRevenue({
      tenantId,
      subscriptionId: subscription.id,
      amount: subscription.items.data[0]?.price?.unit_amount || 0,
      currency: subscription.currency,
      plan,
      billing,
      type: 'subscription_created',
    });

  } catch (error) {
    console.error('Error updating tenant subscription:', error);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Platform subscription updated:', subscription.id);
  
  const tenantId = subscription.metadata.tenantId;

  if (!tenantId) {
    console.error('No tenant ID in subscription metadata');
    return;
  }

  try {
    const status = subscription.status === 'active' ? 'active' : 
                  subscription.cancel_at_period_end ? 'canceling' : 
                  subscription.status;

    await writeClient
      .patch(tenantId)
      .set({
        'subscription.status': status,
        'subscription.currentPeriodStart': new Date(subscription.current_period_start * 1000).toISOString(),
        'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000).toISOString(),
        'subscription.cancelAtPeriodEnd': subscription.cancel_at_period_end,
      })
      .commit();

    console.log(`Tenant ${tenantId} subscription updated to ${status}`);
  } catch (error) {
    console.error('Error updating tenant subscription:', error);
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Platform subscription deleted:', subscription.id);
  
  const tenantId = subscription.metadata.tenantId;

  if (!tenantId) {
    console.error('No tenant ID in subscription metadata');
    return;
  }

  try {
    await writeClient
      .patch(tenantId)
      .set({
        'subscription.status': 'canceled',
        'subscription.canceledAt': new Date().toISOString(),
      })
      .commit();

    console.log(`Tenant ${tenantId} subscription canceled`);
  } catch (error) {
    console.error('Error canceling tenant subscription:', error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log('Platform payment succeeded:', invoice.id);
  
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const tenantId = subscription.metadata.tenantId;
    const plan = subscription.metadata.plan;
    const billing = subscription.metadata.billing;

    if (tenantId) {
      // Log successful payment as platform revenue
      await logPlatformRevenue({
        tenantId,
        subscriptionId: subscription.id,
        invoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        plan,
        billing,
        type: 'payment_succeeded',
      });

      console.log(`Platform revenue logged: ${invoice.amount_paid / 100} ${invoice.currency.toUpperCase()}`);
    }
  }
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Platform payment failed:', invoice.id);
  
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const tenantId = subscription.metadata.tenantId;

    if (tenantId) {
      // Update tenant subscription status
      await writeClient
        .patch(tenantId)
        .set({
          'subscription.status': 'past_due',
          'subscription.lastPaymentFailed': new Date().toISOString(),
        })
        .commit();

      console.log(`Tenant ${tenantId} subscription marked as past due`);
    }
  }
}

async function logPlatformRevenue(data: {
  tenantId: string;
  subscriptionId: string;
  invoiceId?: string;
  amount: number;
  currency: string;
  plan: string;
  billing: string;
  type: string;
}) {
  try {
    // Create a platform revenue record in Sanity
    await writeClient.create({
      _type: 'platformRevenue',
      tenantId: data.tenantId,
      subscriptionId: data.subscriptionId,
      invoiceId: data.invoiceId,
      amount: data.amount / 100, // Convert from cents
      currency: data.currency.toUpperCase(),
      plan: data.plan,
      billing: data.billing,
      type: data.type,
      createdAt: new Date().toISOString(),
    });

    console.log('Platform revenue logged successfully');
  } catch (error) {
    console.error('Error logging platform revenue:', error);
  }
}
