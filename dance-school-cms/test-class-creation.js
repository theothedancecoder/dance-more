import { client } from './src/lib/sanity.ts';

async function createTestClassWithInstances() {
  try {
    console.log('🎯 Creating test class with instances...');
    
    // Get the dancezone tenant
    const tenant = await client.fetch(`*[_type == "tenant" && slug.current == "dancezone"][0]`);
    if (!tenant) {
      console.error('❌ Tenant "dancezone" not found');
      return;
    }
    
    console.log('✅ Found tenant:', tenant.schoolName);
    
    // Create a test class
    const classData = {
      _type: 'class',
      title: 'Test Ballet Class',
      description: 'A test ballet class for verification',
      instructorName: 'Test Instructor',
      capacity: 15,
      price: 25,
      location: 'Studio A',
      duration: 60,
      level: 'beginner',
      category: 'ballet',
      tenant: {
        _type: 'reference',
        _ref: tenant._id
      },
      isRecurring: false,
      singleClassDate: '2025-01-15T18:00:00.000Z'
    };
    
    const createdClass = await client.create(classData);
    console.log('✅ Created class:', createdClass.title);
    
    // Create a class instance for this class
    const instanceData = {
      _type: 'classInstance',
      class: {
        _type: 'reference',
        _ref: createdClass._id
      },
      tenant: {
        _type: 'reference',
        _ref: tenant._id
      },
      startTime: '2025-01-15T18:00:00.000Z',
      endTime: '2025-01-15T19:00:00.000Z',
      status: 'scheduled',
      availableSpots: 15,
      bookedSpots: 0
    };
    
    const createdInstance = await client.create(instanceData);
    console.log('✅ Created class instance for:', new Date(createdInstance.startTime).toLocaleString());
    
    console.log('🎉 Test class and instance created successfully!');
    
    // Verify the class appears in the public API
    console.log('\n🔍 Testing public classes API...');
    const publicClasses = await client.fetch(`
      *[_type == "class" && tenant._ref == $tenantId] {
        _id,
        title,
        description,
        instructorName,
        capacity,
        price,
        location,
        duration,
        level,
        category,
        isRecurring,
        singleClassDate
      }
    `, { tenantId: tenant._id });
    
    console.log('📋 Public classes found:', publicClasses.length);
    publicClasses.forEach(cls => {
      console.log(`  - ${cls.title} (${cls.category})`);
    });
    
    // Verify class instances
    console.log('\n🔍 Testing class instances API...');
    const instances = await client.fetch(`
      *[_type == "classInstance" && tenant._ref == $tenantId] {
        _id,
        startTime,
        endTime,
        status,
        availableSpots,
        bookedSpots,
        class->{title, instructorName}
      }
    `, { tenantId: tenant._id });
    
    console.log('📅 Class instances found:', instances.length);
    instances.forEach(instance => {
      console.log(`  - ${instance.class.title} at ${new Date(instance.startTime).toLocaleString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error creating test class:', error);
  }
}

createTestClassWithInstances();
