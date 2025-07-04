import { NextRequest, NextResponse } from 'next/server';
import { Webhook, WebhookRequiredHeaders } from 'svix';
import { headers } from 'next/headers';
import { client } from '@/lib/sanity';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

if (!webhookSecret) {
  throw new Error('Please add CLERK_WEBHOOK_SECRET to your environment variables');
}

async function validateRequest(request: NextRequest) {
  const payloadString = await request.text();
  const headersList = await headers();

  const svix_id = headersList.get('svix-id');
  const svix_timestamp = headersList.get('svix-timestamp');
  const svix_signature = headersList.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    throw new Error('Missing svix headers');
  }

  const svixHeaders = {
    'svix-id': svix_id,
    'svix-timestamp': svix_timestamp,
    'svix-signature': svix_signature,
  } as WebhookRequiredHeaders;

  const wh = new Webhook(webhookSecret!);
  return wh.verify(payloadString, svixHeaders);
}

export async function POST(request: NextRequest) {
  try {
    // Validate the webhook
    const payload = await validateRequest(request);
    const { type: eventType, data } = payload as any;
    const { id: clerkId, email_addresses, first_name, last_name, phone_numbers } = data;

    // Extract tenant information from the request
    const referer = request.headers.get('referer') || '';
    const tenantSlug = extractTenantFromReferer(referer);

    if (eventType === 'user.created') {
      console.log('User created webhook received:', { clerkId, email: email_addresses?.[0]?.email_address, tenantSlug });
      
      // Check if user already exists
      const existingUser = await client.fetch(
        `*[_type == "user" && clerkId == $clerkId][0]`,
        { clerkId }
      );

      if (!existingUser) {
        if (tenantSlug) {
          // Find the tenant
          const tenant = await client.fetch(
            `*[_type == "tenant" && slug.current == $slug && status == "active"][0]`,
            { slug: tenantSlug }
          );

          if (tenant && tenant.settings?.allowPublicRegistration) {
            // Create user document in Sanity with tenant
            const userDoc = {
              _type: 'user',
              clerkId,
              email: email_addresses?.[0]?.email_address || '',
              firstName: first_name || '',
              lastName: last_name || '',
              name: `${first_name || ''} ${last_name || ''}`.trim(),
              phone: phone_numbers?.[0]?.phone_number || '',
              tenant: {
                _type: 'reference',
                _ref: tenant._id,
              },
              role: tenant.settings?.requireApproval ? 'pending' : 'student',
              isActive: !tenant.settings?.requireApproval,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            await client.create(userDoc);
            console.log(`Created user ${clerkId} for tenant ${tenantSlug}`);
          }
        } else {
          // Create user without tenant (they can be assigned later)
          const userDoc = {
            _type: 'user',
            clerkId,
            email: email_addresses?.[0]?.email_address || '',
            firstName: first_name || '',
            lastName: last_name || '',
            name: `${first_name || ''} ${last_name || ''}`.trim(),
            phone: phone_numbers?.[0]?.phone_number || '',
            role: 'pending', // Will be updated when they register a school or join one
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          await client.create(userDoc);
          console.log(`Created user ${clerkId} without tenant - will be assigned later`);
        }
      } else {
        console.log(`User ${clerkId} already exists in Sanity`);
      }
    }

    if (eventType === 'user.updated') {
      // Update user document in Sanity
      const existingUser = await client.fetch(
        `*[_type == "user" && clerkId == $clerkId][0]`,
        { clerkId }
      );

      if (existingUser) {
        await client
          .patch(existingUser._id)
          .set({
            email: email_addresses?.[0]?.email_address || existingUser.email,
            firstName: first_name || existingUser.firstName,
            lastName: last_name || existingUser.lastName,
            name: `${first_name || ''} ${last_name || ''}`.trim() || existingUser.name,
            phone: phone_numbers?.[0]?.phone_number || existingUser.phone,
            updatedAt: new Date().toISOString(),
          })
          .commit();
      }
    }

    if (eventType === 'user.deleted') {
      // Deactivate user in Sanity (don't delete to preserve data integrity)
      const existingUser = await client.fetch(
        `*[_type == "user" && clerkId == $clerkId][0]`,
        { clerkId }
      );

      if (existingUser) {
        await client
          .patch(existingUser._id)
          .set({
            isActive: false,
            updatedAt: new Date().toISOString(),
          })
          .commit();
      }
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

function extractTenantFromReferer(referer: string): string | null {
  try {
    const url = new URL(referer);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    
    // Check for path-based tenant routing
    if (pathSegments.length > 0) {
      const firstSegment = pathSegments[0];
      const skipRoutes = ['api', '_next', 'sign-in', 'sign-up', 'studio', '.clerk', 'register-school'];
      if (!skipRoutes.includes(firstSegment)) {
        return firstSegment;
      }
    }
    
    return null;
  } catch {
    return null;
  }
}
