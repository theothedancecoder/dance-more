#!/usr/bin/env node
import { config } from 'dotenv';

config({ path: './.env.local' });

console.log('🧪 TESTING API ENDPOINT FILTERING');
console.log('='.repeat(60));

async function testAPIFiltering() {
  try {
    // Note: This test assumes the Next.js dev server is running
    // If not running, start it with: npm run dev
    
    const baseUrl = 'http://localhost:3000';
    
    console.log('\n1. Testing ADMIN view (no filtering)...\n');
    
    try {
      const adminResponse = await fetch(`${baseUrl}/api/admin/passes`);
      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        console.log(`✅ Admin endpoint: ${adminData.passes.length} passes returned`);
        console.log('   (All passes including expired ones)\n');
      } else {
        console.log(`⚠️  Admin endpoint returned status: ${adminResponse.status}`);
      }
    } catch (error) {
      console.log('⚠️  Could not connect to admin endpoint');
      console.log('   Make sure the dev server is running: npm run dev\n');
    }
    
    console.log('2. Testing STUDENT view (with filtering)...\n');
    
    try {
      const studentResponse = await fetch(`${baseUrl}/api/admin/passes?filterExpired=true`);
      if (studentResponse.ok) {
        const studentData = await studentResponse.json();
        console.log(`✅ Student endpoint: ${studentData.passes.length} passes returned`);
        console.log('   (Only active, non-expired passes)\n');
        
        console.log('   Passes visible to students:');
        studentData.passes.forEach((pass, i) => {
          const validityInfo = pass.validityType === 'date' && pass.expiryDate
            ? `until ${new Date(pass.expiryDate).toLocaleDateString()}`
            : pass.validityDays
            ? `${pass.validityDays} days from purchase`
            : 'not configured';
          
          console.log(`   ${i + 1}. ${pass.name} - ${pass.price} kr (valid ${validityInfo})`);
        });
        
        // Check if any expired passes are in the list
        const now = new Date();
        const expiredInList = studentData.passes.filter(pass => {
          if (pass.validityType === 'date' && pass.expiryDate) {
            return new Date(pass.expiryDate) < now;
          }
          return false;
        });
        
        if (expiredInList.length > 0) {
          console.log(`\n   ❌ ERROR: Found ${expiredInList.length} expired pass(es) in student view!`);
          expiredInList.forEach(pass => {
            console.log(`      - ${pass.name} (expired ${new Date(pass.expiryDate).toLocaleDateString()})`);
          });
        } else {
          console.log(`\n   ✅ SUCCESS: No expired passes in student view!`);
        }
      } else {
        console.log(`⚠️  Student endpoint returned status: ${studentResponse.status}`);
      }
    } catch (error) {
      console.log('⚠️  Could not connect to student endpoint');
      console.log('   Make sure the dev server is running: npm run dev\n');
    }
    
    console.log('\n3. Summary:\n');
    console.log('   The API endpoint is now configured to:');
    console.log('   - Show ALL passes to admins (no filter parameter)');
    console.log('   - Show only active, non-expired passes to students (filterExpired=true)');
    console.log('   - Use JavaScript fallback for date checking (handles Sanity null values)');
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

testAPIFiltering();
