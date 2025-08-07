import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { passId, successUrl, cancelUrl } = await request.json();

    if (!passId) {
      return NextResponse.json({ error: 'Pass ID is required' }, { status: 400 });
    }

    // Get tenant slug from header
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant slug is required' }, { status: 400 });
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
          slug
        }
      }
    `, { passId });

    if (!passData) {
      return NextResponse.json({ error: 'Pass not found or inactive' }, { status: 404 });
    }

    // Create description based on pass type
    let description = passData.description || '';
    if (passData.type === 'unlimited') {
      description += ` - Unlimited classes for ${passData.validityDays} days`;
    } else if (['single', 'multi-pass', 'multi'].includes(passData.type)) {
      description += ` - ${passData.classesLimit} classes valid for ${passData.validityDays} days`;
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: STRIPE_CONFIG.payment_method_types as any,
      line_items: [
        {
          price_data: {
            currency: STRIPE_CONFIG.currency,
            product_data: {
              name: passData.name,
              description: description,
              metadata: {
                passId: passData._id,
                passType: passData.type,
                userId: userId,
              },
            },
            unit_amount: Math.round(passData.price * 100), // Convert to øre (smallest currency unit)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${request.nextUrl.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=pass`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/subscriptions`,
      metadata: {
        passId: passData._id,
        passType: passData.type,
        userId: userId,
        type: 'pass_purchase',
        tenantId: passData.tenant?._id,
        tenantSlug: passData.tenant?.slug?.current || tenantSlug,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe pass checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
