import { NextRequest, NextResponse } from 'next/server';
import { stripeConnect, STRIPE_CONFIG } from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant from headers
    const tenantId = request.headers.get('x-tenant-id');
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const { passId, successUrl, cancelUrl } = await request.json();

    if (!passId) {
      return NextResponse.json({ error: 'Pass ID is required' }, { status: 400 });
    }

    // Fetch pass details from Sanity with tenant information
    const passData = await sanityClient.fetch(`
      *[_type == "pass" && _id == $passId && isActive == true][0] {
        _id,
        name,
        description,
        type,
        price,
        validityDays,
        classesLimit,
        tenant->{
          _id,
          schoolName,
          slug,
          stripeConnect
        }
      }
    `, { passId });

    if (!passData) {
      return NextResponse.json({ error: 'Pass not found or inactive' }, { status: 404 });
    }

    // Verify pass belongs to the correct tenant
    if (passData.tenant._id !== tenantId) {
      return NextResponse.json({ error: 'Pass not found in this tenant' }, { status: 404 });
    }

    // Check if tenant has Stripe Connect account
    if (!passData.tenant.stripeConnect?.accountId) {
      return NextResponse.json({ 
        error: 'Payment processing not available. Please contact the school administrator.' 
      }, { status: 400 });
    }

    // Check if Stripe Connect account is active
    if (!passData.tenant.stripeConnect.chargesEnabled) {
      return NextResponse.json({ 
        error: 'Payment processing is temporarily unavailable. Please try again later.' 
      }, { status: 400 });
    }

    // Create description based on pass type
    let description = passData.description || '';
    if (passData.type === 'unlimited') {
      description += ` - Unlimited classes for ${passData.validityDays} days`;
    } else if (['single', 'multi-pass', 'multi'].includes(passData.type)) {
      description += ` - ${passData.classesLimit} classes valid for ${passData.validityDays} days`;
    }

    const currency = passData.tenant.stripeConnect.currency || STRIPE_CONFIG.currency;
    const applicationFeePercent = passData.tenant.stripeConnect.applicationFeePercent || 5;
    const finalTenantSlug = passData.tenant.slug?.current || tenantSlug;

    // Create Stripe Connect checkout session
    const session = await stripeConnect.createCheckoutSession({
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: passData.name,
              description: description,
              metadata: {
                passId: passData._id,
                passType: passData.type,
                userId: userId,
                tenantId: passData.tenant._id,
              },
            },
            unit_amount: Math.round(passData.price * 100), // Convert to smallest currency unit
          },
          quantity: 1,
        },
      ],
      connectedAccountId: passData.tenant.stripeConnect.accountId,
      applicationFeePercent,
      success_url: successUrl || `${request.nextUrl.origin}/${finalTenantSlug}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=pass`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/${finalTenantSlug}/subscriptions`,
      metadata: {
        passId: passData._id,
        passType: passData.type,
        userId: userId,
        type: 'pass_purchase',
        tenantId: passData.tenant._id,
        tenantSlug: finalTenantSlug,
      },
    });

    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url,
      connectedAccountId: passData.tenant.stripeConnect.accountId
    });
  } catch (error) {
    console.error('Stripe Connect pass checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
