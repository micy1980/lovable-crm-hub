import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface CompanyLicense {
  id: string;
  company_id: string;
  license_type: string;
  max_users: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  features: string[];
  license_key: string | null;
  created_at: string;
  updated_at: string;
}

export const useCompanyLicenses = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: licenses = [], isLoading } = useQuery({
    queryKey: ['company-licenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('company_licenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CompanyLicense[];
    },
  });

  const createOrUpdateLicense = useMutation({
    mutationFn: async (license: {
      company_id: string;
      license_type: string;
      max_users: number;
      valid_from: string;
      valid_until: string;
      is_active: boolean;
      features: string[];
    }) => {
      const { data: existing } = await supabase
        .from('company_licenses')
        .select('id')
        .eq('company_id', license.company_id)
        .single();

      if (existing) {
        const { data, error } = await supabase
          .from('company_licenses')
          .update(license)
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('company_licenses')
          .insert(license)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-licenses'] });
      toast({
        title: t('licenses.saveSuccess'),
        description: t('licenses.saveSuccessDescription'),
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: t('licenses.saveError'),
        description: error.message,
      });
    },
  });

  const getLicenseForCompany = (companyId: string) => {
    return licenses.find(l => l.company_id === companyId);
  };

  const getUsedSeats = async (companyId: string): Promise<number> => {
    const { data, error } = await supabase.rpc('get_company_used_seats', {
      _company_id: companyId
    });
    if (error) throw error;
    return data || 0;
  };

  const isLicenseEffective = (license?: CompanyLicense): boolean => {
    if (!license) return false;
    const now = new Date();
    const validFrom = new Date(license.valid_from);
    const validUntil = new Date(license.valid_until);
    return license.is_active && now >= validFrom && now <= validUntil;
  };

  const getLicenseStatus = (license?: CompanyLicense): { status: 'active' | 'expired' | 'inactive'; label: string; color: string } => {
    if (!license) {
      return { status: 'inactive', label: 'Nincs licenc', color: 'text-muted-foreground' };
    }

    const now = new Date();
    const validUntil = new Date(license.valid_until);

    if (!license.is_active) {
      return { status: 'inactive', label: 'Inaktív', color: 'text-muted-foreground' };
    }

    if (now > validUntil) {
      return { status: 'expired', label: 'Lejárt', color: 'text-destructive' };
    }

    return { status: 'active', label: 'Aktív', color: 'text-green-600' };
  };

  const getDaysUntilExpiry = (license?: CompanyLicense): number | null => {
    if (!license || !isLicenseEffective(license)) return null;
    const now = new Date();
    const validUntil = new Date(license.valid_until);
    const diffTime = validUntil.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return {
    licenses,
    isLoading,
    createOrUpdateLicense,
    getLicenseForCompany,
    getUsedSeats,
    isLicenseEffective,
    getLicenseStatus,
    getDaysUntilExpiry,
  };
};
