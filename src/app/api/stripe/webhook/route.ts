import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { sanityClient } from '@/lib/sanity';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature')!;

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { classId, userId, userEmail } = session.metadata || {};

      if (!classId || !userId) {
        console.error('Missing metadata in webhook:', session);
        return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
      }

      // Check if user exists in Sanity, create if not
      let sanityUser = await sanityClient.fetch(
        `*[_type == "user" && clerkId == $userId][0]`,
        { userId }
      );

      if (!sanityUser) {
        // Create user document in Sanity
        sanityUser = await sanityClient.create({
          _type: 'user',
          clerkId: userId,
          email: userEmail || session.customer_email,
          name: session.customer_details?.name || 'Unknown User',
          role: 'student',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }

      // Create booking document in Sanity
      await sanityClient.create({
        _type: 'booking',
        class: {
          _type: 'reference',
          _ref: classId
        },
        user: {
          _type: 'reference',
          _ref: sanityUser._id
        },
        status: 'confirmed',
        paymentId: session.payment_intent as string,
        paymentStatus: 'completed',
        amount: session.amount_total,
        currency: session.currency,
        email: userEmail || session.customer_email,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Disable body parsing, as we need the raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
