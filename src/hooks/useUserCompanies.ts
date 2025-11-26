import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserCompanies = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-companies', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_companies')
        .select('company_id, companies(id, name, tax_id)')
        .eq('user_id', user.id);

      if (error) throw error;
      return data?.map(uc => uc.companies).filter(Boolean) || [];
    },
    enabled: !!user?.id,
  });
};
