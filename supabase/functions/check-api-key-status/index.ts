import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is super admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is super admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Super admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check RESEND_API_KEY from environment (secret)
    const secretApiKey = Deno.env.get('RESEND_API_KEY');
    const hasSecret = !!secretApiKey && secretApiKey.trim().length > 0;
    
    // Check system_settings
    const { data: settingData } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'resend_api_key')
      .single();
    
    const hasSetting = !!settingData?.setting_value && settingData.setting_value.trim().length > 0;

    // Return masked key for super admin
    let maskedKey = '';
    if (hasSecret && secretApiKey) {
      maskedKey = secretApiKey;
    } else if (hasSetting && settingData?.setting_value) {
      maskedKey = settingData.setting_value;
    }

    return new Response(JSON.stringify({ 
      isConfigured: hasSecret || hasSetting,
      apiKey: maskedKey,
      source: hasSecret ? 'secret' : (hasSetting ? 'database' : 'none'),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in check-api-key-status function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
