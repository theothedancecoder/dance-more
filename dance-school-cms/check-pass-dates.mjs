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

console.log('🔍 CHECKING PASS DATES');
console.log('='.repeat(60));

async function checkDates() {
  const passes = await sanityClient.fetch(`
    *[_type == "pass" && validityType == "date"] | order(expiryDate asc) {
      _id,
      name,
      expiryDate,
      isActive,
      "isExpired": dateTime(expiryDate) < dateTime(now()),
      "expiryDateParsed": expiryDate,
      "nowDate": now()
    }
  `);

  console.log(`\nCurrent server time: ${new Date().toISOString()}`);
  console.log(`\nFixed-date passes (${passes.length}):\n`);

  passes.forEach((pass, i) => {
    const expiryDate = new Date(pass.expiryDate);
    const now = new Date();
    const diff = expiryDate - now;
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    console.log(`${i + 1}. ${pass.name}`);
    console.log(`   Expiry Date (raw): ${pass.expiryDate}`);
    console.log(`   Expiry Date (parsed): ${expiryDate.toISOString()}`);
    console.log(`   Current Date: ${now.toISOString()}`);
    console.log(`   Days until expiry: ${days}`);
    console.log(`   Is Expired (Sanity): ${pass.isExpired}`);
    console.log(`   Is Expired (JS): ${expiryDate < now}`);
    console.log(`   Is Active: ${pass.isActive}`);
    console.log(`   Should be visible: ${pass.isActive && !pass.isExpired}`);
    console.log('');
  });
}

checkDates();
