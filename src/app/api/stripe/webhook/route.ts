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
      const { classId, selectedDateTime, passId, userId, userEmail, type, subscriptionId, currentPassId, newPassId } = metadata;

      console.log('🔍 Webhook received:', {
        sessionId: session.id,
        type: type,
        classId: classId,
        passId: passId,
        subscriptionId: subscriptionId,
        currentPassId: currentPassId,
        newPassId: newPassId,
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

      // Handle pass upgrades
      if (subscriptionId && newPassId && type === 'pass_upgrade') {
        console.log('🔄 Processing pass upgrade:', { subscriptionId, newPassId });
        
        // Fetch the subscription to upgrade
        const existingSubscription = await sanityClient.fetch(`
          *[_type == "subscription" && _id == $subscriptionId][0] {
            _id,
            passName,
            passId,
            startDate,
            endDate,
            classesUsed,
            classesLimit,
            isActive
          }
        `, { subscriptionId });

        if (!existingSubscription) {
          console.error('Subscription not found for upgrade:', subscriptionId);
          return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
        }

        // Fetch new pass details
        const newPass = await sanityClient.fetch(`
          *[_type == "pass" && _id == $newPassId][0] {
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
        `, { newPassId });

        if (!newPass) {
          console.error('New pass not found:', newPassId);
          return NextResponse.json({ error: 'New pass not found' }, { status: 404 });
        }

        console.log('📋 New pass details:', newPass);

        // Calculate new expiry date based on new pass configuration
        // For upgrades, we preserve the original start date and extend based on new pass validity
        const originalStartDate = new Date(existingSubscription.startDate);
        let newEndDate: Date;

        if (newPass.validityType === 'date' && newPass.expiryDate) {
          // Use fixed expiry date
          newEndDate = new Date(newPass.expiryDate);
          console.log('📅 Using fixed expiry date for upgrade:', newEndDate);
        } else if (newPass.validityType === 'days' && newPass.validityDays) {
          // Use validity days from original start date
          newEndDate = new Date(originalStartDate.getTime() + newPass.validityDays * 24 * 60 * 60 * 1000);
          console.log('📅 Calculated new expiry from validityDays:', newEndDate, `(${newPass.validityDays} days from start)`);
        } else if (newPass.validityDays) {
          // Fallback to validityDays if validityType is not set
          newEndDate = new Date(originalStartDate.getTime() + newPass.validityDays * 24 * 60 * 60 * 1000);
          console.log('📅 Fallback to validityDays for upgrade:', newEndDate, `(${newPass.validityDays} days from start)`);
        } else {
          // Keep the original end date if new pass doesn't have validity configuration
          newEndDate = new Date(existingSubscription.endDate);
          console.log('📅 Keeping original end date for upgrade:', newEndDate);
        }

        // Map new pass type to subscription type and calculate remaining clips
        let newSubscriptionType: string;
        let newRemainingClips: number | undefined;

        switch (newPass.type) {
          case 'single':
            newSubscriptionType = 'single';
            newRemainingClips = 1;
            break;
          case 'multi-pass':
            newSubscriptionType = 'multi-pass';
            newRemainingClips = newPass.classesLimit;
            break;
          case 'multi':
            newSubscriptionType = 'clipcard';
            newRemainingClips = newPass.classesLimit;
            break;
          case 'unlimited':
            newSubscriptionType = 'monthly';
            newRemainingClips = undefined; // Unlimited
            break;
          default:
            console.error('❌ Unknown new pass type:', newPass.type);
            newSubscriptionType = 'single';
            newRemainingClips = 1;
        }

        console.log('📋 Upgrade subscription mapping:', {
          newPassType: newPass.type,
          newSubscriptionType,
          newClassesLimit: newPass.classesLimit,
          newRemainingClips
        });

        // Update the existing subscription with new pass details
        const updatedSubscription = await sanityClient
          .patch(subscriptionId)
          .set({
            passName: newPass.name,
            passId: newPass._id,
            type: newSubscriptionType,
            endDate: newEndDate.toISOString(),
            classesLimit: newPass.classesLimit || null,
            remainingClips: newRemainingClips,
            // Preserve existing classesUsed and startDate
            updatedAt: new Date().toISOString(),
            // Add upgrade tracking
            upgradeHistory: [
              ...(existingSubscription.upgradeHistory || []),
              {
                fromPassId: existingSubscription.passId,
                fromPassName: existingSubscription.passName,
                toPassId: newPass._id,
                toPassName: newPass.name,
                upgradeDate: new Date().toISOString(),
                stripeSessionId: session.id,
                upgradeCost: session.amount_total
              }
            ]
          })
          .commit();

        console.log('✅ Subscription upgraded:', updatedSubscription._id);

      }
      // Handle pass purchases
      else if (passId && type === 'pass_purchase') {
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

        // Map pass type to subscription type and calculate remaining clips
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
            console.error('❌ Unknown pass type:', pass.type);
            subscriptionType = 'single';
            remainingClips = 1;
        }

        console.log('📋 Subscription mapping:', {
          passType: pass.type,
          subscriptionType,
          classesLimit: pass.classesLimit,
          remainingClips
        });

        // Create subscription document in Sanity
        const subscription = await sanityClient.create({
          _type: 'subscription',
          passName: pass.name,
          passId: pass._id,
          type: subscriptionType,
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
          remainingClips: remainingClips,
          purchasePrice: session.amount_total ? session.amount_total / 100 : pass.price,
          stripeSessionId: session.id,
          stripePaymentId: session.payment_intent as string,
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
        console.log('📚 Processing class booking:', classId, 'DateTime:', selectedDateTime);

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
          bookingDateTime: selectedDateTime || new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        console.log('✅ Booking created:', booking._id, 'for date:', selectedDateTime);

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
