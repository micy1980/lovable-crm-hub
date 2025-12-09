/**
 * ORBIX License Key Types and Utilities
 * 
 * SECURITY NOTE: License key generation has been moved to a secure edge function.
 * The frontend can only:
 * 1. Request license generation from the backend (super_admin only)
 * 2. Format license keys for display
 * 
 * The secret key is stored securely on the server and never exposed to the client.
 */

import { supabase } from '@/integrations/supabase/client';

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

export interface GenerateLicenseResponse {
  success: boolean;
  licenseKey?: string;
  error?: string;
  settings?: {
    maxUsers: number;
    validFrom: string;
    validUntil: string;
    features: LicenseFeature[];
  };
}

/**
 * Generate a license key by calling the secure backend edge function.
 * Only super_admin users can generate license keys.
 */
export async function generateLicenseKey(input: LicenseInput): Promise<string> {
  // Validate input
  if (input.maxUsers < 1 || input.maxUsers > 1023) {
    throw new Error('maxUsers must be between 1 and 1023');
  }
  if (input.validUntil < input.validFrom) {
    throw new Error('validUntil must be >= validFrom');
  }

  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Authentication required');
  }

  const response = await supabase.functions.invoke<GenerateLicenseResponse>('generate-license', {
    body: {
      maxUsers: input.maxUsers,
      validFrom: input.validFrom.toISOString().split('T')[0],
      validUntil: input.validUntil.toISOString().split('T')[0],
      features: input.features
    }
  });

  if (response.error) {
    console.error('License generation error:', response.error);
    throw new Error('Hiba a licensz generálása során');
  }

  if (!response.data?.success || !response.data.licenseKey) {
    throw new Error(response.data?.error || 'Hiba a licensz generálása során');
  }

  return response.data.licenseKey;
}

/**
 * Format a license key for display (add hyphens)
 */
export function formatLicenseKey(key: string): string {
  const normalized = key.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (normalized.length !== 25) return key;
  return `${normalized.slice(0, 5)}-${normalized.slice(5, 10)}-${normalized.slice(10, 15)}-${normalized.slice(15, 20)}-${normalized.slice(20, 25)}`;
}
