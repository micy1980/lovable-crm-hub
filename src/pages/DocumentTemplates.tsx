import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Download, Pencil, Trash2, FileText } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import { useDocumentTemplates, DocumentTemplate } from '@/hooks/useDocumentTemplates';
import { useMasterData } from '@/hooks/useMasterData';
import { TemplateDialog } from '@/components/documents/TemplateDialog';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { ResizableTable } from '@/components/shared/ResizableTable';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { useSortableData } from '@/hooks/useSortableData';
import { getFileTypeIcon } from '@/lib/fileTypeIcons';
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

const DocumentTemplates = () => {
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const { canEdit } = useReadOnlyMode();
  const { templates, isLoading, deleteTemplate, downloadTemplate } = useDocumentTemplates();
  const { items: categories } = useMasterData('template_category');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<DocumentTemplate | null>(null);

  const columnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'name', label: 'Név', required: true, defaultWidth: 200 },
    { key: 'category', label: 'Kategória', defaultWidth: 150 },
    { key: 'file_name', label: 'Fájlnév', defaultWidth: 200 },
    { key: 'description', label: 'Leírás', defaultWidth: 250, sortable: false },
    { key: 'variables', label: 'Változók', defaultWidth: 150, sortable: false },
    { key: 'created_at', label: 'Létrehozva', defaultWidth: 120 },
    { key: 'actions', label: 'Műveletek', defaultWidth: 120, sortable: false },
  ], []);

  const {
    columnStates,
    visibleColumns,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
  } = useColumnSettings({
    storageKey: 'document-templates-column-settings',
    columns: columnConfigs,
  });

  const { sortedData, sortState, handleSort } = useSortableData({
    data: templates || [],
    sortFunctions: {
      name: (a, b) => a.name.localeCompare(b.name, 'hu'),
      category: (a, b) => (a.category || '').localeCompare(b.category || ''),
      file_name: (a, b) => a.file_name.localeCompare(b.file_name, 'hu'),
      created_at: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
  });

  const getCategoryLabel = (value: string | null) => {
    if (!value) return '-';
    const cat = categories.find(c => c.value === value);
    return cat?.label || value;
  };

  const handleEdit = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleDelete = (template: DocumentTemplate) => {
    setTemplateToDelete(template);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate.mutateAsync(templateToDelete.id);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  const renderCellContent = (template: DocumentTemplate, columnKey: string) => {
    switch (columnKey) {
      case 'name':
        const { icon: FileIcon, className: iconClass } = getFileTypeIcon(template.mime_type || '');
        return (
          <div className="flex items-center gap-2">
            <FileIcon className={`h-4 w-4 ${iconClass}`} />
            <span className="font-medium">{template.name}</span>
          </div>
        );
      case 'category':
        return template.category ? (
          <Badge variant="secondary">{getCategoryLabel(template.category)}</Badge>
        ) : '-';
      case 'file_name':
        return template.file_name;
      case 'description':
        return template.description ? (
          <span className="line-clamp-2">{template.description}</span>
        ) : '-';
      case 'variables':
        return template.variables?.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {template.variables.slice(0, 2).map((v) => (
              <Badge key={v} variant="outline" className="text-xs">
                {v}
              </Badge>
            ))}
            {template.variables.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{template.variables.length - 2}
              </Badge>
            )}
          </div>
        ) : '-';
      case 'created_at':
        return new Date(template.created_at).toLocaleDateString('hu-HU');
      case 'actions':
        return (
          <div className="flex items-center justify-center gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => downloadTemplate(template)}
              title="Letöltés"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleEdit(template)}
              title="Szerkesztés"
              disabled={!canEdit}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => handleDelete(template)}
              title="Törlés"
              disabled={!canEdit}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      default:
        return '-';
    }
  };

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Nincs cég kiválasztva</CardTitle>
            <CardDescription>
              Válassz egy céget a sablonok megtekintéséhez
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dokumentum sablonok</h1>
          <p className="text-muted-foreground">
            Újrafelhasználható sablonok dokumentumok generálásához
          </p>
        </div>
        <div className="flex gap-2">
          <ColumnSettingsPopover
            columnStates={columnStates}
            columns={columnConfigs}
            onToggleVisibility={toggleVisibility}
            onReorder={reorderColumns}
            onReset={resetToDefaults}
          />
          <Button
            onClick={() => {
              setSelectedTemplate(undefined);
              setDialogOpen(true);
            }}
            disabled={!canEdit}
          >
            <Plus className="h-4 w-4" />
            Új sablon
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sablonok</CardTitle>
          <CardDescription>
            {activeCompany.name} cég dokumentum sablonjai
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Betöltés...
            </div>
          ) : sortedData.length > 0 ? (
            <ResizableTable
              visibleColumns={visibleColumns}
              getColumnConfig={getColumnConfig}
              onColumnResize={setColumnWidth}
              onColumnReorder={reorderColumns}
              sortState={sortState}
              onSort={handleSort}
            >
              <TableBody>
                {sortedData.map((template) => (
                  <TableRow key={template.id} className="hover:bg-accent/50">
                    {visibleColumns.map((col) => (
                      <TableCell
                        key={col.key}
                        style={{ width: col.width }}
                        className={col.key === 'actions' || col.key === 'created_at' ? 'text-center' : ''}
                      >
                        {renderCellContent(template, col.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </ResizableTable>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Még nincsenek sablonok</p>
              <p className="text-sm">Kattints az "Új sablon" gombra egy sablon létrehozásához</p>
            </div>
          )}
        </CardContent>
      </Card>

      <TemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sablon törlése</AlertDialogTitle>
            <AlertDialogDescription>
              Biztosan törölni szeretnéd a "{templateToDelete?.name}" sablont? Ez a művelet nem vonható vissza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégse</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Törlés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DocumentTemplates;
