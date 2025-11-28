import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LicenseData {
  max_users: number;
  features: string[];
  valid_from: string;
  valid_until: string;
  generated_at: string;
}

interface ActivationRequest {
  company_id: string;
  license_key: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { company_id, license_key }: ActivationRequest = await req.json();

    console.log('Activating license for company:', company_id);

    // Validate license key format
    if (!license_key || !license_key.includes('-')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Érvénytelen licensz kulcs formátum'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Parse license key format: ORB-XXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXX (3x25)
    const parts = license_key.split('-');
    
    if (parts.length !== 4) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Érvénytelen licensz kulcs formátum',
          details: 'A kulcs formátuma nem megfelelő. Elvárt: ORB-{25 kar}-{25 kar}-{25 kar}'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prefix = parts[0].toUpperCase();

    // Validate prefix
    if (prefix !== 'ORB') {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Érvénytelen licensz kulcs előtag',
          details: `Az előtag "${prefix}" nem támogatott. Csak ORB elfogadott.`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract encrypted data (join the 3 blocks of 25 characters)
    const encryptedKey = parts.slice(1).join('');

    // Decrypt and decode license data
    let licenseData: LicenseData;
    try {
      const SECRET_KEY = "ORBIX_LICENSE_SECRET_2025";
      
      // Reconstruct base64 by adding padding if needed
      let base64Data = encryptedKey;
      while (base64Data.length % 4 !== 0) {
        base64Data += '=';
      }
      
      // Decode base64
      const encryptedString = atob(base64Data);
      
      // Decrypt with XOR
      let decrypted = '';
      for (let i = 0; i < encryptedString.length; i++) {
        decrypted += String.fromCharCode(encryptedString.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length));
      }
      
      licenseData = JSON.parse(decrypted);
      console.log('Decoded license data:', licenseData);
    } catch (error) {
      console.error('Failed to decode license:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nem sikerült a licensz dekódolása'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Validate license data structure
    if (!licenseData.max_users || !licenseData.features || !licenseData.valid_from || !licenseData.valid_until) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Hiányos licensz adatok'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Check if company exists
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', company_id)
      .is('deleted_at', null)
      .single();

    if (companyError || !company) {
      console.error('Company not found:', companyError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Vállalat nem található'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if license key is already used by another company
    const { data: existingLicense } = await supabase
      .from('company_licenses')
      .select('company_id')
      .eq('license_key', license_key)
      .neq('company_id', company_id)
      .single();

    if (existingLicense) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Ez a licensz kulcs már használatban van másik vállalatnál'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      );
    }

    // Create or update license
    const licenseRecord = {
      company_id,
      license_type: prefix.toLowerCase(),
      max_users: licenseData.max_users,
      valid_from: new Date(licenseData.valid_from).toISOString(),
      valid_until: new Date(licenseData.valid_until + 'T23:59:59').toISOString(),
      is_active: true,
      features: licenseData.features,
      license_key,
    };

    // Check if company already has a license
    const { data: currentLicense } = await supabase
      .from('company_licenses')
      .select('id')
      .eq('company_id', company_id)
      .single();

    let result;
    if (currentLicense) {
      // Update existing license
      const { data, error } = await supabase
        .from('company_licenses')
        .update(licenseRecord)
        .eq('id', currentLicense.id)
        .select()
        .single();

      if (error) {
        console.error('Failed to update license:', error);
        throw error;
      }
      result = data;
    } else {
      // Create new license
      const { data, error } = await supabase
        .from('company_licenses')
        .insert(licenseRecord)
        .select()
        .single();

      if (error) {
        console.error('Failed to create license:', error);
        throw error;
      }
      result = data;
    }

    console.log('License activated successfully for company:', company.name);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Licensz sikeresen aktiválva',
        license: {
          company_name: company.name,
          license_type: licenseRecord.license_type,
          max_users: licenseRecord.max_users,
          features: licenseRecord.features,
          valid_from: licenseRecord.valid_from,
          valid_until: licenseRecord.valid_until,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error activating license:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Belső szerver hiba'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
