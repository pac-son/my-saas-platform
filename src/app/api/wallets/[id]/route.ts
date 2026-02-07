import { NextResponse } from 'next/server';
import { db } from '@/db';
import { wallets } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  // 1. Define params as a Promise
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 2. Await the params to unlock the ID
    const { id } = await params;

    // 3. Run the query
    const result = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, id))
      .limit(1);

    const wallet = result[0];

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: wallet.id,
      currency: wallet.currency,
      // Convert Kobo (Integer) to Naira (Decimal)
      balance: wallet.balance / 100, 
    });

  } catch (error) {
    console.error('Error fetching wallet:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}