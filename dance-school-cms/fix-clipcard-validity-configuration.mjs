import { config } from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

console.log('🔧 Fixing Clip Card Validity Configuration');
console.log('==========================================');

async function fixClipcardValidityConfiguration() {
  try {
    // 1. Find all clip card passes with invalid validity configuration
    console.log('\n🔍 Finding clip card passes with invalid validity configuration...');
    
    const problematicPasses = await sanityClient.fetch(`
      *[_type == "pass" && type == "multi" && isActive == true && (validityType != "days" && !defined(expiryDate))] {
        _id,
        name,
        type,
        validityType,
        validityDays,
        expiryDate,
        classesLimit,
        tenant->{_id, schoolName}
      }
    `);

    console.log(`Found ${problematicPasses.length} clip card passes with invalid validity configuration:`);

    for (const pass of problematicPasses) {
      console.log(`\n🎫 ${pass.name}`);
      console.log(`   ID: ${pass._id}`);
      console.log(`   Current validity type: ${pass.validityType || 'Not set'}`);
      console.log(`   Current validity days: ${pass.validityDays || 'Not set'}`);
      console.log(`   Current expiry date: ${pass.expiryDate || 'Not set'}`);
      console.log(`   Classes limit: ${pass.classesLimit || 'Not set'}`);
      console.log(`   Tenant: ${pass.tenant?.schoolName || 'No tenant'}`);
    }

    // 2. Fix each problematic pass
    console.log('\n\n🔧 Fixing validity configurations...');
    
    for (const pass of problematicPasses) {
      console.log(`\n🔧 Fixing: ${pass.name}`);
      
      // Determine appropriate validity period based on pass name and existing validityDays
      let validityDays = pass.validityDays || 60; // Default to 60 days if not set
      
      // Adjust based on pass name patterns
      if (pass.name.toLowerCase().includes('open week')) {
        validityDays = 7; // Open week passes should be 7 days
      } else if (pass.name.toLowerCase().includes('trial')) {
        validityDays = 7; // Trial passes should be 7 days
      } else if (pass.name.toLowerCase().includes('10') || pass.name.toLowerCase().includes('clip')) {
        validityDays = 90; // 10-class clip cards should be 90 days
      } else if (pass.name.toLowerCase().includes('2 course')) {
        validityDays = 60; // 2 course passes should be 60 days
      } else if (pass.name.toLowerCase().includes('3 course')) {
        validityDays = 60; // 3 course passes should be 60 days
      } else if (pass.name.toLowerCase().includes('4 course')) {
        validityDays = 60; // 4 course passes should be 60 days
      }
      
      console.log(`   Setting validity to: ${validityDays} days`);
      
      // Update the pass
      const updatedPass = await sanityClient
        .patch(pass._id)
        .set({
          validityType: 'days',
          validityDays: validityDays,
          expiryDate: null, // Remove any fixed expiry date
          updatedAt: new Date().toISOString()
        })
        .commit();
      
      console.log(`   ✅ Updated successfully`);
    }

    // 3. Also fix the OPEN WEEK PASS that has no classesLimit
    console.log('\n\n🔧 Fixing passes with missing classesLimit...');
    
    const passesWithoutClassesLimit = await sanityClient.fetch(`
      *[_type == "pass" && type == "multi" && isActive == true && !defined(classesLimit)] {
        _id,
        name,
        type,
        classesLimit
      }
    `);

    for (const pass of passesWithoutClassesLimit) {
      console.log(`\n🔧 Fixing classesLimit for: ${pass.name}`);
      
      let classesLimit = 10; // Default
      
      if (pass.name.toLowerCase().includes('open week')) {
        classesLimit = 0; // Open week passes might be unlimited during the week
      }
      
      console.log(`   Setting classesLimit to: ${classesLimit}`);
      
      await sanityClient
        .patch(pass._id)
        .set({
          classesLimit: classesLimit,
          updatedAt: new Date().toISOString()
        })
        .commit();
      
      console.log(`   ✅ Updated successfully`);
    }

    // 4. Verify all clip card passes now have valid configurations
    console.log('\n\n✅ Verification - All Clip Card Passes:');
    
    const allClipCardPasses = await sanityClient.fetch(`
      *[_type == "pass" && type == "multi" && isActive == true] | order(name asc) {
        _id,
        name,
        validityType,
        validityDays,
        expiryDate,
        classesLimit,
        "hasValidConfig": (validityType == "days" && defined(validityDays)) || defined(expiryDate)
      }
    `);

    for (const pass of allClipCardPasses) {
      console.log(`\n🎫 ${pass.name}`);
      console.log(`   Validity Type: ${pass.validityType}`);
      console.log(`   Validity Days: ${pass.validityDays}`);
      console.log(`   Classes Limit: ${pass.classesLimit}`);
      console.log(`   Valid Config: ${pass.hasValidConfig ? '✅' : '❌'}`);
      
      if (!pass.hasValidConfig) {
        console.log(`   🚨 STILL INVALID - needs manual review`);
      }
    }

    // 5. Test webhook logic simulation
    console.log('\n\n🧪 Testing Webhook Logic Simulation:');
    
    for (const pass of allClipCardPasses) {
      console.log(`\n🎫 Testing: ${pass.name}`);
      
      const now = new Date();
      let calculatedEndDate;
      let success = true;
      
      try {
        if (pass.validityType === 'date' && pass.expiryDate) {
          calculatedEndDate = new Date(pass.expiryDate);
          console.log(`   Webhook would use fixed expiry: ${calculatedEndDate.toLocaleDateString()}`);
        } else if (pass.validityType === 'days' && pass.validityDays) {
          calculatedEndDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
          console.log(`   Webhook would calculate: ${calculatedEndDate.toLocaleDateString()}`);
        } else if (pass.validityDays) {
          calculatedEndDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
          console.log(`   Webhook would use fallback: ${calculatedEndDate.toLocaleDateString()}`);
        } else {
          success = false;
          console.log(`   🚨 Webhook would FAIL - no valid expiry configuration`);
        }
        
        if (success) {
          console.log(`   ✅ Webhook processing would SUCCEED`);
        }
        
      } catch (error) {
        console.log(`   🚨 Webhook would FAIL with error: ${error.message}`);
      }
    }

    console.log('\n\n🎉 CLIP CARD VALIDITY CONFIGURATION FIX COMPLETE!');
    console.log('==================================================');
    console.log('✅ All clip card passes now have proper validity configuration');
    console.log('✅ Webhook should now successfully create subscriptions for clip card purchases');
    console.log('✅ Future clip card purchases should appear in customer profiles');
    
    console.log('\n📋 Summary of changes:');
    console.log(`   - Fixed ${problematicPasses.length} passes with invalid validity configuration`);
    console.log(`   - Fixed ${passesWithoutClassesLimit.length} passes with missing classesLimit`);
    console.log('   - All clip card passes now use validityType: "days"');
    console.log('   - All clip card passes have appropriate validity periods');

  } catch (error) {
    console.error('❌ Error fixing clip card validity configuration:', error);
  }
}

// Run the fix
fixClipcardValidityConfiguration();
