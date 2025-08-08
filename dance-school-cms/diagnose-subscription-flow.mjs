import { createClient } from '@sanity/client';
import 'dotenv/config';

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2023-05-03',
  useCdn: false
});

async function diagnoseSubscriptionFlow() {
  console.log('🔍 COMPREHENSIVE SUBSCRIPTION FLOW DIAGNOSIS');
  console.log('='.repeat(60));

  try {
    // 1. Check recent Stripe sessions (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log('\n📊 1. RECENT STRIPE SESSIONS (Last 24 hours)');
    console.log('-'.repeat(50));
    
    const recentSessions = await client.fetch(`
      *[_type == "subscription" && _createdAt >= "${yesterday.toISOString()}"] | order(_createdAt desc) {
        _id,
        _createdAt,
        stripeSessionId,
        stripePaymentId,
        passName,
        passId,
        type,
        isActive,
        user->{_id, name, email},
        tenant->{_id, schoolName, slug}
      }
    `);

    console.log(`Found ${recentSessions.length} recent subscriptions:`);
    recentSessions.forEach((sub, i) => {
      console.log(`\n${i + 1}. Subscription ${sub._id}`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
      console.log(`   User: ${sub.user?.name || sub.user?.email || sub.user?._id || 'MISSING USER'}`);
      console.log(`   Tenant: ${sub.tenant?.schoolName || 'MISSING TENANT'}`);
      console.log(`   Pass Name: ${sub.passName || 'NULL'}`);
      console.log(`   Pass ID: ${sub.passId || 'NULL'}`);
      console.log(`   Type: ${sub.type || 'NULL'}`);
      console.log(`   Stripe Session: ${sub.stripeSessionId || 'NULL'}`);
      console.log(`   Stripe Payment: ${sub.stripePaymentId || 'NULL'}`);
      console.log(`   Active: ${sub.isActive}`);
    });

    // 2. Check for orphaned Stripe sessions (sessions without subscriptions)
    console.log('\n\n🔍 2. CHECKING FOR ORPHANED STRIPE SESSIONS');
    console.log('-'.repeat(50));
    
    // Get all unique session IDs from subscriptions
    const sessionIds = recentSessions
      .map(sub => sub.stripeSessionId)
      .filter(Boolean);
    
    console.log(`Found ${sessionIds.length} session IDs in subscriptions`);
    
    // 3. Analyze pass name issues
    console.log('\n\n📝 3. PASS NAME ANALYSIS');
    console.log('-'.repeat(50));
    
    const passNameIssues = await client.fetch(`
      *[_type == "subscription" && (passName == null || passName == "")] {
        _id,
        _createdAt,
        passId,
        type,
        user->{_id, name, email},
        tenant->{_id, schoolName},
        "originalPass": *[_type == "pass" && _id == ^.passId][0]{_id, name, type, tenant}
      }
    `);

    console.log(`Found ${passNameIssues.length} subscriptions with null/empty pass names:`);
    passNameIssues.forEach((sub, i) => {
      console.log(`\n${i + 1}. Subscription ${sub._id}`);
      console.log(`   User: ${sub.user?.name || sub.user?.email || 'Unknown'}`);
      console.log(`   Tenant: ${sub.tenant?.schoolName || 'Unknown'}`);
      console.log(`   Pass ID: ${sub.passId || 'NULL'}`);
      console.log(`   Original Pass Found: ${sub.originalPass ? 'YES' : 'NO'}`);
      if (sub.originalPass) {
        console.log(`   Original Pass Name: ${sub.originalPass.name}`);
        console.log(`   Original Pass Tenant: ${sub.originalPass.tenant?._ref || 'NULL'}`);
        console.log(`   Tenant Match: ${sub.originalPass.tenant?._ref === sub.tenant?._id ? 'YES' : 'NO'}`);
      }
    });

    // 4. Check webhook processing issues
    console.log('\n\n⚡ 4. WEBHOOK PROCESSING ANALYSIS');
    console.log('-'.repeat(50));
    
    // Look for subscriptions created very close together (potential duplicates)
    const duplicateCheck = await client.fetch(`
      *[_type == "subscription"] {
        _id,
        _createdAt,
        stripeSessionId,
        user->{_id},
        tenant->{_id}
      } | order(_createdAt desc)
    `);

    const sessionGroups = {};
    duplicateCheck.forEach(sub => {
      if (sub.stripeSessionId) {
        if (!sessionGroups[sub.stripeSessionId]) {
          sessionGroups[sub.stripeSessionId] = [];
        }
        sessionGroups[sub.stripeSessionId].push(sub);
      }
    });

    const duplicates = Object.entries(sessionGroups).filter(([_, subs]) => subs.length > 1);
    console.log(`Found ${duplicates.length} Stripe sessions with multiple subscriptions:`);
    
    duplicates.forEach(([sessionId, subs]) => {
      console.log(`\nSession ${sessionId}:`);
      subs.forEach((sub, i) => {
        console.log(`  ${i + 1}. ${sub._id} (${new Date(sub._createdAt).toLocaleString()})`);
      });
    });

    // 5. Check user-tenant relationships
    console.log('\n\n👥 5. USER-TENANT RELATIONSHIP ANALYSIS');
    console.log('-'.repeat(50));
    
    const userTenantIssues = await client.fetch(`
      *[_type == "subscription" && (!defined(user) || !defined(tenant))] {
        _id,
        _createdAt,
        "hasUser": defined(user),
        "hasTenant": defined(tenant),
        user,
        tenant
      }
    `);

    console.log(`Found ${userTenantIssues.length} subscriptions with missing user/tenant references:`);
    userTenantIssues.forEach((sub, i) => {
      console.log(`\n${i + 1}. Subscription ${sub._id}`);
      console.log(`   Has User: ${sub.hasUser}`);
      console.log(`   Has Tenant: ${sub.hasTenant}`);
      console.log(`   User Ref: ${sub.user?._ref || 'NULL'}`);
      console.log(`   Tenant Ref: ${sub.tenant?._ref || 'NULL'}`);
    });

    // 6. Check for active subscriptions that should be showing
    console.log('\n\n✅ 6. ACTIVE SUBSCRIPTIONS THAT SHOULD BE VISIBLE');
    console.log('-'.repeat(50));
    
    const now = new Date();
    const activeSubscriptions = await client.fetch(`
      *[_type == "subscription" && isActive == true && dateTime(endDate) > dateTime("${now.toISOString()}")] {
        _id,
        _createdAt,
        passName,
        type,
        startDate,
        endDate,
        user->{_id, name, email},
        tenant->{_id, schoolName, slug},
        "daysRemaining": round((dateTime(endDate) - dateTime("${now.toISOString()}")) / 86400)
      } | order(_createdAt desc)
    `);

    console.log(`Found ${activeSubscriptions.length} active subscriptions:`);
    activeSubscriptions.forEach((sub, i) => {
      console.log(`\n${i + 1}. ${sub._id}`);
      console.log(`   User: ${sub.user?.name || sub.user?.email || 'Unknown'}`);
      console.log(`   Tenant: ${sub.tenant?.schoolName} (${sub.tenant?.slug})`);
      console.log(`   Pass Name: ${sub.passName || 'NULL'}`);
      console.log(`   Type: ${sub.type}`);
      console.log(`   Days Remaining: ${sub.daysRemaining}`);
      console.log(`   Created: ${new Date(sub._createdAt).toLocaleString()}`);
    });

    // 7. Summary and recommendations
    console.log('\n\n📋 7. DIAGNOSIS SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`\n🔢 STATISTICS:`);
    console.log(`   Recent subscriptions (24h): ${recentSessions.length}`);
    console.log(`   Null pass names: ${passNameIssues.length}`);
    console.log(`   Duplicate sessions: ${duplicates.length}`);
    console.log(`   Missing user/tenant refs: ${userTenantIssues.length}`);
    console.log(`   Currently active: ${activeSubscriptions.length}`);

    console.log(`\n🚨 CRITICAL ISSUES FOUND:`);
    if (passNameIssues.length > 0) {
      console.log(`   ❌ ${passNameIssues.length} subscriptions have null pass names`);
    }
    if (duplicates.length > 0) {
      console.log(`   ❌ ${duplicates.length} Stripe sessions created multiple subscriptions`);
    }
    if (userTenantIssues.length > 0) {
      console.log(`   ❌ ${userTenantIssues.length} subscriptions missing user/tenant references`);
    }

    console.log(`\n💡 NEXT STEPS:`);
    console.log(`   1. Check server logs for webhook failures`);
    console.log(`   2. Verify Stripe webhook endpoint is receiving events`);
    console.log(`   3. Test the complete purchase flow end-to-end`);
    console.log(`   4. Run the fix-null-pass-names.mjs script if needed`);

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the diagnosis
diagnoseSubscriptionFlow()
  .then(() => {
    console.log('\n✅ Diagnosis completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Diagnosis failed:', error);
    process.exit(1);
  });
