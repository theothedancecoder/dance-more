import { NextRequest, NextResponse } from 'next/server';
import { sanityClient } from '@/lib/sanity';
import { getVippsAccessToken, getVippsPaymentDetails, mapVippsStatusToPaymentStatus } from '@/lib/vipps';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Vipps webhook received:', body);

    const { orderId, transactionInfo } = body;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Get access token and fetch payment details
    const accessToken = await getVippsAccessToken();
    const paymentDetails = await getVippsPaymentDetails(accessToken, orderId);

    console.log('Vipps payment details:', paymentDetails);

    // Extract class ID from order ID (format: class-{classId}-{timestamp})
    const classIdMatch = orderId.match(/^class-(.+)-\d+$/);
    if (!classIdMatch) {
      console.error('Invalid order ID format:', orderId);
      return NextResponse.json({ error: 'Invalid order ID format' }, { status: 400 });
    }

    const classId = classIdMatch[1];

    // Determine payment status
    const vippsStatus = paymentDetails.transactionInfo.status;
    const { paymentStatus, bookingStatus } = mapVippsStatusToPaymentStatus(vippsStatus);

    // Create or update booking in Sanity
    if (paymentStatus === 'completed') {
      try {
        // Create booking document in Sanity
        const booking = await sanityClient.create({
          _type: 'booking',
          class: {
            _type: 'reference',
            _ref: classId,
          },
          paymentId: paymentDetails.transactionInfo.transactionId,
          paymentStatus: 'completed',
          amount: paymentDetails.transactionInfo.amount / 100, // Convert from øre to NOK
          currency: 'NOK',
          paymentMethod: 'vipps',
          status: 'confirmed',
          bookingDate: new Date().toISOString(),
          // Note: We don't have user info from Vipps webhook, 
          // so we'll need to handle user association differently
        });

        console.log('Booking created in Sanity:', booking);
      } catch (error) {
        console.error('Error creating booking in Sanity:', error);
        // Don't fail the webhook if Sanity update fails
      }
    }

    // Store payment info in local database if needed
    // This is commented out since we're using Sanity as the primary database
    // await db.createPayment({
    //   orderId: paymentDetails.orderId,
    //   paymentId: paymentDetails.transactionInfo.transactionId,
    //   amount: paymentDetails.transactionInfo.amount / 100,
    //   currency: 'NOK',
    //   paymentMethod: 'vipps',
    //   status: paymentStatus,
    //   metadata: {
    //     vippsStatus: vippsStatus,
    //     transactionId: paymentDetails.transactionInfo.transactionId,
    //   },
    // });

    return NextResponse.json({ 
      success: true, 
      orderId,
      status: paymentStatus 
    });
  } catch (error) {
    console.error('Vipps webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Handle GET requests for webhook verification (if needed by Vipps)
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'Vipps webhook endpoint is active' });
}
