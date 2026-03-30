import { NextResponse } from 'next/server';
import { db } from '@/db';
import { vaults } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// 1. GET: Fetch all vaults for the logged-in user
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userVaults = await db.query.vaults.findMany({
      where: eq(vaults.userId, userId),
      orderBy: [desc(vaults.createdAt)],
    });

    return NextResponse.json(userVaults);
  } catch (error: any) {
    console.error('Fetch Vaults Error:', error);
    return NextResponse.json({ error: 'Failed to fetch vaults' }, { status: 500 });
  }
}

// 2. POST: Create a brand new vault
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, targetAmount } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'Vault name is required' }, { status: 400 });
    }
    if (!targetAmount || targetAmount <= 0) {
      return NextResponse.json({ error: 'Target amount must be positive' }, { status: 400 });
    }

    // Convert to Kobo/Cents
    const targetInKobo = Math.round(targetAmount * 100);

    // Insert into database
    const [newVault] = await db.insert(vaults).values({
      userId,
      name: name.trim(),
      targetAmount: targetInKobo,
      currentAmount: 0, // Starts at 0
      status: 'active',
    }).returning();

    return NextResponse.json({ success: true, vault: newVault }, { status: 201 });

  } catch (error: any) {
    console.error('Create Vault Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create vault' }, { status: 500 });
  }
}