import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createClient } from '@sanity/client';

// Create Sanity client
const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  token: process.env.SANITY_API_TOKEN!,
  useCdn: false,
  apiVersion: '2023-05-03',
});

export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔍 Fetching passes for user:', clerkUser.id, clerkUser.emailAddresses[0]?.emailAddress);

    // Fetch user's subscriptions from Sanity using Clerk ID
    const subscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && user->clerkId == $userId] | order(_createdAt desc) {
        _id,
        passName,
        passId,
        type,
        startDate,
        endDate,
        isActive,
        classesUsed,
        classesLimit,
        stripeSessionId,
        paymentStatus,
        amount,
        currency,
        _createdAt,
        _updatedAt,
        "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }
    `, { userId: clerkUser.id });

    console.log('✅ Found subscriptions:', subscriptions.length);
    subscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName} - Active: ${sub.isActive}, Expired: ${sub.isExpired}`);
    });

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error('❌ Error fetching user passes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch passes' },
      { status: 500 }
    );
  }
}
