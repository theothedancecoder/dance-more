import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'a2qsy4v6',
  dataset: 'production',
  token: 'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',
  useCdn: false
});

async function fixUserTenantAssociation() {
  try {
    console.log('🔍 Checking Dancecity tenant...');
    
    // Get the Dancecity tenant
    const dancecityTenant = await client.fetch('*[_type == "tenant" && slug.current == "dancecity"][0]');
    
    if (!dancecityTenant) {
      console.log('❌ Dancecity tenant not found');
      return;
    }
    
    console.log('✅ Found Dancecity tenant:', {
      id: dancecityTenant._id,
      name: dancecityTenant.schoolName,
      slug: dancecityTenant.slug.current,
      owner: dancecityTenant.ownerId
    });
    
    // Check all Theodore users
    const users = await client.fetch(`
      *[_type == "user" && name match "Theodore*"]{
        _id,
        name,
        email,
        clerkId,
        role,
        "tenant": tenant->{_id, schoolName, "slug": slug.current}
      }
    `);
    
    console.log('\n👤 All Theodore users:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role} - ClerkId: ${user.clerkId}`);
      if (user.tenant) {
        console.log(`   Associated with: ${user.tenant.schoolName} (${user.tenant.slug})`);
      } else {
        console.log('   No tenant association (pending status)');
      }
    });
    
    // Find users that need to be associated with Dancecity
    const usersToFix = users.filter(user => !user.tenant || user.tenant.slug !== 'dancecity');
    
    if (usersToFix.length === 0) {
      console.log('\n✅ All users are properly associated with their tenants');
      return;
    }
    
    console.log(`\n🔧 Found ${usersToFix.length} users that need to be associated with Dancecity:`);
    
    for (const user of usersToFix) {
      console.log(`\n🔧 Fixing user: ${user.name} (${user.email})`);
      
      try {
        // Update the user to be associated with Dancecity tenant and make them admin
        const updatedUser = await client
          .patch(user._id)
          .set({
            tenant: {
              _type: 'reference',
              _ref: dancecityTenant._id,
            },
            role: 'admin',
            updatedAt: new Date().toISOString(),
          })
          .commit();
          
        console.log('✅ User updated successfully!');
        console.log(`   User: ${user.name} (${user.email})`);
        console.log(`   Now associated with: Dancecity`);
        console.log(`   Role: admin`);
        console.log(`   ClerkId: ${user.clerkId}`);
        
        // Verify the update
        const verifiedUser = await client.fetch(
          '*[_type == "user" && _id == $userId][0]{_id, name, email, clerkId, role, "tenant": tenant->{_id, schoolName, "slug": slug.current}}',
          { userId: user._id }
        );
        console.log('✅ Verification - Updated user:', {
          name: verifiedUser.name,
          email: verifiedUser.email,
          role: verifiedUser.role,
          tenant: verifiedUser.tenant?.schoolName
        });
        
      } catch (error) {
        console.error(`❌ Error updating user ${user.name}:`, error);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixUserTenantAssociation();
