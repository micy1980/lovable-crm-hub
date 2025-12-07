import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { toast } from 'sonner';

export interface DocumentTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  variables: string[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export const useDocumentTemplates = () => {
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['document-templates', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];

      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as DocumentTemplate[];
    },
    enabled: !!activeCompany,
  });

  const createTemplate = useMutation({
    mutationFn: async (template: {
      name: string;
      description?: string;
      category?: string;
      file: File;
      variables?: string[];
    }) => {
      if (!activeCompany) throw new Error('No active company');

      // Upload file to storage
      const filePath = `${activeCompany.id}/templates/${Date.now()}_${template.file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, template.file);

      if (uploadError) throw uploadError;

      // Create template record
      const { data, error } = await supabase
        .from('document_templates')
        .insert({
          company_id: activeCompany.id,
          name: template.name,
          description: template.description,
          category: template.category,
          file_path: filePath,
          file_name: template.file.name,
          file_size: template.file.size,
          mime_type: template.file.type,
          variables: template.variables || [],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates', activeCompany?.id] });
      toast.success('Sablon sikeresen létrehozva');
    },
    onError: (error) => {
      toast.error('Hiba a sablon létrehozásakor: ' + error.message);
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      category,
      variables,
    }: {
      id: string;
      name: string;
      description?: string;
      category?: string;
      variables?: string[];
    }) => {
      const { data, error } = await supabase
        .from('document_templates')
        .update({
          name,
          description,
          category,
          variables,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates', activeCompany?.id] });
      toast.success('Sablon sikeresen frissítve');
    },
    onError: (error) => {
      toast.error('Hiba a sablon frissítésekor: ' + error.message);
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('document_templates')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-templates', activeCompany?.id] });
      toast.success('Sablon sikeresen törölve');
    },
    onError: (error) => {
      toast.error('Hiba a sablon törlésekor: ' + error.message);
    },
  });

  const downloadTemplate = async (template: DocumentTemplate) => {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(template.file_path);

    if (error) {
      toast.error('Hiba a sablon letöltésekor');
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = template.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return {
    templates,
    isLoading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    downloadTemplate,
  };
};
