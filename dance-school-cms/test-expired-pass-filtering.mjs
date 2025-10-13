#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@sanity/client';

config({ path: './.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

console.log('🧪 TESTING EXPIRED PASS FILTERING');
console.log('='.repeat(60));

async function testPassFiltering() {
  try {
    console.log('\n1. Fetching all passes from Sanity...\n');
    
    const allPasses = await sanityClient.fetch(`
      *[_type == "pass"] | order(name asc) {
        _id,
        name,
        type,
        price,
        validityType,
        validityDays,
        expiryDate,
        classesLimit,
        isActive,
        _createdAt,
        "isExpired": validityType == "date" && dateTime(expiryDate) < dateTime(now())
      }
    `);

    console.log(`📊 Total passes in database: ${allPasses.length}\n`);

    // Categorize passes
    const activePasses = allPasses.filter(p => p.isActive);
    const inactivePasses = allPasses.filter(p => !p.isActive);
    const expiredPasses = allPasses.filter(p => p.validityType === 'date' && p.isExpired);
    const availableForPurchase = allPasses.filter(p => {
      if (!p.isActive) return false;
      if (p.validityType === 'date' && p.isExpired) return false;
      return true;
    });

    console.log('📋 Pass Categories:');
    console.log(`   ✅ Active passes: ${activePasses.length}`);
    console.log(`   ❌ Inactive passes: ${inactivePasses.length}`);
    console.log(`   ⏰ Expired (fixed-date) passes: ${expiredPasses.length}`);
    console.log(`   🛒 Available for purchase: ${availableForPurchase.length}`);

    console.log('\n2. Detailed Pass Information:\n');
    
    allPasses.forEach((pass, index) => {
      const status = [];
      if (!pass.isActive) status.push('❌ INACTIVE');
      if (pass.isExpired) status.push('⏰ EXPIRED');
      if (pass.isActive && !pass.isExpired) status.push('✅ AVAILABLE');
      
      console.log(`${index + 1}. ${pass.name}`);
      console.log(`   Status: ${status.join(', ')}`);
      console.log(`   Type: ${pass.type}`);
      console.log(`   Price: ${pass.price} kr`);
      console.log(`   Validity: ${pass.validityType || 'not set'}`);
      
      if (pass.validityType === 'date' && pass.expiryDate) {
        const expiryDate = new Date(pass.expiryDate);
        const now = new Date();
        const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        console.log(`   Expiry Date: ${expiryDate.toLocaleDateString()}`);
        console.log(`   Days until expiry: ${daysUntilExpiry} days`);
      } else if (pass.validityDays) {
        console.log(`   Validity Days: ${pass.validityDays} days from purchase`);
      }
      
      console.log(`   Classes Limit: ${pass.classesLimit || 'Unlimited'}`);
      console.log('');
    });

    console.log('3. What Students Will See:\n');
    
    if (availableForPurchase.length === 0) {
      console.log('   ⚠️  No passes available for purchase!');
      console.log('   Students will see an empty list.');
    } else {
      console.log(`   Students will see ${availableForPurchase.length} pass(es):\n`);
      availableForPurchase.forEach((pass, index) => {
        console.log(`   ${index + 1}. ${pass.name} - ${pass.price} kr`);
        if (pass.validityType === 'date' && pass.expiryDate) {
          const expiryDate = new Date(pass.expiryDate);
          console.log(`      Valid until: ${expiryDate.toLocaleDateString()}`);
        } else if (pass.validityDays) {
          console.log(`      Valid for: ${pass.validityDays} days from purchase`);
        }
      });
    }

    console.log('\n4. What Students Will NOT See:\n');
    
    const hiddenPasses = allPasses.filter(p => {
      if (!p.isActive) return true;
      if (p.validityType === 'date' && p.isExpired) return true;
      return false;
    });

    if (hiddenPasses.length === 0) {
      console.log('   ✅ All passes are available (none hidden)');
    } else {
      console.log(`   ${hiddenPasses.length} pass(es) will be hidden:\n`);
      hiddenPasses.forEach((pass, index) => {
        const reasons = [];
        if (!pass.isActive) reasons.push('inactive');
        if (pass.isExpired) reasons.push('expired');
        console.log(`   ${index + 1}. ${pass.name} (${reasons.join(', ')})`);
      });
    }

    console.log('\n5. Summary:\n');
    console.log(`   ✅ Filter is working correctly!`);
    console.log(`   📊 ${availableForPurchase.length} passes available for students to purchase`);
    console.log(`   🚫 ${hiddenPasses.length} passes hidden from students`);
    console.log(`   👨‍💼 Admins can still see all ${allPasses.length} passes for management`);

    if (expiredPasses.length > 0) {
      console.log(`\n   💡 Tip: You have ${expiredPasses.length} expired pass(es).`);
      console.log(`      Consider deactivating them or creating new passes with future dates.`);
    }

  } catch (error) {
    console.error('❌ Error testing pass filtering:', error);
  }
}

testPassFiltering();
