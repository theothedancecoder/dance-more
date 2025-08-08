import { NextRequest, NextResponse } from 'next/server';
import { stripeConnect, STRIPE_CONFIG } from '@/lib/stripe';
import { getServerUser } from '@/lib/auth';
import { sanityClient } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant from headers
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const { classId, successUrl, cancelUrl } = await request.json();

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Fetch class details with tenant info from Sanity
    const classData = await sanityClient.fetch(`
      *[_type == "class" && _id == $classId][0] {
        _id,
        title,
        price,
        duration,
        instructor->{
          name
        },
        tenant->{
          _id,
          schoolName,
          slug,
          stripeConnect
        }
      }
    `, { classId });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Verify class belongs to the correct tenant
    if (classData.tenant._id !== tenantId) {
      return NextResponse.json({ error: 'Class not found in this tenant' }, { status: 404 });
    }

    // Check if tenant has Stripe Connect account
    if (!classData.tenant.stripeConnect?.accountId) {
      return NextResponse.json({ 
        error: 'Payment processing not available. Please contact the school administrator.' 
      }, { status: 400 });
    }

    // Check if Stripe Connect account is active
    if (!classData.tenant.stripeConnect.chargesEnabled) {
      return NextResponse.json({ 
        error: 'Payment processing is temporarily unavailable. Please try again later.' 
      }, { status: 400 });
    }

    const tenantSlug = classData.tenant.slug?.current;
    const currency = classData.tenant.stripeConnect.currency || STRIPE_CONFIG.currency;
    const applicationFeePercent = classData.tenant.stripeConnect.applicationFeePercent || 5;

    // Create Stripe Connect checkout session
    const session = await stripeConnect.createCheckoutSession({
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: classData.title,
              description: `Dance class with ${classData.instructor?.name || 'instructor'} - ${classData.duration} minutes`,
              metadata: {
                classId: classData._id,
                userId: user.id,
                tenantId: classData.tenant._id,
              },
            },
            unit_amount: Math.round(classData.price * 100), // Convert to smallest currency unit
          },
          quantity: 1,
        },
      ],
      connectedAccountId: classData.tenant.stripeConnect.accountId,
      applicationFeePercent,
      success_url: successUrl || `${request.nextUrl.origin}/${tenantSlug}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/${tenantSlug}/classes/${classData._id}`,
      customer_email: user.email,
      metadata: {
        classId: classData._id,
        userId: user.id,
        userEmail: user.email,
        tenantId: classData.tenant._id,
        tenantSlug: tenantSlug,
      },
    });

    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url,
      connectedAccountId: classData.tenant.stripeConnect.accountId
    });
  } catch (error) {
    console.error('Stripe Connect checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
