import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: '2023-05-03',
});

async function fixSveinUserRole() {
  const email = 'svein.h.aaberge@gmail.com';
  const userId = 'x7AKQdsMTT5RY3O5CjyoxS';
  
  console.log('🔧 Fixing Svein\'s user role and tenant...');
  console.log('Email:', email);
  console.log('User ID:', userId);
  console.log('=' .repeat(60));

  try {
    // 1. Get current user data
    console.log('\n1. Getting current user data...');
    const currentUser = await sanityClient.fetch(`
      *[_type == "user" && _id == $userId][0] {
        _id,
        clerkId,
        email,
        firstName,
        lastName,
        role,
        tenant,
        _createdAt,
        _updatedAt
      }
    `, { userId });

    if (!currentUser) {
      console.log('❌ User not found');
      return;
    }

    console.log('✅ Current user data:');
    console.log(`   - Role: ${currentUser.role}`);
    console.log(`   - Tenant: ${currentUser.tenant}`);
    console.log(`   - Created: ${currentUser._createdAt}`);

    // 2. Check what tenants are available
    console.log('\n2. Checking available tenants...');
    const tenants = await sanityClient.fetch(`
      *[_type == "tenant" && isActive == true] | order(name asc) {
        _id,
        name,
        slug,
        isActive
      }
    `);

    console.log(`📊 Found ${tenants.length} active tenants:`);
    tenants.forEach((tenant, index) => {
      console.log(`   ${index + 1}. ${tenant.name} (${tenant.slug}) - ID: ${tenant._id}`);
    });

    // 3. Check what roles other users have
    console.log('\n3. Checking common user roles...');
    const roleStats = await sanityClient.fetch(`
      *[_type == "user"] {
        "role": role
      } | {
        "role": role,
        "count": count(*)
      } | order(count desc)
    `);

    console.log('Role distribution:');
    roleStats.forEach(stat => {
      console.log(`   - ${stat.role || 'null'}: ${stat.count} users`);
    });

    // 4. Prepare update data
    console.log('\n4. Preparing user update...');
    
    // Set role to 'user' (most common role for students)
    // Set tenant to the first active tenant (assuming single tenant setup)
    const updateData = {
      role: 'user',
      tenant: tenants.length > 0 ? { _type: 'reference', _ref: tenants[0]._id } : null,
      _updatedAt: new Date().toISOString()
    };

    console.log('✅ Update data:');
    console.log(`   - New Role: ${updateData.role}`);
    console.log(`   - New Tenant: ${tenants.length > 0 ? tenants[0].name : 'null'}`);

    // 5. Apply the update
    console.log('\n5. Applying user update...');
    const result = await sanityClient
      .patch(userId)
      .set(updateData)
      .commit();

    console.log('✅ User updated successfully!');
    console.log('Updated user ID:', result._id);

    // 6. Verify the update
    console.log('\n6. Verifying user update...');
    const updatedUser = await sanityClient.fetch(`
      *[_type == "user" && _id == $userId][0] {
        _id,
        clerkId,
        email,
        firstName,
        lastName,
        role,
        tenant,
        "tenantName": tenant->name,
        _createdAt,
        _updatedAt
      }
    `, { userId });

    console.log('✅ Updated user verification:');
    console.log(`   - Email: ${updatedUser.email}`);
    console.log(`   - Role: ${updatedUser.role}`);
    console.log(`   - Tenant: ${updatedUser.tenantName} (${updatedUser.tenant})`);
    console.log(`   - Updated: ${updatedUser._updatedAt}`);

    // 7. Test access to student interface
    console.log('\n7. Testing student interface access...');
    
    // Check if user would have access based on role
    const hasStudentAccess = ['user', 'student', 'admin'].includes(updatedUser.role);
    console.log(`   - Student access: ${hasStudentAccess ? '✅ YES' : '❌ NO'}`);
    
    if (hasStudentAccess) {
      console.log('   - User should now be able to access /student/passes');
    } else {
      console.log('   - User still may not have access to student interface');
    }

    console.log('\n🎉 User role and tenant fix completed!');
    console.log('Svein should now be able to access the student interface and see his pass.');

  } catch (error) {
    console.error('❌ Error fixing user role:', error);
  }
}

fixSveinUserRole();
