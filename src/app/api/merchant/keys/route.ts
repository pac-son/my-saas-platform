import { NextResponse } from 'next/server';
import { db } from '@/db';
import { merchants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto'; 

// The Cryptography Engine
function generateKeys() {
  // Generates key
  const publishable = `pk_test_${crypto.randomBytes(16).toString('hex')}`;
  const secret = `sk_test_${crypto.randomBytes(32).toString('hex')}`;
  return { publishable, secret };
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Check if this user is already registered as a Merchant
    let merchant = await db.query.merchants.findFirst({
      where: eq(merchants.clerkId, userId),
    });

    // 2. If they are brand new, generate keys and onboard them
    if (!merchant) {
      const { publishable, secret } = generateKeys();
      
      const [newMerchant] = await db.insert(merchants).values({
        clerkId: userId,
        businessName: "My Test Store", // In a real app, you'd ask for this in a form
        publishableKey: publishable,
        secretKey: secret,
      }).returning();
      
      merchant = newMerchant;
    }

    // 3. Return their API credentials
    return NextResponse.json({
      businessName: merchant.businessName,
      publishableKey: merchant.publishableKey,
      secretKey: merchant.secretKey, 
    });

  } catch (error: any) {
    console.error('API Key Generation Error:', error);
    return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 });
  }
}