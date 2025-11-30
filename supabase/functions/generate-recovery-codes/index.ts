import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) {
      code += '-';
    }
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return code;
}

async function hashCode(code: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      console.error('User auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { count = 8 } = await req.json();

    // Generate recovery codes
    const codes: string[] = [];
    const codeHashes: { code_hash: string; user_id: string }[] = [];

    for (let i = 0; i < count; i++) {
      const code = generateRecoveryCode();
      codes.push(code);
      
      const hash = await hashCode(code);
      codeHashes.push({
        code_hash: hash,
        user_id: user.id,
      });
    }

    // Delete old recovery codes
    const { error: deleteError } = await supabaseClient
      .from('user_recovery_codes')
      .delete()
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Error deleting old recovery codes:', deleteError);
    }

    // Insert new recovery codes
    const { error: insertError } = await supabaseClient
      .from('user_recovery_codes')
      .insert(codeHashes);

    if (insertError) {
      console.error('Error inserting recovery codes:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate recovery codes' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generated ${codes.length} recovery codes for user ${user.id}`);

    return new Response(
      JSON.stringify({ codes }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating recovery codes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});