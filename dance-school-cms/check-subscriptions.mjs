import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_API_TOKEN,
});

async function checkSubscriptions() {
  try {
    // Check subscriptions for the tenant
    const subscriptions = await client.fetch(`*[_type == "subscription" && tenant._ref == "DgqhBYe1Mm6KcUArJjcYot"]{
      _id,
      _createdAt,
      stripePaymentIntentId,
      amount,
      currency,
      status,
      user->{
        _id,
        name,
        email
      },
      pass->{
        _id,
        name,
        price
      },
      tenant->{
        _id,
        schoolName
      }
    }`);
    
    console.log('Subscriptions found:', JSON.stringify(subscriptions, null, 2));
    
    // Also check bookings
    const bookings = await client.fetch(`*[_type == "booking" && tenant._ref == "DgqhBYe1Mm6KcUArJjcYot"]{
      _id,
      _createdAt,
      paymentStatus,
      paymentId,
      user->{
        _id,
        name,
        email
      },
      class->{
        _id,
        title,
        price
      }
    }`);
    
    console.log('\nBookings found:', JSON.stringify(bookings, null, 2));
    
    // Check all document types to see what exists
    const allDocs = await client.fetch(`*[tenant._ref == "DgqhBYe1Mm6KcUArJjcYot"]{
      _type,
      _id
    }`);
    
    console.log('\nAll documents for tenant:', JSON.stringify(allDocs, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSubscriptions();
