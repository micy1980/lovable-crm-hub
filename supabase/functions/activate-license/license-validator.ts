/**
 * Server-side license validation for activate-license edge function
 * This duplicates the core validation logic from src/lib/license.ts
 * to run in the Deno environment without browser dependencies.
 */

export type LicenseFeature = 
  | 'partners'
  | 'sales'
  | 'calendar'
  | 'projects'
  | 'documents'
  | 'logs';

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

const FEATURE_ORDER: LicenseFeature[] = ['partners', 'sales', 'calendar', 'projects', 'documents', 'logs'];

function daysToDate(days: number): Date {
  const ms = EPOCH.getTime() + days * 24 * 60 * 60 * 1000;
  return new Date(ms);
}

function maskToFeatures(mask: number): LicenseFeature[] {
  const features: LicenseFeature[] = [];
  for (let i = 0; i < FEATURE_ORDER.length; i++) {
    if (mask & (1 << (5 - i))) {
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
      return null;
    }
    
    const combinedBigInt = base36ToBigInt(normalized);
    const combined = bigIntToBytes(combinedBigInt, 15);
    
    if (combined.length !== 15) {
      return null;
    }
    
    const payloadBytes = combined.slice(0, 7);
    const receivedMac = combined.slice(7, 15);
    
    const computedMac = await hmacSha256(SECRET_KEY, payloadBytes);
    const expectedMac = computedMac.slice(0, 8);
    
    if (!constantTimeCompare(receivedMac, expectedMac)) {
      return null;
    }
    
    const payload = bytesToBigInt(payloadBytes);
    
    const featuresMask = Number(payload & 0x3Fn);
    const validUntilDays = Number((payload >> 6n) & 0x7FFFn);
    const validFromDays = Number((payload >> 21n) & 0x7FFFn);
    const maxUsers = Number((payload >> 36n) & 0x3FFn);
    const version = Number((payload >> 46n) & 0xFn);
    
    if (version !== LICENSE_VERSION) {
      return null;
    }
    
    if (maxUsers < 1) {
      return null;
    }
    
    const validFrom = daysToDate(validFromDays);
    const validUntil = daysToDate(validUntilDays);
    
    if (validUntil < validFrom) {
      return null;
    }
    
    const features = maskToFeatures(featuresMask);
    
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
