import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanity';
import { resolveUserReferenceIds } from '@/lib/user-references';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await request.json();
    
    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    console.log('🔍 Checking subscription status for session:', sessionId);
    const userReferenceIds = await resolveUserReferenceIds(userId);

    // Check if subscription exists for this session
    const subscription = await sanityClient.fetch(
      `*[_type == "subscription" && stripeSessionId == $sessionId && (user._ref in $userReferenceIds || user->clerkId == $userId)][0] {
        _id,
        type,
        passName,
        startDate,
        endDate,
        remainingClips,
        isActive,
        createdViaWebhook
      }`,
      { sessionId, userId, userReferenceIds }
    );

    if (subscription) {
      console.log('✅ Subscription found:', subscription._id);
      return NextResponse.json({ 
        found: true, 
        subscription,
        message: 'Subscription created successfully'
      });
    }

    // Check webhook logs to see if there was an error
    const webhookLog = await sanityClient.fetch(
      `*[_type == "webhookLog" && details.sessionId == $sessionId] | order(timestamp desc)[0] {
        eventType,
        status,
        details,
        timestamp
      }`,
      { sessionId }
    );

    if (webhookLog) {
      if (webhookLog.status === 'error') {
        console.log('❌ Webhook processing failed for session:', sessionId);
        return NextResponse.json({ 
          found: false, 
          webhookError: true,
          error: webhookLog.details?.error || 'Webhook processing failed',
          message: 'There was an issue processing your payment. Please contact support.'
        });
      } else if (webhookLog.status === 'processing') {
        console.log('⏳ Webhook still processing for session:', sessionId);
        return NextResponse.json({ 
          found: false, 
          processing: true,
          message: 'Your payment is being processed. Please wait...'
        });
      }
    }

    console.log('⏳ Subscription not found yet for session:', sessionId);
    return NextResponse.json({ 
      found: false,
      message: 'Waiting for payment confirmation...'
    });

  } catch (error) {
    console.error('❌ Error checking subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to check subscription status', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
