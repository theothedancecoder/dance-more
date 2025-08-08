import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

async function debugStripeConnectIssue() {
  console.log('🔍 Debugging Stripe Connect Pass Purchase Issue...\n');

  try {
    // 1. Check all tenants and their Stripe Connect status
    console.log('1. Checking tenant Stripe Connect status...');
    const tenants = await sanityClient.fetch(`
      *[_type == "tenant"] {
        _id,
        schoolName,
        slug,
        stripeConnect
      }
    `);

    console.log(`Found ${tenants.length} tenants:`);
    tenants.forEach(tenant => {
      const connectStatus = tenant.stripeConnect?.accountStatus || 'not_connected';
      const chargesEnabled = tenant.stripeConnect?.chargesEnabled || false;
      console.log(`  - ${tenant.schoolName} (${tenant.slug?.current}): ${connectStatus}, charges: ${chargesEnabled}`);
    });

    // 2. Check recent subscriptions
    console.log('\n2. Checking recent subscriptions...');
    const recentSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription"] | order(_createdAt desc)[0...5] {
        _id,
        _createdAt,
        type,
        status,
        user->{name, email},
        tenant->{schoolName},
        pass->{name, type},
        stripePaymentIntentId,
        stripeSessionId
      }
    `);

    console.log(`Found ${recentSubscriptions.length} recent subscriptions:`);
    recentSubscriptions.forEach(sub => {
      const createdAt = new Date(sub._createdAt).toLocaleString();
      console.log(`  - ${sub.user?.name || 'Unknown'}: ${sub.pass?.name} (${sub.type}) - ${createdAt}`);
      console.log(`    Tenant: ${sub.tenant?.schoolName}, Status: ${sub.status}`);
      console.log(`    Stripe Session: ${sub.stripeSessionId || 'None'}`);
    });

    // 3. Check recent passes
    console.log('\n3. Checking available passes...');
    const passes = await sanityClient.fetch(`
      *[_type == "pass" && isActive == true] {
        _id,
        name,
        type,
        price,
        tenant->{
          schoolName,
          stripeConnect
        }
      }
    `);

    console.log(`Found ${passes.length} active passes:`);
    passes.forEach(pass => {
      const tenantConnected = pass.tenant?.stripeConnect?.accountId ? '✅' : '❌';
      const chargesEnabled = pass.tenant?.stripeConnect?.chargesEnabled ? '✅' : '❌';
      console.log(`  ${tenantConnected} ${pass.name} (${pass.type}) - ${pass.price} NOK`);
      console.log(`    Tenant: ${pass.tenant?.schoolName}, Charges: ${chargesEnabled}`);
    });

    // 4. Check users
    console.log('\n4. Checking recent users...');
    const users = await sanityClient.fetch(`
      *[_type == "user"] | order(_createdAt desc)[0...3] {
        _id,
        name,
        email,
        clerkId,
        _createdAt
      }
    `);

    console.log(`Found ${users.length} recent users:`);
    users.forEach(user => {
      const createdAt = new Date(user._createdAt).toLocaleString();
      console.log(`  - ${user.name} (${user.email}) - ${createdAt}`);
    });

    // 5. Provide recommendations
    console.log('\n5. Recommendations:');
    
    const tenantsWithoutConnect = tenants.filter(t => !t.stripeConnect?.accountId);
    if (tenantsWithoutConnect.length > 0) {
      console.log('  🚨 ISSUE FOUND: Some tenants don\'t have Stripe Connect accounts:');
      tenantsWithoutConnect.forEach(tenant => {
        console.log(`    - ${tenant.schoolName}: No Stripe Connect account`);
      });
      console.log('  🔧 SOLUTION: Set up Stripe Connect for each tenant:');
      console.log('     1. Go to /{tenant-slug}/admin/payments');
      console.log('     2. Click "Connect with Stripe"');
      console.log('     3. Complete the onboarding process');
    }

    const tenantsWithInactiveConnect = tenants.filter(t => 
      t.stripeConnect?.accountId && !t.stripeConnect?.chargesEnabled
    );
    if (tenantsWithInactiveConnect.length > 0) {
      console.log('  ⚠️  ISSUE FOUND: Some tenants have inactive Stripe Connect accounts:');
      tenantsWithInactiveConnect.forEach(tenant => {
        console.log(`    - ${tenant.schoolName}: Account exists but charges disabled`);
      });
      console.log('  🔧 SOLUTION: Complete Stripe Connect onboarding');
    }

    if (recentSubscriptions.length === 0) {
      console.log('  📝 No recent subscriptions found. This could indicate:');
      console.log('     - Webhook not receiving events');
      console.log('     - Sanity permissions issue');
      console.log('     - Payment processing through old system');
    }

    console.log('\n6. Next Steps:');
    console.log('  1. Ensure the tenant has a Stripe Connect account set up');
    console.log('  2. Verify webhook is configured correctly');
    console.log('  3. Check Stripe dashboard for recent payments');
    console.log('  4. Test with a new pass purchase');

    console.log('\n✅ Debug completed successfully!');

  } catch (error) {
    console.error('❌ Error during debugging:', error);
    process.exit(1);
  }
}

// Run the debug
debugStripeConnectIssue();
