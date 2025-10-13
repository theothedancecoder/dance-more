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

async function fixSveinTenantAssociation() {
  const email = 'svein.h.aaberge@gmail.com';
  const clerkId = 'user_32hI2oWTB3ndtvq58UWTagfnlBV';
  const tenantSlug = 'dancecity';
  const subscriptionId = 'x55OSItMbFx92tINEDruzr';
  const userId = 'x7AKQdsMTT5RY3O5CjyoxS';
  
  console.log('🔧 Fixing Svein\'s tenant association...');
  console.log('Email:', email);
  console.log('Subscription ID:', subscriptionId);
  console.log('User ID:', userId);
  console.log('Target Tenant:', tenantSlug);
  console.log('=' .repeat(60));

  try {
    // 1. Get the dancecity tenant ID
    console.log('\n1. Getting dancecity tenant...');
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

    // 2. Update user to be associated with dancecity tenant
    console.log('\n2. Associating user with dancecity tenant...');
    const userUpdate = await sanityClient
      .patch(userId)
      .set({
        tenant: {
          _type: 'reference',
          _ref: tenant._id
        },
        _updatedAt: new Date().toISOString()
      })
      .commit();

    console.log('✅ User updated with tenant association');

    // 3. Update subscription to be associated with dancecity tenant
    console.log('\n3. Associating subscription with dancecity tenant...');
    const subscriptionUpdate = await sanityClient
      .patch(subscriptionId)
      .set({
        tenant: {
          _type: 'reference',
          _ref: tenant._id
        },
        _updatedAt: new Date().toISOString()
      })
      .commit();

    console.log('✅ Subscription updated with tenant association');

    // 4. Verify the updates
    console.log('\n4. Verifying updates...');
    const updatedUser = await sanityClient.fetch(`
      *[_type == "user" && _id == $userId][0] {
        _id,
        email,
        tenant,
        "tenantName": tenant->name,
        "tenantSlug": tenant->slug.current
      }
    `, { userId });

    const updatedSubscription = await sanityClient.fetch(`
      *[_type == "subscription" && _id == $subscriptionId][0] {
        _id,
        passName,
        tenant,
        "tenantName": tenant->name,
        "tenantSlug": tenant->slug.current
      }
    `, { subscriptionId });

    console.log('✅ Updated user verification:');
    console.log(`   - Email: ${updatedUser.email}`);
    console.log(`   - Tenant: ${updatedUser.tenantName} (${updatedUser.tenantSlug})`);

    console.log('✅ Updated subscription verification:');
    console.log(`   - Pass: ${updatedSubscription.passName}`);
    console.log(`   - Tenant: ${updatedSubscription.tenantName} (${updatedSubscription.tenantSlug})`);

    // 5. Test the exact API query that was failing
    console.log('\n5. Testing the exact API query...');
    const apiQuery = `
      *[_type == "subscription" && user._ref == $sanityUserId && isActive == true && endDate > $now && tenant._ref == $tenantId] | order(_createdAt desc) {
        _id,
        type,
        passName,
        passId,
        startDate,
        endDate,
        remainingClips,
        isActive,
        purchasePrice,
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }
    `;

    const now = new Date();
    const apiResult = await sanityClient.fetch(apiQuery, {
      sanityUserId: userId,
      now: now.toISOString(),
      tenantId: tenant._id
    });

    console.log(`📊 API query returned ${apiResult.length} subscriptions`);
    
    if (apiResult.length > 0) {
      console.log('🎉 SUCCESS! The subscription now shows up in the API query');
      apiResult.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.passName} - Active: ${sub.isActive}, Days: ${sub.daysRemaining}`);
      });
    } else {
      console.log('❌ Still no results from API query');
    }

    console.log('\n🎉 Fix completed!');
    console.log('Svein should now be able to see his 2 Course Pass at dancemore.app/dancecity/subscriptions');

  } catch (error) {
    console.error('❌ Error fixing tenant association:', error);
  }
}

fixSveinTenantAssociation();
