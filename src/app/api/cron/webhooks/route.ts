import { NextResponse } from 'next/server';
import { db } from '@/db';
import { webhookEvents } from '@/db/schema';
import { eq, and, lte, lt } from 'drizzle-orm';
import { signWebhook } from '@/lib/webhook-signer';

const MAX_ATTEMPTS = 5;

export async function GET(request: Request) {
  try {
    // SECURITY: Verify the request comes from Vercel CRON or an authorized caller
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const now = new Date();

    // 1. Find all pending events that are due to be processed
    // (Status is 'pending' AND nextAttemptAt is in the past AND we haven't hit the max limit)
    const pendingEvents = await db.query.webhookEvents.findMany({
      where: and(
        eq(webhookEvents.status, 'pending'),
        lt(webhookEvents.attempts, MAX_ATTEMPTS),
        lte(webhookEvents.nextAttemptAt, now)
      ),
      with: { merchant: true } // Pull merchant so we have their webhookUrl + secretKey
    });

    if (pendingEvents.length === 0) {
      return NextResponse.json({ message: 'No pending webhooks to process.' }, { status: 200 });
    }

    console.log(`🚀 Processing ${pendingEvents.length} webhook(s)...`);

    // 2. Process each event
    for (const event of pendingEvents) {
      if (!event.merchant?.webhookUrl) continue;

      let success = false;
      
      try {
        // Generate cryptographic signature so the merchant can verify authenticity
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const signature = signWebhook(event.merchant.secretKey, timestamp, event.payload);

        // Fire the webhook to the Merchant's server with signed headers
        const response = await fetch(event.merchant.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SaveUp-Webhook/1.0',
            'X-SaveUp-Signature': signature,
            'X-SaveUp-Timestamp': timestamp,
          },
          body: event.payload,
        });

        // If the merchant's server responds with a 2xx success code
        if (response.ok) {
          success = true;
        }
      } catch (error) {
        console.error(`❌ Network failure reaching ${event.merchant.webhookUrl}`);
      }

      // 3. Update the database ledger based on the result
      const newAttempts = event.attempts + 1;

      if (success) {
        // IT WORKED! Mark as success.
        await db.update(webhookEvents)
          .set({ status: 'success', attempts: newAttempts, lastAttemptAt: new Date() })
          .where(eq(webhookEvents.id, event.id));
          
        console.log(`✅ Webhook delivered for Event ID: ${event.id}`);
      } else {
        // IT FAILED! Apply Exponential Backoff (Wait 5 mins, then 10, 20, 40...)
        const isFinalAttempt = newAttempts >= MAX_ATTEMPTS;
        const minutesToWait = Math.pow(2, newAttempts) * 5; 
        const nextAttempt = new Date(Date.now() + minutesToWait * 60000);

        await db.update(webhookEvents)
          .set({ 
            status: isFinalAttempt ? 'failed' : 'pending', 
            attempts: newAttempts, 
            lastAttemptAt: new Date(),
            nextAttemptAt: nextAttempt 
          })
          .where(eq(webhookEvents.id, event.id));

        console.log(`⚠️ Webhook failed for ${event.id}. Attempt ${newAttempts}/${MAX_ATTEMPTS}. ${isFinalAttempt ? 'Given up.' : `Retrying at ${nextAttempt.toLocaleTimeString()}`}`);
      }
    }

    return NextResponse.json({ processed: pendingEvents.length, message: 'Queue processed.' }, { status: 200 });

  } catch (error: any) {
    console.error('CRON Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}