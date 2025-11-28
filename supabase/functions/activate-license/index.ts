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

    // Normalize and validate license key format: 25 alphanumeric chars, typically shown as 5x5 groups
    if (!license_key) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Érvénytelen licensz kulcs',
          details: 'A kulcs nem lehet üres.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Remove all non-alphanumeric characters and uppercase (hyphens/spaces ignored, case-insensitive)
    const normalizedKey = license_key.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    if (normalizedKey.length !== 25) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Érvénytelen licensz kulcs formátum',
          details: 'A kulcs formátuma nem megfelelő. Elvárt: 5×5 karakteres kód (25 betű/szám).',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Encrypted payload is the normalized 25-character key
    const encryptedKey = normalizedKey;

    // Decrypt and decode license data
    let licenseData: LicenseData;
    try {
      const SECRET_KEY = 'ORBIX_LICENSE_SECRET_2025';

      // Convert uppercase hex string to decrypted string
      const hexString = encryptedKey.toUpperCase();
      let decrypted = '';

      // Process hex pairs (each 2 hex chars = 1 byte)
      for (let i = 0; i < hexString.length; i += 2) {
        const hexByte = hexString.substring(i, i + 2);
        const charCode = parseInt(hexByte, 16) ^ SECRET_KEY.charCodeAt((i / 2) % SECRET_KEY.length);
        decrypted += String.fromCharCode(charCode);
      }

      // Parse compact format
      const compactData = JSON.parse(decrypted);

      // Convert compact format to full format
      const featureMap: Record<string, string> = {
        P: 'partners',
        R: 'projects', // R for pRojects
        S: 'sales',
        D: 'documents',
        C: 'calendar',
        L: 'logs',
      };

      const featureString = compactData.f || '';
      const features: string[] = [];

      for (let i = 0; i < featureString.length; i++) {
        const char = featureString[i];
        const feature = featureMap[char];
        if (feature) features.push(feature);
      }

      licenseData = {
        max_users: compactData.u,
        features,
        valid_from: new Date().toISOString().split('T')[0], // Current date as valid_from
        valid_until: compactData.v,
      };

      console.log('Decoded license data:', licenseData);
    } catch (error) {
      console.error('Failed to decode license:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Érvénytelen licensz kulcs',
          details: 'Nem sikerült a licensz dekódolása.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Validate license data structure
    if (!licenseData.max_users || !licenseData.features || !licenseData.valid_from || !licenseData.valid_until) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Hiányos licensz adatok',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
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
          error: 'Vállalat nem található',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Check if license key is already used by another company
    const { data: existingLicense } = await supabase
      .from('company_licenses')
      .select('company_id')
      .eq('license_key', normalizedKey)
      .neq('company_id', company_id)
      .single();

    if (existingLicense) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Ez a licensz kulcs már használatban van másik vállalatnál',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Prepare license record for persistence
    const licenseRecord = {
      company_id,
      max_users: licenseData.max_users,
      valid_from: new Date(licenseData.valid_from).toISOString(),
      valid_until: new Date(licenseData.valid_until + 'T23:59:59').toISOString(),
      is_active: true,
      features: licenseData.features,
      license_key: normalizedKey,
    };

    // Check if company already has a license
    const { data: currentLicense } = await supabase
      .from('company_licenses')
      .select('id')
      .eq('company_id', company_id)
      .single();

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

      console.log('Existing license updated:', data);
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

      console.log('New license created:', data);
    }

    console.log('License activated successfully for company:', company.name);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Licensz sikeresen aktiválva',
        license: {
          company_name: company.name,
          max_users: licenseRecord.max_users,
          features: licenseRecord.features,
          valid_from: licenseRecord.valid_from,
          valid_until: licenseRecord.valid_until,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error activating license:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Belső szerver hiba',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
