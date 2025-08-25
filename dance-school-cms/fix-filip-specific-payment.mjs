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

const FILIP_PAYMENT_INTENT = 'pi_3RzjD2L8HTHT1SQN050Cegsf';

console.log('🔧 Fixing Filip\'s Specific Payment');
console.log('==================================');
console.log(`Payment Intent: ${FILIP_PAYMENT_INTENT}`);

async function fixFilipPayment() {
  try {
    // 1. Get the payment intent details
    console.log('\n💰 Fetching Payment Intent...');
    const paymentIntent = await stripe.paymentIntents.retrieve(FILIP_PAYMENT_INTENT);
    
    console.log('✅ Payment Intent Details:');
    console.log(`   ID: ${paymentIntent.id}`);
    console.log(`   Status: ${paymentIntent.status}`);
    console.log(`   Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency.toUpperCase()}`);
    console.log(`   Created: ${new Date(paymentIntent.created * 1000).toLocaleString()}`);
    console.log(`   Metadata:`, paymentIntent.metadata);
    
    // 2. Find the associated checkout session
    console.log('\n🔍 Finding associated checkout session...');
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntent.id,
      limit: 10,
    });
    
    if (sessions.data.length === 0) {
      console.log('❌ No checkout session found for this payment intent');
      return;
    }
    
    const session = sessions.data[0];
    console.log('✅ Found Checkout Session:');
    console.log(`   ID: ${session.id}`);
    console.log(`   Status: ${session.status}/${session.payment_status}`);
    console.log(`   Customer Email: ${session.customer_details?.email}`);
    console.log(`   Customer Name: ${session.customer_details?.name}`);
    console.log(`   Metadata:`, session.metadata);
    
    // 3. Find Filip's user record
    console.log('\n👤 Finding Filip\'s user record...');
    const filip = await sanityClient.fetch(`
      *[_type == "user" && (email == $email || name match "*Filip Michalski*")][0] {
        _id, name, email, clerkId, role, _createdAt
      }
    `, { email: session.customer_details?.email });
    
    if (!filip) {
      console.log('❌ Filip not found in database');
      console.log('🔧 Creating Filip\'s user record...');
      
      // Create Filip's user record
      const newUser = await sanityClient.create({
        _type: 'user',
        name: session.customer_details?.name || 'Filip Michalski',
        email: session.customer_details?.email,
        role: 'student',
        clerkId: session.metadata?.userId || `manual_${Date.now()}`,
      });
      
      console.log('✅ Created user:', newUser._id);
      filip = newUser;
    } else {
      console.log('✅ Found Filip:', filip.name, '(' + filip.email + ')');
    }
    
    // 4. Check if subscription already exists
    console.log('\n🎫 Checking for existing subscription...');
    const existingSubscription = await sanityClient.fetch(`
      *[_type == "subscription" && stripeSessionId == $sessionId][0]
    `, { sessionId: session.id });
    
    if (existingSubscription) {
      console.log('✅ Subscription already exists:', existingSubscription._id);
      return;
    }
    
    // 5. Get pass details from metadata
    console.log('\n📋 Getting pass details...');
    const { passId, tenantId } = session.metadata || {};
    
    if (!passId || !tenantId) {
      console.log('❌ Missing metadata. Available metadata:', session.metadata);
      console.log('🔧 Attempting to find pass by amount...');
      
      // Try to find pass by amount
      const passes = await sanityClient.fetch(`
        *[_type == "pass" && price == $price] {
          _id, name, type, price, validityDays, classesLimit, validityType, expiryDate, tenant->{_id, schoolName}
        }
      `, { price: paymentIntent.amount / 100 });
      
      if (passes.length === 0) {
        console.log('❌ No passes found with matching price');
        return;
      }
      
      console.log(`Found ${passes.length} passes with matching price:`);
      for (const pass of passes) {
        console.log(`- ${pass.name} (${pass.type}) - ${pass.tenant?.schoolName}`);
      }
      
      // Use the first matching pass
      const selectedPass = passes[0];
      console.log(`🎯 Using pass: ${selectedPass.name}`);
      
      await createSubscription(session, filip, selectedPass, selectedPass.tenant._id);
      
    } else {
      // Get pass from metadata
      const pass = await sanityClient.fetch(`
        *[_type == "pass" && _id == $passId][0] {
          _id, name, type, price, validityDays, classesLimit, validityType, expiryDate
        }
      `, { passId });
      
      if (!pass) {
        console.log('❌ Pass not found:', passId);
        return;
      }
      
      console.log('✅ Found pass:', pass.name, '(' + pass.type + ')');
      await createSubscription(session, filip, pass, tenantId);
    }
    
  } catch (error) {
    console.error('❌ Error fixing Filip\'s payment:', error);
  }
}

async function createSubscription(session, user, pass, tenantId) {
  try {
    console.log('\n🔧 Creating subscription...');
    
    // Calculate subscription details
    const now = new Date();
    let endDate;
    
    // Determine end date based on pass configuration
    if (pass.validityType === 'date' && pass.expiryDate) {
      endDate = new Date(pass.expiryDate);
      console.log('✅ Using fixed expiry date:', endDate.toISOString());
    } else if (pass.validityType === 'days' && pass.validityDays) {
      endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
      console.log('✅ Calculated expiry from validityDays:', pass.validityDays, 'days ->', endDate.toISOString());
    } else if (pass.validityDays) {
      endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
      console.log('⚠️ Using fallback validityDays:', pass.validityDays, 'days ->', endDate.toISOString());
    } else {
      // Default to 30 days for single passes
      endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      console.log('⚠️ Using default 30 days expiry:', endDate.toISOString());
    }
    
    let subscriptionType;
    let remainingClips;
    
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
        remainingClips = undefined;
        break;
      default:
        subscriptionType = 'single';
        remainingClips = 1;
        break;
    }
    
    // Create subscription
    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: user._id,
      },
      tenant: {
        _type: 'reference',
        _ref: tenantId,
      },
      type: subscriptionType,
      startDate: new Date(session.created * 1000).toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      passId: pass._id,
      passName: pass.name,
      purchasePrice: session.amount_total ? session.amount_total / 100 : pass.price,
      stripePaymentId: session.payment_intent,
      stripeSessionId: session.id,
      isActive: true,
    };
    
    console.log('📝 Subscription details:');
    console.log('   User:', user.name);
    console.log('   Pass:', pass.name, '(' + subscriptionType + ')');
    console.log('   Classes:', remainingClips || 'Unlimited');
    console.log('   Valid until:', endDate.toLocaleDateString());
    
    const createdSubscription = await sanityClient.create(subscriptionData);
    console.log('\n🎉 SUCCESS! Created subscription:', createdSubscription._id);
    console.log('✅', user.name, 'should now see their', pass.name, 'pass in the app');
    
    return createdSubscription;
    
  } catch (error) {
    console.error('❌ Error creating subscription:', error);
  }
}

// Run the fix
fixFilipPayment();
