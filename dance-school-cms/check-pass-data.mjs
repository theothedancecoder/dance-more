#!/usr/bin/env node
import { config } from 'dotenv';
import { createClient } from '@sanity/client';

config({ path: './.env.local' });

const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2023-05-03',
});

async function checkPass() {
  const pass = await sanityClient.fetch(`
    *[_type == 'pass' && _id == '7Csmu86aV4MF06f2xe9x4d'][0] {
      _id,
      name,
      type,
      price,
      validityDays,
      classesLimit,
      isActive
    }
  `);
  
  console.log('🔍 PASS DATA FOR RECENT PURCHASE:');
  console.log('Pass ID: 7Csmu86aV4MF06f2xe9x4d');
  console.log('Pass Data:', JSON.stringify(pass, null, 2));
  
  // Also check the subscription that was created
  const subscription = await sanityClient.fetch(`
    *[_type == 'subscription' && _id == 'oLHtOefD7nkFljdU8GVd44'][0] {
      _id,
      passId,
      passName,
      type,
      stripeSessionId,
      startDate,
      endDate,
      remainingClips
    }
  `);
  
  console.log('\n🔍 SUBSCRIPTION THAT WAS CREATED:');
  console.log('Subscription Data:', JSON.stringify(subscription, null, 2));
}

checkPass().catch(console.error);
