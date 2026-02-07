import { NextResponse } from 'next/server';
import { db } from '@/db';
import { users, wallets } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    // 1. Parse the incoming JSON body
    const body = await request.json();
    const { email, fullName } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 2. Database Logic: Create User + Wallet (Atomic Transaction)
    // We use a transaction so we don't end up with a user who has no wallet.
    const result = await db.transaction(async (tx) => {
      
      // A. Insert User
      const [newUser] = await tx
        .insert(users)
        .values({
          email,
          fullName,
        })
        .returning(); 

      // B. Create their first Wallet (NGN)
      const [newWallet] = await tx
        .insert(wallets)
        .values({
          userId: newUser.id,
          currency: 'NGN',
          balance: 0, // 0.00 NGN
        })
        .returning();

      return { user: newUser, wallet: newWallet };
    });

    // 3. Return success response
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user. Email might already exist.' },
      { status: 500 }
    );
  }
}