import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { writeClient } from '@/lib/sanity';
import { UserRole } from '@/types';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occured', {
      status: 400
    });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const email = email_addresses[0].email_address;
    const name = [first_name, last_name].filter(Boolean).join(' ') || 'Anonymous User';

    // Force admin role for admin email
    const role = email === 'dancation@gmail.com' ? UserRole.ADMIN : UserRole.STUDENT;

    // Always update Clerk metadata to ensure role is set
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(id, {
        publicMetadata: { role }
      });
      console.log(`Set role ${role} for ${email} in Clerk metadata`);
    } catch (error) {
      console.error('Error updating Clerk metadata:', error);
    }

    // Sync with Sanity
    try {
      // Check if user already exists in Sanity
      const existingUser = await writeClient.fetch(`
        *[_type == "user" && clerkId == $clerkId][0]
      `, { clerkId: id });

      if (!existingUser) {
        // Create new user in Sanity
        const newUser = await writeClient.create({
          _type: 'user',
          clerkId: id,
          email: email,
          name: name,
          firstName: first_name || '',
          lastName: last_name || '',
          role: role,
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        console.log(`Created user ${email} with role ${role} in Sanity:`, newUser._id);
      } else {
        // Update existing user in Sanity
        const updatedUser = await writeClient
          .patch(existingUser._id)
          .set({
            email: email,
            name: name,
            firstName: first_name || '',
            lastName: last_name || '',
            role: email === 'dancation@gmail.com' ? UserRole.ADMIN : existingUser.role, // Only force admin for admin email
            updatedAt: new Date().toISOString(),
          })
          .commit();
        console.log(`Updated user ${email} in Sanity:`, updatedUser._id);
      }
    } catch (error) {
      console.error('Error syncing user with Sanity:', error);
    }
  }

  return new Response('Success', { status: 200 });
}
