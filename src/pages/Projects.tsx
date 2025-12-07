import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { Link, useNavigate } from 'react-router-dom';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { ProjectDialog } from '@/components/projects/ProjectDialog';
import { useMemo, useState } from 'react';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { ResizableTable } from '@/components/shared/ResizableTable';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useSortableData } from '@/hooks/useSortableData';
import { Checkbox } from '@/components/ui/checkbox';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import { BulkActionsToolbar, StatusOption, UserOption } from '@/components/shared/BulkActionsToolbar';
import { BulkDeleteDialog } from '@/components/shared/BulkDeleteDialog';

const Projects = () => {
  const { activeCompany } = useCompany();
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const { canEdit } = useReadOnlyMode();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const columnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'select', label: '', defaultWidth: 40, sortable: false },
    { key: 'name', label: 'Név', required: true, defaultWidth: 200 },
    { key: 'code', label: 'Kód', defaultWidth: 120 },
    { key: 'partner', label: 'Partner', defaultWidth: 180 },
    { key: 'description', label: 'Leírás', defaultWidth: 250, sortable: false },
    { key: 'status', label: 'Státusz', defaultWidth: 120 },
    { key: 'created_at', label: 'Létrehozva', defaultWidth: 150 },
    { key: 'actions', label: 'Műveletek', defaultWidth: 80, sortable: false },
  ], []);

  // Columns that should be centered
  const centeredColumns = ['select', 'status', 'created_at'];

  const {
    columnStates,
    visibleColumns,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
  } = useColumnSettings({
    storageKey: 'projects-column-settings',
    columns: columnConfigs,
  });

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          partner:partners(id, name)
        `)
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany,
  });

  // Fetch users for owner change
  const { data: companyUsers } = useQuery({
    queryKey: ['company-users', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];
      const { data, error } = await supabase.rpc('get_company_users_for_assignment', {
        _company_id: activeCompany.id,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany,
  });

  const { sortedData: sortedProjects, sortState, handleSort } = useSortableData({
    data: projects || [],
    sortFunctions: {
      name: (a, b) => (a.name || '').localeCompare(b.name || '', 'hu'),
      code: (a, b) => (a.code || '').localeCompare(b.code || ''),
      partner: (a, b) => (a.partner?.name || '').localeCompare(b.partner?.name || '', 'hu'),
      status: (a, b) => (a.status || '').localeCompare(b.status || ''),
      created_at: (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
    },
  });

  // Bulk selection
  const {
    selectedIds,
    isAllSelected,
    isPartiallySelected,
    toggleItem,
    toggleAll,
    clearSelection,
    selectedCount,
    hasSelection,
  } = useBulkSelection(sortedProjects);

  // Bulk operations
  const { bulkStatusChange, bulkOwnerChange, bulkDelete, isProcessing } = useBulkOperations({
    entityType: 'projects',
    queryKey: ['projects', activeCompany?.id || ''],
    onSuccess: clearSelection,
  });

  // Status options
  const statusOptions: StatusOption[] = useMemo(() => [
    { value: 'planning', label: 'Tervezés' },
    { value: 'in_progress', label: 'Folyamatban' },
    { value: 'on_hold', label: 'Felfüggesztve' },
    { value: 'completed', label: 'Befejezett' },
    { value: 'cancelled', label: 'Törölve' },
  ], []);

  // User options for owner change
  const userOptions: UserOption[] = useMemo(() => 
    (companyUsers || []).map((u: any) => ({
      id: u.id,
      name: u.full_name || u.email,
    })),
    [companyUsers]
  );

  const handleBulkStatusChange = (status: string) => {
    bulkStatusChange.mutate({ ids: Array.from(selectedIds), status });
  };

  const handleBulkOwnerChange = (userId: string) => {
    bulkOwnerChange.mutate({ ids: Array.from(selectedIds), userId, field: 'owner_user_id' });
  };

  const handleBulkDelete = () => {
    bulkDelete.mutate(Array.from(selectedIds));
    setBulkDeleteDialogOpen(false);
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return '-';
    switch (status) {
      case 'planning': return 'Tervezés';
      case 'in_progress': return 'Folyamatban';
      case 'on_hold': return 'Felfüggesztve';
      case 'completed': return 'Befejezett';
      case 'cancelled': return 'Törölve';
      default: return status;
    }
  };

  const renderCellContent = (project: any, columnKey: string) => {
    switch (columnKey) {
      case 'select':
        return (
          <Checkbox
            checked={selectedIds.has(project.id)}
            onCheckedChange={() => toggleItem(project.id)}
            onClick={(e) => e.stopPropagation()}
          />
        );
      case 'name':
        return <span className="font-medium">{project.name}</span>;
      case 'code':
        return project.code || '-';
      case 'partner':
        return project.partner?.name || '-';
      case 'description':
        return project.description ? (
          <span className="line-clamp-2">{project.description}</span>
        ) : '-';
      case 'status':
        return project.status ? (
          <Badge variant="secondary">{getStatusLabel(project.status)}</Badge>
        ) : '-';
      case 'created_at':
        return project.created_at 
          ? new Date(project.created_at).toLocaleDateString('hu-HU')
          : '-';
      case 'actions':
        return (
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/projects/${project.id}`);
              }}
              title="Szerkesztés"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        );
      default:
        return '-';
    }
  };

  // Custom getColumnConfig to handle select checkbox
  const getColumnConfigWithCheckbox = (key: string): ColumnConfig | undefined => {
    if (key === 'select') {
      return {
        key: 'select',
        label: '',
        defaultWidth: 40,
        sortable: false,
        // Custom render will be handled in the cell
      };
    }
    return getColumnConfig(key);
  };

  // Render select header cell manually in the table
  const renderSelectHeader = () => (
    <Checkbox
      checked={isAllSelected}
      ref={(el) => {
        if (el) {
          (el as any).indeterminate = isPartiallySelected;
        }
      }}
      onCheckedChange={toggleAll}
    />
  );

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t('projects.noCompanySelected')}</CardTitle>
            <CardDescription>
              {t('projects.noCompanyMessage')}
            </CardDescription>
          </CardHeader>
          {isSuperAdmin(profile) && (
            <CardContent>
              <Link to="/settings">
                <Button className="w-full">{t('projects.createCompany')}</Button>
              </Link>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <LicenseGuard feature="projects">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('projects.title')}</h1>
          <p className="text-muted-foreground">
            {t('projects.description', { companyName: activeCompany.name })}
          </p>
        </div>
        <div className="flex gap-2">
          <ColumnSettingsPopover
            columnStates={columnStates}
            columns={columnConfigs.filter(c => c.key !== 'select')}
            onToggleVisibility={toggleVisibility}
            onReorder={reorderColumns}
            onReset={resetToDefaults}
          />
          <ExportMenu
            data={projects || []}
            columns={visibleColumns.filter(c => c.key !== 'select' && c.key !== 'actions').map(col => ({
              header: getColumnConfig(col.key)?.label || col.key,
              key: col.key === 'partner' ? 'partner.name' : col.key,
            }))}
            title="Projektek"
          />
          <Button onClick={() => setDialogOpen(true)} disabled={!canEdit} className="min-w-[140px]">
            <Plus className="h-4 w-4" />
            {t('projects.newProject')}
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedCount}
        onClearSelection={clearSelection}
        onBulkDelete={() => setBulkDeleteDialogOpen(true)}
        onBulkStatusChange={handleBulkStatusChange}
        onBulkOwnerChange={handleBulkOwnerChange}
        statusOptions={statusOptions}
        userOptions={userOptions}
        showDelete={canEdit}
        showStatusChange={canEdit}
        showOwnerChange={canEdit}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('projects.allProjects')}</CardTitle>
          <CardDescription>
            {t('projects.projectsIn', { companyName: activeCompany.name })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('projects.loadingProjects')}
            </div>
          ) : sortedProjects.length > 0 ? (
            <ResizableTable
              visibleColumns={visibleColumns}
              getColumnConfig={getColumnConfigWithCheckbox}
              onColumnResize={setColumnWidth}
              onColumnReorder={reorderColumns}
              sortState={sortState}
              onSort={handleSort}
              selectHeader={renderSelectHeader()}
            >
              <TableBody>
                {sortedProjects.map((project) => (
                  <TableRow
                    key={project.id}
                    className={`cursor-pointer hover:bg-accent/50 ${selectedIds.has(project.id) ? 'bg-primary/5' : ''}`}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    {visibleColumns.map((col) => (
                      <TableCell 
                        key={col.key} 
                        style={{ width: col.width }}
                        className={centeredColumns.includes(col.key) ? 'text-center' : ''}
                      >
                        {renderCellContent(project, col.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </ResizableTable>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t('projects.noProjectsFound')}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <ProjectDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <BulkDeleteDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        onConfirm={handleBulkDelete}
        count={selectedCount}
        entityName="projekt"
        isLoading={isProcessing}
      />
    </LicenseGuard>
  );
};

export default Projects;
