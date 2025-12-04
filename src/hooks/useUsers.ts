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
      family_name,
      given_name,
      email,
      password,
      is_active, 
      can_delete, 
      can_view_logs,
      mustChangePassword
    }: { 
      id: string; 
      role?: 'super_admin' | 'admin' | 'normal' | 'viewer';
      family_name?: string;
      given_name?: string;
      email?: string;
      password?: string;
      is_active?: boolean; 
      can_delete?: boolean; 
      can_view_logs?: boolean;
      mustChangePassword?: boolean;
    }) => {
      // Update email if provided and different
      if (email && email.trim() !== '') {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session');
        }

        const { data: emailData, error: emailError } = await supabase.functions.invoke('admin-update-user', {
          body: { userId: id, email, mustChangePassword },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        // Check for validation errors in response (now returns 200 with ok: false)
        if (emailData && !emailData.ok) {
          if (emailData.errorCode === 'EMAIL_ALREADY_REGISTERED') {
            const duplicateError = new Error('EMAIL_ALREADY_REGISTERED');
            (duplicateError as any).errorCode = 'EMAIL_ALREADY_REGISTERED';
            throw duplicateError;
          }
          throw new Error(emailData.error || emailData.message || 'Failed to update email');
        }

        if (emailError) {
          throw new Error(emailError.message || 'Failed to update email');
        }

        if (!emailData?.ok) {
          throw new Error(emailData?.error || 'Failed to update email');
        }
      }

      // Build full_name from family and given names if they are provided
      const full_name = (family_name && given_name) ? `${family_name} ${given_name}` : undefined;

      // Update profile fields
      const { data, error } = await supabase
        .from('profiles')
        .update({ role, family_name, given_name, full_name, is_active, can_delete, can_view_logs })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // If user was promoted to super_admin, assign them to all companies
      if (role === 'super_admin') {
        const { data: allCompanies } = await supabase
          .from('companies')
          .select('id')
          .is('deleted_at', null);
        
        if (allCompanies && allCompanies.length > 0) {
          // Get existing company assignments
          const { data: existingAssignments } = await supabase
            .from('user_companies')
            .select('company_id')
            .eq('user_id', id);
          
          const existingCompanyIds = new Set(existingAssignments?.map(a => a.company_id) || []);
          
          // Insert only missing assignments
          const newAssignments = allCompanies
            .filter(company => !existingCompanyIds.has(company.id))
            .map(company => ({
              user_id: id,
              company_id: company.id
            }));
          
          if (newAssignments.length > 0) {
            await supabase.from('user_companies').insert(newAssignments);
          }
        }
      }

      // Update password if provided
      if (password && password.trim() !== '') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error('No active session');
          }

          const { data: passwordData, error: passwordError } = await supabase.functions.invoke('admin-update-password', {
            body: {
              userId: id,
              password,
              mustChangePassword,
            },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          // Helper function to extract Supabase error message from raw error string
          const extractSupabaseErrorMessage = (raw: string): string => {
            const match = raw.match(/\{.*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]);
                if (typeof parsed.error === 'string') return parsed.error;
              } catch {
                // ignore parse errors
              }
            }
            return raw;
          };

          if (passwordError) {
            // Prefer detailed context from the edge function if available
            const ctx: any = (passwordError as any).context;
            let rawMessage = '';

            if (ctx) {
              if (typeof ctx.error === 'string') {
                rawMessage = ctx.error;
              } else if (ctx.body && typeof ctx.body.error === 'string') {
                rawMessage = ctx.body.error;
              } else if (ctx.body) {
                rawMessage = JSON.stringify(ctx.body);
              }
            }

            if (!rawMessage) {
              rawMessage = passwordError.message || '';
            }

            const supabaseMsg = extractSupabaseErrorMessage(rawMessage);
            console.log('[useUsers] Password error detected:', supabaseMsg, 'raw:', rawMessage, 'ctx:', ctx);
            
            // Check if it's a weak password error
            const lower = supabaseMsg.toLowerCase();
            if (lower.includes('password is known to be weak') || lower.includes('easy to guess')) {
              const weakPasswordError: any = new Error(t('users.errors.weakPassword'));
              weakPasswordError.isWeakPassword = true;
              console.log('[useUsers] Throwing weak password error');
              throw weakPasswordError;
            }
            
            // Other errors
            throw new Error(supabaseMsg || 'Failed to update password');
          }

          // Check if the function returned a structured error in the response body
          if (passwordData && typeof passwordData === 'object') {
            if ('code' in passwordData && passwordData.code === 'weak_password') {
              const weakPasswordError = new Error(t('users.errors.weakPassword'));
              (weakPasswordError as any).isWeakPassword = true;
              throw weakPasswordError;
            }
            if ('error' in passwordData) {
              const errorMsg = passwordData.error as string;
              if (errorMsg.toLowerCase().includes('weak') || 
                  errorMsg.toLowerCase().includes('easy to guess')) {
                const weakPasswordError = new Error(t('users.errors.weakPassword'));
                (weakPasswordError as any).isWeakPassword = true;
                throw weakPasswordError;
              }
              throw new Error(errorMsg);
            }
          }
        } catch (error: any) {
          // Re-throw weak password errors as-is
          if (error.isWeakPassword) {
            throw error;
          }
          // For other errors, wrap them appropriately
          console.error('[useUsers] Password update error:', error);
          throw error;
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
      console.log('[useUsers] onError called:', error);
      // Don't show toast for weak password errors - the form will handle it
      if (error.isWeakPassword) {
        console.log('[useUsers] Weak password error, form will handle it');
        return;
      }
      // Don't show toast here - let the component handle all error display
      console.log('[useUsers] Non-weak-password error, component will handle it');
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
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: value })
        .eq('id', id);

      if (error) throw error;
      return { id, field, value };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: any) => {
      console.error('toggleUserFlag error', error);
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
      family_name,
      given_name,
      role, 
      is_active, 
      can_delete, 
      can_view_logs,
      mustChangePassword,
      sendInvite
    }: { 
      email: string;
      password?: string;
      family_name: string;
      given_name: string;
      role: 'super_admin' | 'admin' | 'normal' | 'viewer'; 
      is_active: boolean; 
      can_delete?: boolean; 
      can_view_logs?: boolean;
      mustChangePassword?: boolean;
      sendInvite?: boolean;
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
          familyName: family_name,
          givenName: given_name,
          role,
          isActive: is_active,
          canDelete: can_delete,
          canViewLogs: can_view_logs,
          mustChangePassword,
          sendInvite,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Check for validation errors in response (now returns 200 with ok: false)
      if (data && !data.ok) {
        if (data.errorCode === 'EMAIL_ALREADY_REGISTERED') {
          const duplicateError = new Error('EMAIL_ALREADY_REGISTERED');
          (duplicateError as any).errorCode = 'EMAIL_ALREADY_REGISTERED';
          throw duplicateError;
        }
        
        if (data.errorCode === 'WEAK_PASSWORD') {
          const weakPasswordError = new Error('WEAK_PASSWORD');
          (weakPasswordError as any).isWeakPassword = true;
          throw weakPasswordError;
        }
        
        // Other validation errors
        throw new Error(data.error || data.message || 'Failed to create user');
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

  const deleteUser = useMutation({
    mutationFn: async ({ targetUserId, password }: { targetUserId: string; password: string }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { targetUserId, password },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (data && !data.success) {
        if (data.errorCode === 'INVALID_PASSWORD') {
          const invalidPasswordError = new Error(t('users.deleteDialog.invalidPassword'));
          (invalidPasswordError as any).errorCode = 'INVALID_PASSWORD';
          throw invalidPasswordError;
        }
        
        if (data.errorCode === 'USER_HAS_ACTIVITY') {
          const hasActivityError = new Error(t('users.deleteDialog.hasActivity'));
          (hasActivityError as any).errorCode = 'USER_HAS_ACTIVITY';
          throw hasActivityError;
        }
        
        throw new Error(data.error || data.message || 'Failed to delete user');
      }

      if (error) throw error;
      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete user');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: t('users.deleteDialog.success') });
    },
    onError: (error: any) => {
      if (error.errorCode === 'INVALID_PASSWORD') {
        // This is handled by the dialog component
        throw error;
      }
      
      if (error.errorCode === 'USER_HAS_ACTIVITY') {
        toast({
          title: t('users.error'),
          description: t('users.deleteDialog.hasActivity'),
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: t('users.error'),
        description: t('users.deleteDialog.unexpectedError'),
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
    deleteUser,
  };
};
