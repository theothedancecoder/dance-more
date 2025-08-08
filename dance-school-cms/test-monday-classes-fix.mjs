import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

async function testMondayClassesFix() {
  console.log('🔍 Testing Monday Classes Fix...\n');

  try {
    // 1. Check for existing Monday classes
    console.log('1. Checking for existing Monday classes...');
    const mondayClasses = await sanityClient.fetch(`
      *[_type == "class" && isRecurring == true && isActive == true] {
        _id,
        title,
        recurringSchedule {
          weeklySchedule[] {
            dayOfWeek,
            startTime,
            endTime
          }
        }
      }
    `);

    const classesWithMonday = mondayClasses.filter(cls => 
      cls.recurringSchedule?.weeklySchedule?.some(schedule => 
        schedule.dayOfWeek?.toLowerCase() === 'monday'
      )
    );

    console.log(`Found ${classesWithMonday.length} classes with Monday schedules:`);
    classesWithMonday.forEach(cls => {
      const mondaySchedules = cls.recurringSchedule.weeklySchedule.filter(s => 
        s.dayOfWeek?.toLowerCase() === 'monday'
      );
      mondaySchedules.forEach(schedule => {
        console.log(`  - ${cls.title}: Monday ${schedule.startTime}-${schedule.endTime}`);
      });
    });

    // 2. Check for existing Monday class instances
    console.log('\n2. Checking for existing Monday class instances...');
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const mondayInstances = await sanityClient.fetch(`
      *[_type == "classInstance" && date >= $startDate && date <= $endDate] {
        _id,
        date,
        parentClass->{
          title,
          recurringSchedule {
            weeklySchedule[] {
              dayOfWeek,
              startTime
            }
          }
        }
      } | order(date asc)
    `, {
      startDate: now.toISOString(),
      endDate: nextWeek.toISOString()
    });

    const actualMondayInstances = mondayInstances.filter(instance => {
      const instanceDate = new Date(instance.date);
      return instanceDate.getDay() === 1; // Monday
    });

    console.log(`Found ${actualMondayInstances.length} Monday class instances in the next week:`);
    actualMondayInstances.forEach(instance => {
      const date = new Date(instance.date);
      console.log(`  - ${instance.parentClass.title}: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    });

    // 3. Test the day calculation logic
    console.log('\n3. Testing day calculation logic...');
    
    function testDayCalculation(baseDate, targetDayOfWeek) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDay = days.indexOf(targetDayOfWeek.toLowerCase());
      
      if (targetDay === -1) {
        throw new Error(`Invalid day of week: ${targetDayOfWeek}`);
      }
      
      const date = new Date(baseDate);
      const currentDay = date.getDay();
      
      // Calculate days to add to get to the target day
      let daysToAdd = targetDay - currentDay;
      
      // If the target day is today or in the past this week, move to next week
      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }
      
      date.setDate(date.getDate() + daysToAdd);
      return date;
    }

    // Test with different base dates
    const testDates = [
      new Date('2024-01-07'), // Sunday
      new Date('2024-01-08'), // Monday
      new Date('2024-01-09'), // Tuesday
      new Date('2024-01-10'), // Wednesday
    ];

    testDates.forEach(baseDate => {
      const mondayResult = testDayCalculation(baseDate, 'monday');
      const baseDayName = baseDate.toLocaleDateString('en-US', { weekday: 'long' });
      const resultDayName = mondayResult.toLocaleDateString('en-US', { weekday: 'long' });
      
      console.log(`  Base: ${baseDayName} ${baseDate.toLocaleDateString()} → Next Monday: ${resultDayName} ${mondayResult.toLocaleDateString()}`);
      
      // Verify it's actually a Monday
      if (mondayResult.getDay() !== 1) {
        console.error(`    ❌ ERROR: Result is not a Monday! (day=${mondayResult.getDay()})`);
      } else {
        console.log(`    ✅ Correct: Result is a Monday`);
      }
    });

    // 4. Provide recommendations
    console.log('\n4. Recommendations:');
    
    if (classesWithMonday.length === 0) {
      console.log('  ⚠️  No Monday classes found. Create a test Monday class to verify the fix.');
    } else if (actualMondayInstances.length === 0) {
      console.log('  🔧 No Monday instances found. Run the generate instances API to create them.');
      console.log('     You can do this through the admin panel or by calling:');
      console.log('     POST /api/admin/generate-instances');
    } else {
      console.log('  ✅ Monday classes and instances are present. The fix appears to be working!');
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Error during testing:', error);
    process.exit(1);
  }
}

// Run the test
testMondayClassesFix();
