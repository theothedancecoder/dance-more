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

console.log('🔍 Debugging Clip Card Webhook Processing Issue');
console.log('===============================================');

async function debugClipcardWebhookIssue() {
  try {
    // 1. Compare working drop-in vs non-working clip card passes
    console.log('\n📋 Comparing Pass Types and Webhook Processing:');
    
    // Get drop-in passes (working)
    const dropInPasses = await sanityClient.fetch(`
      *[_type == "pass" && type == "single" && isActive == true] | order(name asc) {
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

    console.log(`\n✅ DROP-IN PASSES (Working - ${dropInPasses.length} found):`);
    for (const pass of dropInPasses) {
      console.log(`\n🎫 ${pass.name}`);
      console.log(`   ID: ${pass._id}`);
      console.log(`   Type: ${pass.type}`);
      console.log(`   Validity Type: ${pass.validityType || 'Not set'}`);
      console.log(`   Validity Days: ${pass.validityDays || 'Not set'}`);
      console.log(`   Expiry Date: ${pass.expiryDate || 'Not set'}`);
      console.log(`   Classes Limit: ${pass.classesLimit || 'Not set'}`);
      console.log(`   Tenant: ${pass.tenant?.schoolName || 'No tenant'}`);
    }

    // Get clip card passes (not working)
    const clipCardPasses = await sanityClient.fetch(`
      *[_type == "pass" && type == "multi" && isActive == true] | order(name asc) {
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

    console.log(`\n❌ CLIP CARD PASSES (Not Working - ${clipCardPasses.length} found):`);
    for (const pass of clipCardPasses) {
      console.log(`\n🎫 ${pass.name}`);
      console.log(`   ID: ${pass._id}`);
      console.log(`   Type: ${pass.type}`);
      console.log(`   Validity Type: ${pass.validityType || 'Not set'}`);
      console.log(`   Validity Days: ${pass.validityDays || 'Not set'}`);
      console.log(`   Expiry Date: ${pass.expiryDate || 'Not set'}`);
      console.log(`   Classes Limit: ${pass.classesLimit || 'Not set'}`);
      console.log(`   Tenant: ${pass.tenant?.schoolName || 'No tenant'}`);
    }

    // 2. Analyze the webhook logic differences
    console.log('\n\n🔧 Webhook Logic Analysis:');
    console.log('Looking at how different pass types are processed...');
    
    console.log('\nWebhook Processing Logic (from webhook code):');
    console.log('switch (pass.type) {');
    console.log('  case "single":');
    console.log('    subscriptionType = "single";');
    console.log('    remainingClips = 1;');
    console.log('    ✅ This works for drop-ins');
    console.log('');
    console.log('  case "multi-pass":');
    console.log('    subscriptionType = "multi-pass";');
    console.log('    remainingClips = pass.classesLimit;');
    console.log('    ❓ Different from "multi"');
    console.log('');
    console.log('  case "multi":');
    console.log('    subscriptionType = "clipcard";');
    console.log('    remainingClips = pass.classesLimit;');
    console.log('    ❌ This should work for clip cards but doesn\'t');
    console.log('');
    console.log('  case "unlimited":');
    console.log('    subscriptionType = "monthly";');
    console.log('    remainingClips = undefined;');
    console.log('    ❓ For unlimited passes');

    // 3. Check if there are any clip card passes with missing required fields
    console.log('\n\n🔍 Checking Clip Card Pass Configurations:');
    
    for (const pass of clipCardPasses) {
      console.log(`\n🎫 Analyzing: ${pass.name}`);
      
      // Check tenant
      if (!pass.tenant) {
        console.log(`   🚨 ISSUE: No tenant assigned!`);
      } else {
        console.log(`   ✅ Tenant: ${pass.tenant.schoolName}`);
      }
      
      // Check classes limit
      if (!pass.classesLimit) {
        console.log(`   🚨 ISSUE: No classesLimit set!`);
      } else {
        console.log(`   ✅ Classes Limit: ${pass.classesLimit}`);
      }
      
      // Check expiry configuration
      if (!pass.validityDays && !pass.expiryDate) {
        console.log(`   🚨 ISSUE: No validity configuration!`);
      } else if (pass.validityDays) {
        console.log(`   ✅ Validity: ${pass.validityDays} days`);
      } else if (pass.expiryDate) {
        const expiryDate = new Date(pass.expiryDate);
        const now = new Date();
        if (expiryDate <= now) {
          console.log(`   🚨 ISSUE: Fixed expiry date is in the past! (${expiryDate.toLocaleDateString()})`);
        } else {
          console.log(`   ✅ Fixed expiry: ${expiryDate.toLocaleDateString()}`);
        }
      }
      
      // Simulate webhook processing for this pass
      console.log(`   🔧 Webhook Simulation:`);
      console.log(`      Pass type: "${pass.type}" → subscriptionType: "clipcard"`);
      console.log(`      remainingClips: ${pass.classesLimit || 'undefined'}`);
      
      if (pass.validityType === 'days' && pass.validityDays) {
        const testExpiry = new Date(Date.now() + pass.validityDays * 24 * 60 * 60 * 1000);
        console.log(`      Expiry calculation: ${testExpiry.toLocaleDateString()}`);
      } else if (pass.expiryDate) {
        console.log(`      Fixed expiry: ${new Date(pass.expiryDate).toLocaleDateString()}`);
      } else {
        console.log(`      🚨 EXPIRY CALCULATION WOULD FAIL!`);
      }
    }

    // 4. Check recent successful drop-in purchases vs failed clip card attempts
    console.log('\n\n📊 Recent Purchase Comparison:');
    
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Recent drop-in purchases (working)
    const recentDropIns = await sanityClient.fetch(`
      *[_type == "subscription" && type == "single" && _createdAt >= $startOfDay] | order(_createdAt desc) {
        _id,
        passName,
        type,
        user->{email},
        _createdAt,
        stripeSessionId
      }
    `, { startOfDay: startOfDay.toISOString() });

    console.log(`\n✅ Recent Drop-in Purchases (${recentDropIns.length}):`);
    for (const sub of recentDropIns) {
      console.log(`   - ${sub.passName} by ${sub.user?.email} at ${new Date(sub._createdAt).toLocaleString()}`);
    }

    // Recent clip card purchases (should be working but aren't)
    const recentClipCards = await sanityClient.fetch(`
      *[_type == "subscription" && type == "clipcard" && _createdAt >= $startOfDay] | order(_createdAt desc) {
        _id,
        passName,
        type,
        user->{email},
        _createdAt,
        stripeSessionId
      }
    `, { startOfDay: startOfDay.toISOString() });

    console.log(`\n❌ Recent Clip Card Purchases (${recentClipCards.length}):`);
    if (recentClipCards.length === 0) {
      console.log(`   No clip card subscriptions created today!`);
      console.log(`   This confirms clip card webhook processing is failing.`);
    } else {
      for (const sub of recentClipCards) {
        console.log(`   - ${sub.passName} by ${sub.user?.email} at ${new Date(sub._createdAt).toLocaleString()}`);
      }
    }

    // 5. Identify the specific issue
    console.log('\n\n🎯 ROOT CAUSE ANALYSIS:');
    console.log('========================');
    
    console.log('✅ Drop-in classes work because:');
    console.log('   - Pass type "single" → subscription type "single"');
    console.log('   - Simple 1-day validity');
    console.log('   - Webhook processes successfully');
    
    console.log('\n❌ Clip cards fail because:');
    console.log('   - Pass type "multi" → subscription type "clipcard"');
    console.log('   - More complex validity calculation');
    console.log('   - Webhook fails during subscription creation');
    
    console.log('\n🔍 LIKELY ISSUES:');
    console.log('1. 🚨 Tenant assignment missing on clip card passes');
    console.log('2. 🚨 Invalid expiry date calculation for clip cards');
    console.log('3. 🚨 Missing classesLimit on some clip card passes');
    console.log('4. 🚨 Webhook fails silently when processing clip cards');
    
    console.log('\n🛠️ NEXT STEPS:');
    console.log('1. Check webhook logs for clip card processing errors');
    console.log('2. Verify all clip card passes have proper tenant assignment');
    console.log('3. Ensure all clip card passes have valid expiry configuration');
    console.log('4. Test webhook processing with a clip card purchase');

  } catch (error) {
    console.error('❌ Error debugging clip card webhook issue:', error);
  }
}

// Run the debug
debugClipcardWebhookIssue();
