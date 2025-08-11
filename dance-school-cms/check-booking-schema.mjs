import dotenv from 'dotenv';
import { createClient } from '@sanity/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
});

console.log('🔍 CHECKING BOOKING SCHEMA IN SANITY');

async function checkBookingSchema() {
  try {
    // 1. Check if there are any booking documents
    const bookings = await sanityClient.fetch(
      `*[_type == "booking"] {
        _id,
        _type,
        _createdAt,
        user->{_id, email, name},
        classInstance->{_id, date, startTime},
        subscription->{_id, passName, type},
        tenant->{_id, schoolName},
        status,
        bookedAt,
        cancelledAt
      } | order(_createdAt desc)[0...5]`
    );

    console.log(`\n📊 Found ${bookings.length} booking documents (showing first 5):`);
    
    if (bookings.length > 0) {
      bookings.forEach((booking, index) => {
        console.log(`\n${index + 1}. Booking ID: ${booking._id}`);
        console.log(`   User: ${booking.user?.email || 'Unknown'}`);
        console.log(`   Class: ${booking.classInstance?.date} at ${booking.classInstance?.startTime}`);
        console.log(`   Subscription: ${booking.subscription?.passName || booking.subscription?.type || 'None'}`);
        console.log(`   Tenant: ${booking.tenant?.schoolName || 'Unknown'}`);
        console.log(`   Status: ${booking.status || 'Unknown'}`);
        console.log(`   Booked: ${booking.bookedAt || booking._createdAt}`);
        if (booking.cancelledAt) {
          console.log(`   Cancelled: ${booking.cancelledAt}`);
        }
      });
    } else {
      console.log('   No booking documents found');
    }

    // 2. Check total count of bookings
    const totalBookings = await sanityClient.fetch(`count(*[_type == "booking"])`);
    console.log(`\n📈 Total bookings in database: ${totalBookings}`);

    // 3. Check booking statuses
    const bookingStatuses = await sanityClient.fetch(
      `*[_type == "booking"] | {
        "status": status,
        "count": count(*)
      } | group(status) | {
        "status": _key,
        "count": count(*)
      }`
    );

    console.log('\n📊 Booking statuses:');
    bookingStatuses.forEach(status => {
      console.log(`   ${status.status || 'undefined'}: ${status.count}`);
    });

    // 4. Check recent bookings by tenant
    const bookingsByTenant = await sanityClient.fetch(
      `*[_type == "booking"] {
        tenant->{schoolName}
      } | group(tenant.schoolName) | {
        "tenant": _key,
        "count": count(*)
      }`
    );

    console.log('\n🏢 Bookings by tenant:');
    bookingsByTenant.forEach(tenant => {
      console.log(`   ${tenant.tenant || 'Unknown'}: ${tenant.count}`);
    });

    // 5. Check if there are any class instances
    const classInstances = await sanityClient.fetch(
      `*[_type == "classInstance"] {
        _id,
        date,
        startTime,
        class->{name},
        tenant->{schoolName}
      } | order(date desc)[0...3]`
    );

    console.log(`\n📅 Recent class instances (${classInstances.length} found):`);
    classInstances.forEach((instance, index) => {
      console.log(`   ${index + 1}. ${instance.class?.name || 'Unknown'} - ${instance.date} at ${instance.startTime}`);
      console.log(`      Tenant: ${instance.tenant?.schoolName || 'Unknown'}`);
    });

    // 6. Check the relationship between subscriptions and bookings
    const subscriptionsWithBookings = await sanityClient.fetch(
      `*[_type == "subscription"] {
        _id,
        passName,
        type,
        user->{email},
        "bookingCount": count(*[_type == "booking" && subscription._ref == ^._id])
      } | order(bookingCount desc)[0...5]`
    );

    console.log('\n🔗 Subscriptions with booking counts:');
    subscriptionsWithBookings.forEach((sub, index) => {
      console.log(`   ${index + 1}. ${sub.user?.email}: ${sub.passName || sub.type} (${sub.bookingCount} bookings)`);
    });

  } catch (error) {
    console.error('❌ Error checking booking schema:', error);
  }
}

checkBookingSchema();
