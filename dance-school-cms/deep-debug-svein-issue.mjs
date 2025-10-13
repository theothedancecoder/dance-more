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

async function deepDebugSveinIssue() {
  const email = 'svein.h.aaberge@gmail.com';
  const clerkId = 'user_32hI2oWTB3ndtvq58UWTagfnlBV';
  
  console.log('🔍 Deep debugging Svein\'s issue...');
  console.log('Email:', email);
  console.log('Clerk ID:', clerkId);
  console.log('=' .repeat(60));

  try {
    // 1. Check if user exists and get all details
    console.log('\n1. Checking user details...');
    const user = await sanityClient.fetch(`
      *[_type == "user" && email == $email][0] {
        _id,
        clerkId,
        email,
        firstName,
        lastName,
        role,
        tenant,
        _createdAt,
        _updatedAt
      }
    `, { email });

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log(`   - ID: ${user._id}`);
    console.log(`   - Clerk ID: ${user.clerkId}`);
    console.log(`   - Email: ${user.email}`);
    console.log(`   - Name: ${user.firstName} ${user.lastName}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Tenant: ${user.tenant}`);
    console.log(`   - Created: ${user._createdAt}`);

    // 2. Check all subscriptions for this user (not just active ones)
    console.log('\n2. Checking ALL subscriptions for this user...');
    const allSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && user->clerkId == $clerkId] | order(_createdAt desc) {
        _id,
        passName,
        passId,
        type,
        startDate,
        endDate,
        isActive,
        classesUsed,
        classesLimit,
        stripeSessionId,
        paymentStatus,
        amount,
        currency,
        _createdAt,
        _updatedAt,
        "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now()),
        "user": user->{_id, clerkId, email}
      }
    `, { clerkId: user.clerkId });

    console.log(`📊 Found ${allSubscriptions.length} total subscriptions`);
    
    allSubscriptions.forEach((sub, index) => {
      console.log(`\n   Subscription ${index + 1}:`);
      console.log(`   - ID: ${sub._id}`);
      console.log(`   - Pass: ${sub.passName}`);
      console.log(`   - Type: ${sub.type}`);
      console.log(`   - Active: ${sub.isActive}`);
      console.log(`   - Expired: ${sub.isExpired}`);
      console.log(`   - Classes: ${sub.classesUsed}/${sub.classesLimit}`);
      console.log(`   - Valid until: ${sub.endDate} (${sub.remainingDays} days)`);
      console.log(`   - Payment: ${sub.paymentStatus} - ${sub.amount/100} ${sub.currency?.toUpperCase()}`);
      console.log(`   - User Reference: ${sub.user?.email} (${sub.user?.clerkId})`);
      console.log(`   - Created: ${sub._createdAt}`);
      console.log(`   - Updated: ${sub._updatedAt}`);
    });

    // 3. Check if there are multiple users with the same email
    console.log('\n3. Checking for duplicate users...');
    const duplicateUsers = await sanityClient.fetch(`
      *[_type == "user" && email == $email] {
        _id,
        clerkId,
        email,
        firstName,
        lastName,
        tenant,
        _createdAt
      }
    `, { email });

    console.log(`📊 Found ${duplicateUsers.length} users with this email`);
    
    if (duplicateUsers.length > 1) {
      console.log('⚠️ Multiple users found with same email:');
      duplicateUsers.forEach((u, index) => {
        console.log(`   User ${index + 1}: ${u._id} (${u.clerkId}) - Tenant: ${u.tenant} - Created: ${u._createdAt}`);
      });
    }

    // 4. Check subscriptions with different user references
    console.log('\n4. Checking subscriptions with email reference...');
    const emailSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription" && user->email == $email] | order(_createdAt desc) {
        _id,
        passName,
        "userClerkId": user->clerkId,
        "userEmail": user->email,
        isActive,
        "isExpired": dateTime(endDate) < dateTime(now())
      }
    `, { email });

    console.log(`📊 Found ${emailSubscriptions.length} subscriptions by email reference`);
    
    emailSubscriptions.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub._id}: ${sub.passName} (User: ${sub.userEmail}, ClerkID: ${sub.userClerkId}, Active: ${sub.isActive}, Expired: ${sub.isExpired})`);
    });

    // 5. Test the exact API query with debugging
    console.log('\n5. Testing exact API query...');
    const apiQuery = `
      *[_type == "subscription" && user->clerkId == $userId] | order(_createdAt desc) {
        _id,
        passName,
        passId,
        type,
        startDate,
        endDate,
        isActive,
        classesUsed,
        classesLimit,
        stripeSessionId,
        paymentStatus,
        amount,
        currency,
        _createdAt,
        _updatedAt,
        "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpired": dateTime(endDate) < dateTime(now())
      }
    `;

    console.log('Query:', apiQuery);
    console.log('Parameters:', { userId: user.clerkId });

    const apiResult = await sanityClient.fetch(apiQuery, { userId: user.clerkId });

    console.log(`✅ API query returned ${apiResult.length} subscriptions`);
    
    if (apiResult.length === 0) {
      console.log('❌ API query returned no results');
      
      // Debug the user reference
      console.log('\n6. Debugging user reference...');
      const userRefTest = await sanityClient.fetch(`
        *[_type == "subscription"] {
          _id,
          passName,
          "hasUserRef": defined(user),
          "userClerkId": user->clerkId,
          "userEmail": user->email,
          "userExists": defined(user->_id)
        }[0..5]
      `);
      
      console.log('Sample subscription user references:');
      userRefTest.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub._id}: hasUserRef=${sub.hasUserRef}, userExists=${sub.userExists}, clerkId=${sub.userClerkId}, email=${sub.userEmail}`);
      });
      
    } else {
      apiResult.forEach((sub, index) => {
        console.log(`\n   API Result ${index + 1}:`);
        console.log(`   - ID: ${sub._id}`);
        console.log(`   - Pass: ${sub.passName}`);
        console.log(`   - Active: ${sub.isActive}`);
        console.log(`   - Expired: ${sub.isExpired}`);
        console.log(`   - Should show: ${sub.isActive && !sub.isExpired ? 'YES' : 'NO'}`);
      });
    }

    // 6. Check tenant-specific data
    if (user.tenant) {
      console.log(`\n7. Checking tenant-specific data for: ${user.tenant}`);
      const tenantData = await sanityClient.fetch(`
        *[_type == "tenant" && _id == $tenantId][0] {
          _id,
          name,
          slug,
          isActive
        }
      `, { tenantId: user.tenant });

      if (tenantData) {
        console.log(`   - Tenant: ${tenantData.name} (${tenantData.slug})`);
        console.log(`   - Active: ${tenantData.isActive}`);
      } else {
        console.log('   - Tenant not found');
      }
    }

  } catch (error) {
    console.error('❌ Error during deep debugging:', error);
  }
}

deepDebugSveinIssue();
