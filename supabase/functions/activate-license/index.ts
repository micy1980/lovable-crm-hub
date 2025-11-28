import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { verifyAndDecodeLicenseKey } from './license-validator.ts';

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

    // Normalize the license key
    const normalizedKey = license_key.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    if (normalizedKey.length !== 25) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Érvénytelen licensz kulcs formátum',
          details: 'A kulcs formátuma nem megfelelő. Elvárt: 25 karakteres kód.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify and decode the license key using cryptographic validation
    console.log('Verifying license key:', normalizedKey);
    const decodedLicense = await verifyAndDecodeLicenseKey(normalizedKey);

    if (!decodedLicense) {
      console.log('License verification failed - invalid signature or format');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Érvénytelen licensz kulcs',
          details: 'A licensz kulcs nem megfelelő vagy meghamisított.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log('License decoded successfully:', {
      version: decodedLicense.version,
      maxUsers: decodedLicense.maxUsers,
      validFrom: decodedLicense.validFrom.toISOString(),
      validUntil: decodedLicense.validUntil.toISOString(),
      features: decodedLicense.features
    });

    // Convert decoded license to the format expected by the database
    const licenseData: LicenseData = {
      max_users: decodedLicense.maxUsers,
      features: decodedLicense.features,
      valid_from: decodedLicense.validFrom.toISOString().split('T')[0],
      valid_until: decodedLicense.validUntil.toISOString().split('T')[0],
    };

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
