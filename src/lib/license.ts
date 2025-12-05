/**
 * ORBIX License Key Generation and Validation
 * 
 * Format: 25 alphanumeric characters (base-36) displayed as 5 blocks of 5
 * Example: AB4KD-9ZQ1M-F7H2P-WX3C8-R2L0S
 * 
 * Encoding (64-bit payload):
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

export interface LicenseInput {
  maxUsers: number;
  validFrom: Date;
  validUntil: Date;
  features: LicenseFeature[];
}

// Epoch: 2000-01-01
const EPOCH = new Date('2000-01-01T00:00:00Z');
const LICENSE_VERSION = 1;
const SECRET_KEY = 'ORBIX_LICENSE_SECRET_2025';

// Feature bit positions (MSB first) - 8 bits for 7 features
const FEATURE_ORDER: LicenseFeature[] = ['partners', 'projects', 'sales', 'documents', 'calendar', 'my_items', 'audit'];

/**
 * Convert a date to days since epoch
 */
function dateToDays(date: Date): number {
  const ms = date.getTime() - EPOCH.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

/**
 * Convert days since epoch to Date
 */
function daysToDate(days: number): Date {
  const ms = EPOCH.getTime() + days * 24 * 60 * 60 * 1000;
  return new Date(ms);
}

/**
 * Convert features array to 8-bit mask
 */
function featuresToMask(features: LicenseFeature[]): number {
  let mask = 0;
  for (let i = 0; i < FEATURE_ORDER.length; i++) {
    if (features.includes(FEATURE_ORDER[i])) {
      mask |= (1 << (7 - i)); // MSB first
    }
  }
  return mask;
}

/**
 * Convert 8-bit mask to features array
 */
function maskToFeatures(mask: number): LicenseFeature[] {
  const features: LicenseFeature[] = [];
  for (let i = 0; i < FEATURE_ORDER.length; i++) {
    if (mask & (1 << (7 - i))) {
      features.push(FEATURE_ORDER[i]);
    }
  }
  return features;
}

/**
 * Convert byte array to BigInt (big-endian)
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

/**
 * Convert BigInt to byte array (big-endian, minimal length)
 */
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
  
  // Pad to minimum length if needed
  while (bytes.length < minLength) {
    bytes.unshift(0);
  }
  
  return new Uint8Array(bytes);
}

/**
 * Encode BigInt as base-36 with fixed length
 */
function bigIntToBase36(value: bigint, length: number): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  let temp = value;
  
  while (temp > 0n) {
    result = chars[Number(temp % 36n)] + result;
    temp = temp / 36n;
  }
  
  // Pad with leading zeros
  return result.padStart(length, '0');
}

/**
 * Decode base-36 string to BigInt
 */
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

/**
 * Compute HMAC-SHA256 using Web Crypto API
 */
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

/**
 * Constant-time buffer comparison
 */
function constantTimeCompare(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * Generate a random 12-bit nonce
 */
function generateNonce(): number {
  const randomBytes = new Uint8Array(2);
  crypto.getRandomValues(randomBytes);
  return ((randomBytes[0] << 8) | randomBytes[1]) & 0xFFF; // 12 bits = 0-4095
}

/**
 * Generate a license key from input parameters
 */
export async function generateLicenseKey(input: LicenseInput): Promise<string> {
  // Validate input
  if (input.maxUsers < 1 || input.maxUsers > 1023) {
    throw new Error('maxUsers must be between 1 and 1023');
  }
  if (input.validUntil < input.validFrom) {
    throw new Error('validUntil must be >= validFrom');
  }
  
  const version = LICENSE_VERSION;
  const nonce = generateNonce(); // 12-bit random value
  const maxUsers = input.maxUsers;
  const validFromDays = dateToDays(input.validFrom);
  const validUntilDays = dateToDays(input.validUntil);
  const featuresMask = featuresToMask(input.features);
  
  // Check date range fits in 15 bits (0..32767 days)
  if (validFromDays < 0 || validFromDays > 32767 || validUntilDays < 0 || validUntilDays > 32767) {
    throw new Error('Dates out of range (must be within ~89 years of epoch 2000-01-01)');
  }
  
  // Build 64-bit payload (big-endian)
  let payload = 0n;
  payload = (payload << 4n) | BigInt(version);        // 4 bits
  payload = (payload << 12n) | BigInt(nonce);         // 12 bits (NEW)
  payload = (payload << 10n) | BigInt(maxUsers);      // 10 bits
  payload = (payload << 15n) | BigInt(validFromDays); // 15 bits
  payload = (payload << 15n) | BigInt(validUntilDays);// 15 bits
  payload = (payload << 8n) | BigInt(featuresMask);   // 8 bits
  // Total: 64 bits = 8 bytes
  
  // Convert to bytes
  const payloadBytes = bigIntToBytes(payload, 8);
  
  // Compute HMAC-SHA256 and truncate to 7 bytes
  const mac = await hmacSha256(SECRET_KEY, payloadBytes);
  const macBytes = mac.slice(0, 7);
  
  // Concatenate payload + MAC (8 + 7 = 15 bytes)
  const combined = new Uint8Array(15);
  combined.set(payloadBytes, 0);
  combined.set(macBytes, 8);
  
  // Convert to BigInt and then to base-36 (25 characters)
  const combinedBigInt = bytesToBigInt(combined);
  const base36 = bigIntToBase36(combinedBigInt, 25);
  
  // Format as 5 blocks of 5
  return `${base36.slice(0, 5)}-${base36.slice(5, 10)}-${base36.slice(10, 15)}-${base36.slice(15, 20)}-${base36.slice(20, 25)}`;
}

/**
 * Verify and decode a license key
 */
export async function verifyAndDecodeLicenseKey(rawKey: string): Promise<DecodedLicense | null> {
  try {
    // Normalize: remove non-alphanumeric, uppercase
    const normalized = rawKey.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    
    // Check length
    if (normalized.length !== 25) {
      return null;
    }
    
    // Decode from base-36
    const combinedBigInt = base36ToBigInt(normalized);
    const combined = bigIntToBytes(combinedBigInt, 15);
    
    // Must be exactly 15 bytes
    if (combined.length !== 15) {
      return null;
    }
    
    // Split into payload (8 bytes) and MAC (7 bytes)
    const payloadBytes = combined.slice(0, 8);
    const receivedMac = combined.slice(8, 15);
    
    // Verify HMAC
    const computedMac = await hmacSha256(SECRET_KEY, payloadBytes);
    const expectedMac = computedMac.slice(0, 7);
    
    if (!constantTimeCompare(receivedMac, expectedMac)) {
      return null; // Invalid MAC
    }
    
    // Decode payload (64 bits)
    const payload = bytesToBigInt(payloadBytes);
    
    // Extract fields (big-endian, MSB first)
    // Layout: version(4) + nonce(12) + maxUsers(10) + validFrom(15) + validUntil(15) + features(8) = 64 bits
    const featuresMask = Number(payload & 0xFFn);                     // 8 bits
    const validUntilDays = Number((payload >> 8n) & 0x7FFFn);         // 15 bits
    const validFromDays = Number((payload >> 23n) & 0x7FFFn);         // 15 bits
    const maxUsers = Number((payload >> 38n) & 0x3FFn);               // 10 bits
    // nonce at bits 48-59 (12 bits) - we don't need to decode it
    const version = Number((payload >> 60n) & 0xFn);                  // 4 bits
    
    // Validate version
    if (version !== LICENSE_VERSION) {
      return null;
    }
    
    // Validate basic invariants
    if (maxUsers < 1) {
      return null;
    }
    
    const validFrom = daysToDate(validFromDays);
    const validUntil = daysToDate(validUntilDays);
    
    if (validUntil < validFrom) {
      return null;
    }
    
    // Decode features
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

/**
 * Format a license key for display (add hyphens)
 */
export function formatLicenseKey(key: string): string {
  const normalized = key.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (normalized.length !== 25) return key;
  return `${normalized.slice(0, 5)}-${normalized.slice(5, 10)}-${normalized.slice(10, 15)}-${normalized.slice(15, 20)}-${normalized.slice(20, 25)}`;
}
