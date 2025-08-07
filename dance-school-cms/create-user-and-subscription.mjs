#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@sanity/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env.local') });

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
});

async function createUserAndSubscription() {
  try {
    const userId = 'user_30wjws3MyPB9ddGIVJDiAW5TPfv'; // Your actual user ID from logs
    const tenantId = 'DgqhBYe1Mm6KcUArJjcYot';

    console.log('🔍 Checking if user exists in Sanity...');
    
    // Check if user exists
    let user = await writeClient.fetch(
      `*[_type == "user" && _id == $userId][0]`,
      { userId }
    );

    if (!user) {
      console.log('👤 User not found, creating user record...');
      
      // Create user in Sanity
      user = await writeClient.create({
        _type: 'user',
        _id: userId,
        email: 'your-email@example.com', // Replace with your actual email
        firstName: 'Your',
        lastName: 'Name',
        clerkId: userId,
        role: 'student',
        tenant: {
          _type: 'reference',
          _ref: tenantId,
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      
      console.log('✅ User created:', user._id);
    } else {
      console.log('✅ User already exists:', user._id);
    }

    // Now create subscription
    console.log('🎫 Creating subscription...');
    
    const pass = await writeClient.fetch(
      `*[_type == "pass" && tenant._ref == $tenantId && isActive == true][0]`,
      { tenantId }
    );

    if (!pass) {
      console.error('❌ No active passes found');
      return;
    }

    console.log('Found pass:', pass.name, pass.type, pass.price + ' kr');

    const now = new Date();
    const endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);

    const subscriptionData = {
      _type: 'subscription',
      user: {
        _type: 'reference',
        _ref: userId,
      },
      tenant: {
        _type: 'reference',
        _ref: tenantId,
      },
      type: 'single',
      passId: pass._id,
      passName: pass.name,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips: 1,
      isActive: true,
      stripePaymentId: 'manual_creation_for_your_user_' + Date.now(),
      purchasePrice: pass.price,
    };

    const createdSubscription = await writeClient.create(subscriptionData);
    console.log('🎉 SUCCESS! Created subscription:', createdSubscription._id);
    console.log('✅ This should now appear in Your Active Passes!');
    console.log('🔄 Refresh your browser to see the pass');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('references non-existent document')) {
      console.log('💡 The user ID might not exist in Sanity. Try creating the user first.');
    }
  }
}

createUserAndSubscription();
