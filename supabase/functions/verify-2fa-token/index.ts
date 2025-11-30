import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple TOTP verification (RFC 6238)
function verifyTOTP(secret: string, token: string, window = 1): boolean {
  const time = Math.floor(Date.now() / 1000);
  const timeStep = 30; // 30 seconds per step
  
  // Check current time window and adjacent windows
  for (let i = -window; i <= window; i++) {
    const testTime = time + (i * timeStep);
    const expectedToken = generateTOTP(secret, testTime);
    if (expectedToken === token) {
      return true;
    }
  }
  
  return false;
}

function generateTOTP(secret: string, time: number): string {
  const timeStep = 30;
  const counter = Math.floor(time / timeStep);
  
  // Decode base32 secret
  const key = base32Decode(secret);
  
  // Generate HMAC-SHA1
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(counter), false);
  
  const hmac = hmacSha1(key, new Uint8Array(buffer));
  
  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = 
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  
  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

function base32Decode(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  
  for (const char of base32.toUpperCase()) {
    const val = alphabet.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substr(i * 8, 8), 2);
  }
  
  return bytes;
}

function hmacSha1(key: Uint8Array, data: Uint8Array): Uint8Array {
  const blockSize = 64;
  
  // Adjust key size
  let adjustedKey = key;
  if (key.length > blockSize) {
    adjustedKey = sha1(key);
  }
  if (adjustedKey.length < blockSize) {
    const temp = new Uint8Array(blockSize);
    temp.set(adjustedKey);
    adjustedKey = temp;
  }
  
  // Create inner and outer padded keys
  const innerKey = new Uint8Array(blockSize);
  const outerKey = new Uint8Array(blockSize);
  
  for (let i = 0; i < blockSize; i++) {
    innerKey[i] = adjustedKey[i] ^ 0x36;
    outerKey[i] = adjustedKey[i] ^ 0x5c;
  }
  
  // HMAC = H(outerKey || H(innerKey || message))
  const innerHash = sha1(concat(innerKey, data));
  return sha1(concat(outerKey, innerHash));
}

function sha1(data: Uint8Array): Uint8Array {
  // Simple SHA-1 implementation
  const h = [0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476, 0xC3D2E1F0];
  
  const ml = data.length * 8;
  const paddedLength = Math.ceil((ml + 65) / 512) * 512;
  const padded = new Uint8Array(paddedLength / 8);
  padded.set(data);
  padded[data.length] = 0x80;
  
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 4, ml, false);
  
  for (let i = 0; i < padded.length; i += 64) {
    const w = new Array(80);
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false);
    }
    
    for (let j = 16; j < 80; j++) {
      w[j] = rotateLeft(w[j-3] ^ w[j-8] ^ w[j-14] ^ w[j-16], 1);
    }
    
    let [a, b, c, d, e] = h;
    
    for (let j = 0; j < 80; j++) {
      let f, k;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5A827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ED9EBA1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8F1BBCDC;
      } else {
        f = b ^ c ^ d;
        k = 0xCA62C1D6;
      }
      
      const temp = (rotateLeft(a, 5) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = rotateLeft(b, 30);
      b = a;
      a = temp;
    }
    
    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
  }
  
  const result = new Uint8Array(20);
  const resultView = new DataView(result.buffer);
  for (let i = 0; i < 5; i++) {
    resultView.setUint32(i * 4, h[i], false);
  }
  
  return result;
}

function rotateLeft(n: number, b: number): number {
  return ((n << b) | (n >>> (32 - b))) >>> 0;
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a);
  result.set(b, a.length);
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const { email, token, isRecoveryCode } = await req.json();

    if (!email || !token) {
      return new Response(
        JSON.stringify({ error: 'Email and token are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's 2FA secret and recovery codes
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, two_factor_secret, two_factor_enabled')
      .eq('email', email)
      .eq('two_factor_enabled', true)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ valid: false, error: 'invalid_code' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let isValid = false;

    if (isRecoveryCode) {
      // Verify recovery code
      const { data: recoveryCodes, error: recoveryError } = await supabaseClient
        .from('user_recovery_codes')
        .select('id, code_hash')
        .eq('user_id', profile.id)
        .eq('used', false);

      if (recoveryError) {
        console.error('Recovery codes fetch error:', recoveryError);
        return new Response(
          JSON.stringify({ valid: false, error: 'invalid_code' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if token matches any recovery code
      for (const code of recoveryCodes || []) {
        // Simple hash comparison (in production, use proper hashing like bcrypt)
        const expectedHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(token)
        );
        const expectedHashHex = Array.from(new Uint8Array(expectedHash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (code.code_hash === expectedHashHex) {
          isValid = true;
          
          // Mark recovery code as used
          await supabaseClient
            .from('user_recovery_codes')
            .update({ used: true, used_at: new Date().toISOString() })
            .eq('id', code.id);
          
          break;
        }
      }
    } else {
      // Verify TOTP token
      if (!profile.two_factor_secret) {
        return new Response(
          JSON.stringify({ valid: false, error: 'invalid_code' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      isValid = verifyTOTP(profile.two_factor_secret, token);
    }

    return new Response(
      JSON.stringify({ valid: isValid, error: isValid ? undefined : 'invalid_code' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying 2FA token:', error);
    return new Response(
      JSON.stringify({ valid: false, error: 'server_error' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});