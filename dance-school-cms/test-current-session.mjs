import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'a2qsy4v6',
  dataset: 'production',
  token: 'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',
  useCdn: false
});

async function testCurrentSession() {
  try {
    console.log('🔍 Testing what the middleware would see for dancewithdancecity@gmail.com...\n');
    
    // Simulate what the middleware does - get user by ClerkId
    const clerkId = 'user_2zWH77fKg5nQWc7TR50QVlB93GZ'; // Your current ClerkId
    
    const user = await client.fetch(`*[_type == "user" && clerkId == $clerkId][0]{
      _id,
      name,
      email,
      clerkId,
      role,
      tenant->{_id, "slug": slug.current, schoolName}
    }`, { clerkId });
    
    console.log('👤 User found by middleware:');
    if (user) {
      console.log(`   ID: ${user._id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   ClerkId: ${user.clerkId}`);
      console.log(`   Role: ${user.role}`);
      if (user.tenant) {
        console.log(`   Tenant: ${user.tenant.schoolName} (${user.tenant.slug})`);
        console.log(`   Tenant ID: ${user.tenant._id}`);
      } else {
        console.log('   Tenant: NONE');
      }
    } else {
      console.log('❌ NO USER FOUND - This is the problem!');
    }
    
    // Get the DANCE WITH DANCECITY tenant
    const tenant = await client.fetch('*[_type == "tenant" && slug.current == "dance-with-dancecity"][0]');
    
    console.log('\n🏫 DANCE WITH DANCECITY tenant:');
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Owner: ${tenant.ownerId}`);
    
    // Check if user belongs to this tenant
    if (user && user.tenant && user.tenant.slug === 'dance-with-dancecity') {
      console.log('\n✅ MIDDLEWARE CHECK: User belongs to DANCE WITH DANCECITY');
      console.log('✅ MIDDLEWARE CHECK: User has admin role');
      console.log('✅ DATABASE IS CORRECT - This should work!');
      
      console.log('\n🔧 SOLUTION: The issue is likely browser cache or session sync.');
      console.log('Try these steps:');
      console.log('1. Clear all browser data for dancemore.app');
      console.log('2. Use incognito/private browsing mode');
      console.log('3. Try a different browser');
      console.log('4. Wait 5-10 minutes for Clerk session to sync');
      
    } else {
      console.log('\n❌ MIDDLEWARE CHECK: User does NOT belong to DANCE WITH DANCECITY');
      console.log('This explains the access denied error.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCurrentSession();
