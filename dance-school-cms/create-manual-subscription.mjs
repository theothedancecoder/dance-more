import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const writeClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
});

async function createManualSubscription() {
  try {
    // Using YOUR actual user ID from the logs
    const userId = 'user_30wjws3MyPB9ddGIVJDiAW5TPfv';
    const tenantId = 'DgqhBYe1Mm6KcUArJjcYot';

    // Get the first available pass for this tenant
    const pass = await writeClient.fetch(
      `*[_type == "pass" && tenant._ref == $tenantId && isActive == true][0]`,
      { tenantId }
    );

    if (!pass) {
      console.error('No active passes found for tenant');
      return;
    }

    console.log('Found pass:', pass.name, pass.type, pass.price + ' kr');

    // Create subscription
    const now = new Date();
    const endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);

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
        subscriptionType = 'single';
        remainingClips = 1;
    }

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
      type: subscriptionType,
      passId: pass._id,
      passName: pass.name,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      remainingClips,
      isActive: true,
      stripePaymentId: 'manual_creation_' + Date.now(),
      purchasePrice: pass.price,
    };

    console.log('Creating subscription:', subscriptionData);

    const createdSubscription = await writeClient.create(subscriptionData);

    console.log('✅ Successfully created subscription:', createdSubscription._id);
    console.log('Pass:', pass.name);
    console.log('Valid until:', endDate.toLocaleDateString());
    console.log('Remaining classes:', remainingClips || 'Unlimited');
    
    console.log('\n🎉 Your pass should now appear in the "Your Active Passes" section!');
    console.log('Visit: http://localhost:3000/dance-with-dancecity/subscriptions');

  } catch (error) {
    console.error('Error creating subscription:', error);
  }
}

createManualSubscription();
