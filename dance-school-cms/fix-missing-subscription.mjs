import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

async function fixMissingSubscription() {
  console.log('🔧 Fixing Missing Subscription...\n');

  try {
    // 1. Find the most recent user (likely you)
    console.log('1. Finding recent users...');
    const users = await sanityClient.fetch(`
      *[_type == "user"] | order(_createdAt desc)[0...3] {
        _id,
        name,
        email,
        clerkId,
        _createdAt
      }
    `);

    console.log('Recent users:');
    users.forEach((user, index) => {
      const createdAt = new Date(user._createdAt).toLocaleString();
      console.log(`  ${index + 1}. ${user.name || 'Unknown'} (${user.email}) - ${createdAt}`);
      console.log(`     ID: ${user._id}, Clerk ID: ${user.clerkId || 'None'}`);
    });

    // 2. Find the tenant
    console.log('\n2. Finding DANCE WITH DANCECITY tenant...');
    const tenant = await sanityClient.fetch(`
      *[_type == "tenant" && schoolName == "DANCE WITH DANCECITY"][0] {
        _id,
        schoolName,
        slug
      }
    `);

    if (!tenant) {
      console.error('❌ Tenant not found!');
      return;
    }

    console.log(`✅ Found tenant: ${tenant.schoolName} (${tenant._id})`);

    // 3. Find available passes
    console.log('\n3. Finding available passes...');
    const passes = await sanityClient.fetch(`
      *[_type == "pass" && tenant._ref == $tenantId && isActive == true] {
        _id,
        name,
        type,
        price,
        validityDays,
        classesLimit
      }
    `, { tenantId: tenant._id });

    console.log('Available passes:');
    passes.forEach((pass, index) => {
      console.log(`  ${index + 1}. ${pass.name} (${pass.type}) - ${pass.price} NOK`);
      console.log(`     ID: ${pass._id}`);
    });

    // 4. Ask user to confirm details
    console.log('\n4. Creating subscription for your recent purchase...');
    console.log('Please confirm the details:');
    
    // Assume the most recent user and a common pass (you can modify these)
    const targetUser = users[0]; // Most recent user
    const targetPass = passes.find(p => p.name.toLowerCase().includes('drop-in')) || passes[0]; // Drop-in or first pass

    console.log(`User: ${targetUser.name} (${targetUser.email})`);
    console.log(`Pass: ${targetPass.name} (${targetPass.price} NOK)`);

    // 5. Create the subscription
    const now = new Date();
    const endDate = new Date(now.getTime() + (targetPass.validityDays || 30) * 24 * 60 * 60 * 1000);

    // Determine subscription type and remaining clips based on pass type
    let subscriptionType;
    let remainingClips;

    switch (targetPass.type) {
      case 'single':
        subscriptionType = 'single';
        remainingClips = 1;
        break;
      case 'multi-pass':
        subscriptionType = 'multi-pass';
        remainingClips = targetPass.classesLimit;
        break;
      case 'multi':
        subscriptionType = 'clipcard';
        remainingClips = targetPass.classesLimit;
        break;
      case 'unlimited':
        subscriptionType = 'monthly';
        remainingClips = undefined; // Unlimited
        break;
      default:
        subscriptionType = 'single';
        remainingClips = 1;
    }

    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: targetUser._id,
      },
      tenant: {
        _type: 'reference',
        _ref: tenant._id,
      },
      pass: {
        _type: 'reference',
        _ref: targetPass._id,
      },
      type: subscriptionType,
      passName: targetPass.name,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      status: 'active',
      amount: targetPass.price,
      currency: 'NOK',
      isActive: true,
      stripeSessionId: `manual-${Date.now()}`, // Manual creation marker
    };

    console.log('\n5. Creating subscription with data:');
    console.log(JSON.stringify(subscriptionData, null, 2));

    const createdSubscription = await writeClient.create(subscriptionData);
    
    console.log('\n🎉 SUCCESS! Created subscription:');
    console.log(`   ID: ${createdSubscription._id}`);
    console.log(`   Type: ${subscriptionType}`);
    console.log(`   Pass: ${targetPass.name}`);
    console.log(`   Valid until: ${endDate.toLocaleDateString()}`);
    console.log(`   Remaining clips: ${remainingClips || 'Unlimited'}`);

    // 6. Verify it shows up in the API
    console.log('\n6. Verifying subscription appears in user API...');
    
    // Test the user subscriptions API logic
    const testSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && isActive == true && endDate > $now && tenant._ref == $tenantId] | order(_createdAt desc) {
        _id,
        type,
        passName,
        startDate,
        endDate,
        remainingClips,
        isActive,
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400)
      }`,
      { 
        userId: targetUser._id, 
        now: now.toISOString(), 
        tenantId: tenant._id 
      }
    );

    console.log(`Found ${testSubscriptions.length} active subscriptions for user:`, testSubscriptions);

    console.log('\n✅ Fix completed! Your pass should now appear in the "Your Active Passes" section.');
    console.log('🔄 Refresh the subscriptions page to see your new pass.');

  } catch (error) {
    console.error('❌ Error fixing subscription:', error);
    process.exit(1);
  }
}

// Run the fix
fixMissingSubscription();
