import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { writeClient } from '@/lib/sanity';
import { isAdmin } from '@/lib/admin-utils';

// Get all payments/bookings for a tenant
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

    // Validate tenant exists and is active
    const tenant = await writeClient.fetch(
      `*[_type == "tenant" && _id == $tenantId && status == "active"][0]`,
      { tenantId }
    );
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Invalid or inactive tenant' },
        { status: 403 }
      );
    }
    
    // Fetch both bookings and subscriptions from Sanity
    const bookingsQuery = `*[_type == "booking" && tenant._ref == $tenantId] | order(_createdAt desc) {
      _id,
      "amount": class->price,
      "currency": "NOK",
      paymentStatus,
      "status": paymentStatus,
      "customerName": user->name,
      "customerEmail": user->email,
      "passName": class->title,
      "createdAt": _createdAt,
      paymentId,
      "paymentMethod": select(
        paymentId match "pi_*" => "card",
        paymentId match "vipps_*" => "vipps",
        "card"
      ),
      "type": "booking",
      class->{
        _id,
        title,
        price
      },
      user->{
        _id,
        name,
        email
      },
      tenant->{
        _id,
        schoolName
      }
    }`;

    const subscriptionsQuery = `*[_type == "subscription" && tenant._ref == $tenantId] | order(_createdAt desc) {
      _id,
      purchasePrice,
      "currency": "NOK",
      isActive,
      stripePaymentId,
      passName,
      type,
      user,
      "customerName": user->name,
      "customerEmail": user->email,
      "createdAt": _createdAt,
      "paymentId": stripePaymentId,
      "paymentMethod": select(
        stripePaymentId match "pi_*" => "card",
        stripePaymentId match "vipps_*" => "vipps",
        "stripe"
      ),
      "type": "subscription",
      user->{
        _id,
        name,
        email,
        firstName,
        lastName,
        clerkId
      },
      tenant->{
        _id,
        schoolName
      }
    }`;

    const [bookings, subscriptions] = await Promise.all([
      writeClient.fetch(bookingsQuery, { tenantId }),
      writeClient.fetch(subscriptionsQuery, { tenantId })
    ]);

    // Debug: Log detailed subscription data
    console.log('🔍 ADMIN PAYMENTS DEBUG - Raw subscriptions data:');
    console.log(`Found ${subscriptions.length} subscriptions`);
    
    if (subscriptions.length > 0) {
      subscriptions.slice(0, 3).forEach((sub: any, i: number) => {
        console.log(`\n--- Subscription ${i + 1} ---`);
        console.log('ID:', sub._id);
        console.log('Pass Name:', sub.passName);
        console.log('Purchase Price:', sub.purchasePrice);
        console.log('Customer Name (direct):', sub.customerName);
        console.log('Customer Email (direct):', sub.customerEmail);
        console.log('User object:', sub.user ? 'EXISTS' : 'NULL');
        if (sub.user) {
          console.log('User ID:', sub.user._id);
          console.log('User Name:', sub.user.name);
          console.log('User Email:', sub.user.email);
        }
        console.log('Created At:', sub.createdAt);
      });
    }

    // Transform bookings to payment format
    const bookingPayments = bookings.map((booking: any) => ({
      _id: booking._id,
      amount: booking.amount || 0,
      currency: booking.currency || 'NOK',
      status: booking.paymentStatus === 'paid' ? 'completed' : 
              booking.paymentStatus === 'pending' ? 'pending' : 'failed',
      customerName: booking.customerName || booking.user?.name || 'Unknown User',
      customerEmail: booking.customerEmail || booking.user?.email || 'No email provided',
      passName: booking.passName || booking.class?.title || 'Unknown Class',
      createdAt: booking.createdAt || new Date().toISOString(),
      paymentMethod: booking.paymentMethod || 'card',
      paymentId: booking.paymentId || null,
      type: 'Class Booking'
    }));

    // Transform subscriptions to payment format
    console.log('\n🔄 TRANSFORMING SUBSCRIPTIONS TO PAYMENT FORMAT:');
    const subscriptionPayments = subscriptions.map((subscription: any) => {
      const transformed = {
        _id: subscription._id,
        amount: subscription.purchasePrice || 0,
        currency: subscription.currency || 'NOK',
        status: subscription.isActive ? 'completed' : 'pending',
        customerName: subscription.customerName || subscription.user?.name || 
                     (subscription.user?.firstName && subscription.user?.lastName 
                      ? `${subscription.user.firstName} ${subscription.user.lastName}` 
                      : 'Unknown User'),
        customerEmail: subscription.customerEmail || subscription.user?.email || 'No email provided',
        passName: subscription.passName || 
                  (subscription.type ? `${subscription.type.charAt(0).toUpperCase() + subscription.type.slice(1)} Pass` : 'Unknown Pass'),
        createdAt: subscription.createdAt || new Date().toISOString(),
        paymentMethod: subscription.paymentMethod || 'stripe',
        paymentId: subscription.paymentId || subscription.stripePaymentId || null,
        type: 'Pass Purchase'
      };
      
      // Debug first few transformations
      if (subscriptions.indexOf(subscription) < 3) {
        console.log(`\n--- Transformed Payment ${subscriptions.indexOf(subscription) + 1} ---`);
        console.log('Original customerName:', subscription.customerName);
        console.log('Original user?.name:', subscription.user?.name);
        console.log('Final customerName:', transformed.customerName);
        console.log('Original passName:', subscription.passName);
        console.log('Final passName:', transformed.passName);
      }
      
      return transformed;
    });

    // Combine and sort all payments by creation date
    const allPayments = [...bookingPayments, ...subscriptionPayments];
    const payments = allPayments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Calculate monthly revenue (current month)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const monthlyPayments = payments.filter(payment => {
      const paymentDate = new Date(payment.createdAt);
      return paymentDate >= startOfMonth && 
             paymentDate <= endOfMonth && 
             payment.status === 'completed';
    });

    const monthlyRevenue = monthlyPayments.reduce((total, payment) => {
      return total + (payment.amount || 0);
    }, 0);

    // Calculate total revenue (all completed payments)
    const totalRevenue = payments
      .filter(payment => payment.status === 'completed')
      .reduce((total, payment) => total + (payment.amount || 0), 0);

    return NextResponse.json({ 
      payments,
      monthlyRevenue,
      totalRevenue,
      monthlyPaymentsCount: monthlyPayments.length,
      totalPaymentsCount: payments.filter(p => p.status === 'completed').length
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
