import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { Link, useNavigate } from 'react-router-dom';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SalesDialog } from '@/components/sales/SalesDialog';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { ResizableTable } from '@/components/shared/ResizableTable';
import { TableBody, TableCell, TableRow } from '@/components/ui/table';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { formatCurrency, getNumberFormatSettings } from '@/lib/formatCurrency';
import { useSortableData } from '@/hooks/useSortableData';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import { BulkActionsToolbar } from '@/components/shared/BulkActionsToolbar';
import { BulkDeleteDialog } from '@/components/shared/BulkDeleteDialog';
import { FavoriteButton } from '@/components/shared/FavoriteButton';
import { TagDisplay } from '@/components/shared/TagSelector';

const Sales = () => {
  const { activeCompany } = useCompany();
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const { canEdit } = useReadOnlyMode();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { settings: systemSettings } = useSystemSettings();
  const numberFormatSettings = getNumberFormatSettings(systemSettings);

  const columnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'select', label: '', defaultWidth: 40, sortable: false },
    { key: 'favorite', label: '', defaultWidth: 40, sortable: false },
    { key: 'name', label: 'Név', required: true, defaultWidth: 200 },
    { key: 'partner', label: 'Partner', defaultWidth: 180 },
    { key: 'expected_value', label: 'Várható érték', defaultWidth: 150 },
    { key: 'currency', label: 'Pénznem', defaultWidth: 100 },
    { key: 'expected_close_date', label: 'Várható lezárás', defaultWidth: 140 },
    { key: 'status', label: 'Státusz', defaultWidth: 120 },
    { key: 'tags', label: 'Címkék', defaultWidth: 150, sortable: false },
    { key: 'description', label: 'Leírás', defaultWidth: 200, defaultVisible: false, sortable: false },
    { key: 'actions', label: 'Műveletek', defaultWidth: 80, sortable: false },
  ], []);

  // Columns that should be centered or right-aligned
  const centeredColumns = ['favorite', 'currency', 'expected_close_date', 'status'];
  const rightAlignedColumns = ['expected_value'];

  const {
    columnStates,
    visibleColumns,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
  } = useColumnSettings({
    storageKey: 'sales-column-settings',
    columns: columnConfigs,
  });

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];

      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Fetch partner names for each sale that has a partner_id
      const partnerIds = [...new Set(data.filter(s => s.partner_id).map(s => s.partner_id))];
      let partnerMap: Record<string, string> = {};
      
      if (partnerIds.length > 0) {
        const { data: partners } = await supabase
          .from('partners')
          .select('id, name')
          .in('id', partnerIds);
        
        if (partners) {
          partnerMap = Object.fromEntries(partners.map(p => [p.id, p.name]));
        }
      }
      
      return data.map(sale => ({
        ...sale,
        partnerName: sale.partner_id ? partnerMap[sale.partner_id] || null : null
      }));
    },
    enabled: !!activeCompany,
  });

  const { sortedData: sortedSales, sortState, handleSort } = useSortableData({
    data: sales || [],
    sortFunctions: {
      name: (a, b) => (a.name || '').localeCompare(b.name || '', 'hu'),
      partner: (a, b) => (a.partnerName || '').localeCompare(b.partnerName || '', 'hu'),
      expected_value: (a, b) => (a.expected_value || 0) - (b.expected_value || 0),
      currency: (a, b) => (a.currency || '').localeCompare(b.currency || ''),
      expected_close_date: (a, b) => new Date(a.expected_close_date || 0).getTime() - new Date(b.expected_close_date || 0).getTime(),
      status: (a, b) => (a.status || '').localeCompare(b.status || ''),
    },
  });

  // Bulk selection and operations
  const bulkSelection = useBulkSelection(sortedSales);
  const bulkOperations = useBulkOperations({
    entityType: 'sales',
    queryKey: ['sales', activeCompany?.id || ''],
    onSuccess: () => bulkSelection.clearSelection(),
  });

  const handleBulkStatusChange = (status: string) => {
    bulkOperations.bulkStatusChange.mutate({
      ids: Array.from(bulkSelection.selectedIds),
      status,
    });
  };

  const handleBulkDelete = () => {
    bulkOperations.bulkDelete.mutate(Array.from(bulkSelection.selectedIds));
    setDeleteDialogOpen(false);
  };
  const getStatusLabel = (status: string | null) => {
    if (!status) return '-';
    switch (status) {
      case 'lead': return 'Lead';
      case 'qualified': return 'Minősített';
      case 'proposal': return 'Ajánlat';
      case 'negotiation': return 'Tárgyalás';
      case 'closed_won': return 'Megnyert';
      case 'closed_lost': return 'Elveszett';
      default: return status;
    }
  };

  const salesStatuses = [
    { value: 'lead', label: 'Lead' },
    { value: 'qualified', label: 'Minősített' },
    { value: 'proposal', label: 'Ajánlat' },
    { value: 'negotiation', label: 'Tárgyalás' },
    { value: 'closed_won', label: 'Megnyert' },
    { value: 'closed_lost', label: 'Elveszett' },
  ];

  const renderCellContent = (sale: any, columnKey: string) => {
    switch (columnKey) {
      case 'select':
        return (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={bulkSelection.selectedIds.has(sale.id)}
              onCheckedChange={() => bulkSelection.toggleItem(sale.id)}
            />
          </div>
        );
      case 'favorite':
        return <FavoriteButton entityType="sales" entityId={sale.id} />;
      case 'name':
        return <span className="font-medium">{sale.name}</span>;
      case 'partner':
        return sale.partnerName || '-';
      case 'expected_value':
        return <span className="font-mono">{formatCurrency(sale.expected_value, sale.currency || 'HUF', numberFormatSettings)}</span>;
      case 'currency':
        return sale.currency || 'HUF';
      case 'expected_close_date':
        return sale.expected_close_date
          ? new Date(sale.expected_close_date).toLocaleDateString('hu-HU')
          : '-';
      case 'status':
        return sale.status ? (
          <Badge variant="secondary">{getStatusLabel(sale.status)}</Badge>
        ) : '-';
      case 'tags':
        return <TagDisplay entityType="sales" entityId={sale.id} />;
      case 'description':
        return sale.description ? (
          <span className="line-clamp-2">{sale.description}</span>
        ) : '-';
      case 'actions':
        return (
          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/sales/${sale.id}`);
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

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t('sales.noCompanySelected')}</CardTitle>
            <CardDescription>
              {t('sales.noCompanyMessage')}
            </CardDescription>
          </CardHeader>
          {isSuperAdmin(profile) && (
            <CardContent>
              <Link to="/settings">
                <Button className="w-full">{t('sales.createCompany')}</Button>
              </Link>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  return (
    <LicenseGuard feature="sales">
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('sales.title')}</h1>
          <p className="text-muted-foreground">
            {t('sales.description', { companyName: activeCompany.name })}
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
            data={sales || []}
            columns={visibleColumns.map(col => ({
              header: getColumnConfig(col.key)?.label || col.key,
              key: col.key === 'partner' ? 'partners.name' : col.key,
            }))}
            title="Értékesítések"
          />
          <Button onClick={() => setDialogOpen(true)} disabled={!canEdit} className="min-w-[140px]">
            <Plus className="h-4 w-4" />
            {t('sales.newOpportunity')}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('sales.salesPipeline')}</CardTitle>
          <CardDescription>
            {t('sales.pipelineDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BulkActionsToolbar
            selectedCount={bulkSelection.selectedCount}
            onClearSelection={bulkSelection.clearSelection}
            onBulkStatusChange={handleBulkStatusChange}
            onBulkDelete={() => setDeleteDialogOpen(true)}
            statusOptions={salesStatuses}
          />
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Betöltés...
            </div>
          ) : sortedSales.length > 0 ? (
            <ResizableTable
              visibleColumns={visibleColumns}
              getColumnConfig={getColumnConfig}
              onColumnResize={setColumnWidth}
              onColumnReorder={reorderColumns}
              sortState={sortState}
              onSort={handleSort}
              selectHeader={
                <Checkbox
                  checked={bulkSelection.isAllSelected}
                  indeterminate={bulkSelection.isPartiallySelected}
                  onCheckedChange={bulkSelection.toggleAll}
                  aria-label="Select all"
                />
              }
            >
              <TableBody>
                {sortedSales.map((sale) => (
                  <TableRow
                    key={sale.id}
                    className="cursor-pointer hover:bg-accent/50"
                    onClick={() => navigate(`/sales/${sale.id}`)}
                  >
                    {visibleColumns.map((col) => (
                      <TableCell 
                        key={col.key} 
                        style={{ width: col.width }}
                        className={
                          centeredColumns.includes(col.key) 
                            ? 'text-center' 
                            : rightAlignedColumns.includes(col.key)
                              ? 'text-right'
                              : ''
                        }
                      >
                        {renderCellContent(sale, col.key)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </ResizableTable>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nincs értékesítési lehetőség
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <SalesDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      
      <BulkDeleteDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleBulkDelete}
        count={bulkSelection.selectedCount}
        entityName="értékesítés"
        isLoading={bulkOperations.bulkDelete.isPending}
      />
    </LicenseGuard>
  );
};

export default Sales;