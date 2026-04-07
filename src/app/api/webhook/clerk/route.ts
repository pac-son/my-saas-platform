import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users, wallets } from '@/db/schema';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env');
  }

  // 1. Get the headers securely
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', { status: 400 });
  }

  // 2. Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // 3. Verify the signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error: Invalid signature', { status: 400 });
  }

  // 4. Handle the "user.created" event
  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;
    const primaryEmail = email_addresses[0]?.email_address;
    const name = `${first_name || ''} ${last_name || ''}`.trim();

    try {
      // Atomic Database Transaction
      await db.transaction(async (tx) => {
        
        // A. Create the User Record
        await tx.insert(users).values({
          id: id,
          email: primaryEmail,
          fullName: name || 'New Student',
        });

        // B. Automatically generate their empty USD Wallet
        await tx.insert(wallets).values({
          userId: id,
          balance: 0,
          currency: 'USD',
        });
      });
      
      console.log(`Success: Created user & wallet for ${primaryEmail}`);
    } catch (error) {
      console.error('Error saving user to DB:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true }, { status: 200 });
}