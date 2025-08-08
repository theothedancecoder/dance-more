#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@sanity/client';

config({ path: './.env.local' });

const writeClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

console.log('🔧 FIXING WRONG SUBSCRIPTION');
console.log('='.repeat(50));

async function fixWrongSubscription() {
  try {
    // Fix the subscription that has wrong pass name
    const subscriptionId = 'oLHtOefD7nkFljdU8GVd44';
    const correctPassName = '1 COURSE VALID FOR 8 WEEKS.';
    const correctPassId = '7Csmu86aV4MF06f2xe9x4d';
    
    console.log(`1. Fixing subscription: ${subscriptionId}`);
    console.log(`   Setting correct pass name: "${correctPassName}"`);
    console.log(`   Setting correct pass ID: "${correctPassId}"`);
    
    const result = await writeClient
      .patch(subscriptionId)
      .set({ 
        passName: correctPassName,
        passId: correctPassId
      })
      .commit();
    
    console.log('✅ Subscription updated successfully!');
    console.log(`   Updated subscription ID: ${result._id}`);
    
    console.log('\n2. Verifying the fix...');
    
    // Verify the subscription now shows correctly
    const updatedSub = await writeClient.fetch(`
      *[_type == "subscription" && _id == $subId][0] {
        _id,
        passName,
        passId,
        type,
        remainingClips,
        endDate
      }
    `, { subId: subscriptionId });
    
    if (updatedSub) {
      console.log('✅ Verification successful:');
      console.log(`   Pass Name: "${updatedSub.passName}"`);
      console.log(`   Pass ID: "${updatedSub.passId}"`);
      console.log(`   Type: ${updatedSub.type}`);
      console.log(`   Remaining Clips: ${updatedSub.remainingClips}`);
      console.log(`   Valid Until: ${new Date(updatedSub.endDate).toLocaleDateString()}`);
    }
    
    console.log('\n🎉 SUCCESS! The subscription now has the correct pass name.');
    console.log('🔄 Refresh your subscriptions page to see the fix.');
    
  } catch (error) {
    console.error('❌ Error fixing subscription:', error);
  }
}

fixWrongSubscription();
