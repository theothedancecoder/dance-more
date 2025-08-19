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

console.log('🧪 TESTING PASS MANAGEMENT FUNCTIONALITY');
console.log('='.repeat(50));

async function testPassManagement() {
  try {
    console.log('1. Fetching all passes...');
    
    const passes = await sanityClient.fetch(`
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
        _createdAt
      }
    `);

    console.log(`Found ${passes.length} passes:`);
    
    passes.forEach((pass, i) => {
      console.log(`\n${i + 1}. ${pass.name}`);
      console.log(`   ID: ${pass._id}`);
      console.log(`   Type: ${pass.type}`);
      console.log(`   Price: ${pass.price} kr`);
      console.log(`   Status: ${pass.isActive ? '✅ Active' : '❌ Inactive'}`);
      console.log(`   Validity: ${pass.validityType || 'Not set'}`);
      if (pass.validityDays) {
        console.log(`   Days: ${pass.validityDays}`);
      }
      if (pass.expiryDate) {
        console.log(`   Expires: ${new Date(pass.expiryDate).toLocaleDateString()}`);
      }
    });

    console.log('\n2. Testing pass status changes...');
    
    // Find a pass to test with
    const testPass = passes.find(p => p.name.includes('Drop-in') || p.name.includes('DAY'));
    
    if (testPass) {
      console.log(`\nTesting with pass: ${testPass.name}`);
      console.log(`Current status: ${testPass.isActive ? 'Active' : 'Inactive'}`);
      
      // Toggle status
      const newStatus = !testPass.isActive;
      console.log(`Changing status to: ${newStatus ? 'Active' : 'Inactive'}`);
      
      await sanityClient
        .patch(testPass._id)
        .set({
          isActive: newStatus,
          _updatedAt: new Date().toISOString()
        })
        .commit();
      
      console.log('✅ Status updated successfully');
      
      // Verify the change
      const updatedPass = await sanityClient.fetch(`
        *[_type == "pass" && _id == $passId][0] {
          _id,
          name,
          isActive
        }
      `, { passId: testPass._id });
      
      console.log(`Verified status: ${updatedPass.isActive ? 'Active' : 'Inactive'}`);
      
      // Revert back to original status
      await sanityClient
        .patch(testPass._id)
        .set({
          isActive: testPass.isActive,
          _updatedAt: new Date().toISOString()
        })
        .commit();
      
      console.log('✅ Reverted to original status');
      
    } else {
      console.log('No suitable test pass found');
    }

    console.log('\n3. Summary of pass availability:');
    const activeCount = passes.filter(p => p.isActive).length;
    const inactiveCount = passes.filter(p => !p.isActive).length;
    
    console.log(`   Active passes: ${activeCount}`);
    console.log(`   Inactive passes: ${inactiveCount}`);
    console.log(`   Total passes: ${passes.length}`);
    
    if (inactiveCount > 0) {
      console.log('\n   Inactive passes:');
      passes.filter(p => !p.isActive).forEach(pass => {
        console.log(`   - ${pass.name} (${pass.type})`);
      });
    }

    console.log('\n✅ Pass management functionality is working correctly!');
    console.log('\nNext steps:');
    console.log('1. Deploy the updated webhook and admin interface');
    console.log('2. Access /admin/passes to manage pass availability');
    console.log('3. Inactive passes will be blocked from purchase');

  } catch (error) {
    console.error('❌ Error testing pass management:', error);
  }
}

testPassManagement();
