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

async function checkSubscriptions() {
  const subs = await sanityClient.fetch(`
    *[_type == 'subscription' && user._ref == 'user_30wjws3MyPB9ddGIVJDiAW5TPfv' && isActive == true] {
      _id,
      passName,
      type,
      remainingClips,
      startDate,
      endDate,
      isActive
    } | order(startDate desc)
  `);
  
  console.log('🔍 CURRENT USER SUBSCRIPTIONS:');
  console.log('='.repeat(50));
  subs.forEach((sub, i) => {
    const daysLeft = Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24));
    console.log(`${i+1}. ${sub.passName || 'NULL NAME'} (${sub.type})`);
    console.log(`   ID: ${sub._id}`);
    console.log(`   Days left: ${daysLeft}`);
    console.log(`   Clips: ${sub.remainingClips ?? 'unlimited'}`);
    console.log('');
  });
  console.log(`Total active subscriptions: ${subs.length}`);
}

checkSubscriptions().catch(console.error);
