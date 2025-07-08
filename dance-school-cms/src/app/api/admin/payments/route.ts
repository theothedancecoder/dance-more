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
    
    // Fetch tenant-specific bookings/payments from Sanity
    const query = `*[_type == "booking" && tenant._ref == $tenantId] | order(_createdAt desc) {
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

    const bookings = await sanityClient.fetch(query, { tenantId });

    // Transform bookings to payment format
    const payments = bookings.map((booking: any) => ({
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
      paymentId: booking.paymentId || null
    }));

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
