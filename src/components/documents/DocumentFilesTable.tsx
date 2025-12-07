import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Download, Trash2, FileText, Upload, ArrowUpDown, ArrowUp, ArrowDown, Eye } from 'lucide-react';
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
import { DocumentFilePreview } from './DocumentFilePreview';
import { useCompany } from '@/contexts/CompanyContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isAdminOrAbove } from '@/lib/roleUtils';

interface DocumentFilesTableProps {
  documentId: string;
  isDeleted: boolean;
}

type SortField = 'file_name' | 'file_size' | 'mime_type' | 'uploaded_at' | 'uploader';
type SortDirection = 'asc' | 'desc';

// Map MIME types to simple Windows-like file type names
const getSimpleFileType = (mimeType: string | null): string => {
  if (!mimeType) return '-';
  
  const mimeMap: Record<string, string> = {
    // Documents
    'application/pdf': 'PDF',
    'application/msword': 'Word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/vnd.ms-excel': 'Excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
    'application/vnd.ms-excel.sheet.macroenabled.12': 'Excel',
    'application/vnd.ms-powerpoint': 'PowerPoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint',
    'text/plain': 'Szöveg',
    'text/csv': 'CSV',
    'application/rtf': 'RTF',
    
    // Images
    'image/jpeg': 'Kép',
    'image/jpg': 'Kép',
    'image/png': 'Kép',
    'image/gif': 'Kép',
    'image/webp': 'Kép',
    'image/svg+xml': 'SVG',
    'image/bmp': 'Kép',
    'image/tiff': 'Kép',
    
    // Archives
    'application/zip': 'ZIP',
    'application/x-rar-compressed': 'RAR',
    'application/x-7z-compressed': '7Z',
    'application/x-tar': 'TAR',
    'application/gzip': 'GZIP',
    
    // Audio/Video
    'audio/mpeg': 'MP3',
    'audio/wav': 'WAV',
    'video/mp4': 'MP4',
    'video/avi': 'AVI',
    'video/quicktime': 'MOV',
    
    // Other
    'application/json': 'JSON',
    'application/xml': 'XML',
    'text/html': 'HTML',
    'text/css': 'CSS',
    'application/javascript': 'JS',
  };
  
  return mimeMap[mimeType.toLowerCase()] || mimeType.split('/')[1]?.toUpperCase().slice(0, 10) || '-';
};

export const DocumentFilesTable = ({ documentId, isDeleted }: DocumentFilesTableProps) => {
  const { activeCompany } = useCompany();
  const { data: profile } = useUserProfile();
  const isAdmin = isAdminOrAbove(profile);
  const { files, isLoading, isDownloadingZip, uploadFiles, deleteFile, downloadFile, downloadMultipleFiles } = useDocumentFiles(documentId);
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<DocumentFile | null>(null);
  const [sortField, setSortField] = useState<SortField>('uploaded_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [previewFile, setPreviewFile] = useState<DocumentFile | null>(null);

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (date: string) => {
    return format(parseISO(date), 'yyyy.MM.dd HH:mm', { locale: hu });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 ml-1 opacity-50" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 ml-1" />
      : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const sortedFiles = [...files].sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (sortField) {
      case 'file_name':
        aVal = a.file_name.toLowerCase();
        bVal = b.file_name.toLowerCase();
        break;
      case 'file_size':
        aVal = a.file_size || 0;
        bVal = b.file_size || 0;
        break;
      case 'mime_type':
        aVal = getSimpleFileType(a.mime_type);
        bVal = getSimpleFileType(b.mime_type);
        break;
      case 'uploaded_at':
        aVal = new Date(a.uploaded_at).getTime();
        bVal = new Date(b.uploaded_at).getTime();
        break;
      case 'uploader':
        aVal = a.uploader?.full_name?.toLowerCase() || '';
        bVal = b.uploader?.full_name?.toLowerCase() || '';
        break;
      default:
        return 0;
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

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
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadSelected}
                disabled={isDownloadingZip}
              >
                {isDownloadingZip ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ZIP készítése...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {selectedFiles.size > 1 ? `Letöltés ZIP-ben (${selectedFiles.size})` : `Letöltés (${selectedFiles.size})`}
                  </>
                )}
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
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('file_name')}
                  >
                    <div className="flex items-center">
                      Fájlnév
                      {getSortIcon('file_name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('file_size')}
                  >
                    <div className="flex items-center justify-center">
                      Méret
                      {getSortIcon('file_size')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('mime_type')}
                  >
                    <div className="flex items-center justify-center">
                      Típus
                      {getSortIcon('mime_type')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('uploaded_at')}
                  >
                    <div className="flex items-center justify-center">
                      Feltöltve
                      {getSortIcon('uploaded_at')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('uploader')}
                  >
                    <div className="flex items-center">
                      Feltöltő
                      {getSortIcon('uploader')}
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedFiles.map((file) => (
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
                    <TableCell className="text-center text-sm">
                      {getSimpleFileType(file.mime_type)}
                    </TableCell>
                    <TableCell className="text-center">{formatDate(file.uploaded_at)}</TableCell>
                    <TableCell>{file.uploader?.full_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(file.mime_type?.startsWith('image/') || file.mime_type === 'application/pdf') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewFile(file)}
                            title="Előnézet"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadFile(file.file_path, file.file_name)}
                          title="Letöltés"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        {isAdmin && !isDeleted && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(file)}
                            className="text-destructive hover:text-destructive"
                            title="Törlés"
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

      {previewFile && (
        <DocumentFilePreview
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
          filePath={previewFile.file_path}
          fileName={previewFile.file_name}
          mimeType={previewFile.mime_type}
          onDownload={() => downloadFile(previewFile.file_path, previewFile.file_name)}
        />
      )}
    </>
  );
};
