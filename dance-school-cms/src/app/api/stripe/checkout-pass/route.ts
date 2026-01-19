import { NextRequest, NextResponse } from 'next/server';
import { stripeConnect, STRIPE_CONFIG } from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanity';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant from headers
    const tenantId = request.headers.get('x-tenant-id');
    const tenantSlug = request.headers.get('x-tenant-slug');
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const { passId, successUrl, cancelUrl, upgradeFromSubscriptionId } = await request.json();

    if (!passId) {
      return NextResponse.json({ error: 'Pass ID is required' }, { status: 400 });
    }

    // Handle upgrade logic if upgradeFromSubscriptionId is provided
    let upgradeInfo = null;
    if (upgradeFromSubscriptionId) {
      // Get the current subscription details
      const currentSubscription = await sanityClient.fetch(`
        *[_type == "subscription" && _id == $subscriptionId && user->clerkId == $userId][0] {
          _id,
          passName,
          type,
          amount,
          currency,
          passId,
          startDate,
          endDate,
          isActive
        }
      `, { subscriptionId: upgradeFromSubscriptionId, userId });

      if (!currentSubscription || !currentSubscription.isActive) {
        return NextResponse.json({ error: 'Current subscription not found or inactive' }, { status: 404 });
      }

      // Get the original pass price
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

      // If we don't have the pass price, use the subscription amount
      if (currentPassPrice === 0 && currentSubscription.amount) {
        currentPassPrice = currentSubscription.amount / 100; // Convert from øre to NOK
      }

      upgradeInfo = {
        subscriptionId: currentSubscription._id,
        currentPassPrice,
        passName: currentSubscription.passName
      };
    }

    // Fetch pass details from Sanity with tenant information
    const passData = await sanityClient.fetch(`
      *[_type == "pass" && _id == $passId && isActive == true][0] {
        _id,
        name,
        description,
        type,
        price,
        validityDays,
        classesLimit,
        tenant->{
          _id,
          schoolName,
          slug,
          stripeConnect
        }
      }
    `, { passId });

    if (!passData) {
      return NextResponse.json({ error: 'Pass not found or inactive' }, { status: 404 });
    }

    // Verify pass belongs to the correct tenant
    if (passData.tenant._id !== tenantId) {
      return NextResponse.json({ error: 'Pass not found in this tenant' }, { status: 404 });
    }

    // Check if tenant has Stripe Connect account
    if (!passData.tenant.stripeConnect?.accountId) {
      return NextResponse.json({ 
        error: 'Payment processing not available. Please contact the school administrator.' 
      }, { status: 400 });
    }

    // Check if Stripe Connect account is active
    if (!passData.tenant.stripeConnect.chargesEnabled) {
      return NextResponse.json({ 
        error: 'Payment processing is temporarily unavailable. Please try again later.' 
      }, { status: 400 });
    }

    // Create description based on pass type
    let description = passData.description || '';
    if (passData.type === 'unlimited') {
      description += ` - Unlimited classes for ${passData.validityDays} days`;
    } else if (['single', 'multi-pass', 'multi'].includes(passData.type)) {
      description += ` - ${passData.classesLimit} classes valid for ${passData.validityDays} days`;
    }

    const currency = passData.tenant.stripeConnect.currency || STRIPE_CONFIG.currency;
    const applicationFeePercent = passData.tenant.stripeConnect.applicationFeePercent || 5;
    const finalTenantSlug = passData.tenant.slug?.current || tenantSlug;

    // Calculate pricing for upgrade or regular purchase
    let finalPrice = passData.price;
    let productName = passData.name;
    let productDescription = description;
    let sessionMetadata: any = {
      passId: passData._id,
      passType: passData.type,
      userId: userId,
      type: 'pass_purchase',
      tenantId: passData.tenant._id,
      tenantSlug: finalTenantSlug,
    };

    if (upgradeInfo) {
      // Calculate upgrade cost (difference between new pass and current pass)
      const upgradeCost = Math.max(0, passData.price - upgradeInfo.currentPassPrice);
      finalPrice = upgradeCost;
      productName = `Upgrade to ${passData.name}`;
      productDescription = `Upgrade from "${upgradeInfo.passName}" to "${passData.name}" - Pay only the difference`;
      
      // Add upgrade metadata
      sessionMetadata.type = 'pass_upgrade';
      sessionMetadata.upgradeFromSubscriptionId = upgradeInfo.subscriptionId;
      sessionMetadata.originalPassPrice = upgradeInfo.currentPassPrice;
      sessionMetadata.newPassPrice = passData.price;
      sessionMetadata.upgradeCost = upgradeCost;

      // If upgrade cost is 0, we still need to process it but with minimal charge
      if (upgradeCost === 0) {
        finalPrice = 1; // 1 NOK minimal charge for processing
        productDescription += ' (Free upgrade - minimal processing fee)';
      }
    }

    // Create Stripe Connect checkout session
    const session = await stripeConnect.createCheckoutSession({
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: productName,
              description: productDescription,
              metadata: {
                passId: passData._id,
                passType: passData.type,
                userId: userId,
                tenantId: passData.tenant._id,
                ...(upgradeInfo && {
                  upgradeFromSubscriptionId: upgradeInfo.subscriptionId,
                  isUpgrade: 'true'
                })
              },
            },
            unit_amount: Math.round(finalPrice * 100), // Convert to smallest currency unit
          },
          quantity: 1,
        },
      ],
      connectedAccountId: passData.tenant.stripeConnect.accountId,
      applicationFeePercent,
      success_url: successUrl || `${request.nextUrl.origin}/${finalTenantSlug}/subscriptions?success=true&session_id={CHECKOUT_SESSION_ID}&type=${upgradeInfo ? 'upgrade' : 'pass'}`,
      cancel_url: cancelUrl || `${request.nextUrl.origin}/${finalTenantSlug}/subscriptions`,
      metadata: sessionMetadata,
    });

    return NextResponse.json({ 
      sessionId: session.id, 
      url: session.url,
      connectedAccountId: passData.tenant.stripeConnect.accountId
    });
  } catch (error) {
    console.error('Stripe Connect pass checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
