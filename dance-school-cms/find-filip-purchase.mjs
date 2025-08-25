import { config } from 'dotenv';
import { createClient } from '@sanity/client';
import Stripe from 'stripe';

// Load environment variables
config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('🔍 Finding Filip\'s Purchase');
console.log('===========================');

async function findFilipPurchase() {
  try {
    // 1. First, let's look at Filip's user record
    console.log('\n👤 Filip\'s User Record:');
    const filip = await sanityClient.fetch(`
      *[_type == "user" && (email match "*filip*" || email match "*fjmichalski*" || name match "*Filip*")][0] {
        _id,
        name,
        email,
        clerkId,
        role,
        _createdAt
      }
    `);

    if (filip) {
      console.log(`✅ Found Filip: ${filip.name} (${filip.email})`);
      console.log(`   Clerk ID: ${filip.clerkId}`);
      console.log(`   Role: ${filip.role}`);
      console.log(`   Created: ${new Date(filip._createdAt).toLocaleString()}`);
    } else {
      console.log('❌ Filip not found in users');
      return;
    }

    // 2. Check for any subscriptions for Filip
    console.log('\n🎫 Filip\'s Subscriptions:');
    const subscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && user._ref == $userId] {
        _id,
        passName,
        type,
        startDate,
        endDate,
        isActive,
        stripeSessionId,
        _createdAt
      }
    `, { userId: filip._id });

    console.log(`Found ${subscriptions.length} subscriptions for Filip:`);
    for (const sub of subscriptions) {
      console.log(`\n🎫 Subscription: ${sub._id}`);
      console.log(`   Pass: ${sub.passName}`);
      console.log(`   Type: ${sub.type}`);
      console.log(`   Active: ${sub.isActive}`);
      console.log(`   Valid: ${new Date(sub.startDate).toLocaleDateString()} - ${new Date(sub.endDate).toLocaleDateString()}`);
      console.log(`   Stripe Session: ${sub.stripeSessionId}`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
    }

    // 3. Check for any bookings for Filip
    console.log('\n📚 Filip\'s Bookings:');
    const bookings = await sanityClient.fetch(`
      *[_type == "booking" && user._ref == $userId] {
        _id,
        class->{title},
        status,
        paymentStatus,
        paymentId,
        amount,
        _createdAt
      }
    `, { userId: filip._id });

    console.log(`Found ${bookings.length} bookings for Filip:`);
    for (const booking of bookings) {
      console.log(`\n📚 Booking: ${booking._id}`);
      console.log(`   Class: ${booking.class?.title}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Payment Status: ${booking.paymentStatus}`);
      console.log(`   Payment ID: ${booking.paymentId}`);
      console.log(`   Amount: ${booking.amount ? (booking.amount / 100) : 'N/A'} NOK`);
      console.log(`   Created: ${new Date(booking._createdAt).toLocaleString()}`);
    }

    // 4. Search Stripe for Filip's sessions (last 30 days)
    console.log('\n💳 Searching Stripe for Filip\'s Sessions (last 30 days):');
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: thirtyDaysAgo },
      limit: 100,
    });

    const filipSessions = sessions.data.filter(session => 
      session.customer_details?.email?.includes('filip') || 
      session.customer_details?.name?.toLowerCase().includes('filip') ||
      session.customer_details?.email?.includes('fjmichalski') ||
      session.customer_details?.email === filip.email
    );

    console.log(`Found ${filipSessions.length} Stripe sessions for Filip:`);
    
    for (const session of filipSessions) {
      console.log(`\n💳 Stripe Session: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Payment Status: ${session.payment_status}`);
      console.log(`   Amount: ${session.amount_total ? (session.amount_total / 100) : 'N/A'} ${session.currency?.toUpperCase() || 'NOK'}`);
      console.log(`   Customer Email: ${session.customer_details?.email}`);
      console.log(`   Customer Name: ${session.customer_details?.name}`);
      console.log(`   Created: ${new Date(session.created * 1000).toLocaleString()}`);
      console.log(`   Metadata:`, session.metadata);
      
      // Check if subscription exists for this session
      const hasSubscription = await sanityClient.fetch(`
        count(*[_type == "subscription" && stripeSessionId == $sessionId])
      `, { sessionId: session.id });
      
      console.log(`   Subscription exists: ${hasSubscription > 0 ? '✅ Yes' : '❌ No'}`);
      
      if (hasSubscription === 0 && session.status === 'complete' && session.payment_status === 'paid') {
        console.log(`   🚨 PROBLEM: Payment completed but no subscription created!`);
        
        // Let's try to create the missing subscription
        if (session.metadata?.type === 'pass_purchase') {
          console.log(`   💡 This looks like a pass purchase that failed to create subscription`);
          console.log(`   📋 Metadata: ${JSON.stringify(session.metadata)}`);
        }
      }
    }

    // 5. Check recent payments in admin payments table
    console.log('\n💰 Recent Payments (all users, last 7 days):');
    const recentPayments = await sanityClient.fetch(`
      *[_type == "booking" && _createdAt >= $sevenDaysAgo] | order(_createdAt desc) {
        _id,
        user->{name, email},
        class->{title},
        paymentId,
        paymentStatus,
        amount,
        _createdAt
      }
    `, { sevenDaysAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() });

    console.log(`Found ${recentPayments.length} recent payments:`);
    for (const payment of recentPayments) {
      console.log(`\n💰 Payment: ${payment._id}`);
      console.log(`   User: ${payment.user?.name} (${payment.user?.email})`);
      console.log(`   Class: ${payment.class?.title}`);
      console.log(`   Payment ID: ${payment.paymentId}`);
      console.log(`   Status: ${payment.paymentStatus}`);
      console.log(`   Amount: ${payment.amount ? (payment.amount / 100) : 'N/A'} NOK`);
      console.log(`   Created: ${new Date(payment._createdAt).toLocaleString()}`);
    }

  } catch (error) {
    console.error('❌ Error finding Filip\'s purchase:', error);
  }
}

// Run the search
findFilipPurchase();
