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
      const metadata = session.metadata || {};
      const { classId, passId, userId, userEmail, type } = metadata;

      console.log('🔍 Webhook received:', {
        sessionId: session.id,
        type: type,
        classId: classId,
        passId: passId,
        userId: userId,
        metadata: metadata
      });

      if (!userId) {
        console.error('Missing userId in webhook metadata:', session);
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
      }

      // Check if user exists in Sanity, create if not
      let sanityUser = await sanityClient.fetch(
        `*[_type == "user" && clerkId == $userId][0]`,
        { userId }
      );

      if (!sanityUser) {
        console.log('Creating new user in Sanity:', userId);
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

      // Handle pass purchases
      if (passId && type === 'pass_purchase') {
        console.log('🎫 Processing pass purchase:', passId);
        
        // Fetch pass details from Sanity
        const pass = await sanityClient.fetch(`
          *[_type == "pass" && _id == $passId][0] {
            _id,
            name,
            type,
            validityType,
            validityDays,
            expiryDate,
            classesLimit,
            price,
            isActive
          }
        `, { passId });

        if (!pass) {
          console.error('Pass not found:', passId);
          return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
        }

        if (!pass.isActive) {
          console.error('Pass is inactive:', passId);
          return NextResponse.json({ error: 'Pass is no longer available' }, { status: 400 });
        }

        console.log('📋 Pass details:', pass);

        // Calculate expiry date based on pass configuration
        const now = new Date();
        let endDate: Date;

        if (pass.validityType === 'date' && pass.expiryDate) {
          // Use fixed expiry date
          endDate = new Date(pass.expiryDate);
          console.log('📅 Using fixed expiry date:', endDate);
        } else if (pass.validityType === 'days' && pass.validityDays) {
          // Use validity days from now
          endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
          console.log('📅 Calculated expiry from validityDays:', endDate, `(${pass.validityDays} days)`);
        } else if (pass.validityDays) {
          // Fallback to validityDays if validityType is not set
          endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
          console.log('📅 Fallback to validityDays:', endDate, `(${pass.validityDays} days)`);
        } else {
          // Default fallback - 30 days
          endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          console.log('⚠️ Using default 30-day expiry:', endDate);
        }

        // Get tenant information
        const { tenantId, tenantSlug } = metadata;
        let tenantRef = null;
        
        if (tenantId) {
          tenantRef = { _type: 'reference', _ref: tenantId };
        } else if (tenantSlug) {
          // Try to find tenant by slug
          const tenant = await sanityClient.fetch(`
            *[_type == "tenant" && slug.current == $tenantSlug][0] { _id }
          `, { tenantSlug });
          if (tenant) {
            tenantRef = { _type: 'reference', _ref: tenant._id };
          }
        }

        // Create subscription document in Sanity
        const subscription = await sanityClient.create({
          _type: 'subscription',
          passName: pass.name,
          passId: pass._id,
          type: pass.type,
          user: {
            _type: 'reference',
            _ref: sanityUser._id
          },
          tenant: tenantRef,
          startDate: now.toISOString(),
          endDate: endDate.toISOString(),
          isActive: true,
          classesUsed: 0,
          classesLimit: pass.classesLimit || null,
          stripeSessionId: session.id,
          paymentId: session.payment_intent as string,
          paymentStatus: 'completed',
          amount: session.amount_total,
          currency: session.currency,
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        });

        console.log('✅ Subscription created:', subscription._id);

      } 
      // Handle class bookings
      else if (classId) {
        console.log('📚 Processing class booking:', classId);
        
        // Create booking document in Sanity
        const booking = await sanityClient.create({
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

        console.log('✅ Booking created:', booking._id);

      } else {
        console.error('Unknown purchase type - no passId or classId found:', metadata);
        return NextResponse.json({ error: 'Unknown purchase type' }, { status: 400 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('❌ Webhook error:', error);
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
