import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Download, Trash2, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocumentFile, useDocumentFiles } from '@/hooks/useDocumentFiles';
import { DocumentFileUpload } from './DocumentFileUpload';
import { useCompany } from '@/contexts/CompanyContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isAdminOrAbove } from '@/lib/roleUtils';

interface DocumentFilesTableProps {
  documentId: string;
  isDeleted: boolean;
}

export const DocumentFilesTable = ({ documentId, isDeleted }: DocumentFilesTableProps) => {
  const { activeCompany } = useCompany();
  const { data: profile } = useUserProfile();
  const isAdmin = isAdminOrAbove(profile);
  const { files, isLoading, uploadFiles, deleteFile, downloadFile, downloadMultipleFiles } = useDocumentFiles(documentId);
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<DocumentFile | null>(null);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (date: string) => {
    return format(parseISO(date), 'yyyy.MM.dd HH:mm', { locale: hu });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFiles(new Set(files.map(f => f.id)));
    } else {
      setSelectedFiles(new Set());
    }
  };

  const handleSelectFile = (fileId: string, checked: boolean) => {
    const newSelected = new Set(selectedFiles);
    if (checked) {
      newSelected.add(fileId);
    } else {
      newSelected.delete(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleDownloadSelected = () => {
    downloadMultipleFiles(Array.from(selectedFiles));
  };

  const handleUpload = async () => {
    if (!activeCompany || filesToUpload.length === 0) return;
    
    await uploadFiles.mutateAsync({
      documentId,
      files: filesToUpload,
      companyId: activeCompany.id,
    });
    
    setFilesToUpload([]);
    setUploadDialogOpen(false);
  };

  const handleDeleteClick = (file: DocumentFile) => {
    setFileToDelete(file);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (fileToDelete) {
      await deleteFile.mutateAsync(fileToDelete.id);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    }
  };

  const handleFilesSelected = (newFiles: File[]) => {
    setFilesToUpload(prev => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fájlok ({files.length})
          </CardTitle>
          <div className="flex gap-2">
            {selectedFiles.size > 0 && (
              <Button variant="outline" size="sm" onClick={handleDownloadSelected}>
                <Download className="mr-2 h-4 w-4" />
                Letöltés ({selectedFiles.size})
              </Button>
            )}
            {!isDeleted && (
              <Button size="sm" onClick={() => setUploadDialogOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Fájl feltöltése
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mb-2" />
              <p>Még nincs fájl feltöltve</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={selectedFiles.size === files.length && files.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Fájlnév</TableHead>
                  <TableHead className="text-center">Méret</TableHead>
                  <TableHead className="text-center">Típus</TableHead>
                  <TableHead className="text-center">Feltöltve</TableHead>
                  <TableHead>Feltöltő</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedFiles.has(file.id)}
                        onCheckedChange={(checked) => handleSelectFile(file.id, !!checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{file.file_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{formatFileSize(file.file_size)}</TableCell>
                    <TableCell className="text-center text-sm text-muted-foreground">
                      {file.mime_type?.split('/')[1]?.toUpperCase() || '-'}
                    </TableCell>
                    <TableCell className="text-center">{formatDate(file.uploaded_at)}</TableCell>
                    <TableCell>{file.uploader?.full_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(file.file_path, file.file_name)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {isAdmin && !isDeleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(file)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fájlok feltöltése</DialogTitle>
            <DialogDescription>
              Válassza ki a feltölteni kívánt fájlokat.
            </DialogDescription>
          </DialogHeader>
          
          <DocumentFileUpload
            onFilesSelected={handleFilesSelected}
            selectedFiles={filesToUpload}
            onRemoveFile={handleRemoveFile}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Mégse
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={filesToUpload.length === 0 || uploadFiles.isPending}
            >
              {uploadFiles.isPending ? 'Feltöltés...' : 'Feltöltés'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fájl törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törölni szeretné a "{fileToDelete?.file_name}" fájlt? 
              Ez a művelet nem vonható vissza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
