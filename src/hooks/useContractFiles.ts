import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ContractFile {
  id: string;
  contract_id: string;
  title: string;
  description: string | null;
  change_summary: string | null;
  file_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  version_number: number;
  is_current: boolean;
  original_file_id: string | null;
  created_by: string | null;
  created_at: string | null;
  uploader?: {
    id: string;
    full_name: string | null;
  } | null;
}

export const useContractFiles = (contractId: string | undefined) => {
  const queryClient = useQueryClient();
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Query for current files only
  const { data: files = [], isLoading } = useQuery({
    queryKey: ['contract-files', contractId],
    queryFn: async () => {
      if (!contractId) return [];
      
      const { data, error } = await supabase
        .from('contract_versions')
        .select(`
          *,
          uploader:profiles!contract_versions_created_by_fkey(id, full_name)
        `)
        .eq('contract_id', contractId)
        .eq('is_current', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ContractFile[];
    },
    enabled: !!contractId,
  });

  // Query for all versions of a specific file
  const getFileVersions = async (fileId: string): Promise<ContractFile[]> => {
    const file = files.find(f => f.id === fileId);
    if (!file) return [];

    const originalId = file.original_file_id || file.id;

    const { data, error } = await supabase
      .from('contract_versions')
      .select(`
        *,
        uploader:profiles!contract_versions_created_by_fkey(id, full_name)
      `)
      .or(`id.eq.${originalId},original_file_id.eq.${originalId}`)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching versions:', error);
      return [];
    }

    return data as ContractFile[];
  };

  const uploadFiles = useMutation({
    mutationFn: async ({ 
      contractId, 
      files: filesToUpload, 
      companyId,
      metadata
    }: { 
      contractId: string; 
      files: File[]; 
      companyId: string;
      metadata?: {
        title?: string;
        description?: string;
        change_summary?: string;
      };
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nem azonosított felhasználó');

      const uploadedFiles = [];

      for (const file of filesToUpload) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${companyId}/contracts/${contractId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Check if a file with the same title already exists
        const fileTitle = metadata?.title || file.name;
        const existingFile = files.find(f => f.title === fileTitle && f.is_current);

        if (existingFile) {
          // Create new version
          const originalId = existingFile.original_file_id || existingFile.id;
          const newVersion = existingFile.version_number + 1;

          // Mark old file as not current
          await supabase
            .from('contract_versions')
            .update({ is_current: false })
            .eq('id', existingFile.id);

          // Insert new version
          const { data: fileRecord, error: insertError } = await supabase
            .from('contract_versions')
            .insert({
              contract_id: contractId,
              title: fileTitle,
              description: metadata?.description,
              change_summary: metadata?.change_summary,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              created_by: user.id,
              version_number: newVersion,
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
            .from('contract_versions')
            .insert({
              contract_id: contractId,
              title: fileTitle,
              description: metadata?.description,
              change_summary: metadata?.change_summary,
              file_path: filePath,
              file_size: file.size,
              mime_type: file.type,
              created_by: user.id,
              version_number: 1,
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
      queryClient.invalidateQueries({ queryKey: ['contract-files', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract-versions', contractId] });
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
      if (file.file_path) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([file.file_path]);

        if (storageError) {
          console.warn('Storage deletion failed:', storageError);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('contract_versions')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-files', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract-versions', contractId] });
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
        .from('contract_versions')
        .select('*')
        .eq('id', versionId)
        .single();

      if (fetchError || !versionToRestore) throw new Error('Verzió nem található');

      const originalId = versionToRestore.original_file_id || versionToRestore.id;

      // Mark all versions as not current
      await supabase
        .from('contract_versions')
        .update({ is_current: false })
        .or(`id.eq.${originalId},original_file_id.eq.${originalId}`);

      // Mark the selected version as current
      await supabase
        .from('contract_versions')
        .update({ is_current: true })
        .eq('id', versionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract-files', contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract-versions', contractId] });
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

  const downloadMultipleFiles = async (fileIds: string[], contractTitle?: string) => {
    const filesToDownload = files.filter(f => fileIds.includes(f.id));
    
    if (filesToDownload.length === 0) {
      toast.error('Nincs kiválasztott fájl');
      return;
    }

    // If only one file, download directly
    if (filesToDownload.length === 1) {
      const file = filesToDownload[0];
      if (file.file_path) {
        await downloadFile(file.file_path, file.title);
      }
      return;
    }

    // Multiple files - create ZIP
    setIsDownloadingZip(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      let successCount = 0;
      
      for (const file of filesToDownload) {
        if (!file.file_path) continue;
        
        const { data, error } = await supabase.storage
          .from('documents')
          .download(file.file_path);

        if (error) {
          console.error(`Failed to download ${file.title}:`, error);
          continue;
        }

        if (!data) {
          console.error(`No data received for ${file.title}`);
          continue;
        }
        
        // Convert Blob to ArrayBuffer for JSZip
        const arrayBuffer = await data.arrayBuffer();
        
        // Get file extension from file_path
        const ext = file.file_path.split('.').pop() || '';
        const fileName = ext ? `${file.title}.${ext}` : file.title;
        
        zip.file(fileName, arrayBuffer);
        successCount++;
      }
      
      if (successCount === 0) {
        toast.error('Nem sikerült egyetlen fájlt sem letölteni');
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      // Use contract title and full timestamp with seconds
      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const safeName = (contractTitle || 'szerzodes').replace(/[^a-zA-Z0-9áéíóöőúüűÁÉÍÓÖŐÚÜŰ\s-]/g, '').replace(/\s+/g, '_');
      a.download = `${safeName}_${timestamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(`${successCount} fájl letöltve ZIP formátumban`);
    } catch (error: any) {
      console.error('ZIP creation error:', error);
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