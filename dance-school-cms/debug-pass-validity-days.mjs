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

console.log('🔍 Debugging Pass Validity Days');
console.log('===============================');

async function debugPassValidityDays() {
  try {
    // Get all passes to check their validity configuration
    const passes = await sanityClient.fetch(`
      *[_type == "pass"] {
        _id,
        name,
        type,
        price,
        validityDays,
        validityType,
        expiryDate,
        classesLimit,
        isActive
      }
    `);

    console.log(`\n📊 Found ${passes.length} passes:`);
    
    for (const pass of passes) {
      console.log(`\n🎫 Pass: ${pass.name}`);
      console.log(`   ID: ${pass._id}`);
      console.log(`   Type: ${pass.type}`);
      console.log(`   Price: ${pass.price} kr`);
      console.log(`   Validity Type: ${pass.validityType}`);
      console.log(`   Validity Days: ${pass.validityDays}`);
      console.log(`   Expiry Date: ${pass.expiryDate}`);
      console.log(`   Classes Limit: ${pass.classesLimit}`);
      console.log(`   Is Active: ${pass.isActive}`);
      
      // Check for potential issues
      if (pass.validityType === 'days' && !pass.validityDays) {
        console.log(`   ⚠️  ISSUE: Pass uses 'days' validity but validityDays is ${pass.validityDays}`);
      }
      
      if (pass.validityType === 'date' && !pass.expiryDate) {
        console.log(`   ⚠️  ISSUE: Pass uses 'date' validity but expiryDate is ${pass.expiryDate}`);
      }
      
      if (!pass.validityType) {
        console.log(`   ⚠️  ISSUE: Pass has no validityType set`);
      }
      
      // Test the webhook calculation logic
      if (pass.validityDays) {
        const now = new Date();
        const calculatedEndDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
        console.log(`   📅 Would expire: ${calculatedEndDate.toLocaleDateString()} (${pass.validityDays} days from now)`);
      } else if (pass.expiryDate) {
        console.log(`   📅 Fixed expiry: ${new Date(pass.expiryDate).toLocaleDateString()}`);
      } else {
        console.log(`   ❌ No valid expiry calculation possible!`);
      }
    }

    // Check recent subscriptions that had issues
    console.log('\n🔍 Checking recent problematic subscriptions:');
    const recentSubs = await sanityClient.fetch(`
      *[_type == "subscription" && _createdAt > "2025-08-12" && stripeSessionId != null] {
        _id,
        passName,
        passId,
        startDate,
        endDate,
        stripeSessionId,
        "pass": *[_type == "pass" && _id == ^.passId][0]{
          name,
          validityDays,
          validityType,
          expiryDate
        }
      }
    `);

    for (const sub of recentSubs) {
      console.log(`\n🎫 Subscription: ${sub.passName}`);
      console.log(`   Pass ID: ${sub.passId}`);
      console.log(`   Start: ${sub.startDate}`);
      console.log(`   End: ${sub.endDate}`);
      console.log(`   Pass Data:`, sub.pass);
      
      if (sub.pass) {
        const startDate = new Date(sub.startDate);
        const endDate = new Date(sub.endDate);
        const actualDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
        console.log(`   Actual validity: ${actualDays} days`);
        console.log(`   Expected validity: ${sub.pass.validityDays} days`);
        
        if (actualDays !== sub.pass.validityDays) {
          console.log(`   ⚠️  MISMATCH: Expected ${sub.pass.validityDays} days, got ${actualDays} days`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error debugging pass validity days:', error);
  }
}

// Run the debug
debugPassValidityDays();
