import { client } from './src/lib/sanity.js';

async function checkUser() {
  try {
    const users = await client.fetch(`*[_type == "user" && email == "dancewithdancecity@gmail.com"][0]{
      _id,
      email,
      role,
      clerkId,
      tenant->{
        _id,
        schoolName,
        "slug": slug.current
      }
    }`);
    
    console.log('User data:', JSON.stringify(users, null, 2));
    
    // Also check by clerkId if email doesn't work
    const usersByClerk = await client.fetch(`*[_type == "user"]{
      _id,
      email,
      role,
      clerkId,
      tenant->{
        _id,
        schoolName,
        "slug": slug.current
      }
    }`);
    
    console.log('\nAll users:', JSON.stringify(usersByClerk, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUser();
