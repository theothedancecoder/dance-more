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

      // Transform Stripe charges to our payment format
      const payments = charges.data.map((charge) => {
        // Extract customer info from billing details or metadata
        const customerName = charge.billing_details?.name || 
                           charge.metadata?.customerName || 
                           'Unknown Customer';
        
        const customerEmail = charge.billing_details?.email || 
                            charge.metadata?.customerEmail || 
                            charge.receipt_email || 
                            'No email provided';

        // Extract pass/product name from metadata or description
        const passName = charge.metadata?.passName || 
                        charge.metadata?.productName ||
                        charge.description || 
                        'Unknown Pass';

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
          customerName,
          customerEmail,
          passName,
          createdAt: new Date(charge.created * 1000).toISOString(),
          paymentMethod,
          paymentId: charge.id,
          type: 'Pass Purchase',
          stripeData: {
            id: charge.id,
            status: charge.status,
            amount: charge.amount,
            currency: charge.currency,
            created: charge.created,
            metadata: charge.metadata,
            billing_details: charge.billing_details
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

      const payments = subscriptions.map((subscription: any) => ({
        _id: subscription._id,
        amount: subscription.purchasePrice || 0,
        currency: subscription.currency || 'NOK',
        status: subscription.isActive ? 'completed' : 'pending',
        customerName: subscription.customerName || subscription.user?.name || 'Unknown User',
        customerEmail: subscription.customerEmail || subscription.user?.email || 'No email provided',
        passName: subscription.passName || 'Unknown Pass',
        createdAt: subscription.createdAt || new Date().toISOString(),
        paymentMethod: subscription.paymentMethod || 'stripe',
        paymentId: subscription.paymentId || subscription.stripePaymentId || null,
        type: 'Pass Purchase'
      }));

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
