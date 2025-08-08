#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
config({ path: './.env.local' });

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
});

const writeClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

console.log('🔧 FIXING NULL PASS NAMES');
console.log('='.repeat(50));

async function fixNullPassNames() {
  try {
    // Find all subscriptions with null pass names
    console.log('1. Finding subscriptions with null pass names...');
    const subscriptionsWithNullNames = await sanityClient.fetch(`
      *[_type == "subscription" && (passName == null || passName == "")] {
        _id,
        passId,
        passName,
        type,
        user->{_id, name, email},
        tenant->{_id, schoolName}
      }
    `);

    console.log(`Found ${subscriptionsWithNullNames.length} subscriptions with null pass names:`);
    
    if (subscriptionsWithNullNames.length === 0) {
      console.log('✅ No subscriptions with null pass names found!');
      return;
    }

    // Display them
    subscriptionsWithNullNames.forEach((sub, index) => {
      console.log(`  ${index + 1}. ${sub._id} - User: ${sub.user?.name || 'Unknown'} - Type: ${sub.type}`);
      console.log(`     PassID: ${sub.passId || 'MISSING'} - Current Name: ${sub.passName || 'NULL'}`);
    });

    console.log('\n2. Fixing pass names...');
    
    let fixedCount = 0;
    let errorCount = 0;

    for (const subscription of subscriptionsWithNullNames) {
      try {
        let passName = null;
        
        if (subscription.passId) {
          // Try to get the pass name from the pass document
          const pass = await sanityClient.fetch(`
            *[_type == "pass" && _id == $passId][0] {
              name
            }
          `, { passId: subscription.passId });
          
          if (pass) {
            passName = pass.name;
            console.log(`  ✅ Found pass name for ${subscription._id}: "${passName}"`);
          } else {
            console.log(`  ⚠️  Pass not found for ${subscription._id}, using type-based name`);
          }
        }
        
        // If we couldn't get the pass name, create a reasonable default based on type
        if (!passName) {
          switch (subscription.type) {
            case 'single':
              passName = 'Drop-in Class';
              break;
            case 'clipcard':
            case 'multi-pass':
              passName = 'Multi-Class Pass';
              break;
            case 'monthly':
            case 'unlimited':
              passName = 'Unlimited Pass';
              break;
            default:
              passName = 'Class Pass';
          }
          console.log(`  🔧 Using default name for ${subscription._id}: "${passName}"`);
        }
        
        // Update the subscription
        await writeClient
          .patch(subscription._id)
          .set({ passName })
          .commit();
          
        console.log(`  ✅ Updated ${subscription._id} with pass name: "${passName}"`);
        fixedCount++;
        
      } catch (error) {
        console.error(`  ❌ Error fixing ${subscription._id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 SUMMARY:');
    console.log(`✅ Fixed: ${fixedCount} subscriptions`);
    console.log(`❌ Errors: ${errorCount} subscriptions`);
    
    if (fixedCount > 0) {
      console.log('\n🎉 SUCCESS! Pass names have been fixed.');
      console.log('🔄 Refresh your subscriptions page to see the correct pass names.');
    }
    
  } catch (error) {
    console.error('❌ Error in fix process:', error);
  }
}

fixNullPassNames();
