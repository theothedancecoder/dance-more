import { createClient } from '@sanity/client';

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

async function checkDanceCityActivePasses() {
  console.log('🔍 Checking DanceCity Active Passes Status');
  console.log('==========================================\n');

  try {
    // Get DanceCity tenant
    const danceCityTenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == "dancecity"][0]{
        _id,
        name,
        "slug": slug.current
      }`
    );

    if (!danceCityTenant) {
      console.log('❌ DanceCity tenant not found');
      return;
    }

    console.log(`✅ Found tenant: ${danceCityTenant.name} (${danceCityTenant.slug})`);
    console.log(`   Tenant ID: ${danceCityTenant._id}\n`);

    // Get all users for DanceCity tenant
    const users = await sanityClient.fetch(
      `*[_type == "user" && tenant._ref == $tenantId]{
        _id,
        name,
        email,
        clerkId,
        role
      }`,
      { tenantId: danceCityTenant._id }
    );

    console.log(`👥 Found ${users.length} users for DanceCity:\n`);

    // Check subscriptions for each user
    for (const user of users) {
      console.log(`👤 ${user.name} (${user.email})`);
      console.log(`   User ID: ${user._id}`);
      console.log(`   Clerk ID: ${user.clerkId}`);
      console.log(`   Role: ${user.role}`);

      // Get active subscriptions for this user
      const subscriptions = await sanityClient.fetch(
        `*[_type == "subscription" && user._ref == $userId && tenant._ref == $tenantId]{
          _id,
          type,
          passName,
          startDate,
          endDate,
          remainingClips,
          isActive,
          stripeSessionId,
          stripePaymentId,
          purchasePrice,
          _createdAt
        } | order(_createdAt desc)`,
        { userId: user._id, tenantId: danceCityTenant._id }
      );

      if (subscriptions.length === 0) {
        console.log('   📋 No subscriptions found');
      } else {
        console.log(`   📋 ${subscriptions.length} subscription(s):`);
        
        subscriptions.forEach((sub, index) => {
          const isCurrentlyActive = new Date(sub.endDate) > new Date() && sub.isActive;
          const status = isCurrentlyActive ? '🟢 ACTIVE' : '🔴 EXPIRED/INACTIVE';
          
          console.log(`      ${index + 1}. ${sub.passName} - ${status}`);
          console.log(`         Type: ${sub.type}`);
          console.log(`         Valid: ${new Date(sub.startDate).toLocaleDateString()} - ${new Date(sub.endDate).toLocaleDateString()}`);
          console.log(`         Remaining: ${sub.remainingClips || 'Unlimited'} classes`);
          console.log(`         Price: ${sub.purchasePrice} NOK`);
          console.log(`         Stripe Session: ${sub.stripeSessionId || 'N/A'}`);
          console.log(`         Created: ${new Date(sub._createdAt).toLocaleDateString()}`);
        });
      }
      console.log('');
    }

    // Summary statistics
    const totalSubscriptions = await sanityClient.fetch(
      `count(*[_type == "subscription" && tenant._ref == $tenantId])`,
      { tenantId: danceCityTenant._id }
    );

    const activeSubscriptions = await sanityClient.fetch(
      `count(*[_type == "subscription" && tenant._ref == $tenantId && isActive == true && dateTime(endDate) > dateTime(now())])`,
      { tenantId: danceCityTenant._id }
    );

    const recentPurchases = await sanityClient.fetch(
      `*[_type == "subscription" && tenant._ref == $tenantId && _createdAt > dateTime(now()) - 60*60*24*7]{
        _id,
        passName,
        user->{name, email},
        purchasePrice,
        _createdAt
      } | order(_createdAt desc)`,
      { tenantId: danceCityTenant._id }
    );

    console.log('📊 SUMMARY STATISTICS');
    console.log('=====================');
    console.log(`Total Users: ${users.length}`);
    console.log(`Total Subscriptions: ${totalSubscriptions}`);
    console.log(`Currently Active: ${activeSubscriptions}`);
    console.log(`Recent Purchases (7 days): ${recentPurchases.length}\n`);

    if (recentPurchases.length > 0) {
      console.log('🛒 Recent Purchases:');
      recentPurchases.forEach((purchase, index) => {
        console.log(`   ${index + 1}. ${purchase.user.name} - ${purchase.passName} (${purchase.purchasePrice} NOK)`);
        console.log(`      Date: ${new Date(purchase._createdAt).toLocaleDateString()}`);
      });
    }

    // Check for potential issues
    console.log('\n🔍 POTENTIAL ISSUES CHECK');
    console.log('=========================');

    // Users without subscriptions
    const usersWithoutSubs = users.filter(user => 
      !subscriptions.some(sub => sub.user._ref === user._id)
    );

    if (usersWithoutSubs.length > 0) {
      console.log(`⚠️  ${usersWithoutSubs.length} users without any subscriptions:`);
      usersWithoutSubs.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
      });
    } else {
      console.log('✅ All users have at least one subscription');
    }

    // Check for subscriptions without Stripe data
    const subsWithoutStripe = await sanityClient.fetch(
      `*[_type == "subscription" && tenant._ref == $tenantId && (stripeSessionId == null || stripeSessionId == "")]{
        _id,
        passName,
        user->{name, email},
        _createdAt
      }`,
      { tenantId: danceCityTenant._id }
    );

    if (subsWithoutStripe.length > 0) {
      console.log(`\n⚠️  ${subsWithoutStripe.length} subscriptions without Stripe session data:`);
      subsWithoutStripe.forEach(sub => {
        console.log(`   - ${sub.user.name}: ${sub.passName} (Created: ${new Date(sub._createdAt).toLocaleDateString()})`);
      });
    } else {
      console.log('\n✅ All subscriptions have Stripe session data');
    }

  } catch (error) {
    console.error('❌ Error checking DanceCity passes:', error);
  }
}

checkDanceCityActivePasses().catch(console.error);
