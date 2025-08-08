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

      if (type === 'pass_purchase' && passId && tenantId) {
        console.log('🎫 Processing pass purchase:', { passId, tenantId, userId, sessionId: session.id });
        
        // First check if subscription already exists for this session to prevent duplicates
        const existingSubscription = await sanityClient.fetch(
          `*[_type == "subscription" && stripeSessionId == $sessionId][0]`,
          { sessionId: session.id }
        );

        if (existingSubscription) {
          console.log('✅ Subscription already exists for session:', session.id);
          return NextResponse.json({ received: true, message: 'Subscription already exists' });
        }

        // Ensure user exists in Sanity with consistent ID handling
        let user = await sanityClient.fetch(
          `*[_type == "user" && _id == $userId][0]`,
          { userId }
        );

        if (!user) {
          console.log('👤 Creating new user in Sanity:', userId);
          try {
            user = await writeClient.create({
              _type: 'user',
              _id: userId,
              name: session.customer_details?.name || 'User',
              email: userEmail || session.customer_email || '',
              role: 'student',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
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
            
            // Don't fail the webhook - let the sync mechanism handle it
            console.log('⚠️ Continuing without user creation - sync mechanism will handle this');
          }
        } else {
          console.log('✅ User found in Sanity:', user._id);
        }
        
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

        // Create subscription with proper session tracking and user reference
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
          startDate: new Date(session.created * 1000).toISOString(), // Use session creation time
          endDate: endDate.toISOString(),
          remainingClips,
          passId: pass._id, // Store original pass ID
          passName: pass.name,
          purchasePrice: session.amount_total ? session.amount_total / 100 : pass.price,
          stripePaymentId: session.payment_intent as string,
          stripeSessionId: session.id, // Add session ID for deduplication
          isActive: true,
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
            tenantId,
            sessionId: session.id
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
          
          // Don't return error - let the sync mechanism handle failed subscriptions
          console.log('⚠️ Webhook will continue - sync mechanism will catch this subscription');
        }
      } else if (classId) {
        // Handle class booking (existing logic with improved user handling)
        let sanityUser = await sanityClient.fetch(
          `*[_type == "user" && _id == $userId][0]`,
          { userId }
        );

        if (!sanityUser) {
          try {
            // Create user document in Sanity with consistent ID
            sanityUser = await writeClient.create({
              _type: 'user',
              _id: userId,
              email: userEmail || session.customer_email,
              name: session.customer_details?.name || 'Unknown User',
              role: 'student',
              isActive: true,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          } catch (error) {
            console.error('❌ Error creating user for booking:', error);
            // Continue with booking even if user creation fails
          }
        }

        if (sanityUser) {
          try {
            // Create booking document in Sanity
            await writeClient.create({
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
            console.log('✅ Booking created successfully');
          } catch (error) {
            console.error('❌ Error creating booking:', error);
          }
        }
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
