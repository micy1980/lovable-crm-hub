import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Download, Trash2, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { hu } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TableRow, TableCell } from '@/components/ui/table';
import { useDocuments } from '@/hooks/useDocuments';
import { useCompany } from '@/contexts/CompanyContext';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { DocumentDialog } from '@/components/documents/DocumentDialog';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { ResizableTable, ResizableTableCell } from '@/components/shared/ResizableTable';
import { useSortableData } from '@/hooks/useSortableData';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin, isAdminOrAbove } from '@/lib/roleUtils';
import { PasswordConfirmDialog } from '@/components/shared/PasswordConfirmDialog';
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

const STORAGE_KEY = 'documents-column-settings';

const Documents = () => {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { data: profile } = useUserProfile();
  const isSuper = isSuperAdmin(profile);
  const isAdmin = isAdminOrAbove(profile);
  const { documents, isLoading, deleteDocument, hardDeleteDocument, downloadDocument } = useDocuments();
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);
  const [hardDeleteDialogOpen, setHardDeleteDialogOpen] = useState(false);
  const [documentToHardDelete, setDocumentToHardDelete] = useState<any>(null);

  const columnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'title', label: 'Megnevezés', defaultVisible: true, defaultWidth: 250, required: true },
    { key: 'visibility', label: 'Láthatóság', defaultVisible: true, defaultWidth: 120 },
    { key: 'partner', label: 'Partner', defaultVisible: true, defaultWidth: 150 },
    { key: 'project', label: 'Projekt', defaultVisible: true, defaultWidth: 150 },
    { key: 'sales', label: 'Értékesítés', defaultVisible: false, defaultWidth: 150 },
    { key: 'size', label: 'Méret', defaultVisible: true, defaultWidth: 100 },
    { key: 'uploaded', label: 'Feltöltve', defaultVisible: true, defaultWidth: 120 },
    { key: 'uploader', label: 'Feltöltő', defaultVisible: false, defaultWidth: 150 },
  ], []);

  const {
    columnStates,
    visibleColumns,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
  } = useColumnSettings({ storageKey: STORAGE_KEY, columns: columnConfigs });

  const filteredDocuments = useMemo(() => {
    if (!searchTerm) return documents;
    const lower = searchTerm.toLowerCase();
    return documents.filter((d: any) =>
      d.title.toLowerCase().includes(lower) ||
      d.description?.toLowerCase().includes(lower) ||
      d.partner?.name?.toLowerCase().includes(lower) ||
      d.project?.name?.toLowerCase().includes(lower)
    );
  }, [documents, searchTerm]);

  const { sortedData: sortedDocuments, sortState, handleSort } = useSortableData({
    data: filteredDocuments,
    sortFunctions: {
      title: (a, b) => (a.title || '').localeCompare(b.title || '', 'hu'),
      visibility: (a, b) => (a.visibility || '').localeCompare(b.visibility || ''),
      partner: (a, b) => (a.partner?.name || '').localeCompare(b.partner?.name || '', 'hu'),
      project: (a, b) => (a.project?.name || '').localeCompare(b.project?.name || '', 'hu'),
      sales: (a, b) => (a.sales?.name || '').localeCompare(b.sales?.name || '', 'hu'),
      size: (a, b) => (a.file_size || 0) - (b.file_size || 0),
      uploaded: (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
      uploader: (a, b) => (a.uploader?.full_name || '').localeCompare(b.uploader?.full_name || '', 'hu'),
    },
  });

  const getVisibilityBadge = (visibility: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
      COMPANY_ONLY: { label: 'Cég', variant: 'default' },
      PROJECT_ONLY: { label: 'Projekt', variant: 'secondary' },
      SALES_ONLY: { label: 'Értékesítés', variant: 'outline' },
      PUBLIC: { label: 'Publikus', variant: 'default' },
    };
    const config = variants[visibility] || { label: visibility, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    const mb = bytes / 1024 / 1024;
    if (mb >= 1) return `${mb.toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(2)} KB`;
  };

  const handleEdit = (doc: any) => {
    setSelectedDocument(doc);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedDocument(null);
  };

  const handleSoftDeleteClick = (doc: any) => {
    setDocumentToDelete(doc);
    setDeleteDialogOpen(true);
  };

  const handleHardDeleteClick = (doc: any) => {
    setDocumentToHardDelete(doc);
    setHardDeleteDialogOpen(true);
  };

  const handleConfirmSoftDelete = async () => {
    if (documentToDelete) {
      await deleteDocument.mutateAsync(documentToDelete.id);
      setDeleteDialogOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleConfirmHardDelete = async () => {
    if (documentToHardDelete) {
      await hardDeleteDocument.mutateAsync({
        id: documentToHardDelete.id,
        filePath: documentToHardDelete.file_path,
      });
      setHardDeleteDialogOpen(false);
      setDocumentToHardDelete(null);
    }
  };

  const getCellValue = (doc: any, key: string) => {
    switch (key) {
      case 'title':
        return (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div>
              <div className="font-medium flex items-center gap-2">
                {doc.title}
                {doc.deleted_at && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Törölt
                  </Badge>
                )}
              </div>
              {doc.description && (
                <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                  {doc.description}
                </div>
              )}
            </div>
          </div>
        );
      case 'visibility':
        return getVisibilityBadge(doc.visibility);
      case 'partner':
        return doc.partner?.name || '-';
      case 'project':
        return doc.project?.name || '-';
      case 'sales':
        return doc.sales?.name || '-';
      case 'size':
        return formatFileSize(doc.file_size);
      case 'uploaded':
        return doc.created_at ? format(parseISO(doc.created_at), 'yyyy.MM.dd', { locale: hu }) : '-';
      case 'uploader':
        return doc.uploader?.full_name || '-';
      default:
        return '-';
    }
  };

  if (!activeCompany) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Válasszon céget a dokumentumok megtekintéséhez</p>
      </div>
    );
  }

  return (
    <LicenseGuard feature="documents">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dokumentumok</h1>
            <p className="text-muted-foreground">Dokumentum kezelés</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Új dokumentum
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ColumnSettingsPopover
            columnStates={columnStates}
            columns={columnConfigs}
            onToggleVisibility={toggleVisibility}
            onReorder={reorderColumns}
            onReset={resetToDefaults}
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : sortedDocuments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nincs találat' : 'Még nincs dokumentum'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <ResizableTable
              visibleColumns={visibleColumns}
              onColumnResize={setColumnWidth}
              onColumnReorder={reorderColumns}
              data={sortedDocuments}
              renderHeader={(col) => getColumnConfig(col.key)?.label || col.key}
              sortState={sortState}
              onSort={handleSort}
              renderRow={(doc, columns) => (
                <TableRow 
                  key={doc.id} 
                  className={`cursor-pointer hover:bg-muted/50 ${doc.deleted_at ? 'opacity-60' : ''}`}
                  onClick={() => handleEdit(doc)}
                >
                  {columns.map((col) => (
                    <ResizableTableCell 
                      key={col.key} 
                      width={col.width}
                    >
                      {getCellValue(doc, col.key)}
                    </ResizableTableCell>
                  ))}
                  <TableCell className="w-[120px]">
                    <div className="flex items-center gap-1">
                      {doc.file_path && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadDocument(doc.file_path, doc.title);
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {isAdmin && !doc.deleted_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSoftDeleteClick(doc);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      {isSuper && doc.deleted_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHardDeleteClick(doc);
                          }}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            />
          </Card>
        )}
      </div>

      <DocumentDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        document={selectedDocument}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dokumentum törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törölni szeretné a "{documentToDelete?.title}" dokumentumot?
              A dokumentum nem lesz látható, de nem törlődik véglegesen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSoftDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PasswordConfirmDialog
        open={hardDeleteDialogOpen}
        onOpenChange={setHardDeleteDialogOpen}
        onConfirm={handleConfirmHardDelete}
        title="Dokumentum végleges törlése"
        description={`A "${documentToHardDelete?.title}" dokumentum és a hozzá tartozó fájl véglegesen törlődik. Ez a művelet NEM vonható vissza.`}
      />
    </LicenseGuard>
  );
};

export default Documents;