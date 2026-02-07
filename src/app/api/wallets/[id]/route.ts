import { NextResponse } from 'next/server';
import { db } from '@/db';
import { wallets } from '@/db/schema'; 
import { eq } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: { id: string } } 
) {
  // 1. Run the query (returns an Array)
  const result = await db
    .select()
    .from(wallets)
    .where(eq(wallets.id, params.id))
    .limit(1);
  
  // 2. Extract the first item
  const wallet = result[0];

  if (!wallet) {
    return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
  }

  // 3. Convert Kobo to Naira for display
  return NextResponse.json({
    id: wallet.id,
    currency: wallet.currency,
    balance: wallet.balance / 100, 
  });
}