import { NextResponse } from 'next/server';
import { db } from '@/db';
import { vaults, merchants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: Request) {
  try {
    // 1. Identify the shopper (The Student)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Shopper must be logged in' }, { status: 401 });
    }

    const body = await request.json();
    const { publishableKey, productId, productName, targetAmount } = body;

    if (!publishableKey || !productId || !productName || !targetAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. Identify the Merchant using their API Key
    const merchant = await db.query.merchants.findFirst({
      where: eq(merchants.publishableKey, publishableKey),
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Invalid Merchant API Key' }, { status: 401 });
    }

    // 3. Create the Vault locked to this Merchant and Product
    const targetInCents = Math.round(targetAmount * 100);

    const [newVault] = await db.insert(vaults).values({
      userId,
      merchantId: merchant.id,
      productId: productId,
      name: `Saving for: ${productName} (at ${merchant.businessName})`,
      targetAmount: targetInCents,
      currentAmount: 0,
      status: 'active',
    }).returning();

    return NextResponse.json({ success: true, vault: newVault }, { status: 201 });

  } catch (error: any) {
    console.error('B2B Vault Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to initialize savings plan' }, { status: 500 });
  }
}