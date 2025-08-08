import { createClient } from '@sanity/client';
import Stripe from 'stripe';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false,
});

async function refreshStripeStatus() {
  try {
    console.log('🔄 Refreshing Stripe Connect status...');
    
    // Get the tenant
    const tenant = await sanityClient.fetch(
      `*[_type == "tenant" && slug.current == "dance-with-dancecity"][0] {
        _id,
        schoolName,
        stripeConnect
      }`
    );
    
    if (!tenant) {
      console.error('❌ Tenant not found');
      return;
    }
    
    console.log('📋 Current tenant data:', JSON.stringify(tenant, null, 2));
    
    if (!tenant.stripeConnect?.accountId) {
      console.error('❌ No Stripe Connect account ID found');
      return;
    }
