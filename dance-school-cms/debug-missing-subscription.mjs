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

console.log('🔍 Debugging Missing Subscription Issue');
console.log('=====================================');

async function debugMissingSubscription() {
  try {
    // 1. Check recent Stripe sessions from yesterday
    console.log('\n📋 Recent Stripe Checkout Sessions (last 24 hours):');
    const yesterday = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000);
    
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: yesterday },
      limit: 20,
    });

    console.log(`Found ${sessions.data.length} sessions from yesterday:`);
    
    for (const session of sessions.data) {
      console.log(`\n💳 Session: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Payment Status: ${session.payment_status}`);
      console.log(`   Amount: ${session.amount_total ? (session.amount_total / 100) : 'N/A'} ${session.currency?.toUpperCase() || 'NOK'}`);
      console.log(`   Customer Email: ${session.customer_details?.email || session.customer_email || 'N/A'}`);
      console.log(`   Customer Name: ${session.customer_details?.name || 'N/A'}`);
      console.log(`   Created: ${new Date(session.created * 1000).toLocaleString()}`);
      
      if (session.metadata) {
        console.log(`   Metadata:`, session.metadata);
      }
      
      // Check if subscription exists for this session
      const subscription = await sanityClient.fetch(`
        *[_type == "subscription" && stripeSessionId == $sessionId][0] {
          _id,
          passName,
          user->{name, email},
          isActive
        }
      `, { sessionId: session.id });
      
      if (subscription) {
        console.log(`   ✅ Subscription exists: ${subscription._id} (${subscription.passName})`);
        console.log(`   👤 User: ${subscription.user?.name} (${subscription.user?.email})`);
        console.log(`   📊 Active: ${subscription.isActive}`);
      } else {
        console.log(`   ❌ NO SUBSCRIPTION FOUND FOR THIS SESSION!`);
        
        // If this is a completed session without subscription, investigate further
        if (session.status === 'complete' && session.payment_status === 'paid') {
          console.log(`   🚨 ISSUE: Payment completed but no subscription created!`);
          
          // Check if there are any bookings for this session
          const booking = await sanityClient.fetch(`
            *[_type == "booking" && paymentId == $sessionId][0] {
              _id,
              user->{name, email},
              class->{title}
            }
          `, { sessionId: session.id });
          
          if (booking) {
            console.log(`   📚 Found booking instead: ${booking._id} for ${booking.class?.title}`);
            console.log(`   👤 Booking user: ${booking.user?.name} (${booking.user?.email})`);
          }
        }
      }
    }

    // 2. Check recent subscriptions in Sanity
    console.log('\n\n📋 Recent Subscriptions in Sanity (last 24 hours):');
    const recentSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt >= $yesterday] | order(_createdAt desc) {
        _id,
        passName,
        stripeSessionId,
        user->{name, email, clerkId},
        isActive,
        _createdAt,
        startDate,
        endDate
      }
    `, { yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() });

    console.log(`Found ${recentSubscriptions.length} subscriptions from yesterday:`);
    
    for (const sub of recentSubscriptions) {
      console.log(`\n🎫 Subscription: ${sub._id}`);
      console.log(`   Pass: ${sub.passName}`);
      console.log(`   User: ${sub.user?.name} (${sub.user?.email})`);
      console.log(`   Clerk ID: ${sub.user?.clerkId}`);
      console.log(`   Stripe Session: ${sub.stripeSessionId}`);
      console.log(`   Active: ${sub.isActive}`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
      console.log(`   Valid: ${new Date(sub.startDate).toLocaleDateString()} - ${new Date(sub.endDate).toLocaleDateString()}`);
    }

    // 3. Check recent bookings (in case it was a class booking, not pass purchase)
    console.log('\n\n📋 Recent Bookings (last 24 hours):');
    const recentBookings = await sanityClient.fetch(`
      *[_type == "booking" && _createdAt >= $yesterday] | order(_createdAt desc) {
        _id,
        paymentId,
        user->{name, email},
        class->{title},
        status,
        paymentStatus,
        amount,
        _createdAt
      }
    `, { yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() });

    console.log(`Found ${recentBookings.length} bookings from yesterday:`);
    
    for (const booking of recentBookings) {
      console.log(`\n📚 Booking: ${booking._id}`);
      console.log(`   Class: ${booking.class?.title}`);
      console.log(`   User: ${booking.user?.name} (${booking.user?.email})`);
      console.log(`   Payment ID: ${booking.paymentId}`);
      console.log(`   Status: ${booking.status}`);
      console.log(`   Payment Status: ${booking.paymentStatus}`);
      console.log(`   Amount: ${booking.amount ? (booking.amount / 100) : 'N/A'} NOK`);
      console.log(`   Created: ${new Date(booking._createdAt).toLocaleString()}`);
    }

    // 4. Check for users created yesterday (might indicate new registrations)
    console.log('\n\n📋 New Users (last 24 hours):');
    const newUsers = await sanityClient.fetch(`
      *[_type == "user" && _createdAt >= $yesterday] | order(_createdAt desc) {
        _id,
        name,
        email,
        clerkId,
        role,
        _createdAt
      }
    `, { yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() });

    console.log(`Found ${newUsers.length} new users from yesterday:`);
    
    for (const user of newUsers) {
      console.log(`\n👤 User: ${user._id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Clerk ID: ${user.clerkId}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${new Date(user._createdAt).toLocaleString()}`);
    }

    // 5. Summary and recommendations
    console.log('\n\n📊 SUMMARY & RECOMMENDATIONS:');
    console.log('===============================');
    
    const completedSessions = sessions.data.filter(s => s.status === 'complete' && s.payment_status === 'paid');
    const sessionsWithoutSubscriptions = [];
    
    for (const session of completedSessions) {
      const hasSubscription = await sanityClient.fetch(`
        count(*[_type == "subscription" && stripeSessionId == $sessionId])
      `, { sessionId: session.id });
      
      if (hasSubscription === 0) {
        sessionsWithoutSubscriptions.push(session);
      }
    }
    
    console.log(`✅ Completed payments: ${completedSessions.length}`);
    console.log(`❌ Payments without subscriptions: ${sessionsWithoutSubscriptions.length}`);
    
    if (sessionsWithoutSubscriptions.length > 0) {
      console.log('\n🚨 PROBLEMATIC SESSIONS (paid but no subscription):');
      for (const session of sessionsWithoutSubscriptions) {
        console.log(`   Session: ${session.id}`);
        console.log(`   Customer: ${session.customer_details?.name} (${session.customer_details?.email})`);
        console.log(`   Amount: ${(session.amount_total / 100)} ${session.currency?.toUpperCase()}`);
        console.log(`   Time: ${new Date(session.created * 1000).toLocaleString()}`);
        console.log(`   Metadata: ${JSON.stringify(session.metadata)}`);
        console.log('');
      }
      
      console.log('💡 RECOMMENDED ACTIONS:');
      console.log('1. Check webhook logs for these sessions');
      console.log('2. Manually create subscriptions for these customers');
      console.log('3. Verify webhook endpoint is receiving events');
      console.log('4. Check if metadata is properly set during checkout');
    }

  } catch (error) {
    console.error('❌ Error debugging missing subscription:', error);
  }
}

// Run the debug
debugMissingSubscription();
