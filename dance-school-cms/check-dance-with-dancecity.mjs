import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'a2qsy4v6',
  dataset: 'production',
  token: 'sk0oThJpx2nkFl2e1CzgNPXk0501sf2mfP9hg8mLn1hKBwdj8rOdlR7KB3uyB1kg3sZCBgPMw8XcCQzpKiwhpGmL5QdOpU7s9Y1uPpU0TT7qUkhRZvNvxfZTqtffCzrxEoBBQ8J68ImwtAhTrV9oO7orwv1qM7184iOMqEKAJx9CqwWjN2Ry',
  useCdn: false
});

async function checkDanceWithDancecityAccess() {
  try {
    console.log('🔍 Checking DANCE WITH DANCECITY access...\n');
    
    // Get the DANCE WITH DANCECITY tenant
    const tenant = await client.fetch('*[_type == "tenant" && slug.current == "dance-with-dancecity"][0]');
    
    if (!tenant) {
      console.log('❌ DANCE WITH DANCECITY tenant not found');
      return;
    }
    
    console.log('🏫 DANCE WITH DANCECITY tenant:');
    console.log(`   ID: ${tenant._id}`);
    console.log(`   Name: ${tenant.schoolName}`);
    console.log(`   Slug: ${tenant.slug.current}`);
    console.log(`   Owner: ${tenant.ownerId}`);
    console.log(`   Status: ${tenant.status}`);
    
    // Get users associated with DANCE WITH DANCECITY
    const users = await client.fetch(`
      *[_type == "user" && tenant._ref == $tenantId]{
        _id,
        name,
        email,
        clerkId,
        role
      }
    `, { tenantId: tenant._id });
    
    console.log('\n👤 Users with access to DANCE WITH DANCECITY:');
    if (users.length === 0) {
      console.log('❌ NO USERS have access to DANCE WITH DANCECITY');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email}) - Role: ${user.role} - ClerkId: ${user.clerkId}`);
      });
    }
    
    // Check if any Theodore users need to be associated with DANCE WITH DANCECITY
    const theodoreUsers = await client.fetch('*[_type == "user" && name match "Theodore*"]');
    
    console.log('\n🔧 Theodore users that could be given access:');
    theodoreUsers.forEach((user, index) => {
      const hasAccess = users.some(u => u.clerkId === user.clerkId);
      console.log(`${index + 1}. ${user.name} (${user.email}) - ClerkId: ${user.clerkId} - Has Access: ${hasAccess ? 'YES' : 'NO'}`);
    });
    
    // If no Theodore users have access, offer to fix it
    const theodoreWithAccess = theodoreUsers.filter(user => 
      users.some(u => u.clerkId === user.clerkId)
    );
    
    if (theodoreWithAccess.length === 0) {
      console.log('\n🔧 SOLUTION: Need to associate a Theodore user with DANCE WITH DANCECITY');
      console.log('I can fix this by updating one of your accounts to have admin access to this tenant.');
    } else {
      console.log('\n✅ Theodore users already have access to DANCE WITH DANCECITY');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDanceWithDancecityAccess();
