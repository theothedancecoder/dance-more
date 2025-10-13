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

async function fixAllMissingTenantAssociations() {
  console.log('🔧 Fixing all missing tenant associations...');
  console.log('=' .repeat(60));

  try {
    // 1. Get all active tenants
    console.log('\n1. Getting all active tenants...');
    const tenants = await sanityClient.fetch(`
      *[_type == "tenant"] {
        _id,
        name,
        "slug": slug.current,
        "subdomain": subdomain.current,
        isActive
      }
    `);

    console.log(`📊 Found ${tenants.length} tenants:`);
    tenants.forEach((tenant, index) => {
      console.log(`   ${index + 1}. ${tenant.name || tenant.slug} (${tenant.slug}) - ID: ${tenant._id}`);
    });

    // 2. Find all subscriptions without tenant associations
    console.log('\n2. Finding subscriptions without tenant associations...');
    const subscriptionsWithoutTenant = await sanityClient.fetch(`
      *[_type == "subscription" && !defined(tenant)] {
        _id,
        passName,
        type,
        isActive,
        startDate,
        endDate,
        "userEmail": user->email,
        "userClerkId": user->clerkId,
        "userName": user->firstName + " " + user->lastName,
        "isExpired": dateTime(endDate) < dateTime(now())
      }
    `);

    console.log(`📊 Found ${subscriptionsWithoutTenant.length} subscriptions without tenant association:`);
    subscriptionsWithoutTenant.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.passName} - ${sub.userEmail} - Active: ${sub.isActive}, Expired: ${sub.isExpired}`);
    });

    // 3. Find all users without tenant associations
    console.log('\n3. Finding users without tenant associations...');
    const usersWithoutTenant = await sanityClient.fetch(`
      *[_type == "user" && !defined(tenant)] {
        _id,
        email,
        firstName,
        lastName,
        clerkId,
        role,
        _createdAt
      }
    `);

    console.log(`📊 Found ${usersWithoutTenant.length} users without tenant association:`);
    usersWithoutTenant.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} - ${user.firstName} ${user.lastName} - Role: ${user.role}`);
    });

    // 4. Strategy: Associate with the main tenant (dancecity) or first active tenant
    const mainTenant = tenants.find(t => t.slug === 'dancecity') || tenants.find(t => t.isActive) || tenants[0];
    
    if (!mainTenant) {
      console.log('❌ No suitable tenant found for association');
      return;
    }

    console.log(`\n4. Using tenant for associations: ${mainTenant.name || mainTenant.slug} (${mainTenant._id})`);

    // 5. Fix all subscriptions without tenant
    console.log('\n5. Fixing subscriptions...');
    let fixedSubscriptions = 0;
    
    for (const subscription of subscriptionsWithoutTenant) {
      try {
        await sanityClient
          .patch(subscription._id)
          .set({
            tenant: {
              _type: 'reference',
              _ref: mainTenant._id
            },
            _updatedAt: new Date().toISOString()
          })
          .commit();
        
        console.log(`   ✅ Fixed subscription: ${subscription.passName} for ${subscription.userEmail}`);
        fixedSubscriptions++;
      } catch (error) {
        console.log(`   ❌ Failed to fix subscription ${subscription._id}: ${error.message}`);
      }
    }

    // 6. Fix all users without tenant
    console.log('\n6. Fixing users...');
    let fixedUsers = 0;
    
    for (const user of usersWithoutTenant) {
      try {
        await sanityClient
          .patch(user._id)
          .set({
            tenant: {
              _type: 'reference',
              _ref: mainTenant._id
            },
            role: user.role === 'pending' ? 'user' : user.role, // Also fix pending roles
            _updatedAt: new Date().toISOString()
          })
          .commit();
        
        console.log(`   ✅ Fixed user: ${user.email} (${user.firstName} ${user.lastName})`);
        fixedUsers++;
      } catch (error) {
        console.log(`   ❌ Failed to fix user ${user._id}: ${error.message}`);
      }
    }

    // 7. Fix any subscriptions with missing data (like Svein's case)
    console.log('\n7. Fixing subscriptions with missing data...');
    const subscriptionsWithMissingData = await sanityClient.fetch(`
      *[_type == "subscription" && (
        !defined(classesUsed) || 
        !defined(classesLimit) || 
        !defined(paymentStatus) || 
        !defined(amount) || 
        !defined(currency)
      )] {
        _id,
        passName,
        passId,
        type,
        classesUsed,
        classesLimit,
        paymentStatus,
        amount,
        currency,
        "userEmail": user->email,
        "passDetails": *[_type == "pass" && _id == ^.passId][0]{
          name,
          price,
          classesLimit,
          type
        }
      }
    `);

    console.log(`📊 Found ${subscriptionsWithMissingData.length} subscriptions with missing data`);
    
    let fixedDataSubscriptions = 0;
    for (const subscription of subscriptionsWithMissingData) {
      try {
        const updateData = {};
        
        // Fix missing classesUsed
        if (subscription.classesUsed === null || subscription.classesUsed === undefined) {
          updateData.classesUsed = 0;
        }
        
        // Fix missing classesLimit
        if (subscription.classesLimit === null || subscription.classesLimit === undefined) {
          if (subscription.passDetails?.classesLimit) {
            updateData.classesLimit = subscription.passDetails.classesLimit;
          } else if (subscription.type === 'multi-pass' && subscription.passName?.includes('2')) {
            updateData.classesLimit = 2;
          } else if (subscription.type === 'multi-pass' && subscription.passName?.includes('3')) {
            updateData.classesLimit = 3;
          } else if (subscription.type === 'single') {
            updateData.classesLimit = 1;
          }
        }
        
        // Fix missing payment data
        if (!subscription.paymentStatus) {
          updateData.paymentStatus = 'completed';
        }
        
        if (!subscription.amount && subscription.passDetails?.price) {
          updateData.amount = subscription.passDetails.price * 100; // Convert to cents
        }
        
        if (!subscription.currency) {
          updateData.currency = 'nok';
        }
        
        if (Object.keys(updateData).length > 0) {
          updateData._updatedAt = new Date().toISOString();
          
          await sanityClient
            .patch(subscription._id)
            .set(updateData)
            .commit();
          
          console.log(`   ✅ Fixed data for: ${subscription.passName} - ${subscription.userEmail}`);
          console.log(`      Updated: ${Object.keys(updateData).join(', ')}`);
          fixedDataSubscriptions++;
        }
      } catch (error) {
        console.log(`   ❌ Failed to fix subscription data ${subscription._id}: ${error.message}`);
      }
    }

    // 8. Verification - Test the API query for a few users
    console.log('\n8. Verification - Testing API queries...');
    const testUsers = subscriptionsWithoutTenant.slice(0, 3); // Test first 3 users
    
    for (const testUser of testUsers) {
      if (testUser.userClerkId) {
        try {
          const user = await sanityClient.fetch(`
            *[_type == "user" && clerkId == $clerkId][0] {
              _id,
              email
            }
          `, { clerkId: testUser.userClerkId });

          if (user) {
            const apiQuery = `
              *[_type == "subscription" && user._ref == $sanityUserId && isActive == true && endDate > $now && tenant._ref == $tenantId] | order(_createdAt desc) {
                _id,
                passName,
                type,
                isActive,
                "daysRemaining": round((dateTime(endDate) - dateTime(now())) / 86400)
              }
            `;

            const now = new Date();
            const apiResult = await sanityClient.fetch(apiQuery, {
              sanityUserId: user._id,
              now: now.toISOString(),
              tenantId: mainTenant._id
            });

            console.log(`   📊 ${user.email}: ${apiResult.length} subscriptions now visible`);
            if (apiResult.length > 0) {
              apiResult.forEach(sub => {
                console.log(`      - ${sub.passName} (${sub.daysRemaining} days remaining)`);
              });
            }
          }
        } catch (error) {
          console.log(`   ❌ Failed to test user ${testUser.userEmail}: ${error.message}`);
        }
      }
    }

    // 9. Summary
    console.log('\n🎉 SUMMARY:');
    console.log(`✅ Fixed ${fixedSubscriptions} subscriptions with missing tenant associations`);
    console.log(`✅ Fixed ${fixedUsers} users with missing tenant associations`);
    console.log(`✅ Fixed ${fixedDataSubscriptions} subscriptions with missing data`);
    console.log(`🏢 All associations made with tenant: ${mainTenant.name || mainTenant.slug}`);
    console.log('\nAll affected users should now be able to see their passes in their respective tenant dashboards.');

  } catch (error) {
    console.error('❌ Error during bulk fix:', error);
  }
}

fixAllMissingTenantAssociations();
