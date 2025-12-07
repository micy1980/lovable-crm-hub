import { useState } from 'react';
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
  version: number;
  original_file_id: string | null;
  is_current: boolean;
  uploader?: {
    id: string;
    full_name: string | null;
  } | null;
}

export const useDocumentFiles = (documentId: string | undefined) => {
  const queryClient = useQueryClient();
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Query for current files only
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
        .eq('is_current', true)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as DocumentFile[];
    },
    enabled: !!documentId,
  });

  // Query for all versions of a specific file
  const getFileVersions = async (fileId: string): Promise<DocumentFile[]> => {
    // Find the original file ID
    const file = files.find(f => f.id === fileId);
    if (!file) return [];

    const originalId = file.original_file_id || file.id;

    const { data, error } = await supabase
      .from('document_files')
      .select(`
        *,
        uploader:profiles!document_files_uploaded_by_fkey(id, full_name)
      `)
      .or(`id.eq.${originalId},original_file_id.eq.${originalId}`)
      .order('version', { ascending: false });

    if (error) {
      console.error('Error fetching versions:', error);
      return [];
    }

    return data as DocumentFile[];
  };

  const uploadFiles = useMutation({
    mutationFn: async ({ documentId, files: filesToUpload, companyId }: { documentId: string; files: File[]; companyId: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nem azonosított felhasználó');

      const uploadedFiles = [];

      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${companyId}/${documentId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Check if a file with the same name already exists
        const existingFile = files.find(f => f.file_name === file.name && f.is_current);

        if (existingFile) {
          // Create new version
          const originalId = existingFile.original_file_id || existingFile.id;
          const newVersion = existingFile.version + 1;

          // Mark old file as not current
          await supabase
            .from('document_files')
            .update({ is_current: false })
            .eq('id', existingFile.id);

          // Insert new version
          const { data: fileRecord, error: insertError } = await supabase
            .from('document_files')
            .insert({
              document_id: documentId,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: user.id,
              version: newVersion,
              original_file_id: originalId,
              is_current: true,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          uploadedFiles.push(fileRecord);
        } else {
          // New file
          const { data: fileRecord, error: insertError } = await supabase
            .from('document_files')
            .insert({
              document_id: documentId,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: user.id,
              version: 1,
              is_current: true,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          uploadedFiles.push(fileRecord);
        }
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

  const restoreVersion = useMutation({
    mutationFn: async (versionId: string) => {
      // Get the version to restore
      const { data: versionToRestore, error: fetchError } = await supabase
        .from('document_files')
        .select('*')
        .eq('id', versionId)
        .single();

      if (fetchError || !versionToRestore) throw new Error('Verzió nem található');

      const originalId = versionToRestore.original_file_id || versionToRestore.id;

      // Mark all versions as not current
      await supabase
        .from('document_files')
        .update({ is_current: false })
        .or(`id.eq.${originalId},original_file_id.eq.${originalId}`);

      // Mark the selected version as current
      await supabase
        .from('document_files')
        .update({ is_current: true })
        .eq('id', versionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-files', documentId] });
      toast.success('Verzió visszaállítva');
    },
    onError: (error: any) => {
      toast.error('Hiba a verzió visszaállítása során: ' + error.message);
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
    
    if (filesToDownload.length === 0) {
      toast.error('Nincs kiválasztott fájl');
      return;
    }

    // If only one file, download directly
    if (filesToDownload.length === 1) {
      await downloadFile(filesToDownload[0].file_path, filesToDownload[0].file_name);
      return;
    }

    // Multiple files - create ZIP
    setIsDownloadingZip(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      for (const file of filesToDownload) {
        const { data, error } = await supabase.storage
          .from('documents')
          .download(file.file_path);

        if (error) {
          console.error(`Failed to download ${file.file_name}:`, error);
          continue;
        }

        zip.file(file.file_name, data);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dokumentumok_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${filesToDownload.length} fájl letöltve ZIP formátumban`);
    } catch (error: any) {
      toast.error('Hiba a ZIP létrehozása során: ' + error.message);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return {
    files,
    isLoading,
    isDownloadingZip,
    uploadFiles,
    deleteFile,
    downloadFile,
    downloadMultipleFiles,
    getFileVersions,
    restoreVersion,
  };
};
