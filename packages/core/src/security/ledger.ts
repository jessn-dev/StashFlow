/**
 * Ledger entry interface for signing.
 * Represents the minimal set of fields that must remain immutable to ensure ledger integrity.
 */
export interface LedgerEntry {
  /** Unique identifier for the ledger record. */
  id: string;
  /** The owner of the record. */
  userId: string;
  /** The transaction amount. */
  amount: number;
  /** ISO currency code. */
  currency: string;
  /** Categorization of the movement. */
  type: 'income' | 'expense';
  /** The effective date of the transaction. */
  date: string;
  /** System timestamp when the record was first created. */
  createdAt: string;
}

/**
 * Signs a ledger entry using HMAC-SHA256 to ensure data integrity and authenticity.
 * 
 * PSEUDOCODE:
 * 1. Initialize a TextEncoder to convert strings to UTF-8 byte arrays.
 * 2. Encode the secret key and the JSON-serialized entry into byte arrays.
 * 3. Import the raw secret key into a CryptoKey object for HMAC-SHA256.
 * 4. Generate the HMAC signature over the entry data.
 * 5. Convert the resulting signature buffer into a hex-encoded string.
 * 6. Return the hex signature.
 * 
 * @param entry - The ledger data to sign.
 * @param secret - The private signing key.
 * @returns A Promise resolving to the hex-encoded signature.
 * @throws Error - If cryptographic operations fail.
 */
export async function signEntry(entry: LedgerEntry, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  // Stringify must be deterministic for signature consistency.
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
 * Verifies a ledger entry signature against a provided secret.
 * 
 * PSEUDOCODE:
 * 1. Initialize a TextEncoder.
 * 2. Encode the secret and the JSON-serialized entry into byte arrays.
 * 3. Import the raw secret key into a CryptoKey object for HMAC verification.
 * 4. Convert the hex-encoded signature string back into a byte array.
 * 5. Use the Web Crypto API to verify the signature against the data and key.
 * 6. Return the boolean result.
 * 
 * @param entry - The ledger data that was signed.
 * @param signature - The hex-encoded signature to verify.
 * @param secret - The private signing key.
 * @returns A Promise resolving to true if valid, false otherwise.
 * @throws Error - If cryptographic operations fail or signature format is invalid.
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

  // Convert hex string to Uint8Array for verification.
  const sigBytes = new Uint8Array(
    signature.match(/.{1,2}/g)?.map((byte) => Number.parseInt(byte, 16)) || []
  );

  return await crypto.subtle.verify('HMAC', cryptoKey, sigBytes, data);
}
