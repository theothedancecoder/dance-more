import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/lib/database';
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

    // Check if user exists
    const existingUser = db.getUserByEmail(email);

    if (!existingUser) {
      // Check if this is the admin email and give admin role
      const role = email === 'dancation@gmail.com' ? UserRole.ADMIN : UserRole.STUDENT;
      
      // Create new user
      db.createUser({
        email,
        name,
        role,
      });
      
      console.log(`Created user ${email} with role ${role}`);
    } else {
      // Update existing user
      db.updateUser(existingUser.id, {
        email,
        name,
      });
    }
  }

  return new Response('Success', { status: 200 });
}
