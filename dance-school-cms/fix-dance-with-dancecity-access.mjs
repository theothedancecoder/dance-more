import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'a2qsy4v6',
  dataset: 'production',
  token: 'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',
  useCdn: false
});

async function fixDanceWithDancecityAccess() {
  try {
    console.log('🔧 Fixing DANCE WITH DANCECITY access...\n');
    
    // Get the DANCE WITH DANCECITY tenant
    const tenant = await client.fetch('*[_type == "tenant" && slug.current == "dance-with-dancecity"][0]');
    
    if (!tenant) {
      console.log('❌ DANCE WITH DANCECITY tenant not found');
      return;
    }
    
    console.log('🏫 Found DANCE WITH DANCECITY tenant:');
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Owner ClerkId: ${tenant.ownerId}`);
    
    // Find the Theodore user with the matching ClerkId (the owner)
    const ownerUser = await client.fetch(
      '*[_type == "user" && clerkId == $clerkId][0]',
      { clerkId: tenant.ownerId }
    );
    
    if (!ownerUser) {
      console.log('❌ Owner user not found in database');
      return;
    }
    
    console.log(`\n👤 Found owner user: ${ownerUser.name} (${ownerUser.email})`);
    console.log(`   Current tenant: ${ownerUser.tenant ? 'Associated' : 'NOT ASSOCIATED'}`);
    console.log(`   Current role: ${ownerUser.role}`);
    
    // Update the owner user to be associated with DANCE WITH DANCECITY as admin
    console.log('\n🔧 Updating user association...');
    
    const updatedUser = await client
      .patch(ownerUser._id)
      .set({
        tenant: {
          _type: 'reference',
          _ref: tenant._id,
        },
        role: 'admin',
        updatedAt: new Date().toISOString(),
      })
      .commit();
      
    console.log('✅ User updated successfully!');
    console.log(`   User: ${ownerUser.name} (${ownerUser.email})`);
    console.log(`   Now associated with: DANCE WITH DANCECITY`);
    console.log(`   Role: admin`);
    console.log(`   ClerkId: ${ownerUser.clerkId}`);
    
    // Verify the update
    const verifiedUser = await client.fetch(
      '*[_type == "user" && _id == $userId][0]{_id, name, email, clerkId, role, "tenant": tenant->{_id, schoolName, "slug": slug.current}}',
      { userId: ownerUser._id }
    );
    
    console.log('\n✅ Verification - Updated user:');
    console.log(`   Name: ${verifiedUser.name}`);
    console.log(`   Email: ${verifiedUser.email}`);
    console.log(`   Role: ${verifiedUser.role}`);
    console.log(`   Tenant: ${verifiedUser.tenant?.schoolName} (${verifiedUser.tenant?.slug})`);
    
    console.log('\n🎉 SUCCESS! You now have admin access to DANCE WITH DANCECITY');
    console.log('📍 Access URL: https://dancemore.app/dance-with-dancecity/admin');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixDanceWithDancecityAccess();
