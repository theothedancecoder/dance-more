import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth';
import { sanityClient } from '@/lib/sanity';
import { VIPPS_CONFIG, getVippsAccessToken, createVippsPayment } from '@/lib/vipps';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId, successUrl, cancelUrl } = await request.json();

    if (!classId) {
      return NextResponse.json({ error: 'Class ID is required' }, { status: 400 });
    }

    // Fetch class details from Sanity
    const classData = await sanityClient.fetch(`
      *[_type == "class" && _id == $classId][0] {
        _id,
        title,
        price,
        duration,
        instructor->{
          name
        }
      }
    `, { classId });

    if (!classData) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 });
    }

    // Generate unique order ID
    const orderId = `class-${classData._id}-${Date.now()}`;
    
    // Get Vipps access token
    const accessToken = await getVippsAccessToken();

    // Create Vipps payment
    const description = `${classData.title} - Dance class with ${classData.instructor?.name || 'instructor'}`;
    const vippsPayment = await createVippsPayment(
      accessToken,
      orderId,
      classData.price,
      description,
      successUrl || `${request.nextUrl.origin}/payment/success?orderId=${orderId}`,
      cancelUrl || `${request.nextUrl.origin}/classes/${classData._id}`
    );

    // Store payment info in database (you might want to implement this)
    // await db.createPayment({
    //   orderId: vippsPayment.orderId,
    //   userId: user.id,
    //   classId: classData._id,
    //   amount: classData.price,
    //   currency: VIPPS_CONFIG.currency,
    //   paymentMethod: 'vipps',
    //   status: 'pending',
    //   metadata: {
    //     userEmail: user.email,
    //     className: classData.title,
    //   },
    // });

    return NextResponse.json({ 
      orderId: vippsPayment.orderId, 
      url: vippsPayment.url 
    });
  } catch (error) {
    console.error('Vipps checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create Vipps payment' },
      { status: 500 }
    );
  }
}
