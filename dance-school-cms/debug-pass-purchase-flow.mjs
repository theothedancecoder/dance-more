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

console.log('🔍 Debugging Pass Purchase Flow');
console.log('================================');

async function debugPassPurchaseFlow() {
  try {
    // 1. Check all passes and their status
    console.log('\n📋 Current Passes:');
    const passes = await sanityClient.fetch(`
      *[_type == "pass"] | order(name asc) {
        _id,
        name,
        type,
        price,
        validityType,
        validityDays,
        expiryDate,
        isActive,
        tenant->{_id, schoolName},
        _createdAt
      }
    `);

    const now = new Date();
    
    for (const pass of passes) {
      console.log(`\n🎫 Pass: ${pass.name}`);
      console.log(`   ID: ${pass._id}`);
      console.log(`   Type: ${pass.type}`);
      console.log(`   Price: ${pass.price} NOK`);
      console.log(`   Validity Type: ${pass.validityType}`);
      console.log(`   Validity Days: ${pass.validityDays}`);
      console.log(`   Expiry Date: ${pass.expiryDate}`);
      console.log(`   Is Active: ${pass.isActive}`);
      console.log(`   Tenant: ${pass.tenant?.schoolName || 'No tenant'}`);
      
      // Check if pass is purchasable
      let canPurchase = true;
      let reason = '';
      
      if (pass.isActive === false) {
        canPurchase = false;
        reason = 'Pass is marked as inactive';
      }
      
      if (pass.validityType === 'date' && pass.expiryDate) {
        const expiryDate = new Date(pass.expiryDate);
        if (expiryDate <= now) {
          canPurchase = false;
          reason = `Pass expired on ${expiryDate.toLocaleDateString()}`;
        }
      }
      
      console.log(`   Can Purchase: ${canPurchase ? '✅ Yes' : '❌ No'}`);
      if (!canPurchase) {
        console.log(`   Reason: ${reason}`);
      }
      
      // Simulate what would happen if someone bought this pass
      if (canPurchase) {
        console.log(`   📅 If purchased now:`);
        
        if (pass.validityType === 'date' && pass.expiryDate) {
          const endDate = new Date(pass.expiryDate);
          console.log(`     Would expire: ${endDate.toLocaleDateString()} (fixed date)`);
        } else if (pass.validityDays) {
          const endDate = new Date(now.getTime() + pass.validityDays * 24 * 60 * 60 * 1000);
          console.log(`     Would expire: ${endDate.toLocaleDateString()} (${pass.validityDays} days from now)`);
        } else {
          console.log(`     ⚠️ No valid expiry calculation possible!`);
        }
      }
    }

    // 2. Check recent subscriptions to see if any are immediately expired
    console.log('\n\n🔍 Recent Subscriptions (last 10):');
    const recentSubscriptions = await sanityClient.fetch(`
      *[_type == "subscription"] | order(_createdAt desc) [0...10] {
        _id,
        passName,
        startDate,
        endDate,
        isActive,
        stripeSessionId,
        user->{name, email},
        _createdAt,
        "daysFromNow": round((dateTime(endDate) - dateTime(now())) / 86400),
        "isExpiredNow": dateTime(endDate) < dateTime(now())
      }
    `);

    for (const sub of recentSubscriptions) {
      console.log(`\n🎫 Subscription: ${sub.passName}`);
      console.log(`   User: ${sub.user?.name || sub.user?.email || 'Unknown'}`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleDateString()}`);
      console.log(`   Start: ${new Date(sub.startDate).toLocaleDateString()}`);
      console.log(`   End: ${new Date(sub.endDate).toLocaleDateString()}`);
      console.log(`   Days from now: ${sub.daysFromNow}`);
      console.log(`   Is Expired: ${sub.isExpiredNow ? '❌ Yes' : '✅ No'}`);
      console.log(`   Is Active: ${sub.isActive}`);
      console.log(`   Stripe Session: ${sub.stripeSessionId || 'None'}`);
      
      // Check for immediate expiry issue
      const createdDate = new Date(sub._createdAt);
      const endDate = new Date(sub.endDate);
      const timeDiff = endDate - createdDate;
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      
      if (daysDiff < 1 && sub.isExpiredNow) {
        console.log(`   🚨 ISSUE: Subscription expired immediately after creation!`);
        console.log(`   🚨 Time between creation and expiry: ${daysDiff.toFixed(2)} days`);
      }
    }

    // 3. Check for timezone issues
    console.log('\n\n🌍 Timezone Analysis:');
    console.log(`   Server time: ${now.toISOString()}`);
    console.log(`   Server local: ${now.toLocaleString()}`);
    console.log(`   Timezone offset: ${now.getTimezoneOffset()} minutes`);
    
    // Test date calculations
    const testValidityDays = 30;
    const testEndDate = new Date(now.getTime() + testValidityDays * 24 * 60 * 60 * 1000);
    console.log(`   Test: 30 days from now would be: ${testEndDate.toISOString()}`);

  } catch (error) {
    console.error('❌ Error debugging pass purchase flow:', error);
  }
}

// Run the debug
debugPassPurchaseFlow();
