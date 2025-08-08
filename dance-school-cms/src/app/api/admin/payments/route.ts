import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { writeClient } from '@/lib/sanity';
import { stripe } from '@/lib/stripe';
import { isAdmin } from '@/lib/admin-utils';

// Get all payments/bookings for a tenant directly from Stripe
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const userIsAdmin = await isAdmin(userId);
    if (!userIsAdmin) {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get tenant from headers (set by middleware) - REQUIRED for security
    const tenantId = request.headers.get('x-tenant-id');
    
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 403 }
      );
    }

    // Get tenant with Stripe Connect account info
    const tenant = await writeClient.fetch(
      `*[_type == "tenant" && _id == $tenantId && status == "active"][0] {
        _id,
        schoolName,
        stripeConnect {
          accountId,
          accountStatus
        }
      }`,
      { tenantId }
    );
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Invalid or inactive tenant' },
        { status: 403 }
      );
    }

    // Check if tenant has Stripe Connect account
    if (!tenant.stripeConnect?.accountId) {
      return NextResponse.json({
        payments: [],
        monthlyRevenue: 0,
        totalRevenue: 0,
        monthlyPaymentsCount: 0,
        totalPaymentsCount: 0,
        message: 'Stripe Connect account not configured'
      });
    }

    const stripeAccountId = tenant.stripeConnect.accountId;
    console.log('🔍 Fetching payments from Stripe Connect account:', stripeAccountId);

    try {
      // Fetch charges from Stripe Connect account (charges have more detailed customer info)
      const charges = await stripe.charges.list({
        limit: 100, // Adjust as needed
      }, {
        stripeAccount: stripeAccountId,
      });

      console.log(`✅ Found ${charges.data.length} charges from Stripe`);

      // Also fetch checkout sessions for better metadata and line items
      const checkoutSessions = await stripe.checkout.sessions.list({
        limit: 100,
        expand: ['data.line_items']
      }, {
        stripeAccount: stripeAccountId,
      });

      // Create a map of payment intent IDs to checkout session data
      const sessionDataMap = new Map();
      checkoutSessions.data.forEach(session => {
        if (session.payment_intent) {
          sessionDataMap.set(session.payment_intent, {
            metadata: session.metadata || {},
            lineItems: session.line_items?.data || []
          });
        }
      });

      // Get user data from Sanity for name matching
      // First, collect all unique emails from charges
      const emails = Array.from(new Set(
        charges.data
          .map(charge => charge.billing_details?.email || charge.receipt_email)
          .filter(Boolean)
      ));

      // Also collect userIds from session metadata as fallback
      const userIds = Array.from(new Set(
        checkoutSessions.data
          .map(session => session.metadata?.userId)
          .filter(Boolean)
      ));

      let userMapByEmail = new Map();
      let userMapByClerkId = new Map();
      
      // Fetch users by email (primary method)
      if (emails.length > 0) {
        const usersByEmail = await writeClient.fetch(
          `*[_type == "user" && email in $emails] {
            clerkId,
            name,
            firstName,
            lastName,
            email
          }`,
          { emails }
        );
        
        usersByEmail.forEach((user: any) => {
          userMapByEmail.set(user.email, user);
        });
      }

      // Fetch users by clerkId (fallback method)
      if (userIds.length > 0) {
        const usersByClerkId = await writeClient.fetch(
          `*[_type == "user" && clerkId in $userIds] {
            clerkId,
            name,
            firstName,
            lastName,
            email
          }`,
          { userIds }
        );
        
        usersByClerkId.forEach((user: any) => {
          userMapByClerkId.set(user.clerkId, user);
        });
      }

      // Transform Stripe charges to our payment format
      const payments = charges.data.map((charge) => {
        // Get checkout session data if available
        const sessionData = sessionDataMap.get(charge.payment_intent) || { metadata: {}, lineItems: [] };
        const sessionMetadata = sessionData.metadata;
        const lineItems = sessionData.lineItems;
        
        // Get student name - prioritize email-based lookup over session metadata
        let studentName = 'Unknown Student';
        let foundUser = null;
        
        // First, try to match by email (most reliable)
        const customerEmail = charge.billing_details?.email || 
                            charge.metadata?.customerEmail || 
                            sessionMetadata?.customerEmail ||
                            charge.receipt_email;
        
        if (customerEmail) {
          foundUser = userMapByEmail.get(customerEmail);
          if (foundUser) {
            studentName = foundUser.name || 
                         (foundUser.firstName && foundUser.lastName ? `${foundUser.firstName} ${foundUser.lastName}` : '') ||
                         'Unknown Student';
            console.log(`✅ Found user by email ${customerEmail}: ${studentName}`);
          }
        }
        
        // Fallback to session metadata userId if email lookup failed
        if (!foundUser && sessionMetadata.userId) {
          foundUser = userMapByClerkId.get(sessionMetadata.userId);
          if (foundUser) {
            studentName = foundUser.name || 
                         (foundUser.firstName && foundUser.lastName ? `${foundUser.firstName} ${foundUser.lastName}` : '') ||
                         'Unknown Student';
            console.log(`⚠️ Found user by clerkId ${sessionMetadata.userId}: ${studentName}`);
          }
        }
        
        // Final fallback to Stripe billing details if no user found in Sanity
        if (!foundUser) {
          studentName = charge.billing_details?.name || 
                       charge.metadata?.customerName || 
                       sessionMetadata?.customerName ||
                       'Unknown Student';
          console.log(`🔄 Using Stripe billing name: ${studentName}`);
        }
        
        // customerEmail is already defined above, so we can reuse it
        const finalCustomerEmail = customerEmail || 'No email provided';

        // Extract pass/product name from line items first, then fallback to metadata
        let passName = 'Unknown Pass';
        if (lineItems.length > 0) {
          passName = lineItems[0].description || 'Unknown Pass';
          console.log(`   ✅ Found Pass Name from Line Item: ${passName}`);

          // Show all items purchased in this session
          lineItems.forEach((item: any, index: number) => {
            console.log(`      Item ${index + 1}: ${item.description} (Qty: ${item.quantity})`);
          });
        } else {
          console.log(`   ❌ No line items found`);
          passName = charge.metadata?.passName || 
                    sessionMetadata?.passName ||
                    charge.description || 
                    'Unknown Pass';
          console.log(`   Fallback Pass Name: ${passName}`);
        }

        // Determine payment method
        let paymentMethod = 'card';
        if (charge.payment_method_details) {
          paymentMethod = charge.payment_method_details.type || 'card';
        }

        // Convert status
        let status = 'pending';
        if (charge.status === 'succeeded') {
          status = 'completed';
        } else if (charge.status === 'pending') {
          status = 'pending';
        } else if (charge.status === 'failed') {
          status = 'failed';
        }

        return {
          _id: charge.id,
          amount: charge.amount / 100, // Convert from cents
          currency: charge.currency.toUpperCase(),
          status,
          paymentStatus: status, // Add paymentStatus field that PaymentsTable expects
          customerName: studentName,
          customerEmail: finalCustomerEmail,
          email: finalCustomerEmail, // Add email field that PaymentsTable expects
          passName,
          createdAt: new Date(charge.created * 1000).toISOString(),
          paymentMethod,
          paymentId: charge.id,
          type: 'subscription', // Change to 'subscription' to match PaymentsTable logic
          // Add user object that PaymentsTable expects
          user: {
            _id: foundUser?.clerkId || sessionMetadata.userId || charge.id,
            name: studentName,
            email: finalCustomerEmail
          },
          // Add pass object that PaymentsTable expects
          pass: {
            _id: sessionMetadata.passId || charge.id,
            name: passName,
            type: sessionMetadata.passType || 'pass'
          },
          stripeData: {
            id: charge.id,
            status: charge.status,
            amount: charge.amount,
            currency: charge.currency,
            created: charge.created,
            metadata: charge.metadata,
            billing_details: charge.billing_details,
            sessionMetadata: sessionMetadata,
            lineItems: lineItems
          }
        };
      });

      // Sort by creation date (newest first)
      payments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Calculate monthly revenue (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthlyPayments = payments.filter((payment: any) => {
        const paymentDate = new Date(payment.createdAt);
        return paymentDate >= startOfMonth && 
               paymentDate <= endOfMonth && 
               payment.status === 'completed';
      });

      const monthlyRevenue = monthlyPayments.reduce((total: number, payment: any) => {
        return total + (payment.amount || 0);
      }, 0);

      // Calculate total revenue (all completed payments)
      const totalRevenue = payments
        .filter((payment: any) => payment.status === 'completed')
        .reduce((total: number, payment: any) => total + (payment.amount || 0), 0);

      console.log(`💰 Monthly Revenue: ${monthlyRevenue} NOK`);
      console.log(`💰 Total Revenue: ${totalRevenue} NOK`);
      console.log(`📊 Monthly Payments: ${monthlyPayments.length}`);
      console.log(`📊 Total Completed Payments: ${payments.filter((p: any) => p.status === 'completed').length}`);

      return NextResponse.json({ 
        payments,
        monthlyRevenue,
        totalRevenue,
        monthlyPaymentsCount: monthlyPayments.length,
        totalPaymentsCount: payments.filter((p: any) => p.status === 'completed').length,
        source: 'stripe_connect'
      });

    } catch (stripeError: any) {
      console.error('❌ Stripe API Error:', stripeError);
      
      // If Stripe fails, fall back to Sanity data but log the issue
      console.log('⚠️ Falling back to Sanity data due to Stripe error');
      
      // Fallback to original Sanity-based approach
      const subscriptionsQuery = `*[_type == "subscription" && tenant._ref == $tenantId] | order(_createdAt desc) {
        _id,
        purchasePrice,
        "currency": "NOK",
        isActive,
        stripePaymentId,
        passName,
        type,
        "customerName": user->name,
        "customerEmail": user->email,
        "createdAt": _createdAt,
        "paymentId": stripePaymentId,
        "paymentMethod": select(
          stripePaymentId match "pi_*" => "card",
          stripePaymentId match "vipps_*" => "vipps",
          "stripe"
        ),
        user->{
          _id,
          name,
          email,
          firstName,
          lastName
        }
      }`;

      const subscriptions = await writeClient.fetch(subscriptionsQuery, { tenantId });

      const payments = subscriptions.map((subscription: any) => {
        const customerName = subscription.customerName || subscription.user?.name || 'Unknown User';
        const customerEmail = subscription.customerEmail || subscription.user?.email || 'No email provided';
        const passName = subscription.passName || 'Unknown Pass';
        const status = subscription.isActive ? 'completed' : 'pending';
        
        return {
          _id: subscription._id,
          amount: subscription.purchasePrice || 0,
          currency: subscription.currency || 'NOK',
          status,
          paymentStatus: status,
          customerName,
          customerEmail,
          email: customerEmail,
          passName,
          createdAt: subscription.createdAt || new Date().toISOString(),
          paymentMethod: subscription.paymentMethod || 'stripe',
          paymentId: subscription.paymentId || subscription.stripePaymentId || null,
          type: 'subscription',
          // Add user object that PaymentsTable expects
          user: {
            _id: subscription.user?._id || subscription._id,
            name: customerName,
            email: customerEmail
          },
          // Add pass object that PaymentsTable expects
          pass: {
            _id: subscription._id,
            name: passName,
            type: subscription.type || 'pass'
          }
        };
      });

      // Calculate revenue from fallback data
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyPayments = payments.filter((payment: any) => {
        const paymentDate = new Date(payment.createdAt);
        return paymentDate >= startOfMonth && payment.status === 'completed';
      });

      const monthlyRevenue = monthlyPayments.reduce((total: number, payment: any) => total + (payment.amount || 0), 0);
      const totalRevenue = payments.filter((p: any) => p.status === 'completed').reduce((total: number, payment: any) => total + (payment.amount || 0), 0);

      return NextResponse.json({ 
        payments,
        monthlyRevenue,
        totalRevenue,
        monthlyPaymentsCount: monthlyPayments.length,
        totalPaymentsCount: payments.filter((p: any) => p.status === 'completed').length,
        source: 'sanity_fallback',
        stripeError: stripeError.message
      });
    }

  } catch (error) {
    console.error('❌ Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
