import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

export interface Contract {
  id: string;
  owner_company_id: string;
  partner_id: string | null;
  project_id: string | null;
  sales_id: string | null;
  title: string;
  contract_number: string | null;
  contract_type: string | null;
  description: string | null;
  signed_date: string | null;
  effective_date: string | null;
  expiry_date: string | null;
  termination_notice_days: number | null;
  auto_renewal: boolean | null;
  renewal_period_months: number | null;
  total_value: number | null;
  currency: string | null;
  payment_frequency: string | null;
  payment_day: number | null;
  billing_start_date: string | null;
  status: string | null;
  expiry_warning_days: number | null;
  termination_warning_days: number | null;
  renewal_warning_days: number | null;
  restrict_access: boolean | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  partner?: { id: string; name: string } | null;
  project?: { id: string; name: string } | null;
  sales?: { id: string; name: string } | null;
}

export interface ContractVersion {
  id: string;
  contract_id: string;
  version_number: number;
  title: string;
  description: string | null;
  change_summary: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  created_by: string | null;
  created_at: string | null;
}

export const useContracts = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];

      // SA sees all including deleted (RLS handles this), others only non-deleted
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          partner:partners(id, name),
          project:projects(id, name),
          sales:sales(id, name)
        `)
        .eq('owner_company_id', activeCompany.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!activeCompany?.id,
  });

  const createContract = useMutation({
    mutationFn: async (contract: Partial<Contract>) => {
      if (!activeCompany?.id) throw new Error('No active company');

      const { data: user } = await supabase.auth.getUser();
      
      const { title, ...rest } = contract;
      if (!title) throw new Error('Title is required');
      
      const { data, error } = await supabase
        .from('contracts')
        .insert({
          title,
          owner_company_id: activeCompany.id,
          created_by: user.user?.id,
          ...rest,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: 'Szerződés létrehozva',
        description: 'A szerződés sikeresen mentésre került.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: error instanceof Error ? error.message : 'Nem sikerült létrehozni a szerződést',
        variant: 'destructive',
      });
    },
  });

  const updateContract = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Contract> }) => {
      const { data, error } = await supabase
        .from('contracts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: 'Szerződés frissítve',
        description: 'A változtatások mentésre kerültek.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: error instanceof Error ? error.message : 'Nem sikerült frissíteni a szerződést',
        variant: 'destructive',
      });
    },
  });

  const deleteContract = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('soft_delete_contract', {
        _contract_id: id
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract'] });
      toast({
        title: 'Szerződés törölve',
        description: 'A szerződés sikeresen törölve lett.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: error instanceof Error ? error.message : 'Nem sikerült törölni a szerződést',
        variant: 'destructive',
      });
    },
  });

  const hardDeleteContract = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('hard_delete_contract', {
        _contract_id: id
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: 'Szerződés véglegesen törölve',
        description: 'A szerződés és minden kapcsolódó adat véglegesen törölve lett.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: error instanceof Error ? error.message : 'Nem sikerült véglegesen törölni a szerződést',
        variant: 'destructive',
      });
    },
  });

  return {
    contracts,
    isLoading,
    createContract,
    updateContract,
    deleteContract,
    hardDeleteContract,
  };
};

export const useContractVersions = (contractId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ['contract-versions', contractId],
    queryFn: async () => {
      if (!contractId) return [];

      const { data, error } = await supabase
        .from('contract_versions')
        .select('*')
        .eq('contract_id', contractId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      return data as ContractVersion[];
    },
    enabled: !!contractId,
  });

  const addVersion = useMutation({
    mutationFn: async ({ 
      contractId, 
      file, 
      metadata 
    }: { 
      contractId: string;
      file: File; 
      metadata: {
        title: string;
        description?: string;
        change_summary?: string;
      };
    }) => {
      if (!activeCompany?.id) throw new Error('No active company');

      // Get current max version number
      const { data: maxVersion } = await supabase
        .from('contract_versions')
        .select('version_number')
        .eq('contract_id', contractId)
        .order('version_number', { ascending: false })
        .limit(1)
        .single();

      const newVersionNumber = (maxVersion?.version_number || 0) + 1;

      // Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-v${newVersionNumber}.${fileExt}`;
      const filePath = `${activeCompany.id}/contracts/${contractId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create version record
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('contract_versions')
        .insert({
          contract_id: contractId,
          version_number: newVersionNumber,
          title: metadata.title,
          description: metadata.description,
          change_summary: metadata.change_summary,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          created_by: user.user?.id,
        })
        .select()
        .single();

      if (insertError) {
        await supabase.storage.from('documents').remove([filePath]);
        throw insertError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-versions'] });
      toast({
        title: 'Verzió feltöltve',
        description: 'Az új verzió sikeresen mentésre került.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: error instanceof Error ? error.message : 'Nem sikerült feltölteni a verziót',
        variant: 'destructive',
      });
    },
  });

  const downloadVersion = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: 'Hiba',
        description: 'Nem sikerült letölteni a fájlt',
        variant: 'destructive',
      });
    }
  };

  return {
    versions,
    isLoading,
    addVersion,
    downloadVersion,
  };
};

export const useContractAccess = (contractId: string | undefined) => {
  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();

  const { data: accessList = [], isLoading } = useQuery({
    queryKey: ['contract-access', contractId],
    queryFn: async () => {
      if (!contractId) return [];

      const { data, error } = await supabase
        .from('contract_user_access')
        .select('*, user:profiles(id, full_name, email)')
        .eq('contract_id', contractId);

      if (error) throw error;
      return data;
    },
    enabled: !!contractId,
  });

  const updateAccess = useMutation({
    mutationFn: async ({ contractId, userIds }: { contractId: string; userIds: string[] }) => {
      if (!activeCompany?.id) throw new Error('No active company');

      // Delete existing access
      await supabase
        .from('contract_user_access')
        .delete()
        .eq('contract_id', contractId);

      // Insert new access
      if (userIds.length > 0) {
        const { error } = await supabase
          .from('contract_user_access')
          .insert(
            userIds.map(userId => ({
              contract_id: contractId,
              user_id: userId,
              company_id: activeCompany.id,
            }))
          );

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-access'] });
    },
  });

  return {
    accessList,
    isLoading,
    updateAccess,
  };
};
