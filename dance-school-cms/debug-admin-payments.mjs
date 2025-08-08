#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@sanity/client';

config({ path: './.env.local' });

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_TOKEN,
});

console.log('🔍 DEBUGGING ADMIN PAYMENTS DATA');
console.log('='.repeat(50));

async function debugAdminPayments() {
  try {
    // Get tenant ID
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == "dance-with-dancecity"][0] {
        _id,
        schoolName
      }`
    );

    if (!tenant) {
      console.log('❌ Tenant not found');
      return;
    }

    console.log('✅ Found tenant:', tenant.schoolName, 'ID:', tenant._id);

    // Debug: Check subscriptions with user data
    console.log('\n📊 CHECKING SUBSCRIPTIONS WITH USER DATA:');
    const subscriptions = await sanityClient.fetch(
      `*[_type == "subscription" && tenant._ref == $tenantId] | order(_createdAt desc) {
        _id,
        purchasePrice,
        passName,
        type,
        isActive,
        stripePaymentId,
        stripeSessionId,
        _createdAt,
        "user": user->{
          _id,
          name,
          email,
          firstName,
          lastName,
          clerkId
        }
      }`,
      { tenantId: tenant._id }
    );

    console.log(`Found ${subscriptions.length} subscriptions:`);
    
    subscriptions.slice(0, 5).forEach((sub, i) => {
      console.log(`\n${i + 1}. Subscription: ${sub._id}`);
      console.log(`   Pass Name: ${sub.passName || 'NULL'}`);
      console.log(`   Price: ${sub.purchasePrice || 'NULL'} NOK`);
      console.log(`   User ID: ${sub.user?._id || 'NULL'}`);
      console.log(`   User Name: ${sub.user?.name || 'NULL'}`);
      console.log(`   User Email: ${sub.user?.email || 'NULL'}`);
      console.log(`   Stripe Session: ${sub.stripeSessionId || 'NULL'}`);
      console.log(`   Created: ${sub._createdAt || 'NULL'}`);
    });

    // Check if users exist in Sanity
    console.log('\n👥 CHECKING USER RECORDS:');
    const users = await sanityClient.fetch(
      `*[_type == "user"] {
        _id,
        name,
        email,
        clerkId
      }`
    );

    console.log(`Found ${users.length} users in Sanity:`);
    users.slice(0, 3).forEach((user, i) => {
      console.log(`${i + 1}. User: ${user._id}`);
      console.log(`   Name: ${user.name || 'NULL'}`);
      console.log(`   Email: ${user.email || 'NULL'}`);
      console.log(`   Clerk ID: ${user.clerkId || 'NULL'}`);
    });

    // Check for subscriptions without proper user references
    console.log('\n🔍 CHECKING FOR BROKEN USER REFERENCES:');
    const brokenSubs = subscriptions.filter(sub => !sub.user || !sub.user._id);
    console.log(`Found ${brokenSubs.length} subscriptions with broken user references`);

    if (brokenSubs.length > 0) {
      console.log('\n🔧 BROKEN SUBSCRIPTIONS:');
      brokenSubs.forEach((sub, i) => {
        console.log(`${i + 1}. ${sub._id} - Pass: ${sub.passName} - Price: ${sub.purchasePrice}`);
      });
    }

    // Test the admin payments query directly
    console.log('\n🧪 TESTING ADMIN PAYMENTS QUERY:');
    const adminPaymentsQuery = `*[_type == "subscription" && tenant._ref == $tenantId] | order(_createdAt desc) {
      _id,
      purchasePrice,
      "currency": "NOK",
      isActive,
      stripePaymentId,
      passName,
      type,
      "customerName": user->name,
      "customerEmail": user->email,
      "createdAt": _createdAt,
      "paymentId": stripePaymentId,
      "paymentMethod": select(
        stripePaymentId match "pi_*" => "card",
        stripePaymentId match "vipps_*" => "vipps",
        "stripe"
      ),
      "type": "subscription",
      user->{
        _id,
        name,
        email,
        firstName,
        lastName,
        clerkId
      }
    }`;

    const adminPayments = await sanityClient.fetch(adminPaymentsQuery, { tenantId: tenant._id });
    
    console.log(`Admin payments query returned ${adminPayments.length} results:`);
    adminPayments.slice(0, 3).forEach((payment, i) => {
      console.log(`\n${i + 1}. Payment: ${payment._id}`);
      console.log(`   Customer Name: ${payment.customerName || 'NULL'}`);
      console.log(`   Customer Email: ${payment.customerEmail || 'NULL'}`);
      console.log(`   Pass Name: ${payment.passName || 'NULL'}`);
      console.log(`   Amount: ${payment.purchasePrice || 'NULL'}`);
      console.log(`   User Object: ${payment.user ? 'EXISTS' : 'NULL'}`);
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugAdminPayments();
