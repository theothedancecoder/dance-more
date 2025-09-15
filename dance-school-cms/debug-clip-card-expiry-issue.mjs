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

console.log('🔍 Debugging Clip Card Expiry Issue');
console.log('===================================');

async function debugClipCardExpiryIssue() {
  try {
    // 1. Check the "10 Single Clip Card" pass configuration
    console.log('\n📋 Checking "10 Single Clip Card" Pass Configuration:');
    
    const clipCardPass = await sanityClient.fetch(`
      *[_type == "pass" && name == "10 Single Clip Card"][0] {
        _id,
        name,
        type,
        price,
        validityType,
        validityDays,
        expiryDate,
        classesLimit,
        isActive,
        tenant->{_id, schoolName},
        _createdAt,
        _updatedAt
      }
    `);

    if (clipCardPass) {
      console.log(`\n🎫 Pass: ${clipCardPass.name}`);
      console.log(`   ID: ${clipCardPass._id}`);
      console.log(`   Type: ${clipCardPass.type}`);
      console.log(`   Price: ${clipCardPass.price} NOK`);
      console.log(`   Validity Type: ${clipCardPass.validityType}`);
      console.log(`   Validity Days: ${clipCardPass.validityDays}`);
      console.log(`   Expiry Date: ${clipCardPass.expiryDate}`);
      console.log(`   Classes Limit: ${clipCardPass.classesLimit}`);
      console.log(`   Is Active: ${clipCardPass.isActive}`);
      console.log(`   Tenant: ${clipCardPass.tenant?.schoolName}`);
      console.log(`   Created: ${new Date(clipCardPass._createdAt).toLocaleString()}`);
      console.log(`   Updated: ${new Date(clipCardPass._updatedAt).toLocaleString()}`);

      // Analyze the expiry configuration
      console.log(`\n🔍 Expiry Analysis:`);
      if (clipCardPass.validityType === 'date' && clipCardPass.expiryDate) {
        const expiryDate = new Date(clipCardPass.expiryDate);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        console.log(`   Fixed expiry date: ${expiryDate.toLocaleString()}`);
        console.log(`   Days until expiry: ${daysUntilExpiry}`);
        
        if (daysUntilExpiry <= 0) {
          console.log(`   🚨 ISSUE: Pass has a fixed expiry date that is in the past!`);
          console.log(`   🚨 This means ALL purchases of this pass will be immediately expired!`);
        } else if (daysUntilExpiry < 30) {
          console.log(`   ⚠️ WARNING: Pass expires very soon - all purchases will have short validity`);
        }
      } else if (clipCardPass.validityDays) {
        console.log(`   Validity period: ${clipCardPass.validityDays} days from purchase`);
        const testPurchaseDate = new Date();
        const testExpiryDate = new Date(testPurchaseDate.getTime() + clipCardPass.validityDays * 24 * 60 * 60 * 1000);
        console.log(`   If purchased now, would expire: ${testExpiryDate.toLocaleString()}`);
      } else {
        console.log(`   🚨 ISSUE: No valid expiry configuration found!`);
      }

      // Check what the webhook would do with this pass
      console.log(`\n🔧 Webhook Logic Simulation:`);
      const now = new Date();
      let calculatedEndDate;
      
      if (clipCardPass.validityType === 'date' && clipCardPass.expiryDate) {
        calculatedEndDate = new Date(clipCardPass.expiryDate);
        console.log(`   Webhook would use fixed expiry: ${calculatedEndDate.toLocaleString()}`);
      } else if (clipCardPass.validityType === 'days' && clipCardPass.validityDays) {
        calculatedEndDate = new Date(now.getTime() + clipCardPass.validityDays * 24 * 60 * 60 * 1000);
        console.log(`   Webhook would calculate: ${calculatedEndDate.toLocaleString()}`);
      } else if (clipCardPass.validityDays) {
        calculatedEndDate = new Date(now.getTime() + clipCardPass.validityDays * 24 * 60 * 60 * 1000);
        console.log(`   Webhook would use fallback: ${calculatedEndDate.toLocaleString()}`);
      } else {
        console.log(`   🚨 Webhook would fail - no valid configuration`);
      }

    } else {
      console.log('❌ "10 Single Clip Card" pass not found!');
    }

    // 2. Check recent purchases to see what expiry dates were actually set
    console.log('\n\n📊 Recent "10 Single Clip Card" Purchases:');
    
    const recentPurchases = await sanityClient.fetch(`
      *[_type == "subscription" && passName == "10 Single Clip Card"] | order(_createdAt desc) [0...5] {
        _id,
        passName,
        startDate,
        endDate,
        user->{name, email},
        _createdAt,
        "purchaseToExpiryDays": round((dateTime(endDate) - dateTime(_createdAt)) / 86400),
        "daysFromNow": round((dateTime(endDate) - dateTime(now())) / 86400)
      }
    `);

    for (const purchase of recentPurchases) {
      console.log(`\n💳 Purchase by ${purchase.user?.name || purchase.user?.email}`);
      console.log(`   Purchased: ${new Date(purchase._createdAt).toLocaleString()}`);
      console.log(`   Start Date: ${new Date(purchase.startDate).toLocaleString()}`);
      console.log(`   End Date: ${new Date(purchase.endDate).toLocaleString()}`);
      console.log(`   Validity period: ${purchase.purchaseToExpiryDays} days`);
      console.log(`   Days remaining: ${purchase.daysFromNow}`);
      
      if (purchase.purchaseToExpiryDays < 30) {
        console.log(`   🚨 ISSUE: Very short validity period!`);
      }
    }

    // 3. Check if there are other clip card passes with better configuration
    console.log('\n\n📋 All Clip Card Passes Configuration:');
    
    const allClipCardPasses = await sanityClient.fetch(`
      *[_type == "pass" && type == "multi"] | order(name asc) {
        _id,
        name,
        validityType,
        validityDays,
        expiryDate,
        isActive,
        "daysUntilFixedExpiry": round((dateTime(expiryDate) - dateTime(now())) / 86400)
      }
    `);

    for (const pass of allClipCardPasses) {
      console.log(`\n🎫 ${pass.name}`);
      console.log(`   Validity Type: ${pass.validityType || 'Not set'}`);
      console.log(`   Validity Days: ${pass.validityDays || 'Not set'}`);
      console.log(`   Fixed Expiry: ${pass.expiryDate ? new Date(pass.expiryDate).toLocaleString() : 'Not set'}`);
      console.log(`   Active: ${pass.isActive}`);
      
      if (pass.expiryDate) {
        console.log(`   Days until fixed expiry: ${pass.daysUntilFixedExpiry}`);
        if (pass.daysUntilFixedExpiry <= 0) {
          console.log(`   🚨 EXPIRED: This pass has a fixed expiry in the past!`);
        }
      }
    }

    // 4. Provide recommendations
    console.log('\n\n💡 RECOMMENDATIONS:');
    
    if (clipCardPass) {
      if (clipCardPass.validityType === 'date' && clipCardPass.expiryDate) {
        const expiryDate = new Date(clipCardPass.expiryDate);
        const now = new Date();
        if (expiryDate <= now) {
          console.log('🔧 IMMEDIATE FIX NEEDED:');
          console.log('   1. Update the "10 Single Clip Card" pass to use validityDays instead of fixed expiry');
          console.log('   2. Set validityDays to 90 or 120 days for reasonable validity period');
          console.log('   3. Remove or update the fixed expiryDate');
          console.log('   4. Update existing expired subscriptions to have proper expiry dates');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error debugging clip card expiry issue:', error);
  }
}

// Run the debug
debugClipCardExpiryIssue();
