import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export const useUsers = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, user_companies(company_id, companies(name))')
        .is('deleted_at', null)
        .order('email');

      if (error) throw error;
      return data;
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ 
      id, 
      role,
      full_name,
      is_active, 
      can_delete, 
      can_view_logs 
    }: { 
      id: string; 
      role?: 'super_admin' | 'admin' | 'normal' | 'viewer';
      full_name?: string;
      is_active?: boolean; 
      can_delete?: boolean; 
      can_view_logs?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ role, full_name, is_active, can_delete, can_view_logs })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: t('users.updated') });
    },
    onError: (error: any) => {
      toast({
        title: t('users.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleUserFlag = useMutation({
    mutationFn: async ({ 
      id, 
      field,
      value
    }: { 
      id: string; 
      field: 'is_active' | 'can_delete' | 'can_view_logs';
      value: boolean;
    }) => {
      const { data, error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: any) => {
      toast({
        title: t('users.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const assignUserToCompany = useMutation({
    mutationFn: async ({ user_id, company_id }: { user_id: string; company_id: string }) => {
      const { error } = await supabase
        .from('user_companies')
        .insert({ user_id, company_id });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-companies'] });
      toast({ title: t('users.companyAssigned') });
    },
    onError: (error: any) => {
      toast({
        title: t('users.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const removeUserFromCompany = useMutation({
    mutationFn: async ({ user_id, company_id }: { user_id: string; company_id: string }) => {
      const { error } = await supabase
        .from('user_companies')
        .delete()
        .eq('user_id', user_id)
        .eq('company_id', company_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user-companies'] });
      toast({ title: t('users.companyRemoved') });
    },
    onError: (error: any) => {
      toast({
        title: t('users.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    users,
    isLoading,
    updateUser,
    toggleUserFlag,
    assignUserToCompany,
    removeUserFromCompany,
  };
};
