import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function fixExistingSubscriptions() {
  try {
    console.log('🔧 Fixing existing subscription records...');
    
    // Get all subscriptions for the tenant that need fixing
    const subscriptions = await client.fetch(`*[_type == "subscription" && tenant._ref == "DgqhBYe1Mm6KcUArJjcYot"]{
      _id,
      _rev,
      amount,
      currency,
      status,
      pass,
      stripePaymentIntentId,
      user->{
        _id,
        name,
        email
      }
    }`);
    
    console.log(`Found ${subscriptions.length} subscriptions to potentially fix`);
    
    // Get all passes to match with subscriptions
    const passes = await client.fetch(`*[_type == "pass" && tenant._ref == "DgqhBYe1Mm6KcUArJjcYot"]{
      _id,
      name,
      price,
      type
    }`);
    
    console.log(`Found ${passes.length} passes available`);
    
    for (const subscription of subscriptions) {
      console.log(`\n📝 Processing subscription ${subscription._id}...`);
      
      const updates = {};
      let needsUpdate = false;
      
      // Fix missing amount - use a default pass price if available
      if (!subscription.amount && passes.length > 0) {
        // For now, let's assume it's the first pass or a reasonable default
        const defaultPass = passes.find(p => p.type === 'single') || passes[0];
        updates.amount = defaultPass.price || 100; // Default to 100 NOK
        updates.currency = 'NOK';
        needsUpdate = true;
        console.log(`  ✅ Setting amount to ${updates.amount} ${updates.currency}`);
      }
      
      // Fix missing status
      if (!subscription.status) {
        updates.status = 'active';
        needsUpdate = true;
        console.log(`  ✅ Setting status to 'active'`);
      }
      
      // Fix missing pass reference - link to the first available pass for now
      if (!subscription.pass && passes.length > 0) {
        const defaultPass = passes.find(p => p.type === 'single') || passes[0];
        updates.pass = {
          _type: 'reference',
          _ref: defaultPass._id
        };
        needsUpdate = true;
        console.log(`  ✅ Linking to pass: ${defaultPass.name}`);
      }
      
      if (needsUpdate) {
        try {
          await client
            .patch(subscription._id)
            .set(updates)
            .commit();
          
          console.log(`  🎉 Successfully updated subscription ${subscription._id}`);
        } catch (error) {
          console.error(`  ❌ Failed to update subscription ${subscription._id}:`, error);
        }
      } else {
        console.log(`  ℹ️  Subscription ${subscription._id} doesn't need updates`);
      }
    }
    
    console.log('\n✅ Finished processing all subscriptions!');
    
    // Show the updated subscriptions
    const updatedSubscriptions = await client.fetch(`*[_type == "subscription" && tenant._ref == "DgqhBYe1Mm6KcUArJjcYot"]{
      _id,
      amount,
      currency,
      status,
      pass->{
        _id,
        name,
        price
      },
      user->{
        _id,
        name,
        email
      }
    }`);
    
    console.log('\n📊 Updated subscriptions:');
    updatedSubscriptions.forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.user?.name || 'Unknown'} (${sub.user?.email})`);
      console.log(`   Pass: ${sub.pass?.name || 'Unknown'}`);
      console.log(`   Amount: ${sub.amount || 0} ${sub.currency || 'NOK'}`);
      console.log(`   Status: ${sub.status || 'unknown'}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing subscriptions:', error);
  }
}

fixExistingSubscriptions();
