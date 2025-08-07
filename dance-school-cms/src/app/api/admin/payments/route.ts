import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanity';
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
    const tenant = await sanityClient.fetch(
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
      amount,
      currency,
      status,
      stripePaymentIntentId,
      "customerName": user->name,
      "customerEmail": user->email,
      "passName": pass->name,
      "createdAt": _createdAt,
      "paymentId": stripePaymentIntentId,
      "paymentMethod": select(
        stripePaymentIntentId match "pi_*" => "card",
        stripePaymentIntentId match "vipps_*" => "vipps",
        "stripe"
      ),
      "type": "subscription",
      pass->{
        _id,
        name,
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

    const [bookings, subscriptions] = await Promise.all([
      sanityClient.fetch(bookingsQuery, { tenantId }),
      sanityClient.fetch(subscriptionsQuery, { tenantId })
    ]);

    // Transform bookings to payment format
    const bookingPayments = bookings.map((booking: any) => ({
      _id: booking._id,
      amount: booking.amount || 0,
      currency: booking.currency || 'NOK',
      status: booking.paymentStatus === 'paid' ? 'completed' : 
              booking.paymentStatus === 'pending' ? 'pending' : 'failed',
      customerName: booking.customerName || 'Unknown',
      customerEmail: booking.customerEmail || 'unknown@example.com',
      passName: booking.passName || 'Unknown Class',
      createdAt: booking.createdAt || new Date().toISOString(),
      paymentMethod: booking.paymentMethod || 'card',
      paymentId: booking.paymentId || null,
      type: 'Class Booking'
    }));

    // Transform subscriptions to payment format
    const subscriptionPayments = subscriptions.map((subscription: any) => ({
      _id: subscription._id,
      amount: subscription.amount || subscription.pass?.price || 0,
      currency: subscription.currency || 'NOK',
      status: subscription.status === 'active' ? 'completed' : 
              subscription.status === 'pending' ? 'pending' : 
              subscription.status ? subscription.status : 'pending',
      customerName: subscription.customerName || subscription.user?.name || 'Unknown',
      customerEmail: subscription.customerEmail || subscription.user?.email || 'unknown@example.com',
      passName: subscription.passName || subscription.pass?.name || 'Unknown Pass',
      createdAt: subscription.createdAt || new Date().toISOString(),
      paymentMethod: subscription.paymentMethod || 'stripe',
      paymentId: subscription.paymentId || subscription.stripePaymentIntentId || null,
      type: 'Pass Purchase'
    }));

    // Combine and sort all payments by creation date
    const allPayments = [...bookingPayments, ...subscriptionPayments];
    const payments = allPayments.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
