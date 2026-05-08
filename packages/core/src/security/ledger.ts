/**
 * Ledger entry interface for signing.
 * Represents the minimal set of fields that must remain immutable.
 */
export interface LedgerEntry {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  type: 'income' | 'expense';
  date: string;
  createdAt: string;
}

/**
 * Signs a ledger entry using HMAC-SHA256.
 * Returns a hex-encoded signature.
 */
export async function signEntry(entry: LedgerEntry, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(JSON.stringify(entry));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifies a ledger entry signature.
 * Returns true if the signature is valid.
 */
export async function verifyEntry(
  entry: LedgerEntry,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(JSON.stringify(entry));

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const sigBytes = new Uint8Array(
    signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
  );

  return await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, data);
}
