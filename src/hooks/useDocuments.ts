import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCompany } from '@/contexts/CompanyContext';

export const useDocuments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { activeCompany } = useCompany();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany?.id) return [];

      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          partner:partners(id, name),
          project:projects(id, name),
          sales:sales(id, name),
          uploader:profiles!documents_uploaded_by_fkey(id, full_name)
        `)
        .eq('owner_company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany?.id,
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ 
      file, 
      metadata 
    }: { 
      file: File; 
      metadata: {
        title: string;
        description?: string;
        visibility: string;
        partner_id?: string;
        project_id?: string;
        sales_id?: string;
      };
    }) => {
      if (!activeCompany?.id) throw new Error('No active company');

      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${activeCompany.id}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Create document record
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error: insertError } = await supabase
        .from('documents')
        .insert({
          ...metadata,
          owner_company_id: activeCompany.id,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          uploaded_by: user.user?.id,
        })
        .select()
        .single();

      if (insertError) {
        // Cleanup uploaded file on error
        await supabase.storage.from('documents').remove([filePath]);
        throw insertError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: 'Dokumentum feltöltve',
        description: 'A dokumentum sikeresen feltöltésre került.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: error instanceof Error ? error.message : 'Nem sikerült feltölteni a dokumentumot',
        variant: 'destructive',
      });
    },
  });

  const updateDocument = useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: {
        title?: string;
        description?: string;
        visibility?: string;
        partner_id?: string | null;
        project_id?: string | null;
        sales_id?: string | null;
      };
    }) => {
      const { data, error } = await supabase
        .from('documents')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: 'Dokumentum frissítve',
        description: 'A változtatások mentésre kerültek.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: error instanceof Error ? error.message : 'Nem sikerült frissíteni a dokumentumot',
        variant: 'destructive',
      });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete document record via RPC (file is NOT deleted from storage)
      const { error } = await supabase.rpc('soft_delete_document', {
        _document_id: id
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast({
        title: 'Dokumentum törölve',
        description: 'A dokumentum sikeresen törölve lett.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Hiba',
        description: error instanceof Error ? error.message : 'Nem sikerült törölni a dokumentumot',
        variant: 'destructive',
      });
    },
  });

  const downloadDocument = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      // Create download link
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
        description: 'Nem sikerült letölteni a dokumentumot',
        variant: 'destructive',
      });
    }
  };

  return {
    documents,
    isLoading,
    uploadDocument,
    updateDocument,
    deleteDocument,
    downloadDocument,
  };
};
