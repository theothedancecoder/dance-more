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

console.log('🔧 FIXING ADMIN PAYMENTS DISPLAY');
console.log('='.repeat(50));

async function fixAdminPaymentsDisplay() {
  try {
    // Find the user with null name but valid email
    const userId = 'user_30wjws3MyPB9ddGIVJDiAW5TPfv';
    
    console.log('1. Checking current user data...');
    const user = await writeClient.fetch(
      `*[_type == "user" && _id == $userId][0] {
        _id,
        name,
        email,
        firstName,
        lastName,
        clerkId
      }`,
      { userId }
    );

    if (!user) {
      console.log('❌ User not found:', userId);
      return;
    }

    console.log('✅ Found user:', user._id);
    console.log('   Current name:', user.name || 'NULL');
    console.log('   Email:', user.email || 'NULL');
    console.log('   Clerk ID:', user.clerkId || 'NULL');

    // Update the user with a proper name
    if (!user.name) {
      console.log('\n2. Updating user name...');
      
      // Extract name from email or use a default
      const emailName = user.email ? user.email.split('@')[0] : 'User';
      const displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      
      const updatedUser = await writeClient
        .patch(userId)
        .set({
          name: displayName,
          firstName: displayName,
          lastName: 'Customer'
        })
        .commit();

      console.log('✅ Updated user name to:', displayName);
      console.log('✅ Updated user record:', updatedUser._id);
    } else {
      console.log('✅ User already has a name:', user.name);
    }

    // Test the admin payments query again
    console.log('\n3. Testing admin payments query...');
    const tenant = await writeClient.fetch(
      `*[_type == "tenant" && slug.current == "dance-with-dancecity"][0] {
        _id,
        schoolName
      }`
    );

    const testPayments = await writeClient.fetch(
      `*[_type == "subscription" && tenant._ref == $tenantId && user._ref == $userId] | order(_createdAt desc) [0..2] {
        _id,
        passName,
        purchasePrice,
        "customerName": user->name,
        "customerEmail": user->email,
        user->{
          _id,
          name,
          email
        }
      }`,
      { tenantId: tenant._id, userId }
    );

    console.log('\n📊 UPDATED ADMIN PAYMENTS PREVIEW:');
    testPayments.forEach((payment, i) => {
      console.log(`${i + 1}. ${payment.passName || 'Unknown Pass'}`);
      console.log(`   Customer: ${payment.customerName || 'Unknown User'}`);
      console.log(`   Email: ${payment.customerEmail || 'No email'}`);
      console.log(`   Amount: ${payment.purchasePrice || 'N/A'} NOK`);
      console.log('');
    });

    console.log('🎉 SUCCESS! Admin payments should now show proper customer names.');
    console.log('🔄 Refresh the admin payments page to see the changes.');

  } catch (error) {
    console.error('❌ Fix error:', error);
  }
}

fixAdminPaymentsDisplay();
