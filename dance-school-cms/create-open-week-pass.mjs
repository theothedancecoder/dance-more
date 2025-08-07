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

async function createOpenWeekPass() {
  try {
    const tenantId = 'DgqhBYe1Mm6KcUArJjcYot';

    console.log('🎉 Creating Open Week Pass (Aug 11-14, 2025)...');

    // Create the Open Week pass
    const openWeekPass = {
      _type: 'pass',
      name: 'Open Week Pass',
      description: 'Unlimited access to all classes during Open Week (August 11-14, 2025). Perfect for trying out different dance styles!',
      type: 'unlimited', // Unlimited type
      price: 0, // Free for open week
      validityType: 'date', // Date-based validity
      validityDays: 4, // 4 days (Aug 11-14)
      expiryDate: '2025-08-14T23:59:59.000Z', // Expires end of Aug 14th
      classesLimit: null, // Unlimited classes
      isActive: true,
      tenant: {
        _type: 'reference',
        _ref: tenantId,
      },
      features: [
        'Unlimited classes during Open Week',
        'Access to all dance styles',
        'No booking fees',
        'Valid August 11-14, 2025'
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const createdPass = await writeClient.create(openWeekPass);
    console.log('✅ Open Week Pass created:', createdPass._id);

    // Now create a subscription for your user with the specific dates
    const userId = 'user_30wjws3MyPB9ddGIVJDiAW5TPfv';
    
    console.log('🎫 Creating Open Week subscription for your user...');

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
      type: 'unlimited', // Unlimited subscription type
      passId: createdPass._id,
      passName: 'Open Week Pass',
      startDate: '2025-08-11T00:00:00.000Z', // Starts Aug 11th
      endDate: '2025-08-14T23:59:59.000Z',   // Ends Aug 14th
      remainingClips: null, // Unlimited
      isActive: true,
      stripePaymentId: 'open_week_2025_' + Date.now(),
      purchasePrice: 0, // Free
    };

    const createdSubscription = await writeClient.create(subscriptionData);
    console.log('🎉 SUCCESS! Open Week subscription created:', createdSubscription._id);
    
    console.log('\n📅 Open Week Details:');
    console.log('• Valid: August 11-14, 2025');
    console.log('• Type: Unlimited classes');
    console.log('• Price: Free');
    console.log('• Access: All dance styles');
    
    console.log('\n✅ Your Open Week pass should now appear in "Your Active Passes"!');
    console.log('🔄 Refresh your browser to see the new pass');

  } catch (error) {
    console.error('❌ Error creating Open Week pass:', error.message);
  }
}

createOpenWeekPass();
