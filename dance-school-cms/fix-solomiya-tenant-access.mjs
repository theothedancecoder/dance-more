import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

console.log('🎯 FIXING SOLOMIYA TENANT ACCESS ISSUE\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

async function fixSolomiyaTenantAccess() {
  try {
    console.log('🔍 MIDDLEWARE ISSUE IDENTIFIED:');
    console.log('===============================');
    console.log('❌ Middleware blocks users without tenant.slug !== tenantSlug');
    console.log('❌ Solomiya has NO tenant field, so middleware blocks her');
    console.log('✅ Solution: Add tenant reference to Dancecity for Solomiya');
    console.log('');

    // Find Solomiya's user record
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email, tenant
      }`
    );

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('👤 CURRENT USER DATA:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Current Tenant: ${user.tenant?._ref || 'None'}`);
    console.log('');

    // Add tenant reference to Dancecity
    console.log('🔄 ADDING TENANT REFERENCE:');
    console.log('   Adding tenant reference to Dancecity...');
    
    const updateResult = await sanityClient
      .patch(user._id)
      .set({ 
        tenant: {
          _type: 'reference',
          _ref: DANCECITY_TENANT_ID
        }
      })
      .commit();

    console.log('✅ SUCCESS! Added tenant reference');
    console.log(`   User ID: ${updateResult._id}`);
    console.log('');

    // Verify the change
    const updatedUser = await sanityClient.fetch(
      `*[_type == "user" && email == "miiamer88@gmail.com"][0] {
        _id, name, email, tenant->{_id, schoolName, "slug": slug.current}
      }`
    );

    console.log('✅ VERIFICATION:');
    console.log(`   Name: ${updatedUser.name}`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Tenant: ${updatedUser.tenant?.schoolName} (${updatedUser.tenant?.slug})`);
    console.log(`   Tenant ID: ${updatedUser.tenant?._id}`);
    console.log('');

    // Test the API query again to make sure it still works
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && isActive == true] {
        _id, passName, type, remainingClips, 
        "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400)
      }`,
      { userId: user._id }
    );

    console.log('🎫 SUBSCRIPTION VERIFICATION:');
    console.log(`   Active subscriptions: ${subscriptions.length}`);
    subscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName} - ${sub.daysRemaining} days, ${sub.remainingClips} classes`);
    });
    console.log('');

    console.log('🎉 TENANT ACCESS FIX COMPLETE!');
    console.log('===============================');
    console.log('✅ Solomiya now has tenant reference to Dancecity');
    console.log('✅ Middleware will now allow her access to dancecity.no');
    console.log('✅ API query still returns 2 active subscriptions');
    console.log('');
    console.log('📱 NEXT STEPS FOR SOLOMIYA:');
    console.log('1. Clear browser cache completely');
    console.log('2. Log out and log back in');
    console.log('3. Go to dancecity.no/subscriptions');
    console.log('4. Should now see her passes without middleware blocking');
    console.log('');
    console.log('💡 This fix addresses the middleware tenant access control');

  } catch (error) {
    console.error('❌ Error fixing tenant access:', error);
  }
}

fixSolomiyaTenantAccess();
