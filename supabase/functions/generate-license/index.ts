import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type LicenseFeature = 'partners' | 'projects' | 'sales' | 'documents' | 'calendar' | 'my_items' | 'audit';

interface GenerateRequest {
  maxUsers: number;
  validFrom: string; // ISO date string
  validUntil: string; // ISO date string
  features: LicenseFeature[];
}

// Epoch: 2000-01-01
const EPOCH = new Date('2000-01-01T00:00:00Z');
const LICENSE_VERSION = 1;

// Get the secret from environment - NO FALLBACK ALLOWED
// If the secret is not configured, the function will fail explicitly
function getSecretKey(): string {
  const secret = Deno.env.get('LICENSE_SECRET_KEY');
  if (!secret) {
    throw new Error('LICENSE_SECRET_KEY environment variable is not configured');
  }
  return secret;
}

// Feature bit positions (MSB first) - 8 bits for 7 features
const FEATURE_ORDER: LicenseFeature[] = ['partners', 'projects', 'sales', 'documents', 'calendar', 'my_items', 'audit'];

function dateToDays(date: Date): number {
  const ms = date.getTime() - EPOCH.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function featuresToMask(features: LicenseFeature[]): number {
  let mask = 0;
  for (let i = 0; i < FEATURE_ORDER.length; i++) {
    if (features.includes(FEATURE_ORDER[i])) {
      mask |= (1 << (7 - i)); // MSB first
    }
  }
  return mask;
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

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = (result << 8n) | BigInt(bytes[i]);
  }
  return result;
}

function bigIntToBase36(value: bigint, length: number): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  let temp = value;
  
  while (temp > 0n) {
    result = chars[Number(temp % 36n)] + result;
    temp = temp / 36n;
  }
  
  return result.padStart(length, '0');
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
  
  const buffer = new Uint8Array(data);
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, buffer);
  return new Uint8Array(signature);
}

function generateNonce(): number {
  const randomBytes = new Uint8Array(2);
  crypto.getRandomValues(randomBytes);
  return ((randomBytes[0] << 8) | randomBytes[1]) & 0xFFF; // 12 bits = 0-4095
}

async function generateLicenseKey(input: GenerateRequest): Promise<string> {
  // Validate input
  if (input.maxUsers < 1 || input.maxUsers > 1023) {
    throw new Error('maxUsers must be between 1 and 1023');
  }
  
  const fromDate = new Date(input.validFrom);
  const toDate = new Date(input.validUntil);
  
  if (toDate < fromDate) {
    throw new Error('validUntil must be >= validFrom');
  }
  
  const version = LICENSE_VERSION;
  const nonce = generateNonce();
  const maxUsers = input.maxUsers;
  const validFromDays = dateToDays(fromDate);
  const validUntilDays = dateToDays(toDate);
  const featuresMask = featuresToMask(input.features);
  
  if (validFromDays < 0 || validFromDays > 32767 || validUntilDays < 0 || validUntilDays > 32767) {
    throw new Error('Dates out of range');
  }
  
  // Build 64-bit payload
  let payload = 0n;
  payload = (payload << 4n) | BigInt(version);
  payload = (payload << 12n) | BigInt(nonce);
  payload = (payload << 10n) | BigInt(maxUsers);
  payload = (payload << 15n) | BigInt(validFromDays);
  payload = (payload << 15n) | BigInt(validUntilDays);
  payload = (payload << 8n) | BigInt(featuresMask);
  
  const payloadBytes = bigIntToBytes(payload, 8);
  const mac = await hmacSha256(getSecretKey(), payloadBytes);
  const macBytes = mac.slice(0, 7);
  
  const combined = new Uint8Array(15);
  combined.set(payloadBytes, 0);
  combined.set(macBytes, 8);
  
  const combinedBigInt = bytesToBigInt(combined);
  const base36 = bigIntToBase36(combinedBigInt, 25);
  
  return `${base36.slice(0, 5)}-${base36.slice(5, 10)}-${base36.slice(10, 15)}-${base36.slice(15, 20)}-${base36.slice(20, 25)}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header and verify user is super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is super_admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      console.log('User is not super_admin:', profile?.role);
      return new Response(
        JSON.stringify({ success: false, error: 'Only super admins can generate license keys' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: GenerateRequest = await req.json();
    
    console.log('Generating license key for:', {
      maxUsers: body.maxUsers,
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      features: body.features
    });

    const licenseKey = await generateLicenseKey(body);

    console.log('License key generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        licenseKey,
        settings: {
          maxUsers: body.maxUsers,
          validFrom: body.validFrom,
          validUntil: body.validUntil,
          features: body.features
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating license:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
