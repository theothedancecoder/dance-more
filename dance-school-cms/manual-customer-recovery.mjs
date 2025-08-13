import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

// Get customer email from command line argument
const customerEmail = process.argv[2];
const passName = process.argv[3];

if (!customerEmail) {
  console.log('❌ Usage: node manual-customer-recovery.mjs customer@email.com "Pass Name"');
  console.log('');
  console.log('Examples:');
  console.log('  node manual-customer-recovery.mjs solomiya@example.com "Open week Trial Pass"');
  console.log('  node manual-customer-recovery.mjs customer@email.com "Day Drop In"');
  console.log('');
  console.log('Available passes:');
  console.log('  - "Day Drop In"');
  console.log('  - "Open week Trial Pass"');
  console.log('  - "10 Class Pass"');
  console.log('  - "Monthly Unlimited"');
  process.exit(1);
}

console.log('🆘 MANUAL CUSTOMER RECOVERY');
console.log('===========================');
console.log(`👤 Customer: ${customerEmail}`);
console.log(`🎫 Pass: ${passName || 'Will search for recent purchases'}`);
console.log('');

async function recoverCustomer() {
  try {
    // Step 1: Find the user
    console.log('🔍 Step 1: Finding customer...');
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id, name, email, clerkId, tenant->{_id, schoolName}
      }`,
      { email: customerEmail }
    );

    if (!user) {
      console.log('❌ Customer not found in database');
      console.log('💡 They may need to sign up first, or check the email spelling');
      return;
    }

    console.log('✅ Customer found:');
    console.log(`   Name: ${user.name || 'Not set'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Tenant: ${user.tenant?.schoolName || 'Not associated with any school'}`);
    console.log('');

    // Step 2: Check existing subscriptions
    console.log('🔍 Step 2: Checking existing subscriptions...');
    const existingSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        _id, passName, type, startDate, endDate, isActive, remainingClips
      } | order(_createdAt desc)`,
      { userId: user._id }
    );

    console.log(`📋 Found ${existingSubscriptions.length} existing subscriptions:`);
    existingSubscriptions.forEach((sub, index) => {
      const status = sub.isActive ? '✅ Active' : '❌ Inactive';
      const remaining = sub.remainingClips ? `${sub.remainingClips} classes left` : 'Unlimited';
      console.log(`   ${index + 1}. ${sub.passName} - ${status} - ${remaining}`);
    });
    console.log('');

    // Step 3: Get available passes
    console.log('🔍 Step 3: Getting available passes...');
    const availablePasses = await sanityClient.fetch(
      `*[_type == "pass" && tenant._ref == $tenantId] {
        _id, name, type, price, validityDays, classesLimit
      }`,
      { tenantId: DANCECITY_TENANT_ID }
    );

    console.log('🎫 Available passes:');
    availablePasses.forEach((pass, index) => {
      console.log(`   ${index + 1}. ${pass.name} (${pass.type}) - ${pass.price} NOK`);
    });
    console.log('');

    // Step 4: Create subscription if pass name provided
    if (passName) {
      console.log('🔧 Step 4: Creating subscription...');
      
      const selectedPass = availablePasses.find(pass => 
        pass.name.toLowerCase().includes(passName.toLowerCase()) ||
        passName.toLowerCase().includes(pass.name.toLowerCase())
      );

      if (!selectedPass) {
        console.log(`❌ Pass not found: "${passName}"`);
        console.log('💡 Available passes listed above. Try exact name match.');
        return;
      }

      console.log(`✅ Found pass: ${selectedPass.name}`);

      // Check if subscription already exists for this pass
      const existingForThisPass = existingSubscriptions.find(sub => 
        sub.passName === selectedPass.name && sub.isActive
      );

      if (existingForThisPass) {
        console.log('⚠️ Customer already has an active subscription for this pass');
        console.log('💡 Consider if they need a new one or if there\'s another issue');
        return;
      }

      // Create the subscription
      const success = await createSubscriptionForUser(user, selectedPass);
      
      if (success) {
        console.log('🎉 SUCCESS! Subscription created successfully');
        console.log('✅ Customer should now see their pass in the app');
        console.log('💡 Ask them to refresh the app or clear browser cache');
      } else {
        console.log('❌ Failed to create subscription');
        console.log('💡 Check the error messages above for details');
      }
    } else {
      console.log('💡 No pass name provided. Customer analysis complete.');
      console.log('💡 To create a subscription, run:');
      console.log(`   node manual-customer-recovery.mjs ${customerEmail} "Pass Name"`);
    }

  } catch (error) {
    console.error('❌ Error during recovery:', error);
  }
}

async function createSubscriptionForUser(user, pass) {
  try {
    // Calculate subscription details
    const now = new Date();
    const endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);

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
        console.log(`❌ Invalid pass type: ${pass.type}`);
        return false;
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
        _ref: DANCECITY_TENANT_ID,
      },
      type: subscriptionType,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      passId: pass._id,
      passName: pass.name,
      purchasePrice: pass.price,
      stripePaymentId: 'manual_recovery_' + Date.now(),
      stripeSessionId: 'manual_recovery_session_' + Date.now(),
      isActive: true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    console.log('📝 Creating subscription:');
    console.log(`   Pass: ${pass.name} (${subscriptionType})`);
    console.log(`   Classes: ${remainingClips || 'Unlimited'}`);
    console.log(`   Valid until: ${endDate.toLocaleDateString()}`);

    const createdSubscription = await sanityClient.create(subscriptionData);
    console.log(`✅ Subscription created: ${createdSubscription._id}`);

    return true;
  } catch (error) {
    console.log(`❌ Error creating subscription: ${error.message}`);
    return false;
  }
}

// Run the recovery
recoverCustomer();
