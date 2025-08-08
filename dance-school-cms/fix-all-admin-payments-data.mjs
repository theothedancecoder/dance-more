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

console.log('🔧 COMPREHENSIVE ADMIN PAYMENTS DATA FIX');
console.log('='.repeat(60));

async function fixAllAdminPaymentsData() {
  try {
    // Get tenant
    const tenant = await writeClient.fetch(
      `*[_type == "tenant" && slug.current == "dance-with-dancecity"][0] {
        _id,
        schoolName
      }`
    );

    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }

    console.log('✅ Found tenant:', tenant.schoolName);

    // 1. Fix user data
    console.log('\n1. FIXING USER DATA:');
    const userId = 'user_30wjws3MyPB9ddGIVJDiAW5TPfv';
    
    const updatedUser = await writeClient
      .patch(userId)
      .set({
        name: 'Dance Customer',
        firstName: 'Dance',
        lastName: 'Customer'
      })
      .commit();

    console.log('✅ Updated user name to: Dance Customer');

    // 2. Fix all subscriptions with missing pass names
    console.log('\n2. FIXING SUBSCRIPTION PASS NAMES:');
    
    const subscriptions = await writeClient.fetch(
      `*[_type == "subscription" && tenant._ref == $tenantId] {
        _id,
        passName,
        passId,
        type,
        stripeSessionId,
        purchasePrice
      }`,
      { tenantId: tenant._id }
    );

    console.log(`Found ${subscriptions.length} subscriptions to check`);

    let fixedCount = 0;
    for (const sub of subscriptions) {
      if (!sub.passName || sub.passName === 'Unknown Pass') {
        console.log(`\n🔧 Fixing subscription: ${sub._id}`);
        
        let newPassName = 'Class Pass';
        
        // Try to get pass name from the original pass
        if (sub.passId) {
          const originalPass = await writeClient.fetch(
            `*[_type == "pass" && _id == $passId][0] { name }`,
            { passId: sub.passId }
          );
          if (originalPass?.name) {
            newPassName = originalPass.name;
          }
        }
        
        // If no pass found, derive from session ID or type
        if (newPassName === 'Class Pass') {
          if (sub.stripeSessionId?.includes('kizomba')) {
            newPassName = 'kizomba drop in';
          } else if (sub.purchasePrice === 3200) {
            newPassName = '4 COURSE PASS';
          } else if (sub.purchasePrice === 400) {
            newPassName = 'DAY DROP-IN';
          } else if (sub.purchasePrice === 250) {
            newPassName = 'OPEN WEEK PASS';
          } else if (sub.type === 'monthly') {
            newPassName = 'Monthly Unlimited';
          } else if (sub.type === 'clipcard') {
            newPassName = 'Class Package';
          }
        }
        
        await writeClient
          .patch(sub._id)
          .set({ passName: newPassName })
          .commit();
          
        console.log(`   ✅ Updated to: ${newPassName}`);
        fixedCount++;
      }
    }

    console.log(`\n✅ Fixed ${fixedCount} subscription pass names`);

    // 3. Test the admin payments query
    console.log('\n3. TESTING ADMIN PAYMENTS QUERY:');
    
    const testQuery = `*[_type == "subscription" && tenant._ref == $tenantId] | order(_createdAt desc) [0..4] {
      _id,
      purchasePrice,
      passName,
      "customerName": user->name,
      "customerEmail": user->email,
      _createdAt,
      user->{
        _id,
        name,
        email
      }
    }`;

    const testResults = await writeClient.fetch(testQuery, { tenantId: tenant._id });
    
    console.log('\n📊 UPDATED ADMIN PAYMENTS PREVIEW:');
    testResults.forEach((payment, i) => {
      console.log(`${i + 1}. Customer: ${payment.customerName || 'STILL NULL'}`);
      console.log(`   Email: ${payment.customerEmail || 'STILL NULL'}`);
      console.log(`   Pass: ${payment.passName || 'STILL NULL'}`);
      console.log(`   Amount: ${payment.purchasePrice || 'N/A'} NOK`);
      console.log(`   User Object: ${payment.user ? 'EXISTS' : 'NULL'}`);
      if (payment.user) {
        console.log(`   User Name in Object: ${payment.user.name || 'NULL'}`);
      }
      console.log('');
    });

    // 4. Force cache refresh by updating a timestamp
    console.log('\n4. FORCING CACHE REFRESH:');
    await writeClient
      .patch(tenant._id)
      .set({ lastUpdated: new Date().toISOString() })
      .commit();
    
    console.log('✅ Updated tenant timestamp to force cache refresh');

    console.log('\n🎉 COMPREHENSIVE FIX COMPLETE!');
    console.log('🔄 Please refresh the admin payments page and wait a few seconds for changes to appear.');
    console.log('💡 If still showing "Unknown", try a hard refresh (Ctrl+F5 or Cmd+Shift+R)');

  } catch (error) {
    console.error('❌ Fix error:', error);
  }
}

fixAllAdminPaymentsData();
