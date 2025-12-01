import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ApiKeyStatus {
  isConfigured: boolean;
  apiKey: string;
  source: 'secret' | 'database' | 'none';
}

export const useApiKeyStatus = () => {
  return useQuery({
    queryKey: ['api-key-status'],
    queryFn: async (): Promise<ApiKeyStatus> => {
      const { data, error } = await supabase.functions.invoke('check-api-key-status');

      if (error) {
        console.error('Error checking API key status:', error);
        return { isConfigured: false, apiKey: '', source: 'none' };
      }

      return data as ApiKeyStatus;
    },
  });
};
