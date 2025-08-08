import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient, writeClient } from '@/lib/sanity';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Get subscription status
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Get tenant subscription info
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && _id == $tenantId && ownerId == $userId][0] {
        _id,
        schoolName,
        subscription
      }`,
      { tenantId, userId }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found or access denied' }, { status: 404 });
    }

    let subscriptionDetails = null;

    // If tenant has a Stripe subscription, get details from Stripe
    if (tenant.subscription?.subscriptionId) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(tenant.subscription.subscriptionId);
        
        let nextInvoiceAmount = 0;
        let nextInvoiceDate = null;
        
        try {
          const upcomingInvoice = await stripe.invoices.list({
            subscription: stripeSubscription.id,
            limit: 1,
          });
          
          if (upcomingInvoice.data.length > 0) {
            const invoice = upcomingInvoice.data[0];
            nextInvoiceAmount = (invoice.amount_due || 0) / 100;
            nextInvoiceDate = invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000) : null;
          }
        } catch (invoiceError) {
          console.error('Error fetching upcoming invoice:', invoiceError);
        }

        subscriptionDetails = {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          plan: tenant.subscription.plan,
          billing: tenant.subscription.billing,
          currentPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
          nextInvoiceAmount,
          nextInvoiceDate,
          cancelAtPeriodEnd: (stripeSubscription as any).cancel_at_period_end,
        };
      } catch (stripeError) {
        console.error('Error fetching Stripe subscription:', stripeError);
      }
    }

    return NextResponse.json({
      tenant: {
        id: tenant._id,
        name: tenant.schoolName,
        subscription: tenant.subscription || { plan: 'free', status: 'inactive' }
      },
      subscriptionDetails
    });

  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// Cancel subscription
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId } = await request.json();

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    // Get tenant subscription info
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && _id == $tenantId && ownerId == $userId][0] {
        _id,
        subscription
      }`,
      { tenantId, userId }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found or access denied' }, { status: 404 });
    }

    if (!tenant.subscription?.subscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // Cancel subscription at period end
    const canceledSubscription = await stripe.subscriptions.update(
      tenant.subscription.subscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    // Update tenant subscription status
    await writeClient
      .patch(tenant._id)
      .set({
        'subscription.status': 'canceling',
        'subscription.cancelAtPeriodEnd': true,
        'subscription.canceledAt': new Date().toISOString(),
      })
      .commit();

    return NextResponse.json({
      success: true,
      message: 'Subscription will be canceled at the end of the current billing period',
      periodEnd: new Date((canceledSubscription as any).current_period_end * 1000)
    });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}

// Reactivate subscription
export async function PATCH(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tenantId, action } = await request.json();

    if (!tenantId || !action) {
      return NextResponse.json({ error: 'Tenant ID and action required' }, { status: 400 });
    }

    // Get tenant subscription info
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && _id == $tenantId && ownerId == $userId][0] {
        _id,
        subscription
      }`,
      { tenantId, userId }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found or access denied' }, { status: 404 });
    }

    if (!tenant.subscription?.subscriptionId) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
    }

    if (action === 'reactivate') {
      // Reactivate subscription
      const reactivatedSubscription = await stripe.subscriptions.update(
        tenant.subscription.subscriptionId,
        {
          cancel_at_period_end: false,
        }
      );

      // Update tenant subscription status
      await writeClient
        .patch(tenant._id)
        .set({
          'subscription.status': 'active',
          'subscription.cancelAtPeriodEnd': false,
        })
        .unset(['subscription.canceledAt'])
        .commit();

      return NextResponse.json({
        success: true,
        message: 'Subscription reactivated successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error managing subscription:', error);
    return NextResponse.json(
      { error: 'Failed to manage subscription' },
      { status: 500 }
    );
  }
}
