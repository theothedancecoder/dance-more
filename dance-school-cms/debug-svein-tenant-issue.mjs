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

async function debugSveinTenantIssue() {
  const email = 'svein.h.aaberge@gmail.com';
  const clerkId = 'user_32hI2oWTB3ndtvq58UWTagfnlBV';
  const tenantSlug = 'dancecity';
  
  console.log('🔍 Debugging Svein\'s tenant-specific subscription issue...');
  console.log('Email:', email);
  console.log('Clerk ID:', clerkId);
  console.log('Tenant Slug:', tenantSlug);
  console.log('=' .repeat(60));

  try {
    // 1. Check if dancecity tenant exists
    console.log('\n1. Checking dancecity tenant...');
    const tenant = await sanityClient.fetch(`
      *[_type == "tenant" && slug.current == $tenantSlug][0] {
        _id,
        name,
        slug,
        isActive
      }
    `, { tenantSlug });

    if (!tenant) {
      console.log('❌ Dancecity tenant not found');
      return;
    }

    console.log('✅ Found tenant:');
    console.log(`   - ID: ${tenant._id}`);
    console.log(`   - Name: ${tenant.name}`);
    console.log(`   - Slug: ${tenant.slug.current}`);
    console.log(`   - Active: ${tenant.isActive}`);

    // 2. Check Svein's user and tenant association
    console.log('\n2. Checking Svein\'s user and tenant association...');
    const user = await sanityClient.fetch(`
      *[_type == "user" && clerkId == $clerkId][0] {
        _id,
        clerkId,
        email,
        firstName,
        lastName,
        role,
        tenant,
        "tenantName": tenant->name,
        "tenantSlug": tenant->slug.current
      }
    `, { clerkId });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ Found user:');
    console.log(`   - ID: ${user._id}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Tenant ID: ${user.tenant}`);
    console.log(`   - Tenant Name: ${user.tenantName}`);
    console.log(`   - Tenant Slug: ${user.tenantSlug}`);

    // 3. Check subscription and its tenant association
    console.log('\n3. Checking subscription tenant association...');
    const subscription = await sanityClient.fetch(`
      *[_type == "subscription" && user->clerkId == $clerkId][0] {
        _id,
        passName,
        type,
        isActive,
        startDate,
        endDate,
        tenant,
        "tenantName": tenant->name,
        "tenantSlug": tenant->slug.current,
        "userTenant": user->tenant,
        "userTenantSlug": user->tenant->slug.current
      }
    `, { clerkId });

    if (!subscription) {
      console.log('❌ No subscription found');
      return;
    }

    console.log('✅ Found subscription:');
    console.log(`   - ID: ${subscription._id}`);
    console.log(`   - Pass: ${subscription.passName}`);
    console.log(`   - Active: ${subscription.isActive}`);
    console.log(`   - Subscription Tenant: ${subscription.tenant}`);
    console.log(`   - Subscription Tenant Name: ${subscription.tenantName}`);
    console.log(`   - Subscription Tenant Slug: ${subscription.tenantSlug}`);
    console.log(`   - User's Tenant: ${subscription.userTenant}`);
    console.log(`   - User's Tenant Slug: ${subscription.userTenantSlug}`);

    // 4. Test the tenant-specific API query
    console.log('\n4. Testing tenant-specific API query...');
    
    // This is what the /api/user/subscriptions endpoint does
    const tenantSpecificQuery = `
      *[_type == "subscription" && user->clerkId == $clerkId && (
        tenant._ref == $tenantId || 
        user->tenant._ref == $tenantId ||
        !defined(tenant)
      )] | order(_createdAt desc) {
        _id,
        passName,
        type,
        isActive,
        startDate,
        endDate,
        remainingClips,
        purchasePrice,
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }
    `;

    console.log('Query:', tenantSpecificQuery);
    console.log('Parameters:', { clerkId, tenantId: tenant._id });

    const tenantSubscriptions = await sanityClient.fetch(tenantSpecificQuery, { 
      clerkId, 
      tenantId: tenant._id 
    });

    console.log(`📊 Found ${tenantSubscriptions.length} tenant-specific subscriptions`);

    if (tenantSubscriptions.length === 0) {
      console.log('\n❌ ISSUE FOUND: No subscriptions returned by tenant-specific query');
      console.log('\n🔧 DIAGNOSIS:');
      
      if (!subscription.tenant && !user.tenant) {
        console.log('   - Neither subscription nor user has tenant association');
        console.log('   - Need to associate user or subscription with dancecity tenant');
      } else if (subscription.tenant !== tenant._id && user.tenant !== tenant._id) {
        console.log('   - Subscription and user are associated with different tenant');
        console.log(`   - Expected tenant: ${tenant._id} (${tenant.name})`);
        console.log(`   - Subscription tenant: ${subscription.tenant}`);
        console.log(`   - User tenant: ${user.tenant}`);
      }
    } else {
      console.log('✅ Tenant-specific query works correctly');
      tenantSubscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.passName} - Active: ${sub.isActive}, Expired: ${sub.isExpired}`);
      });
    }

    // 5. Show the fix needed
    console.log('\n5. 🔧 SOLUTION:');
    if (tenantSubscriptions.length === 0) {
      if (!user.tenant) {
        console.log('✅ Need to associate Svein\'s user with dancecity tenant');
        console.log(`   - Update user ${user._id} to have tenant reference to ${tenant._id}`);
      }
      if (!subscription.tenant) {
        console.log('✅ Need to associate Svein\'s subscription with dancecity tenant');
        console.log(`   - Update subscription ${subscription._id} to have tenant reference to ${tenant._id}`);
      }
    } else {
      console.log('✅ The subscription should be showing in the dancecity tenant');
      console.log('   - The issue might be elsewhere (caching, frontend, etc.)');
    }

  } catch (error) {
    console.error('❌ Error during tenant debugging:', error);
  }
}

debugSveinTenantIssue();
