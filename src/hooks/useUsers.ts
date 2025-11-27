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
      password,
      is_active, 
      can_delete, 
      can_view_logs 
    }: { 
      id: string; 
      role?: 'super_admin' | 'admin' | 'normal' | 'viewer';
      full_name?: string;
      password?: string;
      is_active?: boolean; 
      can_delete?: boolean; 
      can_view_logs?: boolean;
    }) => {
      // Update profile fields
      const { data, error } = await supabase
        .from('profiles')
        .update({ role, full_name, is_active, can_delete, can_view_logs })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update password if provided
      if (password && password.trim() !== '') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session');
        }

        const { data: passwordData, error: passwordError } = await supabase.functions.invoke('admin-update-password', {
          body: {
            userId: id,
            password,
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (passwordError) {
          throw new Error(passwordError.message || 'Failed to update password');
        }

        // Check if the function returned a structured error in the response body
        if (passwordData && typeof passwordData === 'object') {
          if ('code' in passwordData && passwordData.code === 'weak_password') {
            // Create an error with a special code that the form can catch
            const weakPasswordError = new Error(t('auth.weakPasswordMessage'));
            (weakPasswordError as any).isWeakPassword = true;
            throw weakPasswordError;
          }
          if ('error' in passwordData) {
            // Check if the error message indicates a weak password
            const errorMsg = passwordData.error as string;
            if (errorMsg.toLowerCase().includes('weak') || 
                errorMsg.toLowerCase().includes('easy to guess')) {
              const weakPasswordError = new Error(t('auth.weakPasswordMessage'));
              (weakPasswordError as any).isWeakPassword = true;
              throw weakPasswordError;
            }
            throw new Error(errorMsg);
          }
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: t('users.updated') });
    },
    onError: (error: any) => {
      // Don't show toast for weak password errors - the form will handle it
      if (error.isWeakPassword) {
        return;
      }
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

  const createUser = useMutation({
    mutationFn: async ({ 
      email, 
      password,
      full_name, 
      role, 
      is_active, 
      can_delete, 
      can_view_logs 
    }: { 
      email: string;
      password: string;
      full_name?: string; 
      role: 'super_admin' | 'admin' | 'normal' | 'viewer'; 
      is_active: boolean; 
      can_delete: boolean; 
      can_view_logs: boolean;
    }) => {
      // Get the current session token to authenticate with the edge function
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Call the admin edge function to create the user
      // The edge function validates the caller and uses service role key server-side.
      // This does NOT affect the current session.
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email,
          password,
          fullName: full_name || email,
          role,
          isActive: is_active,
          canDelete: can_delete,
          canViewLogs: can_view_logs,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // When edge function returns 400, Supabase puts response body in data
      // Check for our structured errors first before throwing
      if (data?.errorCode === 'EMAIL_ALREADY_REGISTERED' || 
          data?.message?.toLowerCase().includes('already been registered')) {
        const duplicateError = new Error('EMAIL_ALREADY_REGISTERED');
        (duplicateError as any).errorCode = 'EMAIL_ALREADY_REGISTERED';
        throw duplicateError;
      }
      
      if (data?.errorCode === 'WEAK_PASSWORD' ||
          data?.error?.toLowerCase().includes('weak') ||
          data?.error?.toLowerCase().includes('easy to guess')) {
        const weakPasswordError = new Error('WEAK_PASSWORD');
        (weakPasswordError as any).isWeakPassword = true;
        throw weakPasswordError;
      }

      // Now check for generic errors
      if (error) throw error;
      if (!data?.ok) {
        throw new Error(data?.error || 'Failed to create user');
      }

      return { id: data.userId, email };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: t('users.userCreated') });
    },
    onError: (error: any) => {
      // Don't show toast for duplicate email or weak password errors - the form will handle them
      if (error.errorCode === 'EMAIL_ALREADY_REGISTERED' || error.isWeakPassword) {
        return;
      }
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
    createUser,
    assignUserToCompany,
    removeUserFromCompany,
  };
};
