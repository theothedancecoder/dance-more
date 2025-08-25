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

console.log('🔍 Checking ALL Activity (Last 48 Hours)');
console.log('========================================');

async function checkAllActivity() {
  try {
    const twoDaysAgo = Math.floor((Date.now() - 48 * 60 * 60 * 1000) / 1000);
    
    console.log('📅 Checking from:', new Date(twoDaysAgo * 1000).toLocaleString());
    console.log('📅 To:', new Date().toLocaleString());
    
    // 1. Check Stripe Sessions
    console.log('\n💳 Stripe Checkout Sessions (last 48 hours):');
    const sessions = await stripe.checkout.sessions.list({
      created: { gte: twoDaysAgo },
      limit: 50,
    });
    
    console.log(`Found ${sessions.data.length} Stripe sessions:`);
    for (const session of sessions.data) {
      console.log(`\n💳 Session: ${session.id}`);
      console.log(`   Status: ${session.status}/${session.payment_status}`);
      console.log(`   Amount: ${session.amount_total ? (session.amount_total / 100) : 'N/A'} ${session.currency?.toUpperCase() || 'NOK'}`);
      console.log(`   Email: ${session.customer_details?.email || 'N/A'}`);
      console.log(`   Name: ${session.customer_details?.name || 'N/A'}`);
      console.log(`   Created: ${new Date(session.created * 1000).toLocaleString()}`);
      console.log(`   Metadata:`, session.metadata);
    }
    
    // 2. Check Stripe Payment Intents
    console.log('\n💰 Stripe Payment Intents (last 48 hours):');
    const paymentIntents = await stripe.paymentIntents.list({
      created: { gte: twoDaysAgo },
      limit: 20,
    });
    
    console.log(`Found ${paymentIntents.data.length} payment intents:`);
    for (const pi of paymentIntents.data) {
      console.log(`\n💰 Payment Intent: ${pi.id}`);
      console.log(`   Status: ${pi.status}`);
      console.log(`   Amount: ${pi.amount / 100} ${pi.currency.toUpperCase()}`);
      console.log(`   Created: ${new Date(pi.created * 1000).toLocaleString()}`);
      console.log(`   Metadata:`, pi.metadata);
    }
    
    // 3. Check Sanity Bookings
    console.log('\n📚 Sanity Bookings (last 48 hours):');
    const bookings = await sanityClient.fetch(`
      *[_type == "booking" && _createdAt >= $twoDaysAgo] | order(_createdAt desc) {
        _id,
        user->{name, email},
        class->{title},
        paymentId,
        paymentStatus,
        amount,
        _createdAt
      }
    `, { twoDaysAgo: new Date(twoDaysAgo * 1000).toISOString() });
    
    console.log(`Found ${bookings.length} bookings:`);
    for (const booking of bookings) {
      console.log(`\n📚 Booking: ${booking._id}`);
      console.log(`   User: ${booking.user?.name} (${booking.user?.email})`);
      console.log(`   Class: ${booking.class?.title}`);
      console.log(`   Payment ID: ${booking.paymentId}`);
      console.log(`   Status: ${booking.paymentStatus}`);
      console.log(`   Amount: ${booking.amount ? (booking.amount / 100) : 'N/A'} NOK`);
      console.log(`   Created: ${new Date(booking._createdAt).toLocaleString()}`);
    }
    
    // 4. Check Sanity Subscriptions
    console.log('\n🎫 Sanity Subscriptions (last 48 hours):');
    const subscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt >= $twoDaysAgo] | order(_createdAt desc) {
        _id,
        user->{name, email},
        passName,
        type,
        stripeSessionId,
        isActive,
        _createdAt
      }
    `, { twoDaysAgo: new Date(twoDaysAgo * 1000).toISOString() });
    
    console.log(`Found ${subscriptions.length} subscriptions:`);
    for (const sub of subscriptions) {
      console.log(`\n🎫 Subscription: ${sub._id}`);
      console.log(`   User: ${sub.user?.name} (${sub.user?.email})`);
      console.log(`   Pass: ${sub.passName} (${sub.type})`);
      console.log(`   Stripe Session: ${sub.stripeSessionId}`);
      console.log(`   Active: ${sub.isActive}`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
    }
    
    // 5. Summary
    console.log('\n📊 SUMMARY:');
    console.log('============');
    console.log(`Stripe Sessions: ${sessions.data.length}`);
    console.log(`Payment Intents: ${paymentIntents.data.length}`);
    console.log(`Sanity Bookings: ${bookings.length}`);
    console.log(`Sanity Subscriptions: ${subscriptions.length}`);
    
    if (sessions.data.length === 0 && paymentIntents.data.length === 0) {
      console.log('\n🤔 No Stripe activity found. This could mean:');
      console.log('1. You are in test mode but payments were made in live mode (or vice versa)');
      console.log('2. The payments were made more than 48 hours ago');
      console.log('3. There is a different Stripe account being used');
      console.log('4. The webhook is not connected to this Stripe account');
      
      console.log('\n🔧 RECOMMENDATIONS:');
      console.log('1. Check your Stripe dashboard directly');
      console.log('2. Verify you are using the correct Stripe keys (test vs live)');
      console.log('3. Check if Filip made the payment on a different date');
      console.log('4. Look at your admin payments page to see what data is there');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAllActivity();
