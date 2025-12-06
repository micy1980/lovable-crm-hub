import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DocumentFile {
  id: string;
  document_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
  created_at: string;
  uploader?: {
    id: string;
    full_name: string | null;
  } | null;
}

export const useDocumentFiles = (documentId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['document-files', documentId],
    queryFn: async () => {
      if (!documentId) return [];
      
      const { data, error } = await supabase
        .from('document_files')
        .select(`
          *,
          uploader:profiles!document_files_uploaded_by_fkey(id, full_name)
        `)
        .eq('document_id', documentId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as DocumentFile[];
    },
    enabled: !!documentId,
  });

  const uploadFiles = useMutation({
    mutationFn: async ({ documentId, files, companyId }: { documentId: string; files: File[]; companyId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nem azonosított felhasználó');

      const uploadedFiles = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${companyId}/${documentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: fileRecord, error: insertError } = await supabase
          .from('document_files')
          .insert({
            document_id: documentId,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        uploadedFiles.push(fileRecord);
      }

      return uploadedFiles;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-files', documentId] });
      toast.success('Fájlok sikeresen feltöltve');
    },
    onError: (error: any) => {
      toast.error('Hiba a feltöltés során: ' + error.message);
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (fileId: string) => {
      const file = files.find(f => f.id === fileId);
      if (!file) throw new Error('Fájl nem található');

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([file.file_path]);

      if (storageError) {
        console.warn('Storage deletion failed:', storageError);
      }

      // Delete from database
      const { error } = await supabase
        .from('document_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-files', documentId] });
      toast.success('Fájl törölve');
    },
    onError: (error: any) => {
      toast.error('Hiba a törlés során: ' + error.message);
    },
  });

  const downloadFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error('Hiba a letöltés során: ' + error.message);
    }
  };

  const downloadMultipleFiles = async (fileIds: string[]) => {
    const filesToDownload = files.filter(f => fileIds.includes(f.id));
    
    for (const file of filesToDownload) {
      await downloadFile(file.file_path, file.file_name);
      // Small delay between downloads to prevent browser issues
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  return {
    files,
    isLoading,
    uploadFiles,
    deleteFile,
    downloadFile,
    downloadMultipleFiles,
  };
};
