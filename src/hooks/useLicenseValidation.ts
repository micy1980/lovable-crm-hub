import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ValidationResult {
  valid: boolean;
  company_id?: string;
  company_name?: string;
  license_type?: string;
  max_users?: number;
  valid_until?: string;
  features?: string[];
  reason?: string;
}

export const useLicenseValidation = () => {
  const [isValidating, setIsValidating] = useState(false);

  const validateLicense = async (licenseKey: string): Promise<ValidationResult> => {
    setIsValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-license', {
        body: { license_key: licenseKey },
      });

      if (error) {
        console.error('License validation error:', error);
        return {
          valid: false,
          reason: error.message || 'Validation failed',
        };
      }

      return data as ValidationResult;
    } catch (error) {
      console.error('License validation exception:', error);
      return {
        valid: false,
        reason: 'Network error',
      };
    } finally {
      setIsValidating(false);
    }
  };

  return {
    validateLicense,
    isValidating,
  };
};
