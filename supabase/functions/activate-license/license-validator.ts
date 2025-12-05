/**
 * Server-side license validation for activate-license edge function
 * This duplicates the core validation logic from src/lib/license.ts
 * to run in the Deno environment without browser dependencies.
 * 
 * Format (64-bit payload):
 * - version: 4 bits
 * - nonce: 12 bits (random, ensures unique keys for same parameters)
 * - maxUsers: 10 bits
 * - validFromDays: 15 bits
 * - validUntilDays: 15 bits
 * - features: 8 bits
 * - Total payload: 64 bits (8 bytes)
 * - HMAC-SHA256 tag: 56 bits (7 bytes, truncated)
 * - Total: 120 bits = 15 bytes encoded as 25 base-36 characters
 */

export type LicenseFeature = 
  | 'partners'
  | 'projects'
  | 'sales'
  | 'documents'
  | 'calendar'
  | 'my_items'
  | 'audit';

export interface DecodedLicense {
  version: number;
  maxUsers: number;
  validFrom: Date;
  validUntil: Date;
  features: LicenseFeature[];
}

const EPOCH = new Date('2000-01-01T00:00:00Z');
const LICENSE_VERSION = 1;
const SECRET_KEY = 'ORBIX_LICENSE_SECRET_2025';

// Feature bit positions (MSB first) - 8 bits for 7 features
const FEATURE_ORDER: LicenseFeature[] = ['partners', 'projects', 'sales', 'documents', 'calendar', 'my_items', 'audit'];

function daysToDate(days: number): Date {
  const ms = EPOCH.getTime() + days * 24 * 60 * 60 * 1000;
  return new Date(ms);
}

function maskToFeatures(mask: number): LicenseFeature[] {
  const features: LicenseFeature[] = [];
  for (let i = 0; i < FEATURE_ORDER.length; i++) {
    if (mask & (1 << (7 - i))) {
      features.push(FEATURE_ORDER[i]);
    }
  }
  return features;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

function bigIntToBytes(value: bigint, minLength: number = 0): Uint8Array {
  if (value === 0n) {
    return new Uint8Array(Math.max(1, minLength));
  }
  
  const bytes: number[] = [];
  let temp = value;
  while (temp > 0n) {
    bytes.unshift(Number(temp & 0xFFn));
    temp = temp >> 8n;
  }
  
  while (bytes.length < minLength) {
    bytes.unshift(0);
  }
  
  return new Uint8Array(bytes);
}

function base36ToBigInt(str: string): bigint {
  let result = 0n;
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  for (let i = 0; i < str.length; i++) {
    const digit = chars.indexOf(str[i].toUpperCase());
    if (digit === -1) throw new Error('Invalid base-36 character');
    result = result * 36n + BigInt(digit);
  }
  
  return result;
}

async function hmacSha256(key: string, data: Uint8Array): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Create a clean ArrayBuffer to avoid SharedArrayBuffer type issues
  const buffer = new Uint8Array(data);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, buffer);
  return new Uint8Array(signature);
}

function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

export async function verifyAndDecodeLicenseKey(rawKey: string): Promise<DecodedLicense | null> {
  try {
    const normalized = rawKey.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    if (normalized.length !== 25) {
      console.log('License key length invalid:', normalized.length);
      return null;
    }
    
    const combinedBigInt = base36ToBigInt(normalized);
    const combined = bigIntToBytes(combinedBigInt, 15);
    
    if (combined.length !== 15) {
      console.log('Combined bytes length invalid:', combined.length);
      return null;
    }
    
    // Split into payload (8 bytes) and MAC (7 bytes)
    const payloadBytes = combined.slice(0, 8);
    const receivedMac = combined.slice(8, 15);
    
    const computedMac = await hmacSha256(SECRET_KEY, payloadBytes);
    const expectedMac = computedMac.slice(0, 7);
    
    if (!constantTimeCompare(receivedMac, expectedMac)) {
      console.log('HMAC verification failed');
      return null;
    }
    
    const payload = bytesToBigInt(payloadBytes);
    
    // Extract fields (big-endian, MSB first)
    // Layout: version(4) + nonce(12) + maxUsers(10) + validFrom(15) + validUntil(15) + features(8) = 64 bits
    const featuresMask = Number(payload & 0xFFn);                     // 8 bits
    const validUntilDays = Number((payload >> 8n) & 0x7FFFn);         // 15 bits
    const validFromDays = Number((payload >> 23n) & 0x7FFFn);         // 15 bits
    const maxUsers = Number((payload >> 38n) & 0x3FFn);               // 10 bits
    // nonce at bits 48-59 (12 bits) - we don't need to decode it
    const version = Number((payload >> 60n) & 0xFn);                  // 4 bits
    
    console.log('Decoded license fields:', { version, maxUsers, validFromDays, validUntilDays, featuresMask });
    
    if (version !== LICENSE_VERSION) {
      console.log('Version mismatch:', version, 'expected:', LICENSE_VERSION);
      return null;
    }
    
    if (maxUsers < 1) {
      console.log('Invalid maxUsers:', maxUsers);
      return null;
    }
    
    const validFrom = daysToDate(validFromDays);
    const validUntil = daysToDate(validUntilDays);
    
    if (validUntil < validFrom) {
      console.log('Invalid date range: validUntil < validFrom');
      return null;
    }
    
    const features = maskToFeatures(featuresMask);
    
    console.log('License validated successfully:', { maxUsers, validFrom, validUntil, features });
    
    return {
      version,
      maxUsers,
      validFrom,
      validUntil,
      features
    };
  } catch (error) {
    console.error('License decoding error:', error);
    return null;
  }
}
