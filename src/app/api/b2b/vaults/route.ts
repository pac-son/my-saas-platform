import { NextResponse } from 'next/server';
import { db } from '@/db';
import { vaults, merchants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

// 1. Handle CORS Preflight Requests
// Browsers send an OPTIONS request before POSTing across domains.
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // In production,we reflect the verified origin
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// 2. The Hardened POST Route
export async function POST(request: Request) {
  try {
    // A. Identify the Shopper
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Shopper must be logged in' }, { status: 401 });
    }

    const body = await request.json();
    const { publishableKey, productId, productName, targetAmount } = body;

    if (!publishableKey || !productId || !productName || !targetAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // B. Identify the Merchant by API Key
    const merchant = await db.query.merchants.findFirst({
      where: eq(merchants.publishableKey, publishableKey),
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Invalid Merchant API Key' }, { status: 401 });
    }

    // C. THE FORTRESS: ORIGIN VERIFICATION 
    // We grab the exact URL the request came from
    const incomingOrigin = request.headers.get('origin') || request.headers.get('referer') || '';
    
    // Clean the URL (remove trailing slashes for a perfect match)
    const cleanOrigin = incomingOrigin.replace(/\/$/, '');
    const cleanMerchantUrl = merchant.websiteUrl?.replace(/\/$/, '') || '';

    if (cleanOrigin !== cleanMerchantUrl) {
      console.error(` Security Block: Origin ${cleanOrigin} attempted to use key for ${cleanMerchantUrl}`);
      return NextResponse.json(
        { error: 'Unauthorized Origin. This widget cannot be hosted here.' }, 
        { status: 403 }
      );
    }

    // D. If everything passes, create the Vault
    const targetInCents = Math.round(targetAmount * 100);

    const [newVault] = await db.insert(vaults).values({
      userId,
      merchantId: merchant.id,
      productId: productId,
      name: `Saving for: ${productName}`,
      targetAmount: targetInCents,
      currentAmount: 0,
      status: 'active',
    }).returning();

    // Attach CORS headers to the successful response
    return NextResponse.json(
      { success: true, vault: newVault }, 
      { 
        status: 201,
        headers: {
          'Access-Control-Allow-Origin': cleanOrigin,
        }
      }
    );

  } catch (error: any) {
    console.error('B2B Vault Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}