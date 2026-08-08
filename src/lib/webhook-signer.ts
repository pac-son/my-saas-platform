import crypto from 'crypto';

/**
 * Signs a webhook payload using HMAC-SHA256.
 * Merchants can verify authenticity by computing the same hash
 * with their secret key and comparing it to the X-SaveUp-Signature header.
 *
 * Verification example (Node.js):
 *   const expected = crypto.createHmac('sha256', secretKey)
 *     .update(timestamp + '.' + rawBody)
 *     .digest('hex');
 *   const isValid = expected === signatureHeader;
 */
export function signWebhook(secretKey: string, timestamp: string, payload: string): string {
  // Concatenate timestamp + payload to prevent replay attacks
  const signatureInput = `${timestamp}.${payload}`;
  return crypto
    .createHmac('sha256', secretKey)
    .update(signatureInput)
    .digest('hex');
}
