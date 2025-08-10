import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'a2qsy4v6',
  dataset: 'production',
  token: 'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',
  useCdn: false
});

async function debugCurrentUser() {
  try {
    console.log('🔍 Debugging current user access issue...\n');
    
    // Get all users and their associations
    const allUsers = await client.fetch(`
      *[_type == "user"]{
        _id,
        name,
        email,
        clerkId,
        role,
        "tenant": tenant->{_id, schoolName, "slug": slug.current}
      } | order(name)
    `);
    
    console.log('👥 ALL USERS in database:');
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'No Name'} (${user.email || 'No Email'})`);
      console.log(`   ClerkId: ${user.clerkId || 'No ClerkId'}`);
      console.log(`   Role: ${user.role || 'No Role'}`);
      if (user.tenant) {
        console.log(`   Tenant: ${user.tenant.schoolName} (${user.tenant.slug})`);
      } else {
        console.log('   Tenant: NONE');
      }
      console.log('');
    });
    
    // Get Dancecity tenant
    const dancecityTenant = await client.fetch('*[_type == "tenant" && slug.current == "dancecity"][0]');
    
    console.log('🏫 DANCECITY TENANT:');
    console.log(`   ID: ${dancecityTenant._id}`);
    console.log(`   Name: ${dancecityTenant.schoolName}`);
    console.log(`   Slug: ${dancecityTenant.slug.current}`);
    console.log(`   Owner: ${dancecityTenant.ownerId}`);
    console.log(`   Status: ${dancecityTenant.status}`);
    
    // Get users specifically associated with Dancecity
    const dancecityUsers = await client.fetch(`
      *[_type == "user" && tenant._ref == $tenantId]{
        _id,
        name,
        email,
        clerkId,
        role
      }
    `, { tenantId: dancecityTenant._id });
    
    console.log('\n🎯 USERS ASSOCIATED WITH DANCECITY:');
    if (dancecityUsers.length === 0) {
      console.log('❌ NO USERS are associated with Dancecity!');
    } else {
      dancecityUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   ClerkId: ${user.clerkId}`);
        console.log(`   Role: ${user.role}`);
        console.log('');
      });
    }
    
    console.log('🔧 TROUBLESHOOTING STEPS:');
    console.log('1. Check which email you are currently signed in with on dancemore.app');
    console.log('2. Find that email in the list above and note its ClerkId');
    console.log('3. Verify that ClerkId is in the "USERS ASSOCIATED WITH DANCECITY" list');
    console.log('4. If not, we need to associate that specific ClerkId with Dancecity');
    console.log('\n💡 NEXT STEPS:');
    console.log('- Tell me which email you are currently signed in with');
    console.log('- I will ensure that specific account is properly associated with Dancecity');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCurrentUser();
