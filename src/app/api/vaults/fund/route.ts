import { NextResponse } from 'next/server';
import { db } from '@/db';
import { wallets, vaults, transactions } from '@/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vaultId, amount } = body;

    if (!vaultId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid funding amount' }, { status: 400 });
    }

    const amountInKobo = Math.round(amount * 100);

    // The Atomic Swap
    const result = await db.transaction(async (tx) => {
      
      // 1. Get the User's Main Wallet
      const wallet = await tx.query.wallets.findFirst({
        where: eq(wallets.userId, userId),
      });

      if (!wallet) throw new Error("Wallet not found");
      if (wallet.balance < amountInKobo) throw new Error("Insufficient funds in main wallet");

      // 2. Get the Vault (Ensure it belongs to this user)
      const vault = await tx.query.vaults.findFirst({
        where: and(eq(vaults.id, vaultId), eq(vaults.userId, userId)),
      });

      if (!vault) throw new Error("Vault not found");

      // 3. Deduct from Main Wallet
      await tx.update(wallets)
        .set({
          balance: sql`${wallets.balance} - ${amountInKobo}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      // 4. Add to Vault
      // Check if this deposit completes the goal
      const newAmount = vault.currentAmount + amountInKobo;
      const newStatus = newAmount >= vault.targetAmount ? 'completed' : 'active';

      await tx.update(vaults)
        .set({
          currentAmount: newAmount,
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(vaults.id, vault.id));

      // 5. Create a Ledger Entry so they see it in their history
      await tx.insert(transactions).values({
        walletId: wallet.id,
        amount: -amountInKobo, // Negative because it left the main wallet
        type: 'transfer', 
        status: 'completed',
        reference: `VLT-FUND-${Date.now()}`,
        description: `Transferred to vault: ${vault.name}`,
      });

      return { success: true, newStatus };
    });

    return NextResponse.json(result, { status: 200 });

  } catch (error: any) {
    console.error('Fund Vault Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fund vault' }, { status: 500 });
  }
}