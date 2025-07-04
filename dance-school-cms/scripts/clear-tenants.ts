import { client } from '../src/lib/sanity';

async function clearTenants() {
  try {
    // First get all tenant documents
    const tenants = await client.fetch(`*[_type == "tenant"]._id`);
    console.log(`Found ${tenants.length} tenants to delete`);

    // Delete all tenant documents
    for (const id of tenants) {
      await client.delete(id);
      console.log(`Deleted tenant ${id}`);
    }

    // Also delete all user documents since they reference tenants
    const users = await client.fetch(`*[_type == "user"]._id`);
    console.log(`Found ${users.length} users to delete`);

    for (const id of users) {
      await client.delete(id);
      console.log(`Deleted user ${id}`);
    }

    console.log('Successfully cleared all tenants and users');
  } catch (error) {
    console.error('Error clearing tenants:', error);
  }
}

clearTenants();
