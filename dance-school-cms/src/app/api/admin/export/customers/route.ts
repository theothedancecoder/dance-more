import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { createClient } from '@sanity/client';

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  token: process.env.SANITY_API_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant slug from headers (set by the frontend)
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant not specified' }, { status: 400 });
    }

    // First, get the tenant ID from the slug
    const tenant = await sanityClient.fetch(`
      *[_type == "tenant" && slug.current == $tenantSlug][0] {
        _id
      }
    `, { tenantSlug });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const filterType = searchParams.get('filter') || 'all'; // 'all', 'active', 'expired'
    const passType = searchParams.get('passType') || 'all';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build the query based on filters - now tenant-specific
    let query = `*[_type == "subscription" && tenant._ref == $tenantId]`;
    let queryParams: any = { tenantId: tenant._id };

    // Add date filters if provided
    if (startDate && endDate) {
      query += ` && _createdAt >= $startDate && _createdAt <= $endDate`;
      queryParams.startDate = startDate;
      queryParams.endDate = endDate;
    }

    // Complete the query with data selection
    query += ` | order(_createdAt desc) {
      _id,
      passName,
      passId,
      type,
      startDate,
      endDate,
      isActive,
      classesUsed,
      classesLimit,
      stripeSessionId,
      paymentStatus,
      amount,
      currency,
      _createdAt,
      user->{
        _id,
        name,
        email,
        clerkId
      },
      "remainingDays": round((dateTime(endDate) - dateTime(now())) / 86400),
      "isExpired": dateTime(endDate) < dateTime(now())
    }`;

    const subscriptions = await sanityClient.fetch(query, queryParams);

    // Apply additional filters
    let filteredSubscriptions = subscriptions;

    // Filter by active/expired status
    if (filterType === 'active') {
      filteredSubscriptions = subscriptions.filter((sub: any) => 
        sub.isActive && !sub.isExpired
      );
    } else if (filterType === 'expired') {
      filteredSubscriptions = subscriptions.filter((sub: any) => 
        sub.isExpired || !sub.isActive
      );
    }

    // Filter by pass type
    if (passType !== 'all') {
      filteredSubscriptions = filteredSubscriptions.filter((sub: any) => 
        sub.type === passType
      );
    }

    // Convert to CSV format
    const csvHeaders = [
      'Email',
      'Name', 
      'Pass Name',
      'Pass Type',
      'Purchase Date',
      'Start Date',
      'Expiry Date',
      'Status',
      'Classes Used',
      'Classes Limit',
      'Amount Paid',
      'Currency',
      'Payment Status',
      'Stripe Session ID',
      'Remaining Days'
    ];

    const csvRows = filteredSubscriptions.map((subscription: any) => [
      subscription.user?.email || 'N/A',
      subscription.user?.name || 'N/A',
      subscription.passName || 'N/A',
      subscription.type || 'N/A',
      subscription._createdAt ? new Date(subscription._createdAt).toLocaleDateString() : 'N/A',
      subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : 'N/A',
      subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A',
      subscription.isExpired ? 'Expired' : (subscription.isActive ? 'Active' : 'Inactive'),
      subscription.classesUsed || 0,
      subscription.classesLimit || 'Unlimited',
      subscription.amount ? (subscription.amount / 100).toFixed(2) : 'N/A',
      subscription.currency?.toUpperCase() || 'NOK',
      subscription.paymentStatus || 'N/A',
      subscription.stripeSessionId || 'N/A',
      subscription.remainingDays || 0
    ]);

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map((row: any[]) => 
        row.map((field: any) => 
          // Escape commas and quotes in CSV fields
          typeof field === 'string' && (field.includes(',') || field.includes('"')) 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',')
      )
    ].join('\n');

    // Return CSV as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="customers-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error exporting customers:', error);
    return NextResponse.json(
      { error: 'Failed to export customers' },
      { status: 500 }
    );
  }
}
