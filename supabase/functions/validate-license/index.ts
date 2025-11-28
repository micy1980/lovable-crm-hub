import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationResponse {
  valid: boolean;
  company_id?: string;
  company_name?: string;
  license_type?: string;
  max_users?: number;
  valid_until?: string;
  features?: string[];
  reason?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { license_key } = await req.json();

    if (!license_key) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: 'License key is required',
        } as ValidationResponse),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client with service role for validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch license by key
    const { data: license, error: licenseError } = await supabase
      .from('company_licenses')
      .select(`
        *,
        companies!inner (
          id,
          name,
          deleted_at
        )
      `)
      .eq('license_key', license_key)
      .single();

    if (licenseError || !license) {
      console.error('License lookup error:', licenseError);
      return new Response(
        JSON.stringify({
          valid: false,
          reason: 'Invalid license key',
        } as ValidationResponse),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if company is deleted
    if (license.companies.deleted_at) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: 'Company no longer exists',
        } as ValidationResponse),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if license is active
    if (!license.is_active) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: 'License is inactive',
        } as ValidationResponse),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if license has expired
    const now = new Date();
    const validFrom = new Date(license.valid_from);
    const validUntil = new Date(license.valid_until);

    if (now < validFrom) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: 'License not yet valid',
        } as ValidationResponse),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (now > validUntil) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: 'License has expired',
        } as ValidationResponse),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // License is valid
    return new Response(
      JSON.stringify({
        valid: true,
        company_id: license.companies.id,
        company_name: license.companies.name,
        license_type: license.license_type,
        max_users: license.max_users,
        valid_until: license.valid_until,
        features: license.features,
      } as ValidationResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({
        valid: false,
        reason: 'Internal server error',
      } as ValidationResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
