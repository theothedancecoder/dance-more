import { createClient } from '@sanity/client';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

async function checkAllTenants() {
  console.log('🔍 Checking all tenants and their subscriptions:');
  console.log('===============================================\n');

  const tenants = await sanityClient.fetch(
    `*[_type == "tenant"]{
      _id,
      name,
      "slug": slug.current
    }`
  );

  let totalAllSubscriptions = 0;
  let totalActiveSubscriptions = 0;

  for (const tenant of tenants) {
    const subscriptionCount = await sanityClient.fetch(
      `count(*[_type == "subscription" && tenant._ref == $tenantId])`,
      { tenantId: tenant._id }
    );

    const activeCount = await sanityClient.fetch(
      `count(*[_type == "subscription" && tenant._ref == $tenantId && isActive == true && dateTime(endDate) > dateTime(now())])`,
      { tenantId: tenant._id }
    );

    totalAllSubscriptions += subscriptionCount;
    totalActiveSubscriptions += activeCount;

    console.log(`📊 ${tenant.name} (${tenant.slug}):`);
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Total Subscriptions: ${subscriptionCount}`);
    console.log(`   Active Subscriptions: ${activeCount}`);
    
    if (tenant.slug === 'dancecity') {
      console.log(`   🎯 THIS IS THE DANCECITY TENANT`);
    }
    console.log('');
  }

  // Check if there are subscriptions without tenant reference
  const orphanedSubs = await sanityClient.fetch(
    `count(*[_type == "subscription" && !defined(tenant._ref)])`
  );

  console.log('📊 GRAND TOTALS:');
  console.log('================');
  console.log(`All Tenants Combined:`);
  console.log(`   Total Subscriptions: ${totalAllSubscriptions}`);
  console.log(`   Active Subscriptions: ${totalActiveSubscriptions}`);
  
  if (orphanedSubs > 0) {
    console.log(`   Orphaned Subscriptions: ${orphanedSubs}`);
    console.log(`   TOTAL INCLUDING ORPHANED: ${totalAllSubscriptions + orphanedSubs}`);
  }

  console.log(`\n🎯 Target: 48 passes for DanceCity`);
  if (totalAllSubscriptions >= 48) {
    console.log(`✅ We have ${totalAllSubscriptions} total subscriptions across all tenants!`);
  } else {
    console.log(`⚠️  Still missing ${48 - totalAllSubscriptions} subscriptions`);
  }
}

checkAllTenants().catch(console.error);
