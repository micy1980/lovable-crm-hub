import { useState, useCallback, useMemo } from 'react';
import { format, parseISO, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Download, Trash2, Upload, ArrowUpDown, ArrowUp, ArrowDown, Eye, History, Search, X, Filter, FileText, GripVertical } from 'lucide-react';
import { getFileTypeIcon } from '@/lib/fileTypeIcons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { ContractFile, useContractFiles } from '@/hooks/useContractFiles';
import { DocumentFileUpload } from '@/components/documents/DocumentFileUpload';
import { DocumentFilePreview } from '@/components/documents/DocumentFilePreview';
import { ContractFileVersionsDialog } from './ContractFileVersionsDialog';
import { useCompany } from '@/contexts/CompanyContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isAdminOrAbove } from '@/lib/roleUtils';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { cn } from '@/lib/utils';

interface ContractFilesTableProps {
  contractId: string;
  contractTitle: string;
  isDeleted: boolean;
}

type SortField = 'title' | 'file_size' | 'mime_type' | 'created_at' | 'uploader' | 'version_number';
type SortDirection = 'asc' | 'desc';

// Map MIME types to simple Windows-like file type names
const getSimpleFileType = (mimeType: string | null): string => {
  if (!mimeType) return '-';
  
  const mimeMap: Record<string, string> = {
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
    'image/jpeg': 'Kép',
    'image/jpg': 'Kép',
    'image/png': 'Kép',
    'image/gif': 'Kép',
    'image/webp': 'Kép',
    'image/svg+xml': 'SVG',
    'image/bmp': 'Kép',
    'image/tiff': 'Kép',
    'application/zip': 'ZIP',
    'application/x-rar-compressed': 'RAR',
    'application/x-7z-compressed': '7Z',
    'application/x-tar': 'TAR',
    'application/gzip': 'GZIP',
    'audio/mpeg': 'MP3',
    'audio/wav': 'WAV',
    'video/mp4': 'MP4',
    'video/avi': 'AVI',
    'video/quicktime': 'MOV',
    'application/json': 'JSON',
    'application/xml': 'XML',
    'text/html': 'HTML',
    'text/css': 'CSS',
    'application/javascript': 'JS',
  };
  
  return mimeMap[mimeType.toLowerCase()] || mimeType.split('/')[1]?.toUpperCase().slice(0, 10) || '-';
};

// Column configuration
const CONTRACT_FILES_COLUMNS: ColumnConfig[] = [
  { key: 'select', label: '', defaultWidth: 40, required: true, sortable: false },
  { key: 'title', label: 'Fájlnév', defaultWidth: 250, required: true },
  { key: 'version_number', label: 'Verzió', defaultWidth: 80 },
  { key: 'file_size', label: 'Méret', defaultWidth: 100 },
  { key: 'mime_type', label: 'Típus', defaultWidth: 100 },
  { key: 'created_at', label: 'Feltöltve', defaultWidth: 150 },
  { key: 'uploader', label: 'Feltöltő', defaultWidth: 150 },
  { key: 'actions', label: 'Műveletek', defaultWidth: 140, required: true, sortable: false },
];

export const ContractFilesTable = ({ contractId, contractTitle, isDeleted }: ContractFilesTableProps) => {
  const { activeCompany } = useCompany();
  const { data: profile } = useUserProfile();
  const isAdmin = isAdminOrAbove(profile);
  const { 
    files, 
    isLoading, 
    isDownloadingZip, 
    uploadFiles, 
    deleteFile, 
    downloadFile, 
    downloadMultipleFiles,
    getFileVersions,
    restoreVersion,
  } = useContractFiles(contractId);

  // Column management
  const {
    columnStates,
    visibleColumns,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
  } = useColumnSettings({
    storageKey: 'contract-files-columns',
    columns: CONTRACT_FILES_COLUMNS,
  });
  
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<ContractFile | null>(null);
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [previewFile, setPreviewFile] = useState<ContractFile | null>(null);
  const [versionsFile, setVersionsFile] = useState<ContractFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Column drag state
  const [draggedColIndex, setDraggedColIndex] = useState<number | null>(null);
  const [dragOverColIndex, setDragOverColIndex] = useState<number | null>(null);
  
  // Filter states
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Column drag handlers
  const handleColDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColIndex !== index) {
      setDragOverColIndex(index);
    }
  };

  const handleColDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (draggedColIndex !== null && draggedColIndex !== toIndex) {
      reorderColumns(draggedColIndex, toIndex);
    }
    setDraggedColIndex(null);
    setDragOverColIndex(null);
  };

  const handleColDragEnd = () => {
    setDraggedColIndex(null);
    setDragOverColIndex(null);
  };

  // Get unique file types for filter dropdown
  const fileTypes = useMemo(() => {
    const types = new Set<string>();
    files.forEach(f => {
      const type = getSimpleFileType(f.mime_type);
      if (type !== '-') types.add(type);
    });
    return Array.from(types).sort();
  }, [files]);

  // Filter logic
  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      // Search text filter
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const titleMatch = file.title.toLowerCase().includes(searchLower);
        if (!titleMatch) return false;
      }
      
      // Type filter
      if (filterType !== 'all') {
        const fileType = getSimpleFileType(file.mime_type);
        if (fileType !== filterType) return false;
      }
      
      // Date from filter
      if (filterDateFrom && file.created_at) {
        const fileDate = parseISO(file.created_at);
        const fromDate = startOfDay(new Date(filterDateFrom));
        if (isBefore(fileDate, fromDate)) return false;
      }
      
      // Date to filter
      if (filterDateTo && file.created_at) {
        const fileDate = parseISO(file.created_at);
        const toDate = endOfDay(new Date(filterDateTo));
        if (isAfter(fileDate, toDate)) return false;
      }
      
      return true;
    });
  }, [files, searchText, filterType, filterDateFrom, filterDateTo]);

  const hasActiveFilters = searchText || filterType !== 'all' || filterDateFrom || filterDateTo;

  const clearFilters = () => {
    setSearchText('');
    setFilterType('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
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

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    let aVal: any, bVal: any;
    
    switch (sortField) {
      case 'title':
        aVal = a.title.toLowerCase();
        bVal = b.title.toLowerCase();
        break;
      case 'file_size':
        aVal = a.file_size || 0;
        bVal = b.file_size || 0;
        break;
      case 'mime_type':
        aVal = getSimpleFileType(a.mime_type);
        bVal = getSimpleFileType(b.mime_type);
        break;
      case 'created_at':
        aVal = a.created_at ? new Date(a.created_at).getTime() : 0;
        bVal = b.created_at ? new Date(b.created_at).getTime() : 0;
        break;
      case 'uploader':
        aVal = a.uploader?.full_name?.toLowerCase() || '';
        bVal = b.uploader?.full_name?.toLowerCase() || '';
        break;
      case 'version_number':
        aVal = a.version_number || 1;
        bVal = b.version_number || 1;
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
    downloadMultipleFiles(Array.from(selectedFiles), contractTitle);
  };

  const handleUpload = async () => {
    if (!activeCompany || filesToUpload.length === 0) return;
    
    await uploadFiles.mutateAsync({
      contractId,
      files: filesToUpload,
      companyId: activeCompany.id,
    });
    
    setFilesToUpload([]);
    setUploadDialogOpen(false);
  };

  const handleDeleteClick = (file: ContractFile) => {
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

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDeleted) {
      setIsDragging(true);
    }
  }, [isDeleted]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isDeleted || !activeCompany) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await uploadFiles.mutateAsync({
        contractId,
        files: droppedFiles,
        companyId: activeCompany.id,
      });
    }
  }, [isDeleted, activeCompany, contractId, uploadFiles]);

  const handleRestoreVersion = (versionId: string) => {
    restoreVersion.mutate(versionId);
    setVersionsFile(null);
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
      <Card
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`transition-colors ${isDragging ? 'border-primary border-2 bg-primary/5' : ''}`}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Fájlok ({filteredFiles.length}{hasActiveFilters ? ` / ${files.length}` : ''})
          </CardTitle>
          <div className="flex gap-2">
            <ColumnSettingsPopover
              columnStates={columnStates}
              columns={CONTRACT_FILES_COLUMNS}
              onToggleVisibility={toggleVisibility}
              onReorder={reorderColumns}
              onReset={resetToDefaults}
            />
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
        <CardContent className="space-y-4">
          {/* Filter bar */}
          {files.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
              <Filter className="h-4 w-4 text-muted-foreground" />
              
              {/* Search text */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Keresés fájlnévben..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-8 h-8"
                />
                {searchText && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchText('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              {/* Type filter */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[130px] h-8">
                  <SelectValue placeholder="Típus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Összes típus</SelectItem>
                  {fileTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Date from */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">-tól:</span>
                <Input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-[130px] h-8"
                />
              </div>
              
              {/* Date to */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">-ig:</span>
                <Input
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="w-[130px] h-8"
                />
              </div>
              
              {/* Clear filters */}
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8">
                  <X className="h-4 w-4 mr-1" />
                  Szűrők törlése
                </Button>
              )}
            </div>
          )}

          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg z-10 pointer-events-none">
              <div className="text-lg font-medium text-primary">
                Húzza ide a fájlokat a feltöltéshez
              </div>
            </div>
          )}
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 mb-2" />
              <p>Még nincs fájl feltöltve</p>
              <p className="text-sm mt-1">Húzza ide a fájlokat vagy kattintson a feltöltés gombra</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Search className="h-12 w-12 mb-2" />
              <p>Nincs a szűrésnek megfelelő fájl</p>
              <Button variant="link" onClick={clearFilters} className="mt-2">
                Szűrők törlése
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table style={{ tableLayout: 'fixed', width: 'max-content', minWidth: '100%' }}>
                <TableHeader>
                  <TableRow>
                    {visibleColumns.map((col, index) => {
                      const config = getColumnConfig(col.key);
                      const isSortable = config?.sortable !== false;
                      
                      const renderHeader = () => {
                        if (col.key === 'select') {
                          return (
                            <Checkbox
                              checked={selectedFiles.size === files.length && files.length > 0}
                              onCheckedChange={handleSelectAll}
                            />
                          );
                        }
                        return (
                          <>
                            <GripVertical className="h-3 w-3 text-muted-foreground shrink-0 cursor-grab" />
                            <span className="truncate">{config?.label || col.key}</span>
                            {isSortable && getSortIcon(col.key as SortField)}
                          </>
                        );
                      };
                      
                      return (
                        <TableHead
                          key={col.key}
                          style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                          className={cn(
                            'relative select-none text-center',
                            dragOverColIndex === index && 'bg-accent',
                            draggedColIndex === index && 'opacity-50',
                            isSortable && col.key !== 'select' && col.key !== 'actions' && 'cursor-pointer hover:bg-muted/50'
                          )}
                          draggable={col.key !== 'select' && col.key !== 'actions'}
                          onDragStart={(e) => handleColDragStart(e, index)}
                          onDragOver={(e) => handleColDragOver(e, index)}
                          onDragLeave={handleColDragEnd}
                          onDrop={(e) => handleColDrop(e, index)}
                          onDragEnd={handleColDragEnd}
                          onClick={() => isSortable && col.key !== 'select' && col.key !== 'actions' && handleSort(col.key as SortField)}
                        >
                          <div className="flex items-center justify-center gap-1 w-full">
                            {renderHeader()}
                          </div>
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFiles.map((file) => (
                    <TableRow key={file.id}>
                      {visibleColumns.map((col) => {
                        const renderCell = () => {
                          switch (col.key) {
                            case 'select':
                              return (
                                <Checkbox
                                  checked={selectedFiles.has(file.id)}
                                  onCheckedChange={(checked) => handleSelectFile(file.id, !!checked)}
                                />
                              );
                            case 'title':
                              const { icon: FileIcon, className: iconClass } = getFileTypeIcon(file.mime_type);
                              return (
                                <div className="flex items-center gap-2">
                                  <FileIcon className={`h-4 w-4 ${iconClass}`} />
                                  <span className="font-medium truncate">{file.title}</span>
                                </div>
                              );
                            case 'version_number':
                              return (
                                <Badge variant="outline" className="text-xs">
                                  v{file.version_number || 1}
                                </Badge>
                              );
                            case 'file_size':
                              return formatFileSize(file.file_size);
                            case 'mime_type':
                              return <span className="text-sm">{getSimpleFileType(file.mime_type)}</span>;
                            case 'created_at':
                              return formatDate(file.created_at);
                            case 'uploader':
                              return file.uploader?.full_name || '-';
                            case 'actions':
                              const isImage = file.mime_type?.startsWith('image/');
                              const isPdf = file.mime_type === 'application/pdf' || file.mime_type === 'application/x-pdf';
                              const canPreview = isImage || isPdf;
                              return (
                                <div className="flex items-center justify-center gap-1">
                                  {canPreview ? (
                                    <Button variant="ghost" size="sm" onClick={() => setPreviewFile(file)} title="Előnézet">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button variant="ghost" size="sm" disabled className="opacity-30 relative" title="Előnézet nem elérhető">
                                      <Eye className="h-4 w-4" />
                                      <span className="absolute inset-0 flex items-center justify-center">
                                        <span className="w-6 h-0.5 bg-current rotate-45 absolute" />
                                      </span>
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" onClick={() => setVersionsFile(file)} title="Verzióelőzmények">
                                    <History className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => file.file_path && downloadFile(file.file_path, file.title)} 
                                    disabled={!file.file_path}
                                    title="Letöltés"
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                  {isAdmin && !isDeleted ? (
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteClick(file)} className="text-destructive hover:text-destructive" title="Törlés">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <div className="w-8" />
                                  )}
                                </div>
                              );
                            default:
                              return null;
                          }
                        };
                        
                        return (
                          <TableCell 
                            key={col.key}
                            style={{ width: col.width, minWidth: col.width, maxWidth: col.width }}
                            className={cn(
                              'truncate',
                              col.key !== 'title' && col.key !== 'uploader' && 'text-center'
                            )}
                          >
                            {renderCell()}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fájlok feltöltése</DialogTitle>
            <DialogDescription>
              Válassza ki a feltölteni kívánt fájlokat. Ha azonos nevű fájl már létezik, új verzióként kerül feltöltésre.
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
              Biztosan törölni szeretné a "{fileToDelete?.title}" fájlt? 
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

      {previewFile && previewFile.file_path && (
        <DocumentFilePreview
          open={!!previewFile}
          onOpenChange={(open) => !open && setPreviewFile(null)}
          filePath={previewFile.file_path}
          fileName={previewFile.title}
          mimeType={previewFile.mime_type}
          onDownload={() => previewFile.file_path && downloadFile(previewFile.file_path, previewFile.title)}
        />
      )}

      <ContractFileVersionsDialog
        open={!!versionsFile}
        onOpenChange={(open) => !open && setVersionsFile(null)}
        file={versionsFile}
        getVersions={getFileVersions}
        onDownload={downloadFile}
        onRestore={handleRestoreVersion}
        isAdmin={isAdmin}
      />
    </>
  );
};