import { describe, it, expect, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { signEntry, verifyEntry, type LedgerEntry } from '../../src/security/ledger';

// Polyfill Web Crypto for Vitest (Node.js environment)
vi.stubGlobal('crypto', webcrypto);

describe('Ledger Integrity', () => {
  const secret = 'test-secret-key-at-least-32-chars-long-!!!';
  const entry: LedgerEntry = {
    id: 'txn_123',
    userId: 'user_456',
    amount: 1000,
    currency: 'PHP',
    type: 'income',
    date: '2026-05-01',
    createdAt: '2026-05-01T10:00:00Z',
  };

  it('should sign and verify a valid entry', async () => {
    const signature = await signEntry(entry, secret);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBe(64); // SHA-256 hex is 64 chars

    const isValid = await verifyEntry(entry, signature, secret);
    expect(isValid).toBe(true);
  });

  it('should fail verification if entry data is tampered', async () => {
    const signature = await signEntry(entry, secret);
    
    const tamperedEntry = { ...entry, amount: 9999 }; // Change amount
    const isValid = await verifyEntry(tamperedEntry, signature, secret);
    expect(isValid).toBe(false);
  });

  it('should fail verification if signature is tampered', async () => {
    const signature = await signEntry(entry, secret);
    const tamperedSignature = signature.replace('a', 'b'); // Minor hex change
    
    const isValid = await verifyEntry(entry, tamperedSignature, secret);
    expect(isValid).toBe(false);
  });

  it('should fail verification if secret is different', async () => {
    const signature = await signEntry(entry, secret);
    const wrongSecret = 'wrong-secret-key-wrong-wrong-wrong';
    
    const isValid = await verifyEntry(entry, signature, wrongSecret);
    expect(isValid).toBe(false);
  });

  it('should return false for invalid signature format (non-hex)', async () => {
    const isValid = await verifyEntry(entry, 'invalid-signature-format', secret);
    expect(isValid).toBe(false);
  });

  it('should produce stable signatures for identical inputs', async () => {
    const sig1 = await signEntry(entry, secret);
    const sig2 = await signEntry(entry, secret);
    expect(sig1).toBe(sig2);
  });
});
