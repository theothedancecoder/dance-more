#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@sanity/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env.local') });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

console.log('🔍 Finding users in Sanity...\n');

async function findUsers() {
  try {
    const users = await client.fetch(`
      *[_type == "user"] | order(_createdAt desc) [0...10] {
        _id,
        email,
        firstName,
        lastName,
        clerkId,
        role,
        tenant
      }
    `);

    if (users.length === 0) {
      console.log('❌ No users found in Sanity database');
      console.log('💡 You may need to sign up/sign in to create a user record first');
      return;
    }

    console.log(`Found ${users.length} users:`);
    users.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user._id}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Name: ${user.firstName || ''} ${user.lastName || ''}`);
      console.log(`   Clerk ID: ${user.clerkId || 'N/A'}`);
      console.log(`   Role: ${user.role || 'N/A'}`);
      console.log(`   Tenant: ${user.tenant?._ref || 'N/A'}`);
      console.log('');
    });

    // Also check for the specific user ID that was failing
    const specificUser = await client.fetch(`
      *[_type == "user" && _id == "user_30wjws3MyPB9ddGIVJDiAW5TPfv"][0]
    `);

    if (specificUser) {
      console.log('✅ Found the specific user ID that was referenced!');
    } else {
      console.log('❌ The user ID "user_30wjws3MyPB9ddGIVJDiAW5TPfv" does not exist');
      console.log('💡 Use one of the user IDs listed above instead');
    }

  } catch (error) {
    console.error('Error fetching users:', error.message);
  }
}

findUsers();
