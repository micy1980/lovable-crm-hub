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

// Helper to decode JWT payload
function decodeJwtPayload(token: string): any {
  try {
    const payload = token.split('.')[1];
    const padded = payload.padEnd(payload.length + (4 - (payload.length % 4)) % 4, '=');
    const json = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch (error) {
    console.error('JWT decode error:', error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Step 3A: Require Authorization header and extract session info
    const authHeader = req.headers.get('Authorization') || '';
    const tokenMatch = authHeader.match(/^Bearer (.+)$/);
    const accessToken = tokenMatch?.[1];

    if (!accessToken) {
      return new Response(
        JSON.stringify({ valid: false, error: 'missing_auth' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Decode JWT to get userId and sessionId
    const jwtPayload = decodeJwtPayload(accessToken);
    const userId = jwtPayload?.sub as string | undefined;
    const sessionId = jwtPayload?.session_id as string | undefined;

    if (!userId || !sessionId) {
      return new Response(
        JSON.stringify({ valid: false, error: 'invalid_session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    );

    // Load 2FA settings (session duration + rate limiting config)
    const { data: twoFaSettings, error: twoFaSettingsError } = await supabaseAdmin
      .rpc('get_2fa_settings');

    if (twoFaSettingsError) {
      console.error('Error loading 2FA settings, using defaults:', twoFaSettingsError);
    }

    const sessionDurationMinutes = twoFaSettings?.[0]?.session_duration_minutes ?? 720;
    const maxAttempts = twoFaSettings?.[0]?.max_attempts ?? 10;
    const windowMinutes = twoFaSettings?.[0]?.window_minutes ?? 10;
    const lockMinutes = twoFaSettings?.[0]?.lock_minutes ?? 10;

    // Check if user is locked from 2FA attempts
    const { data: locked, error: lockCheckError } = await supabaseAdmin
      .rpc('is_two_factor_locked', { _user_id: userId });

    if (lockCheckError) {
      console.error('Error checking 2FA lock status:', lockCheckError);
    }

    if (locked === true) {
      return new Response(
        JSON.stringify({ valid: false, error: 'two_factor_locked' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { token, recoveryCode } = await req.json();

    // At least one must be provided
    const totpToken = (token ?? '').toString().trim();
    const recoveryCodeValue = (recoveryCode ?? '').toString().trim();

    if (!totpToken && !recoveryCodeValue) {
      return new Response(
        JSON.stringify({ valid: false, error: 'invalid_code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3B: Get user's 2FA secret using userId from JWT (not from request body)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, two_factor_secret, two_factor_enabled')
      .eq('id', userId)
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

    // Priority: check recovery code first if provided
    if (recoveryCodeValue) {
      // Verify recovery code
      const { data: recoveryCodes, error: recoveryError } = await supabaseAdmin
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

      // Check if recoveryCode matches any stored code
      for (const code of recoveryCodes || []) {
        const expectedHash = await crypto.subtle.digest(
          'SHA-256',
          new TextEncoder().encode(recoveryCodeValue)
        );
        const expectedHashHex = Array.from(new Uint8Array(expectedHash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (code.code_hash === expectedHashHex) {
          isValid = true;
          
          // Mark recovery code as used
          await supabaseAdmin
            .from('user_recovery_codes')
            .update({ used: true, used_at: new Date().toISOString() })
            .eq('id', code.id);
          
          break;
        }
      }
    } else if (totpToken) {
      // Verify TOTP token
      if (!profile.two_factor_secret) {
        return new Response(
          JSON.stringify({ valid: false, error: 'invalid_code' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      isValid = verifyTOTP(profile.two_factor_secret, totpToken);
    }

    // Log the attempt to two_factor_attempts table
    const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('cf-connecting-ip') ?? null;
    
    const { error: logError } = await supabaseAdmin
      .from('two_factor_attempts')
      .insert({
        user_id: userId,
        success: isValid,
        ip_address: ipAddress,
      });

    if (logError) {
      console.error('Error logging 2FA attempt:', logError);
    }

    // If verification failed, check if we should lock the user
    if (!isValid) {
      const { error: applyLockError } = await supabaseAdmin
        .rpc('apply_two_factor_lock_if_needed', {
          _user_id: userId,
          _max_attempts: maxAttempts,
          _window_minutes: windowMinutes,
          _lock_minutes: lockMinutes,
        });

      if (applyLockError) {
        console.error('Error applying 2FA lock if needed:', applyLockError);
      }

      return new Response(
        JSON.stringify({ valid: false, error: 'invalid_code' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3C: On successful verification, mark session as verified via service role
    const expiresAt = new Date(Date.now() + sessionDurationMinutes * 60 * 1000).toISOString();
    
    const { error: markError } = await supabaseAdmin
      .from('session_2fa_verifications')
      .upsert(
        {
          user_id: userId,
          session_id: sessionId,
          verified_at: new Date().toISOString(),
          expires_at: expiresAt,
        },
        { onConflict: 'user_id,session_id' }
      );

    if (markError) {
      console.error('Error marking 2FA verified:', markError);
      return new Response(
        JSON.stringify({ valid: false, error: 'server_error' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ valid: true }),
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