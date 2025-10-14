import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_CONFIG } from '@/lib/stripe';
import { getServerUser } from '@/lib/auth';
import { sanityClient } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId, selectedDateTime, successUrl, cancelUrl } = await request.json();

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Fetch class details from Sanity
    const classData = await sanityClient.fetch(`
      *[_type == "class" && _id == $classId][0] {
        _id,
        title,
        price,
        duration,
        instructor->{
          name
        }
      }
    `, { classId });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: STRIPE_CONFIG.payment_method_types,
      line_items: [
        {
          price_data: {
            currency: STRIPE_CONFIG.currency,
            product_data: {
              name: classData.title,
              description: `Dance class with ${classData.instructor?.name || 'instructor'} - ${classData.duration} minutes`,
              metadata: {
                classId: classData._id,
                userId: user.id,
              },
            },
            unit_amount: Math.round(classData.price * 100), // Convert to øre (smallest currency unit)
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${request.nextUrl.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/classes/${classData._id}`,
      customer_email: user.email,
      metadata: {
        classId: classData._id,
        selectedDateTime: selectedDateTime || '',
        userId: user.id,
        userEmail: user.email,
      },
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
