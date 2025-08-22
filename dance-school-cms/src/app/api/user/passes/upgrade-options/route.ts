import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { sanityClient } from '@/lib/sanity';
import { getServerUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const headersList = await headers();
    const tenantSlug = headersList.get('x-tenant-slug');
    
    if (!tenantSlug) {
      return NextResponse.json({ error: 'Tenant slug is required' }, { status: 400 });
    }

    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json({ error: 'Subscription ID is required' }, { status: 400 });
    }

    // Get the current subscription details
    const currentSubscription = await sanityClient.fetch(`
      *[_type == "subscription" && _id == $subscriptionId && user->clerkId == $userId][0] {
        _id,
        passName,
        type,
        startDate,
        endDate,
        isActive,
        amount,
        currency,
        passId,
        tenant->{_id, slug}
      }
    `, { subscriptionId, userId: user.id });

    if (!currentSubscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Get the original pass details
    let currentPassPrice = 0;
    if (currentSubscription.passId) {
      const currentPass = await sanityClient.fetch(`
        *[_type == "pass" && _id == $passId][0] {
          price
        }
      `, { passId: currentSubscription.passId });
      
      if (currentPass) {
        currentPassPrice = currentPass.price;
      }
    }

    // If we don't have the pass price from the pass document, use the subscription amount
    if (currentPassPrice === 0 && currentSubscription.amount) {
      currentPassPrice = currentSubscription.amount / 100; // Convert from øre to NOK
    }

    // Get tenant information
    const tenant = await sanityClient.fetch(`
      *[_type == "tenant" && slug.current == $tenantSlug][0] {
        _id,
        schoolName,
        slug
      }
    `, { tenantSlug });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    // Get all available passes for this tenant that are more expensive than current pass
    const availablePasses = await sanityClient.fetch(`
      *[_type == "pass" && tenant._ref == $tenantId && isActive == true && price > $currentPrice] | order(price asc) {
        _id,
        name,
        type,
        price,
        validityType,
        validityDays,
        expiryDate,
        classesLimit,
        description,
        features,
        isActive
      }
    `, { 
      tenantId: tenant._id, 
      currentPrice: currentPassPrice 
    });

    // Filter out passes that wouldn't make sense as upgrades
    const upgradeOptions = availablePasses.filter((pass: any) => {
      // Only allow upgrades to passes that are actually better
      const priceDifference = pass.price - currentPassPrice;
      
      // Must be at least 50 NOK more expensive to be worth upgrading
      if (priceDifference < 50) {
        return false;
      }

      // Don't allow downgrading from unlimited to limited passes
      if (currentSubscription.type === 'unlimited' && pass.type !== 'unlimited') {
        return false;
      }

      // Don't allow upgrading from multi-pass to single class
      if (currentSubscription.type === 'multi' && pass.type === 'single') {
        return false;
      }

      return true;
    });

    return NextResponse.json({
      upgradeOptions,
      currentSubscription: {
        id: currentSubscription._id,
        passName: currentSubscription.passName,
        type: currentSubscription.type,
        price: currentPassPrice
      }
    });

  } catch (error) {
    console.error('Error fetching upgrade options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upgrade options' },
      { status: 500 }
    );
  }
}
