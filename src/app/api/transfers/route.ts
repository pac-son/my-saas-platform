import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, wallets, transactions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    // 1. Auth Check
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientEmail, amount } = body;

    // 2. Validation
    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be positive' }, { status: 400 });
    }
    
    const amountInKobo = Math.round(amount * 100);

    // 3. Start the Atomic Transaction
    const result = await db.transaction(async (tx) => {
      
      // A. Get Sender's Wallet (Lock it conceptually)
      // We need to make sure they actually have the money first
      const senderWallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
      });

      if (!senderWallet || senderWallet.balance < amountInKobo) {
        throw new Error("Insufficient funds");
      }

      // B. Find Recipient
      const recipientUser = await tx.query.users.findFirst({
        where: eq(users.email, recipientEmail), // We find them by email
        with: {
          wallet: true, // Auto-fetch their wallet
        }
      });

      if (!recipientUser || !recipientUser.wallet) {
        throw new Error("Recipient not found");
      }

      if (recipientUser.id === userId) {
        throw new Error("Cannot transfer to yourself");
      }

      // C. Perform the Swap (The Magic Moment 🪄)
      
      // 1. Deduct from Sender
      await tx.update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${amountInKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, senderWallet.id));

      // 2. Add to Recipient
      await tx.update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${amountInKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, recipientUser.wallet.id));

      // 3. Create Record for Sender (Money Leaving)
      await tx.insert(transactions).values({
        walletId: senderWallet.id,
        amount: -amountInKobo, // Negative for sender
        type: 'transfer',
        status: 'completed',
        reference: `TRF-OUT-${Date.now()}`,
        description: `Transfer to ${recipientEmail}`,
      });

      // 4. Create Record for Recipient (Money Entering)
      await tx.insert(transactions).values({
        walletId: recipientUser.wallet.id,
        amount: amountInKobo, // Positive for recipient
        type: 'transfer',
        status: 'completed',
        reference: `TRF-IN-${Date.now()}`,
        description: `Received from ${senderWallet.userId}`, // In a real app, show name
      });

      return { success: true };
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('Transfer Error:', error);
    return NextResponse.json({ error: error.message || 'Transfer failed' }, { status: 500 });
  }
}