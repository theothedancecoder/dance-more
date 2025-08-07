import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { sanityClient, writeClient } from '@/lib/sanity';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  console.log('🔔 Stripe webhook received');
  
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature')!;

    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log('✅ Webhook signature verified');
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('📨 Webhook event type:', event.type);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { classId, passId, userId, userEmail, type, tenantId, tenantSlug } = session.metadata || {};

      console.log('💳 Checkout session completed:', {
        sessionId: session.id,
        metadata: session.metadata,
        customer_email: session.customer_email,
        amount_total: session.amount_total
      });

      if (!userId) {
        console.error('❌ Missing userId in webhook metadata:', session);
        return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
      }

      // Ensure user exists in Sanity
      let user = await sanityClient.fetch(
        `*[_type == "user" && _id == $userId][0]`,
        { userId }
      );

      if (!user) {
        console.log('👤 Creating new user in Sanity:', userId);
        // Create user in Sanity if they don't exist
        try {
          user = await writeClient.create({
            _type: 'user',
            _id: userId,
            name: session.customer_details?.name || 'User',
            email: userEmail || session.customer_email || '',
            role: 'student',
          });
          console.log('✅ User created successfully:', user._id);
        } catch (error) {
          console.error('❌ Error creating user in Sanity:', error);
          
          // If it's a permissions error, log detailed info
          if (error instanceof Error && error.message.includes('permission')) {
            console.error('🔒 SANITY PERMISSIONS ERROR - This is why subscriptions are not being created automatically!');
            console.error('🔧 Fix: Update SANITY_API_TOKEN to have Editor permissions');
            console.error('📖 See SANITY_PERMISSIONS_FIX.md for detailed instructions');
          }
          
          return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
        }
      } else {
        console.log('✅ User found in Sanity:', user._id);
      }

      if (type === 'pass_purchase' && passId && tenantId) {
        console.log('🎫 Processing pass purchase:', { passId, tenantId, userId });
        
        // Handle pass purchase
        const pass = await sanityClient.fetch(
          `*[_type == "pass" && _id == $passId && isActive == true][0]`,
          { passId }
        );

        console.log('🔍 Found pass:', pass ? `${pass.name} (${pass.type})` : 'NOT FOUND');

        if (!pass) {
          console.error('❌ Pass not found:', passId);
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
            console.error('❌ Invalid pass type:', pass.type);
            return NextResponse.json({ error: 'Invalid pass type' }, { status: 400 });
        }

        // Create subscription
        const subscriptionData = {
          _type: 'subscription',
          user: {
            _type: 'reference',
            _ref: userId,
          },
          tenant: {
            _type: 'reference',
            _ref: tenantId,
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
        };

        console.log('📝 Creating subscription with data:', subscriptionData);

        try {
          const createdSubscription = await writeClient.create(subscriptionData);
          console.log('🎉 SUCCESS! Created subscription:', createdSubscription._id);
          console.log(`✅ User ${userId} now has ${pass.name} pass (${subscriptionType})`);
          
          // Log success for debugging
          console.log('🔍 Subscription details:', {
            id: createdSubscription._id,
            type: subscriptionType,
            passName: pass.name,
            remainingClips,
            validUntil: endDate.toISOString(),
            userId,
            tenantId
          });
          
        } catch (error) {
          console.error('❌ CRITICAL ERROR: Failed to create subscription:', error);
          
          // Enhanced error logging for permissions issues
          if (error instanceof Error) {
            console.error('📋 Error details:', {
              message: error.message,
              name: error.name,
              stack: error.stack?.split('\n').slice(0, 3).join('\n')
            });
            
            if (error.message.includes('permission') || error.message.includes('Insufficient')) {
              console.error('🔒 SANITY PERMISSIONS ERROR DETECTED!');
              console.error('🚨 This is why customers\' passes are not appearing automatically!');
              console.error('🔧 SOLUTION: Update your SANITY_API_TOKEN to have Editor permissions');
              console.error('📖 See SANITY_PERMISSIONS_FIX.md for step-by-step instructions');
              console.error('🌐 Or use the Sanity Studio at http://localhost:3000/studio to create subscriptions manually');
            }
          }
          
          return NextResponse.json({ 
            error: 'Failed to create subscription',
            details: error instanceof Error ? error.message : 'Unknown error',
            solution: 'Check SANITY_PERMISSIONS_FIX.md for instructions'
          }, { status: 500 });
        }
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
