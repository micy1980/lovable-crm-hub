import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
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

const Projects = () => {
  const { activeCompany } = useCompany();
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const { canEdit } = useReadOnlyMode();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const columnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'name', label: 'Név', required: true, defaultWidth: 200 },
    { key: 'code', label: 'Kód', defaultWidth: 120 },
    { key: 'partner', label: 'Partner', defaultWidth: 180 },
    { key: 'description', label: 'Leírás', defaultWidth: 250 },
    { key: 'status', label: 'Státusz', defaultWidth: 120 },
    { key: 'created_at', label: 'Létrehozva', defaultWidth: 150 },
  ], []);

  // Columns that should be centered
  const centeredColumns = ['status', 'created_at'];

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
      default:
        return '-';
    }
  };

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
            columns={columnConfigs}
            onToggleVisibility={toggleVisibility}
            onReorder={reorderColumns}
            onReset={resetToDefaults}
          />
          <ExportMenu
            data={projects || []}
            columns={visibleColumns.map(col => ({
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
          ) : projects && projects.length > 0 ? (
            <ResizableTable
              visibleColumns={visibleColumns}
              getColumnConfig={getColumnConfig}
              onColumnResize={setColumnWidth}
              onColumnReorder={reorderColumns}
            >
              <TableBody>
                {projects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer hover:bg-accent/50"
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
    </LicenseGuard>
  );
};

export default Projects;