import { NextRequest, NextResponse } from 'next/server';
import { stripeConnect, resolveStripeCurrency } from '@/lib/stripe';
import { auth } from '@clerk/nextjs/server';
import { sanityClient } from '@/lib/sanity';
import { resolveUserReferenceIds } from '@/lib/user-references';

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

    const { passId, promoCode, successUrl, cancelUrl, upgradeFromSubscriptionId } = await request.json();

    if (!passId) {
      return NextResponse.json({ error: 'Pass ID is required' }, { status: 400 });
    }

    // Handle upgrade logic if upgradeFromSubscriptionId is provided
    let upgradeInfo = null;
    if (upgradeFromSubscriptionId) {
      const userReferenceIds = await resolveUserReferenceIds(userId);
      // Get the current subscription details
      const currentSubscription = await sanityClient.fetch(`
        *[_type == "subscription" && _id == $subscriptionId && user._ref in $userReferenceIds][0] {
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
      `, { subscriptionId: upgradeFromSubscriptionId, userReferenceIds });

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
        promoActive,
        promoCode,
        promoDiscountType,
        promoDiscountValue,
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

    const currency = resolveStripeCurrency(passData.tenant.stripeConnect.currency);
    const applicationFeePercent = passData.tenant.stripeConnect.applicationFeePercent || 5;
    const finalTenantSlug = passData.tenant.slug?.current || tenantSlug;

    // Calculate pricing for upgrade or regular purchase
    let finalPrice = passData.price;
    const originalPrice = passData.price;
    let discountAmount = 0;
    let appliedPromoCode: string | null = null;

    if (promoCode && !upgradeInfo) {
      const normalizedPromoCode = String(promoCode).trim().toUpperCase();
      const configuredPromoCode = String(passData.promoCode || '').trim().toUpperCase();

      if (!passData.promoActive || !configuredPromoCode) {
        return NextResponse.json({ error: 'Promo code is not active for this pass' }, { status: 400 });
      }

      if (normalizedPromoCode !== configuredPromoCode) {
        return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 });
      }

      if (!passData.promoDiscountType || !passData.promoDiscountValue) {
        return NextResponse.json({ error: 'Promo configuration is incomplete' }, { status: 400 });
      }

      if (passData.promoDiscountType === 'percentage') {
        discountAmount = (originalPrice * passData.promoDiscountValue) / 100;
      } else {
        discountAmount = passData.promoDiscountValue;
      }

      discountAmount = Math.max(0, Math.min(discountAmount, originalPrice));
      finalPrice = Math.max(1, originalPrice - discountAmount);
      appliedPromoCode = normalizedPromoCode;
    }

    let productName = passData.name;
    let productDescription = description;
    let sessionMetadata: any = {
      passId: passData._id,
      passType: passData.type,
      userId: userId,
      type: 'pass_purchase',
      tenantId: passData.tenant._id,
      tenantSlug: finalTenantSlug,
      originalPrice: String(originalPrice),
      finalPrice: String(finalPrice),
      discountAmount: String(discountAmount),
      ...(appliedPromoCode ? { promoCode: appliedPromoCode } : {}),
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

      // Upgrade flow should not combine with promo
      if (promoCode) {
        productDescription += ' (Promo codes are not applicable on upgrades)';
      }
    } else if (appliedPromoCode) {
      productDescription += ` (Promo ${appliedPromoCode} applied: -${discountAmount.toFixed(2)} kr)`;
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
  } catch (error: any) {
    const stripeErrorCode = error?.code || error?.raw?.code || 'unknown_error';
    const stripeErrorMessage = error?.message || error?.raw?.message || 'Failed to create checkout session';

    console.error('Stripe Connect pass checkout error:', {
      code: stripeErrorCode,
      message: stripeErrorMessage,
      type: error?.type,
      requestId: error?.requestId,
    });

    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        details: stripeErrorCode === 'unknown_error' ? undefined : stripeErrorCode,
      },
      { status: 500 }
    );
  }
}
