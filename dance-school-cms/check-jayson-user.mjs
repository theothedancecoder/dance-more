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

console.log('🔍 Checking user: jayson.ang12@gmail.com\n');

const userEmail = 'jayson.ang12@gmail.com';

async function checkUser() {
  try {
    // Find user by email
    const user = await sanityClient.fetch(
      `*[_type == "user" && email == $email][0] {
        _id, name, email, clerkId, role, createdAt
      }`,
      { email: userEmail }
    );

    if (!user) {
      console.log('❌ User not found in database');
      console.log('This means they need to sign up first before we can create a subscription');
      return;
    }

    console.log('✅ User found:');
    console.log(`   Name: ${user.name || 'No name'}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Clerk ID: ${user.clerkId}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Created: ${user.createdAt}`);

    // Check for existing subscriptions
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && user._ref == $userId] {
        _id, passName, type, startDate, endDate, remainingClips, isActive
      }`,
      { userId: user._id }
    );

    console.log(`\n📋 Existing subscriptions: ${subscriptions.length}`);
    if (subscriptions.length > 0) {
      subscriptions.forEach((sub, index) => {
        console.log(`   ${index + 1}. ${sub.passName} (${sub.type}) - Active: ${sub.isActive}`);
        console.log(`      Valid: ${sub.startDate} to ${sub.endDate}`);
        console.log(`      Remaining: ${sub.remainingClips || 'Unlimited'}`);
      });
      console.log(`\n✅ This user HAS subscriptions - CORS issue preventing visibility`);
    } else {
      console.log(`\n❌ This user has NO subscriptions - needs Open week Trial Pass created`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUser();
