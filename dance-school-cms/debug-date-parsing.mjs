import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

console.log('🔍 Testing date parsing logic...');

// Test the exact dates we have in the database
const testDates = [
  '2025-08-11T18:00:00.000Z', // Monday - Bachata Level 3
  '2025-08-11T19:00:00.000Z', // Monday - Bachata Level 4
  '2025-08-12T18:00:00.000Z', // Tuesday - Bachata Footwork
  '2025-08-13T18:00:00.000Z', // Wednesday - Bachata Sensual Level 1
];

console.log('\n📅 Testing different date parsing methods:');

testDates.forEach((dateStr, index) => {
  console.log(`\n${index + 1}. Testing: ${dateStr}`);
  
  const date = new Date(dateStr);
  
  // Method 1: Default toLocaleDateString (what was failing)
  const method1 = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  
  // Method 2: With UTC timezone (our attempted fix)
  const method2 = date.toLocaleDateString('en-US', { 
    weekday: 'long',
    timeZone: 'UTC'
  }).toLowerCase();
  
  // Method 3: Using UTC methods directly
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const method3 = dayNames[date.getUTCDay()];
  
  // Method 4: Manual parsing from ISO string
  const isoDate = new Date(dateStr);
  const method4 = isoDate.toISOString().split('T')[0]; // Get YYYY-MM-DD
  const method4Date = new Date(method4 + 'T12:00:00.000Z'); // Add noon UTC to avoid timezone issues
  const method4Day = dayNames[method4Date.getUTCDay()];
  
  console.log(`   Original: ${dateStr}`);
  console.log(`   Parsed Date: ${date.toISOString()}`);
  console.log(`   Method 1 (default): ${method1}`);
  console.log(`   Method 2 (UTC timezone): ${method2}`);
  console.log(`   Method 3 (getUTCDay): ${method3}`);
  console.log(`   Method 4 (date-only): ${method4Day}`);
  console.log(`   Local timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
});

// Test what the component should be doing
console.log('\n🔧 Testing component logic:');

const mockInstances = [
  { date: '2025-08-11T18:00:00.000Z', title: 'Bachata Level 3' },
  { date: '2025-08-11T19:00:00.000Z', title: 'Bachata Level 4' },
  { date: '2025-08-12T18:00:00.000Z', title: 'Bachata Footwork' },
  { date: '2025-08-13T18:00:00.000Z', title: 'Bachata Sensual Level 1' },
];

const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const grouped = {};

days.forEach(day => {
  grouped[day] = [];
});

mockInstances.forEach(instance => {
  const instanceDate = new Date(instance.date);
  
  // Try the UTC method
  const dayName = instanceDate.toLocaleDateString('en-US', { 
    weekday: 'long',
    timeZone: 'UTC'
  }).toLowerCase();
  
  console.log(`${instance.title}: ${instance.date} -> ${dayName}`);
  
  if (grouped[dayName]) {
    grouped[dayName].push(instance);
  }
});

console.log('\n📊 Grouped results:');
Object.keys(grouped).forEach(day => {
  console.log(`${day}: ${grouped[day].length} classes`);
  grouped[day].forEach(instance => {
    console.log(`  - ${instance.title}`);
  });
});
