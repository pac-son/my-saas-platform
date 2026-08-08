import { NextResponse } from 'next/server';
import { db } from '@/db';
import { vaults, wallets, merchants, webhookEvents, idempotencyKeys } from '@/db/schema'; 
import { eq, sql } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. GRAB THE IDEMPOTENCY KEY FROM THE HEADER
    const idempotencyKey = request.headers.get('idempotency-key');
    if (!idempotencyKey) {
      return NextResponse.json({ error: 'Missing Idempotency Key' }, { status: 400 });
    }

    const { vaultId, amountToFund } = await request.json();
    
    if (!amountToFund || isNaN(amountToFund) || amountToFund <= 0) {
      return NextResponse.json({ error: 'Please enter a valid funding amount' }, { status: 400 });
    }

    // 2. THE LOCK: Attempt to save the key to the database FIRST
    try {
      await db.insert(idempotencyKeys).values({
        key: idempotencyKey,
        userId: userId,
        action: `fund_vault_${vaultId}`
      });
    } catch (lockError: any) {
      // If Postgres throws an error, it means the Primary Key (the idempotencyKey) already exists!
      // This means this is a duplicate request. We return 200 OK so the frontend thinks it worked, 
      // but we safely abort BEFORE moving any money.
      console.warn(` Blocked duplicate transaction for key: ${idempotencyKey}`);
      return NextResponse.json({ success: true, message: 'Already processed' }, { status: 200 });
    }

    const amountInCents = Math.round(amountToFund * 100);

    // 1. Get the user's wallet and the target vault
    const userWallet = await db.query.wallets.findFirst({ where: eq(wallets.userId, userId) });
    const targetVault = await db.query.vaults.findFirst({
      where: eq(vaults.id, vaultId),
      with: { merchant: true } // Pull the merchant data so we get their webhook URL
    });

    if (!userWallet || !targetVault) throw new Error('Wallet or Vault not found');
    if (userWallet.balance < amountInCents) throw new Error('Insufficient funds in wallet');

    // 2. Atomic Transaction: Move money from Wallet -> Vault
    await db.transaction(async (tx) => {
      // Deduct from Wallet
      await tx.update(wallets)
        .set({ balance: sql`${wallets.balance} - ${amountInCents}` })
        .where(eq(wallets.id, userWallet.id));

      // Add to Vault
      await tx.update(vaults)
        .set({ currentAmount: sql`${vaults.currentAmount} + ${amountInCents}` })
        .where(eq(vaults.id, targetVault.id));
    });

    // 3. Re-fetch the updated vault to check its new balance
    const updatedVault = await db.query.vaults.findFirst({ where: eq(vaults.id, vaultId) });

    // 🚀 4. THE BULLETPROOF QUEUE
    if (updatedVault && updatedVault.currentAmount >= updatedVault.targetAmount && updatedVault.status !== 'completed') {
      
      // Update vault status to completed
      await db.update(vaults).set({ status: 'completed' }).where(eq(vaults.id, vaultId));

      // Instead of firing the webhook immediately, we write it to the database queue!
      if (targetVault.merchant?.webhookUrl) {
        
        const eventPayload = {
          event: 'snbl.order.fully_funded',
          data: {
            productId: targetVault.productId,
            vaultId: targetVault.id,
            customerClerkId: userId,
            totalPaidCents: updatedVault.currentAmount
          }
        };

        // Insert into the new queue table
        await db.insert(webhookEvents).values({
          merchantId: targetVault.merchant.id,
          vaultId: targetVault.id,
          eventType: 'snbl.order.fully_funded',
          payload: JSON.stringify(eventPayload),
          status: 'pending',
          attempts: 0,
        });

        console.log(`📥 Webhook queued for ${targetVault.merchant.businessName}.`);
      }
    }

    return NextResponse.json({ success: true, message: 'Vault funded successfully' }, { status: 200 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}