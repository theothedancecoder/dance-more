#!/usr/bin/env node
import { config } from 'dotenv';
import Stripe from 'stripe';

config({ path: './.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

console.log('🔍 CHECKING STRIPE METADATA FOR PASS PURCHASES');
console.log('='.repeat(50));

async function checkStripeMetadata() {
  try {
    console.log('Fetching recent Stripe checkout sessions...');
    
    // Get recent checkout sessions
    const sessions = await stripe.checkout.sessions.list({
      limit: 20,
      expand: ['data.line_items']
    });
    
    console.log(`\nFound ${sessions.data.length} recent sessions:`);
    
    sessions.data.forEach((session, i) => {
      console.log(`\n${i + 1}. Session: ${session.id}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Amount: ${session.amount_total / 100} ${session.currency?.toUpperCase()}`);
      console.log(`   Customer Email: ${session.customer_email}`);
      console.log(`   Created: ${new Date(session.created * 1000).toLocaleString()}`);
      
      // Show metadata
      console.log(`   Metadata:`, session.metadata);
      
      // Show line items to identify what was purchased
      if (session.line_items?.data) {
        console.log(`   Items purchased:`);
        session.line_items.data.forEach(item => {
          console.log(`     - ${item.description} (${item.quantity}x)`);
          console.log(`       Price: ${item.amount_total / 100} ${session.currency?.toUpperCase()}`);
        });
      }
      
      // Try to identify if this is a pass or class purchase
      const hasClassId = session.metadata?.classId;
      const hasPassId = session.metadata?.passId;
      const hasOtherIds = Object.keys(session.metadata || {}).filter(key => 
        key.includes('Id') || key.includes('id') || key.includes('ID')
      );
      
      if (hasClassId) {
        console.log(`   🎯 TYPE: Class booking (classId: ${hasClassId})`);
      } else if (hasPassId) {
        console.log(`   🎫 TYPE: Pass purchase (passId: ${hasPassId})`);
      } else if (hasOtherIds.length > 0) {
        console.log(`   🔍 TYPE: Unknown - has IDs: ${hasOtherIds.join(', ')}`);
      } else {
        console.log(`   ❓ TYPE: Unknown - no ID metadata found`);
      }
    });
    
    // Look for patterns in metadata
    console.log('\n📊 METADATA ANALYSIS:');
    const allMetadataKeys = new Set();
    const classSessions = [];
    const passSessions = [];
    const unknownSessions = [];
    
    sessions.data.forEach(session => {
      if (session.metadata) {
        Object.keys(session.metadata).forEach(key => allMetadataKeys.add(key));
        
        if (session.metadata.classId) {
          classSessions.push(session);
        } else if (session.metadata.passId) {
          passSessions.push(session);
        } else {
          unknownSessions.push(session);
        }
      }
    });
    
    console.log(`\nAll metadata keys found: ${Array.from(allMetadataKeys).join(', ')}`);
    console.log(`Class sessions (with classId): ${classSessions.length}`);
    console.log(`Pass sessions (with passId): ${passSessions.length}`);
    console.log(`Unknown sessions: ${unknownSessions.length}`);
    
    // Show examples of each type
    if (classSessions.length > 0) {
      console.log(`\n📚 Example class session metadata:`);
      console.log(classSessions[0].metadata);
    }
    
    if (passSessions.length > 0) {
      console.log(`\n🎫 Example pass session metadata:`);
      console.log(passSessions[0].metadata);
    }
    
    if (unknownSessions.length > 0) {
      console.log(`\n❓ Example unknown session metadata:`);
      console.log(unknownSessions[0].metadata);
      
      // Try to guess what type it is based on line items
      if (unknownSessions[0].line_items?.data) {
        const itemDescription = unknownSessions[0].line_items.data[0]?.description || '';
        console.log(`   Item description: "${itemDescription}"`);
        
        if (itemDescription.toLowerCase().includes('pass') || 
            itemDescription.toLowerCase().includes('course') ||
            itemDescription.toLowerCase().includes('clip')) {
          console.log(`   🎫 LIKELY A PASS PURCHASE!`);
        } else if (itemDescription.toLowerCase().includes('class') ||
                   itemDescription.toLowerCase().includes('drop')) {
          console.log(`   📚 LIKELY A CLASS BOOKING!`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking Stripe metadata:', error);
  }
}

checkStripeMetadata();
