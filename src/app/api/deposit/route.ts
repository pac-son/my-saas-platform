import { NextResponse } from 'next/server';
import { db } from '@/db'; 
import { wallets, transactions } from '@/db/schema'; 
import { eq, sql } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { walletId, amount, reference } = body;

    // 1. Validation
    if (!walletId || !amount) {
      return NextResponse.json({ error: 'Missing walletId or amount' }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ error: 'Deposit must be positive' }, { status: 400 });
    }

    // Convert Naira to Kobo (Major to Minor)
    // Math.round fixes any weird floating point bugs like 50.0000001
    const amountInKobo = Math.round(amount * 100);

    // 2. The Atomic Transaction
    const result = await db.transaction(async (tx) => {
      
      // A. Create the Ledger Entry
      const [newTxn] = await tx
        .insert(transactions)
        .values({
          walletId,
          amount: amountInKobo, // Store +5000
          type: 'deposit',
          status: 'completed',
          reference: reference || `REF-${Date.now()}`, // Fallback if no ref provided
          description: 'Wallet Deposit',
        })
        .returning();

      // B. Update Wallet Balance
      // We use sql`` to do this on the DB server, avoiding race conditions.
      await tx
        .update(wallets)
        .set({
          balance: sql`${wallets.balance} + ${amountInKobo}`, 
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, walletId));

      return newTxn;
    });

    return NextResponse.json({ 
      success: true, 
      transactionId: result.id, 
      amountDeposited: amount // Return what they sent for confirmation
    }, { status: 201 });

  } catch (error) {
    console.error('Deposit Error:', error);
    return NextResponse.json({ error: 'Deposit failed' }, { status: 500 });
  }
}