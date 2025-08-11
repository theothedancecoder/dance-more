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

console.log('🔍 Debugging Jayson API visibility issue\n');

const userEmail = 'jayson.ang12@gmail.com';
const DANCECITY_TENANT_ID = 'sOY5WwoEBY24iuIm0CkYss';

async function debugApiIssue() {
  try {
    // 1. Get user data
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id, name, email, clerkId, role, createdAt
      }`,
      { email: userEmail }
    );

    if (!user) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ User found:');
    console.log(`   _id: ${user._id}`);
    console.log(`   clerkId: ${user.clerkId}`);
    console.log(`   email: ${user.email}`);

    // 2. Check subscriptions using user._id (what API currently does)
    console.log('\n🔍 API Query 1: Looking for subscriptions using user._id');
    const subscriptionsById = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId && tenant._ref == $tenantId] {
        _id, passName, type, isActive, user->{_id, clerkId, email}
      }`,
      { userId: user._id, tenantId: DANCECITY_TENANT_ID }
    );
    console.log(`   Found: ${subscriptionsById.length} subscriptions`);
    subscriptionsById.forEach(sub => {
      console.log(`   - ${sub.passName} (${sub._id}) - Active: ${sub.isActive}`);
      console.log(`     User ref: ${sub.user._id} (clerkId: ${sub.user.clerkId})`);
    });

    // 3. Check subscriptions using clerkId (what API should do)
    console.log('\n🔍 API Query 2: Looking for subscriptions using clerkId');
    const subscriptionsByClerkId = await sanityClient.fetch(
      `*[_type == "subscription" && user->clerkId == $clerkId && tenant._ref == $tenantId] {
        _id, passName, type, isActive, user->{_id, clerkId, email}
      }`,
      { clerkId: user.clerkId, tenantId: DANCECITY_TENANT_ID }
    );
    console.log(`   Found: ${subscriptionsByClerkId.length} subscriptions`);
    subscriptionsByClerkId.forEach(sub => {
      console.log(`   - ${sub.passName} (${sub._id}) - Active: ${sub.isActive}`);
      console.log(`     User ref: ${sub.user._id} (clerkId: ${sub.user.clerkId})`);
    });

    // 4. The problem: API uses userId from Clerk auth() which is clerkId, not _id
    console.log('\n🚨 THE PROBLEM:');
    console.log('   - Clerk auth() returns clerkId as userId');
    console.log('   - API searches for subscriptions using this clerkId as _id');
    console.log('   - But subscriptions are linked to user._id, not clerkId');
    console.log('   - This causes a mismatch and no subscriptions are found');

    console.log('\n💡 THE SOLUTION:');
    console.log('   - API should first find user by clerkId');
    console.log('   - Then use that user._id to find subscriptions');
    console.log('   - OR modify query to use user->clerkId == $clerkId');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugApiIssue();
