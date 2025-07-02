import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { sanityClient, writeClient } from '@/lib/sanity';

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
      const { classId, passId, userId, userEmail, type } = session.metadata || {};

      if (!userId) {
        console.error('Missing userId in webhook metadata:', session);
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
      }

      // Ensure user exists in Sanity
      let user = await sanityClient.fetch(
        `*[_type == "user" && _id == $userId][0]`,
        { userId }
      );

      if (!user) {
        // Create user in Sanity if they don't exist
        try {
          user = await writeClient.create({
            _type: 'user',
            _id: userId,
            name: session.customer_details?.name || 'User',
            email: userEmail || session.customer_email || '',
            role: 'student',
          });
        } catch (error) {
          console.error('Error creating user in Sanity:', error);
          return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
        }
      }

      if (type === 'pass_purchase' && passId) {
        // Handle pass purchase
        const pass = await sanityClient.fetch(
          `*[_type == "pass" && _id == $passId && isActive == true][0]`,
          { passId }
        );

        if (!pass) {
          console.error('Pass not found:', passId);
          return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
        }

        const now = new Date();
        const endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);

        // Determine subscription type and remaining clips based on pass type
        let subscriptionType: string;
        let remainingClips: number | undefined;

        switch (pass.type) {
          case 'single':
            subscriptionType = 'single';
            remainingClips = 1;
            break;
          case 'multi-pass':
            subscriptionType = 'multi-pass';
            remainingClips = pass.classesLimit;
            break;
          case 'multi':
            subscriptionType = 'clipcard';
            remainingClips = pass.classesLimit;
            break;
          case 'unlimited':
            subscriptionType = 'monthly';
            remainingClips = undefined; // Unlimited
            break;
          default:
            console.error('Invalid pass type:', pass.type);
            return NextResponse.json({ error: 'Invalid pass type' }, { status: 400 });
        }

        // Create subscription
        await writeClient.create({
          _type: 'subscription',
          user: {
            _type: 'reference',
            _ref: userId,
          },
          type: subscriptionType,
          passId: pass._id,
          passName: pass.name,
          startDate: now.toISOString(),
          endDate: endDate.toISOString(),
          remainingClips,
          isActive: true,
          stripePaymentId: session.payment_intent as string,
          purchasePrice: pass.price,
        });

        console.log(`Created subscription for user ${userId} with pass ${pass.name}`);
      } else if (classId) {
        // Handle class booking (existing logic)
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
