import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe securely
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-04-10' as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletId, amount } = body;

    // 1. Basic Validation
    if (!walletId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid walletId and amount required' }, { status: 400 });
    }

    // Convert to minor units (Kobo/Cents)
    const amountInMinorUnits = Math.round(amount * 100);

    // 2. Generate the Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'ngn', // Change to 'usd' if you are using dollars
            product_data: {
              name: 'Wallet Deposit',
              description: `Deposit to wallet ${walletId}`,
            },
            unit_amount: amountInMinorUnits,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Where Stripe sends the user after they finish the payment screen:
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?deposit=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?deposit=cancelled`,
      
      // 👇 THE MOST IMPORTANT PART: The Metadata Name Tag!
      // This gets sent back to your Webhook so you know exactly which wallet to fund.
      metadata: {
        walletId: walletId, 
      },
    });

    // 3. Return the secure Stripe URL to the frontend
    return NextResponse.json({ url: session.url }, { status: 200 });

  } catch (error: any) {
    console.error('Stripe Checkout Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create checkout' }, { status: 500 });
  }
}