import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables from the parent directory
dotenv.config({ path: '../.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

console.log('🔍 Checking user: marek.lukacovic.mail@gmail.com');
console.log('Investigating tenant association and pass visibility issue\n');

const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';
const userEmail = 'marek.lukacovic.mail@gmail.com';

async function checkMarekUser() {
  try {
    // 1. Find user by email (check ALL users, not just DanceCity)
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id, name, email, clerkId, role, createdAt, tenant
      }`,
      { email: userEmail }
    );

    if (!user) {
      console.log('❌ User not found in database');
      console.log('This means they need to sign up first before we can create a subscription');
      return;
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Clerk ID: ${user.clerkId}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   Tenant Reference: ${user.tenant?._ref || 'NO TENANT ASSIGNED!'}`);

    // 2. Check if user is associated with DanceCity tenant
    const isAssociatedWithDanceCity = user.tenant?._ref === DANCECITY_TENANT_ID;
    
    if (!isAssociatedWithDanceCity) {
      console.log('\n🚨 ISSUE FOUND: User is NOT associated with DanceCity tenant!');
      console.log(`   Expected tenant ID: ${DANCECITY_TENANT_ID}`);
      console.log(`   User's tenant ID: ${user.tenant?._ref || 'NONE'}`);
      
      // Get tenant details if user has one
      if (user.tenant?._ref) {
        const userTenant = await sanityClient.fetch(
          `*[_type == "tenant" && _id == $tenantId][0] {
            _id, schoolName, "slug": slug.current
          }`,
          { tenantId: user.tenant._ref }
        );
        
        if (userTenant) {
          console.log(`   User is associated with: ${userTenant.schoolName} (${userTenant.slug})`);
        }
      }
    } else {
      console.log('\n✅ User is correctly associated with DanceCity tenant');
    }

    // 3. Check for subscriptions under ANY tenant
    const allSubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        _id, passName, type, startDate, endDate, remainingClips, isActive, tenant, purchasePrice, _createdAt
      } | order(_createdAt desc)`,
      { userId: user._id }
    );

    console.log(`\n📋 All subscriptions found: ${allSubscriptions.length}`);
    
    if (allSubscriptions.length === 0) {
      console.log('   ❌ NO SUBSCRIPTIONS FOUND AT ALL');
      console.log('   This suggests the purchase may not have created a subscription');
    } else {
      allSubscriptions.forEach((sub, index) => {
        const isActive = sub.isActive && new Date(sub.endDate) > new Date();
        const tenantMatch = sub.tenant?._ref === DANCECITY_TENANT_ID;
        
        console.log(`\n   ${index + 1}. ${sub.passName} (${sub.type})`);
        console.log(`      Active: ${isActive ? '✅' : '❌'}`);
        console.log(`      Tenant: ${sub.tenant?._ref || 'NO TENANT'}`);
        console.log(`      DanceCity Tenant: ${tenantMatch ? '✅' : '❌'}`);
        console.log(`      Valid: ${sub.startDate} to ${sub.endDate}`);
        console.log(`      Remaining: ${sub.remainingClips || 'Unlimited'}`);
        console.log(`      Price: ${sub.purchasePrice} NOK`);
        console.log(`      Created: ${new Date(sub._createdAt).toLocaleDateString()}`);
        
        if (!tenantMatch) {
          console.log(`      🚨 WRONG TENANT! Should be: ${DANCECITY_TENANT_ID}`);
        }
      });
    }

    // 4. Check for subscriptions specifically under DanceCity tenant
    const danceCitySubscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && tenant._ref == $tenantId] {
        _id, passName, type, startDate, endDate, remainingClips, isActive, purchasePrice, _createdAt
      } | order(_createdAt desc)`,
      { userId: user._id, tenantId: DANCECITY_TENANT_ID }
    );

    console.log(`\n🎫 DanceCity subscriptions: ${danceCitySubscriptions.length}`);
    
    if (danceCitySubscriptions.length === 0) {
      console.log('   ❌ NO DANCECITY SUBSCRIPTIONS FOUND');
      console.log('   This is likely why the user cannot see their active passes');
    }

    // 5. Check recent Stripe payments/purchases
    console.log('\n💳 Checking for recent purchases...');
    
    // Look for any payment records
    const payments = await sanityClient.fetch(
      `*[_type == "payment" && customerEmail == $email] {
        _id, amount, status, stripePaymentIntentId, createdAt, metadata
      } | order(_createdAt desc)[0...5]`,
      { email: userEmail }
    );

    if (payments.length > 0) {
      console.log(`   ✅ Found ${payments.length} payment record(s):`);
      payments.forEach((payment, index) => {
        console.log(`      ${index + 1}. ${payment.amount} NOK - ${payment.status}`);
        console.log(`         Stripe ID: ${payment.stripePaymentIntentId}`);
        console.log(`         Date: ${new Date(payment.createdAt).toLocaleDateString()}`);
        console.log(`         Metadata: ${JSON.stringify(payment.metadata || {})}`);
      });
    } else {
      console.log('   ❌ No payment records found');
    }

    // 6. Summary and recommendations
    console.log('\n📊 DIAGNOSIS SUMMARY');
    console.log('====================');
    
    if (!isAssociatedWithDanceCity) {
      console.log('🚨 PRIMARY ISSUE: User is not associated with DanceCity tenant');
      console.log('   SOLUTION: Update user record to associate with DanceCity tenant');
    }
    
    if (allSubscriptions.length === 0) {
      console.log('🚨 SECONDARY ISSUE: No subscriptions found');
      console.log('   SOLUTION: Create subscription based on purchase');
    } else if (danceCitySubscriptions.length === 0) {
      console.log('🚨 SECONDARY ISSUE: Subscriptions exist but not for DanceCity tenant');
      console.log('   SOLUTION: Update subscription tenant references or create new DanceCity subscription');
    }

    // 7. Provide fix functions
    console.log('\n🔧 AVAILABLE FIXES:');
    console.log('1. Fix tenant association: fixUserTenantAssociation()');
    console.log('2. Create missing subscription: createSubscriptionForUser(passName, purchaseDate)');
    
    return {
      user,
      isAssociatedWithDanceCity,
      allSubscriptions,
      danceCitySubscriptions,
      payments
    };

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Function to fix user tenant association
async function fixUserTenantAssociation() {
  try {
    console.log('\n🔧 Fixing user tenant association...');
    
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0]`,
      { email: userEmail }
    );

    if (!user) {
      console.log('❌ User not found');
      return false;
    }

    const result = await writeClient
      .patch(user._id)
      .set({
        tenant: {
          _type: 'reference',
          _ref: DANCECITY_TENANT_ID
        }
      })
      .commit();

    console.log('✅ User tenant association updated successfully');
    console.log(`   User ${user.name} is now associated with DanceCity tenant`);
    
    return true;
  } catch (error) {
    console.error('❌ Error fixing tenant association:', error);
    return false;
  }
}

// Function to create subscription
async function createSubscriptionForUser(passName, purchaseDate) {
  try {
    console.log(`\n🔍 Creating subscription for: ${userEmail} - ${passName}`);

    // Find user by email
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0]`,
      { email: userEmail }
    );

    if (!user) {
      console.log(`   ❌ User not found: ${userEmail}`);
      return false;
    }

    // Find pass by name and tenant
    const pass = await sanityClient.fetch(
      `*[_type == "pass" && name match $passName && tenant._ref == $tenantId][0]`,
      { passName: passName + '*', tenantId: DANCECITY_TENANT_ID }
    );

    if (!pass) {
      console.log(`   ❌ Pass not found: ${passName}`);
      console.log('   Available passes:');
      
      const availablePasses = await sanityClient.fetch(
        `*[_type == "pass" && tenant._ref == $tenantId] {
          _id, name, type, price, validityDays, classesLimit
        }`,
        { tenantId: DANCECITY_TENANT_ID }
      );
      
      availablePasses.forEach((p, i) => {
        console.log(`      ${i + 1}. ${p.name} (${p.type}) - ${p.price} NOK`);
      });
      
      return false;
    }

    console.log(`   ✅ Found pass: ${pass.name} (${pass.type})`);

    // Check if subscription already exists
    const existingSubscription = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && passId == $passId][0]`,
      { userId: user._id, passId: pass._id }
    );

    if (existingSubscription) {
      console.log(`   ✅ Subscription already exists: ${existingSubscription._id}`);
      return true;
    }

    // Calculate subscription details
    const startDate = new Date(purchaseDate);
    const endDate = new Date(startDate.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);

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
        console.log(`   ❌ Invalid pass type: ${pass.type}`);
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
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      passId: pass._id,
      passName: pass.name,
      purchasePrice: pass.price,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log(`   📝 Creating subscription for ${user.name}:`);
    console.log(`      Pass: ${pass.name} (${subscriptionType})`);
    console.log(`      Classes: ${remainingClips || 'Unlimited'}`);
    console.log(`      Valid until: ${endDate.toLocaleDateString()}`);

    const createdSubscription = await writeClient.create(subscriptionData);
    console.log(`   🎉 SUCCESS! Created subscription: ${createdSubscription._id}`);
    console.log(`   ✅ ${user.name} can now see their ${pass.name} pass in "Your Active Passes"`);

    return true;
  } catch (error) {
    console.log(`   ❌ Error creating subscription:`, error.message);
    return false;
  }
}

// Export functions for manual use
global.fixUserTenantAssociation = fixUserTenantAssociation;
global.createSubscriptionForUser = createSubscriptionForUser;

checkMarekUser();
