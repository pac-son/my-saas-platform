import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { wallets, transactions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16" as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  try {
    // 1. Get the raw body and signature
    const body = await req.text();
    const signature = (await headers()).get("Stripe-Signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    // 2. Verify the event came from Stripe
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed.", err.message);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // 3. Handle successful payments
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Grab the custom data we passed in during checkout
      const userId = session.metadata?.userId;
      const amountTotal = session.amount_total; 

      if (!userId || !amountTotal) {
        throw new Error("Missing user ID or amount in session metadata");
      }

      // 4. Atomic Database Update (The magic part)
      await db.transaction(async (tx) => {
        const wallet = await tx.query.wallets.findFirst({
          where: eq(wallets.userId, userId),
        });

        if (!wallet) throw new Error("Wallet not found");

        // A. Add money to the wallet
        await tx.update(wallets)
          .set({ balance: sql`${wallets.balance} + ${amountTotal}` })
          .where(eq(wallets.id, wallet.id));

        // B. Record the transaction
        await tx.insert(transactions).values({
          walletId: wallet.id,
          amount: amountTotal,
          type: "deposit",
          status: "completed",
          reference: (session.payment_intent as string) || `STRIPE-${Date.now()}`,
          description: "Stripe Card Deposit",
        });
      });
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error: any) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}