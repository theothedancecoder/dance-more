import { client } from './src/lib/sanityClient.js';

console.log('🔍 Debugging upcoming classes count...');

// Test the exact query from the API
const query = `*[_type == "tenant" && slug.current == "dancecity"][0] {
  _id,
  schoolName,
  "classCount": count(*[_type == "class" && tenant._ref == ^._id && status == "active"]),
  "upcomingClasses": count(*[_type == "classInstance" && tenant._ref == ^._id && date >= now() && status == "active"]),
  "totalStudents": count(*[_type == "user" && tenant._ref == ^._id && role != "admin"])
}`;

try {
  const result = await client.fetch(query);
  console.log('📊 Query result:', JSON.stringify(result, null, 2));

  // Also check what class instances exist for this tenant
  const instancesQuery = `*[_type == "classInstance" && tenant._ref == "${result._id}"] {
    _id,
    title,
    date,
    status,
    "isUpcoming": date >= now()
  } | order(date asc)`;

  const instances = await client.fetch(instancesQuery);
  console.log('\n📅 Class instances for Dancecity:');
  console.log(`Total instances: ${instances.length}`);
  
  const upcoming = instances.filter(i => i.isUpcoming);
  const past = instances.filter(i => !i.isUpcoming);
  
  console.log(`Upcoming instances: ${upcoming.length}`);
  console.log(`Past instances: ${past.length}`);
  
  if (upcoming.length > 0) {
    console.log('\n🔮 Upcoming instances:');
    upcoming.slice(0, 5).forEach(instance => {
      console.log(`- ${instance.title}: ${instance.date} (status: ${instance.status})`);
    });
  }
  
  if (past.length > 0) {
    console.log('\n📜 Recent past instances:');
    past.slice(-5).forEach(instance => {
      console.log(`- ${instance.title}: ${instance.date} (status: ${instance.status})`);
    });
  }

} catch (error) {
  console.error('❌ Error:', error);
}
