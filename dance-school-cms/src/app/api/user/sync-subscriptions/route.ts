import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { uncachedSanityClient, writeClient } from '@/lib/sanity';
import { stripe } from '@/lib/stripe';

function getSubscriptionDetailsFromPass(pass: {
  _id: string;
  type: string;
  classesLimit?: number;
}) {
  switch (pass.type) {
    case 'single':
      return { subscriptionType: 'single', remainingClips: 1 as number | undefined };
    case 'multi-pass':
      return { subscriptionType: 'multi-pass', remainingClips: pass.classesLimit };
    case 'multi':
      return { subscriptionType: 'clipcard', remainingClips: pass.classesLimit };
    case 'unlimited':
      return { subscriptionType: 'monthly', remainingClips: undefined };
    default:
      throw new Error(`Invalid pass type: ${pass.type}`);
  }
}

function getSessionType(session: { metadata?: Record<string, string | undefined> }) {
  const sessionType = session.metadata?.type;
  if (sessionType === 'pass_purchase' || sessionType === 'pass_upgrade') {
    return sessionType;
  }
  const passType = session.metadata?.passType;
  if (passType === 'pass_purchase' || passType === 'pass_upgrade') {
    return passType;
  }
  return undefined;
}

function sessionMatchesUser(
  session: {
    metadata?: Record<string, string | undefined>;
    client_reference_id?: string | null;
    customer_details?: { email?: string | null } | null;
    customer_email?: string | null;
    payment_status?: string | null;
    status?: string | null;
  },
  userId: string,
  tenantId: string,
  userEmail?: string | null
) {
  const metadata = session.metadata || {};
  const metadataUserId = metadata.userId || session.client_reference_id;
  const metadataTenantId = metadata.tenantId || metadata.tenant || metadata.tenant_id;
  const sessionEmail = session.customer_details?.email || session.customer_email;
  const matchesUser =
    metadataUserId === userId ||
    (!!userEmail && !!sessionEmail && sessionEmail.toLowerCase() === userEmail.toLowerCase());
  const matchesTenant =
    !metadataTenantId || metadataTenantId === tenantId || metadataTenantId === String(tenantId);
  const isRecoverableType = getSessionType(session) !== undefined;
  const isPaid = session.payment_status === 'paid' || session.status === 'complete';

  return matchesUser && matchesTenant && isRecoverableType && isPaid;
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantSlug = request.headers.get('x-tenant-slug');
    
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant slug required' }, { status: 400 });
    }

    // Get tenant info
    const tenant = await uncachedSanityClient.fetch(
      `*[_type == "tenant" && slug.current == $tenantSlug][0]{ _id, schoolName }`,
      { tenantSlug }
    );

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    console.log('🔄 Syncing subscriptions for user:', userId, 'tenant:', tenant.schoolName);

    // Ensure user exists in Sanity first (match webhook model by clerkId)
    let user = await uncachedSanityClient.fetch(
      `*[_type == "user" && clerkId == $userId][0]`,
      { userId }
    );

    if (!user) {
      console.log('👤 Creating user in Sanity during sync with Clerk ID:', userId);
      try {
        user = await writeClient.create({
          _type: 'user',
          clerkId: userId,
          name: 'User', // Will be updated when we have more info
          email: '', // Will be updated when we have more info
          role: 'student',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('✅ User created during sync:', user._id);
      } catch (error) {
        console.error('❌ Failed to create user during sync:', error);
        return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
      }
    }

    // Check for recent Stripe sessions for this user that might not have been processed
    // Increased to 30 days to catch any missed subscriptions
    const recentSessions = await stripe.checkout.sessions.list({
      limit: 100,
      created: {
        gte: Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000),
      },
    });

    const userSessions = recentSessions.data.filter(session =>
      sessionMatchesUser(session, userId, tenant._id, user.email)
    );

    console.log('💳 Found recent paid sessions for user:', userSessions.length);

    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const session of userSessions) {
      const metadata = session.metadata || {};
      const sessionType = getSessionType(session);
      const upgradeFromSubscriptionId = metadata.upgradeFromSubscriptionId;
      let passId = metadata.passId || metadata.pass_id;
      
      if (!passId) {
        const passName = metadata.passName || metadata.pass_name || metadata.productName;
        if (passName) {
          const recoveredPass = await uncachedSanityClient.fetch(
            `*[_type == "pass" && tenant._ref == $tenantId && isActive == true && name == $passName][0] {
              _id,
              name,
              type,
              classesLimit,
              price,
              validityDays,
              validityType,
              expiryDate
            }`,
            { tenantId: tenant._id, passName }
          );

          if (recoveredPass) {
            passId = recoveredPass._id;
            console.log('🔎 Recovered pass ID from pass name for session:', session.id, recoveredPass._id);
          }
        }
      }

      if (!passId) {
        const msg = `Session ${session.id}: missing passId in metadata and no recoverable pass name`;
        console.log('⚠️', msg);
        errors.push(msg);
        errorCount++;
        continue;
      }

      if (!sessionType || !['pass_purchase', 'pass_upgrade'].includes(sessionType)) {
        const msg = `Session ${session.id}: unsupported session type "${sessionType || 'undefined'}"`;
        console.log('⚠️', msg);
        errors.push(msg);
        errorCount++;
        continue;
      }

      // Get pass details
      const pass = await uncachedSanityClient.fetch(
        `*[_type == "pass" && _id == $passId && isActive == true][0]`,
        { passId }
      );

      if (!pass) {
        const fallbackPass = await uncachedSanityClient.fetch(
          `*[_type == "pass" && tenant._ref == $tenantId && isActive == true && name == $passName][0]`,
          { tenantId: tenant._id, passName: metadata.passName || metadata.pass_name || metadata.productName }
        );
        if (!fallbackPass) {
          console.log('❌ Pass not found:', passId);
          continue;
        }
      }

      const { subscriptionType, remainingClips } = getSubscriptionDetailsFromPass(pass);

      // Check if subscription already exists for this session (using both session ID and payment ID)
      const existingSubscription = await uncachedSanityClient.fetch(
        `*[_type == "subscription" && (stripeSessionId == $sessionId || stripePaymentId == $paymentId)][0]{
          _id,
          type,
          remainingClips,
          passId,
          passName,
          "tenantRef": tenant._ref,
          "userRef": user._ref
        }`,
        { sessionId: session.id, paymentId: session.payment_intent }
      );

      if (existingSubscription) {
        const shouldRepairType = existingSubscription.type !== subscriptionType;
        const shouldRepairTenant = existingSubscription.tenantRef !== tenant._id;
        const shouldRepairUser = existingSubscription.userRef !== user._id;
        const shouldRepairPassName = existingSubscription.passName !== pass.name;
        const shouldRepairPassId = existingSubscription.passId !== pass._id;
        const shouldRepairClipCount =
          subscriptionType === 'clipcard' &&
          typeof remainingClips === 'number' &&
          typeof existingSubscription.remainingClips === 'number' &&
          existingSubscription.type === 'single' &&
          existingSubscription.remainingClips <= 1;

        if (
          shouldRepairType ||
          shouldRepairTenant ||
          shouldRepairUser ||
          shouldRepairPassName ||
          shouldRepairPassId ||
          shouldRepairClipCount
        ) {
          const adjustedRemainingClips = shouldRepairClipCount
            ? Math.max(0, remainingClips - Math.max(0, 1 - existingSubscription.remainingClips))
            : remainingClips;

          await writeClient
            .patch(existingSubscription._id)
            .set({
              user: { _type: 'reference', _ref: user._id },
              tenant: { _type: 'reference', _ref: tenant._id },
              type: subscriptionType,
              remainingClips: adjustedRemainingClips,
              passId: pass._id,
              passName: pass.name,
            })
            .commit();

          console.log('🛠️ Repaired existing subscription for session:', session.id, {
            subscriptionId: existingSubscription._id,
            previousType: existingSubscription.type,
            repairedType: subscriptionType,
            repairedRemainingClips: adjustedRemainingClips,
          });
          createdCount++;
          continue;
        }

        console.log('✅ Subscription already exists for session:', session.id);
        skippedCount++;
        continue;
      }

      // Create the missing subscription
      const sessionDate = new Date(session.created * 1000);
      let endDate: Date;

      // Align expiry logic with webhook route
      if (pass.validityType === 'date' && pass.expiryDate) {
        endDate = new Date(pass.expiryDate);
      } else if (pass.validityType === 'days' && pass.validityDays) {
        endDate = new Date(sessionDate.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
      } else if (pass.validityDays) {
        // Fallback for legacy pass docs without validityType
        endDate = new Date(sessionDate.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
      } else {
        const expiryError = `Pass ${pass._id} has no valid expiry configuration`;
        console.error('❌', expiryError);
        errors.push(`Session ${session.id}: ${expiryError}`);
        errorCount++;
        continue;
      }

      const promoCode = session.metadata?.promoCode || null;
      const originalPrice = session.metadata?.originalPrice ? parseFloat(session.metadata.originalPrice) : null;
      const finalPrice = session.metadata?.finalPrice ? parseFloat(session.metadata.finalPrice) : null;
      const discountAmount = session.metadata?.discountAmount ? parseFloat(session.metadata.discountAmount) : 0;

      const subscriptionData = {
        _type: 'subscription',
        user: {
          _type: 'reference',
          _ref: user._id,
        },
        tenant: {
          _type: 'reference',
          _ref: tenant._id,
        },
        type: subscriptionType,
        startDate: sessionDate.toISOString(),
        endDate: endDate.toISOString(),
        remainingClips,
        passId: pass._id, // Store original pass ID
        passName: pass.name,
        purchasePrice: session.amount_total ? session.amount_total / 100 : pass.price,
        originalPrice: originalPrice ?? pass.price,
        finalPrice: finalPrice ?? (session.amount_total ? session.amount_total / 100 : pass.price),
        discountAmount: discountAmount || 0,
        promoCode,
        stripePaymentId: session.payment_intent as string,
        stripeSessionId: session.id, // Add session ID for proper tracking
        isActive: true,
        isUpgrade: sessionType === 'pass_upgrade',
        upgradedFromSubscriptionId: sessionType === 'pass_upgrade' ? upgradeFromSubscriptionId : undefined,
        upgradeCost: sessionType === 'pass_upgrade' && metadata.upgradeCost
          ? parseFloat(metadata.upgradeCost)
          : undefined,
      };

      try {
        const createdSubscription = await writeClient.create(subscriptionData);
        console.log('🎉 Created missing subscription:', createdSubscription._id, 'for pass:', pass.name);
        console.log('📋 Subscription details:', {
          id: createdSubscription._id,
          type: subscriptionType,
          passName: pass.name,
          remainingClips,
          validUntil: endDate.toISOString(),
          sessionId: session.id
        });
        createdCount++;
      } catch (error) {
        console.error('❌ Failed to create subscription for session:', session.id);
        if (error instanceof Error) {
          console.error('Error details:', error.message);
          errors.push(`Session ${session.id}: ${error.message}`);
        }
        errorCount++;
      }
    }

    const message = `Synced ${createdCount} missing subscriptions, skipped ${skippedCount} existing ones${errorCount > 0 ? `, ${errorCount} errors` : ''}`;
    console.log('✅ Sync complete:', message);

    return NextResponse.json({ 
      success: true, 
      message,
      createdCount,
      skippedCount,
      errorCount,
      errors: errorCount > 0 ? errors : undefined,
      totalSessionsFound: userSessions.length
    });

  } catch (error) {
    console.error('❌ Sync subscriptions error:', error);
    return NextResponse.json(
      { error: 'Failed to sync subscriptions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
