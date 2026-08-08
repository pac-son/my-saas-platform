import { NextResponse } from 'next/server';
import { db } from '@/db';
import { merchants } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';
import crypto from 'crypto'; 

// The Cryptography Engine
function generateKeys() {
  const publishable = `pk_test_${crypto.randomBytes(16).toString('hex')}`;
  const secret = `sk_test_${crypto.randomBytes(32).toString('hex')}`;
  return { publishable, secret };
}

// GET: Fetch existing merchant credentials (returns null if not registered)
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const merchant = await db.query.merchants.findFirst({
      where: eq(merchants.clerkId, userId),
    });

    // If not a merchant, return null so the frontend can redirect to registration
    if (!merchant) {
      return NextResponse.json({ merchant: null });
    }

    return NextResponse.json({
      merchant: {
        id: merchant.id,
        businessName: merchant.businessName,
        websiteUrl: merchant.websiteUrl,
        publishableKey: merchant.publishableKey,
        secretKey: merchant.secretKey,
        webhookUrl: merchant.webhookUrl,
        createdAt: merchant.createdAt,
      },
    });

  } catch (error: any) {
    console.error('Fetch Merchant Error:', error);
    return NextResponse.json({ error: 'Failed to fetch merchant' }, { status: 500 });
  }
}

// POST: Register a new merchant with proper business details
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Check if already registered
    const existing = await db.query.merchants.findFirst({
      where: eq(merchants.clerkId, userId),
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You are already registered as a merchant' },
        { status: 409 }
      );
    }

    // 2. Parse and validate the request body
    const body = await request.json();
    const { businessName, websiteUrl, webhookUrl } = body;

    if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2) {
      return NextResponse.json(
        { error: 'Business name is required (min 2 characters)' },
        { status: 400 }
      );
    }

    // 3. Generate API keys
    const { publishable, secret } = generateKeys();

    // 4. Create the merchant record
    const [newMerchant] = await db.insert(merchants).values({
      clerkId: userId,
      businessName: businessName.trim(),
      websiteUrl: websiteUrl?.trim() || null,
      webhookUrl: webhookUrl?.trim() || null,
      publishableKey: publishable,
      secretKey: secret,
    }).returning();

    return NextResponse.json({
      merchant: {
        id: newMerchant.id,
        businessName: newMerchant.businessName,
        websiteUrl: newMerchant.websiteUrl,
        publishableKey: newMerchant.publishableKey,
        secretKey: newMerchant.secretKey,
        webhookUrl: newMerchant.webhookUrl,
        createdAt: newMerchant.createdAt,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Merchant Registration Error:', error);
    return NextResponse.json({ error: 'Failed to register merchant' }, { status: 500 });
  }
}

// PATCH: Update merchant details (webhook URL, website URL)
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const merchant = await db.query.merchants.findFirst({
      where: eq(merchants.clerkId, userId),
    });

    if (!merchant) {
      return NextResponse.json({ error: 'Merchant not found' }, { status: 404 });
    }

    const body = await request.json();
    const { webhookUrl, websiteUrl } = body;

    // Build the update object with only provided fields
    const updates: Record<string, string | null> = {};
    if (webhookUrl !== undefined) updates.webhookUrl = webhookUrl?.trim() || null;
    if (websiteUrl !== undefined) updates.websiteUrl = websiteUrl?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const [updated] = await db
      .update(merchants)
      .set(updates)
      .where(eq(merchants.clerkId, userId))
      .returning();

    return NextResponse.json({
      merchant: {
        id: updated.id,
        businessName: updated.businessName,
        websiteUrl: updated.websiteUrl,
        webhookUrl: updated.webhookUrl,
      },
    });

  } catch (error: any) {
    console.error('Merchant Update Error:', error);
    return NextResponse.json({ error: 'Failed to update merchant' }, { status: 500 });
  }
}