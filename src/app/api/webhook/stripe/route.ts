import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/db';
import { wallets } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

// Initialize Stripe (You'll need to add your STRIPE_SECRET_KEY to your .env file)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-04-10' as any, // Use the latest API version
});

export async function POST(req: Request) {
  const body = await req.text(); // Stripe requires the raw body, not JSON
  const signature = (await headers()).get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    // SECURITY: Verify the webhook actually came from Stripe using your Webhook Secret
    // You will get this secret when you run the Stripe CLI
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET as string 
    );
  } catch (error: any) {
    console.error('⚠️ Webhook signature verification failed.', error.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the specific event when a checkout session is completely paid
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // We need to know WHO paid and HOW MUCH
    // We expect you passed the userId in the metadata when you created the Checkout Session
    const userId = session.metadata?.userId;
    const amountPaidInCents = session.amount_total;

    if (userId && amountPaidInCents) {
      console.log(`💰 Payment received! Adding ${amountPaidInCents} cents to user ${userId}`);

      try {
        // Atomic Update: Add the money directly to their wallet
        await db.update(wallets)
          .set({ balance: sql`${wallets.balance} + ${amountPaidInCents}` })
          .where(eq(wallets.userId, userId));
          
        console.log('✅ Wallet updated successfully');
      } catch (dbError) {
        console.error('❌ Database failed to update wallet:', dbError);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }
    } else {
      console.error('❌ Missing userId or amount in session metadata');
    }
  }

  // Always return a 200 OK to Stripe so they know we received it
  return NextResponse.json({ received: true }, { status: 200 });
}