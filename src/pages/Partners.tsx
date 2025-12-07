import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePartners } from '@/hooks/usePartners';
import { PartnerDialog } from '@/components/partners/PartnerDialog';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ExportMenu } from '@/components/shared/ExportMenu';
import { useColumnSettings, ColumnConfig } from '@/hooks/useColumnSettings';
import { ColumnSettingsPopover } from '@/components/shared/ColumnSettingsPopover';
import { ResizableTable, ResizableTableCell } from '@/components/shared/ResizableTable';
import { useSortableData } from '@/hooks/useSortableData';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useBulkOperations } from '@/hooks/useBulkOperations';
import { BulkActionsToolbar } from '@/components/shared/BulkActionsToolbar';
import { BulkDeleteDialog } from '@/components/shared/BulkDeleteDialog';
import { useCompany } from '@/contexts/CompanyContext';
import { FavoriteButton } from '@/components/shared/FavoriteButton';
import { TagDisplay } from '@/components/shared/TagSelector';

const formatAddress = (address: any) => {
  if (!address) return '-';
  const parts = [
    address.postal_code,
    address.city,
    address.street_name && address.street_type 
      ? `${address.street_name} ${address.street_type}` 
      : address.street_name,
    address.house_number,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '-';
};

const STORAGE_KEY = 'partners-column-settings';

const Partners = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const { partners, isLoading, createPartner, updatePartner } = usePartners();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { canEdit, checkReadOnly } = useReadOnlyMode();

  const columnConfigs: ColumnConfig[] = useMemo(() => [
    { key: 'select', label: 'Kijelölés', defaultWidth: 40, sortable: false },
    { key: 'favorite', label: 'Kedvencek', defaultWidth: 40, sortable: false },
    { key: 'name', label: t('partners.name'), defaultVisible: true, defaultWidth: 200, required: true },
    { key: 'category', label: t('partners.category'), defaultVisible: true, defaultWidth: 120 },
    { key: 'headquarters', label: t('partners.headquarters'), defaultVisible: true, defaultWidth: 200, sortable: false },
    { key: 'site', label: t('partners.site'), defaultVisible: false, defaultWidth: 200, sortable: false },
    { key: 'mailing', label: t('partners.mailingAddress'), defaultVisible: false, defaultWidth: 200, sortable: false },
    { key: 'phone', label: t('partners.phone'), defaultVisible: true, defaultWidth: 130 },
    { key: 'email', label: t('partners.email'), defaultVisible: true, defaultWidth: 180 },
    { key: 'taxId', label: t('partners.taxId'), defaultVisible: true, defaultWidth: 150 },
    { key: 'euVatNumber', label: t('partners.euVatNumber'), defaultVisible: false, defaultWidth: 150 },
    { key: 'currency', label: t('partners.defaultCurrency'), defaultVisible: false, defaultWidth: 100 },
    { key: 'status', label: t('partners.statusLabel') || 'Státusz', defaultVisible: true, defaultWidth: 100, sortable: false },
    { key: 'tags', label: t('tags.title') || 'Címkék', defaultVisible: true, defaultWidth: 150, sortable: false },
  ], [t]);

  // Columns that should be centered
  const centeredColumns = ['favorite', 'category', 'currency', 'status'];

  const {
    columnStates,
    visibleColumns,
    toggleVisibility,
    setColumnWidth,
    reorderColumns,
    resetToDefaults,
    getColumnConfig,
  } = useColumnSettings({ storageKey: STORAGE_KEY, columns: columnConfigs });

  const { sortedData: sortedPartners, sortState, handleSort } = useSortableData({
    data: partners,
    sortFunctions: {
      name: (a, b) => (a.name || '').localeCompare(b.name || '', 'hu'),
      category: (a, b) => (a.category || '').localeCompare(b.category || '', 'hu'),
      phone: (a, b) => (a.phone || '').localeCompare(b.phone || ''),
      email: (a, b) => (a.email || '').localeCompare(b.email || ''),
      taxId: (a, b) => (a.tax_id || '').localeCompare(b.tax_id || ''),
      euVatNumber: (a, b) => (a.eu_vat_number || '').localeCompare(b.eu_vat_number || ''),
      currency: (a, b) => (a.default_currency || '').localeCompare(b.default_currency || ''),
    },
  });

  // Bulk selection and operations
  const bulkSelection = useBulkSelection(sortedPartners);
  const bulkOperations = useBulkOperations({
    entityType: 'partners',
    queryKey: ['partners', activeCompany?.id || ''],
    onSuccess: () => bulkSelection.clearSelection(),
  });

  const handleBulkDelete = () => {
    bulkOperations.bulkDelete.mutate(Array.from(bulkSelection.selectedIds));
    setDeleteDialogOpen(false);
  };

  // Export columns - only visible ones
  const exportColumns = useMemo(() => {
    const keyToHeaderMap: Record<string, { header: string; key: string }> = {
      name: { header: t('partners.name'), key: 'name' },
      category: { header: t('partners.category'), key: 'category' },
      headquarters: { header: t('partners.headquarters'), key: 'headquarters' },
      site: { header: t('partners.site'), key: 'site' },
      mailing: { header: t('partners.mailingAddress'), key: 'mailing' },
      phone: { header: t('partners.phone'), key: 'phone' },
      email: { header: t('partners.email'), key: 'email' },
      taxId: { header: t('partners.taxId'), key: 'tax_id' },
      euVatNumber: { header: t('partners.euVatNumber'), key: 'eu_vat_number' },
      currency: { header: t('partners.defaultCurrency'), key: 'default_currency' },
    };
    return visibleColumns.map(col => keyToHeaderMap[col.key]).filter(Boolean);
  }, [visibleColumns, t]);

  // Export data - formatted for export
  const exportData = useMemo(() => {
    return partners.map((partner: any) => {
      const hqAddr = partner.partner_addresses?.find((a: any) => a.address_type === 'headquarters');
      const siteAddr = partner.partner_addresses?.find((a: any) => a.address_type === 'site');
      const mailAddr = partner.partner_addresses?.find((a: any) => a.address_type === 'mailing');
      return {
        name: partner.name || '-',
        category: partner.category || '-',
        headquarters: formatAddress(hqAddr),
        site: formatAddress(siteAddr),
        mailing: formatAddress(mailAddr),
        phone: partner.phone || '-',
        email: partner.email || '-',
        tax_id: partner.tax_id || '-',
        eu_vat_number: partner.eu_vat_number || '-',
        default_currency: partner.default_currency || '-',
      };
    });
  }, [partners]);

  const handleCreate = (data: any) => {
    createPartner.mutate(data, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setEditingPartner(null);
      },
    });
  };

  const handleUpdate = (data: any) => {
    if (!editingPartner) return;
    updatePartner.mutate({ id: editingPartner.id, ...data }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setEditingPartner(null);
      },
    });
  };

  const handleOpenCreate = () => {
    checkReadOnly(() => {
      setEditingPartner(null);
      setIsDialogOpen(true);
    });
  };

  const handleOpenEdit = (partner: any) => {
    checkReadOnly(() => {
      setEditingPartner(partner);
      setIsDialogOpen(true);
    });
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingPartner(null);
  };

  const getCellValue = (partner: any, key: string) => {
    const hqAddr = partner.partner_addresses?.find((a: any) => a.address_type === 'headquarters');
    const siteAddr = partner.partner_addresses?.find((a: any) => a.address_type === 'site');
    const mailAddr = partner.partner_addresses?.find((a: any) => a.address_type === 'mailing');

    switch (key) {
      case 'select':
        return (
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={bulkSelection.selectedIds.has(partner.id)}
              onCheckedChange={() => bulkSelection.toggleItem(partner.id)}
            />
          </div>
        );
      case 'favorite':
        return <FavoriteButton entityType="partner" entityId={partner.id} />;
      case 'name':
        return (
          <div className="flex items-center gap-2">
            {partner.name}
            {partner.restrict_access && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('partners.restrictAccessLabel')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      case 'category':
        return partner.category || '-';
      case 'headquarters':
        return formatAddress(hqAddr);
      case 'site':
        return formatAddress(siteAddr);
      case 'mailing':
        return formatAddress(mailAddr);
      case 'phone':
        return partner.phone || '-';
      case 'email':
        return partner.email || '-';
      case 'taxId':
        return partner.tax_id || '-';
      case 'euVatNumber':
        return partner.eu_vat_number || '-';
      case 'currency':
        return partner.default_currency || '-';
      case 'status':
        return partner.is_active !== false ? (
          <Badge variant="secondary">Aktív</Badge>
        ) : (
          <Badge variant="outline">Inaktív</Badge>
        );
      case 'tags':
        return <TagDisplay entityType="partner" entityId={partner.id} />;
      default:
        return '-';
    }
  };

  return (
    <LicenseGuard feature="partners">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('partners.title')}</h1>
            <p className="text-muted-foreground">
              {t('partners.description')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportMenu
              data={exportData}
              columns={exportColumns}
              title="Partnerek"
            />
            <ColumnSettingsPopover
              columnStates={columnStates}
              columns={columnConfigs}
              onToggleVisibility={toggleVisibility}
              onReorder={reorderColumns}
              onReset={resetToDefaults}
            />
            <Button onClick={handleOpenCreate} disabled={!canEdit} className="min-w-[140px]">
              <Plus className="h-4 w-4" />
              {t('partners.add')}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('partners.list')}</CardTitle>
            <CardDescription>
              {t('partners.listDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BulkActionsToolbar
              selectedCount={bulkSelection.selectedCount}
              onClearSelection={bulkSelection.clearSelection}
              onBulkDelete={() => setDeleteDialogOpen(true)}
            />
            {isLoading ? (
              <div className="text-center py-8">{t('common.loading')}</div>
            ) : sortedPartners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('partners.empty')}
              </div>
            ) : (
              <ResizableTable
                visibleColumns={visibleColumns}
                onColumnResize={setColumnWidth}
                onColumnReorder={reorderColumns}
                data={sortedPartners}
                actionColumnHeader="Műveletek"
                renderHeader={(col) => getColumnConfig(col.key)?.label || col.key}
                sortState={sortState}
                onSort={handleSort}
                columnConfigs={columnConfigs}
                selectHeader={
                  <Checkbox
                    checked={bulkSelection.isAllSelected}
                    indeterminate={bulkSelection.isPartiallySelected}
                    onCheckedChange={bulkSelection.toggleAll}
                    aria-label="Select all"
                  />
                }
                renderRow={(partner, columns) => (
                  <TableRow 
                    key={partner.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/partners/${partner.id}`)}
                  >
                    {columns.map((col) => (
                      <ResizableTableCell 
                        key={col.key} 
                        width={col.width}
                        className={centeredColumns.includes(col.key) ? 'text-center' : ''}
                      >
                        {getCellValue(partner, col.key)}
                      </ResizableTableCell>
                    ))}
                    <TableCell className="w-[60px]">
                      <div className="flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(partner); }}
                          disabled={!canEdit}
                          title="Szerkesztés"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              />
            )}
          </CardContent>
        </Card>

        <PartnerDialog
          open={isDialogOpen}
          onClose={handleCloseDialog}
          onSubmit={editingPartner ? handleUpdate : handleCreate}
          isSubmitting={createPartner.isPending || updatePartner.isPending}
          initialData={editingPartner}
        />
        
        <BulkDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleBulkDelete}
          count={bulkSelection.selectedCount}
          entityName="partner"
          isLoading={bulkOperations.bulkDelete.isPending}
        />
      </div>
    </LicenseGuard>
  );
};

export default Partners;
