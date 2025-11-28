import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSystemSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*');

      if (error) throw error;
      
      // Convert array to object for easier access
      const settingsObj: Record<string, string> = {};
      data?.forEach((setting: any) => {
        settingsObj[setting.setting_key] = setting.setting_value;
      });
      
      return settingsObj;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('system_settings')
        .update({ setting_value: value, updated_at: new Date().toISOString() })
        .eq('setting_key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
      toast.success('Beállítás sikeresen frissítve');
    },
    onError: (error) => {
      console.error('Error updating setting:', error);
      toast.error('Hiba a beállítás frissítése során');
    },
  });

  return {
    settings,
    isLoading,
    updateSetting,
  };
};
