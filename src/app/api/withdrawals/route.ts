import { NextResponse } from 'next/server';
import { db } from '@/db';
import { wallets, transactions } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    // 1. Auth Check (Remembering the await!)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { walletId, amount } = body;

    // 2. Validation
    if (!walletId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid withdrawal amount' }, { status: 400 });
    }

    const amountInKobo = Math.round(amount * 100);

    // 3. The Atomic Transaction
    const result = await db.transaction(async (tx) => {
      
      // A. Fetch the wallet and lock the balance
      const wallet = await tx.query.wallets.findFirst({
        where: eq(wallets.id, walletId),
      });

      if (!wallet) {
        throw new Error("Wallet not found");
      }

      // B. The Crucial Check: Do they have enough money?
      if (wallet.balance < amountInKobo) {
        throw new Error("Insufficient funds for this withdrawal");
      }

      // C. Deduct the Balance
      await tx.update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${amountInKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, walletId));

      // D. Create the Ledger Entry
      // We already have 'withdrawal' in our schema enum, so this is safe!
      const [newTxn] = await tx.insert(transactions).values({
        walletId,
        amount: -amountInKobo, // Negative because money is leaving
        type: 'withdrawal',
        status: 'completed',
        reference: `WD-${Date.now()}`,
        description: 'Bank Withdrawal',
      }).returning();

      return newTxn;
    });

    return NextResponse.json({ success: true, transaction: result }, { status: 200 });

  } catch (error: any) {
    console.error('Withdrawal Error:', error);
    return NextResponse.json({ error: error.message || 'Withdrawal failed' }, { status: 500 });
  }
}