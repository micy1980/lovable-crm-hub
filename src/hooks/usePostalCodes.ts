import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PostalCodeData {
  id: string;
  postal_code: string;
  city: string;
  county: string | null;
  country: string | null;
}

export const usePostalCodes = (searchTerm?: string) => {
  return useQuery({
    queryKey: ['postal-codes', searchTerm],
    queryFn: async (): Promise<PostalCodeData[]> => {
      let query = (supabase as any)
        .from('postal_codes')
        .select('*')
        .order('postal_code');

      if (searchTerm && searchTerm.length >= 2) {
        query = query.or(`postal_code.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      return (data || []) as PostalCodeData[];
    },
    enabled: !searchTerm || searchTerm.length >= 2,
  });
};

export const usePostalCodeLookup = (postalCode: string | null) => {
  return useQuery({
    queryKey: ['postal-code-lookup', postalCode],
    queryFn: async (): Promise<PostalCodeData | null> => {
      if (!postalCode) return null;
      
      const { data, error } = await (supabase as any)
        .from('postal_codes')
        .select('*')
        .eq('postal_code', postalCode)
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data as PostalCodeData | null;
    },
    enabled: !!postalCode && postalCode.length >= 4,
  });
};
