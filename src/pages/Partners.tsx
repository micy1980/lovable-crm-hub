import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Lock, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePartners } from '@/hooks/usePartners';
import { PartnerDialog } from '@/components/partners/PartnerDialog';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ExportMenu } from '@/components/shared/ExportMenu';

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

type ColumnKey = 'name' | 'category' | 'headquarters' | 'site' | 'mailing' | 'phone' | 'email' | 'taxId' | 'euVatNumber' | 'currency';

const STORAGE_KEY = 'partners-visible-columns';

const defaultColumns: Record<ColumnKey, boolean> = {
  name: true,
  category: true,
  headquarters: true,
  site: false,
  mailing: false,
  phone: true,
  email: true,
  taxId: true,
  euVatNumber: false,
  currency: false,
};

const loadColumnSettings = (): Record<ColumnKey, boolean> => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...defaultColumns, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load column settings', e);
  }
  return defaultColumns;
};

const Partners = () => {
  const { t } = useTranslation();
  const { partners, isLoading, createPartner, updatePartner } = usePartners();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const { canEdit, checkReadOnly } = useReadOnlyMode();
  
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(loadColumnSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const columnConfig: { key: ColumnKey; label: string }[] = [
    { key: 'name', label: t('partners.name') },
    { key: 'category', label: t('partners.category') },
    { key: 'headquarters', label: t('partners.headquarters') },
    { key: 'site', label: t('partners.site') },
    { key: 'mailing', label: t('partners.mailingAddress') },
    { key: 'phone', label: t('partners.phone') },
    { key: 'email', label: t('partners.email') },
    { key: 'taxId', label: t('partners.taxId') },
    { key: 'euVatNumber', label: t('partners.euVatNumber') },
    { key: 'currency', label: t('partners.defaultCurrency') },
  ];

  // Export columns - only visible ones
  const exportColumns = useMemo(() => {
    const keyToHeaderMap: Record<ColumnKey, { header: string; key: string }> = {
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
    return columnConfig
      .filter(col => visibleColumns[col.key])
      .map(col => keyToHeaderMap[col.key]);
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

  const toggleColumn = (key: ColumnKey) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
          <Button onClick={handleOpenCreate} disabled={!canEdit}>
            <Plus className="mr-2 h-4 w-4" />
            {t('partners.add')}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('partners.list')}</CardTitle>
                <CardDescription>
                  {t('partners.listDescription')}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <ExportMenu
                  data={exportData}
                  columns={exportColumns}
                  title="Partnerek"
                  size="sm"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Settings2 className="mr-2 h-4 w-4" />
                      {t('common.columns')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56" align="end">
                    <div className="space-y-2">
                      <p className="text-sm font-medium mb-3">{t('common.visibleColumns')}</p>
                      {columnConfig.map(col => (
                        <div key={col.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={col.key}
                            checked={visibleColumns[col.key]}
                            onCheckedChange={() => toggleColumn(col.key)}
                            disabled={col.key === 'name'}
                          />
                          <Label htmlFor={col.key} className="text-sm cursor-pointer">
                            {col.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">{t('common.loading')}</div>
            ) : partners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('partners.empty')}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {visibleColumns.name && <TableHead>{t('partners.name')}</TableHead>}
                      {visibleColumns.category && <TableHead>{t('partners.category')}</TableHead>}
                      {visibleColumns.headquarters && <TableHead>{t('partners.headquarters')}</TableHead>}
                      {visibleColumns.site && <TableHead>{t('partners.site')}</TableHead>}
                      {visibleColumns.mailing && <TableHead>{t('partners.mailingAddress')}</TableHead>}
                      {visibleColumns.phone && <TableHead>{t('partners.phone')}</TableHead>}
                      {visibleColumns.email && <TableHead>{t('partners.email')}</TableHead>}
                      {visibleColumns.taxId && <TableHead>{t('partners.taxId')}</TableHead>}
                      {visibleColumns.euVatNumber && <TableHead>{t('partners.euVatNumber')}</TableHead>}
                      {visibleColumns.currency && <TableHead>{t('partners.defaultCurrency')}</TableHead>}
                      <TableHead className="w-[80px]">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.map((partner: any) => {
                      const headquartersAddress = partner.partner_addresses?.find(
                        (a: any) => a.address_type === 'headquarters'
                      );
                      const siteAddress = partner.partner_addresses?.find(
                        (a: any) => a.address_type === 'site'
                      );
                      const mailingAddress = partner.partner_addresses?.find(
                        (a: any) => a.address_type === 'mailing'
                      );
                      return (
                        <TableRow key={partner.id}>
                          {visibleColumns.name && (
                            <TableCell className="font-medium">
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
                            </TableCell>
                          )}
                          {visibleColumns.category && (
                            <TableCell>{partner.category || '-'}</TableCell>
                          )}
                          {visibleColumns.headquarters && (
                            <TableCell className="max-w-[180px]" title={formatAddress(headquartersAddress)}>
                              <span className="truncate block">{formatAddress(headquartersAddress)}</span>
                            </TableCell>
                          )}
                          {visibleColumns.site && (
                            <TableCell className="max-w-[180px]" title={formatAddress(siteAddress)}>
                              <span className="truncate block">{formatAddress(siteAddress)}</span>
                            </TableCell>
                          )}
                          {visibleColumns.mailing && (
                            <TableCell className="max-w-[180px]" title={formatAddress(mailingAddress)}>
                              <span className="truncate block">{formatAddress(mailingAddress)}</span>
                            </TableCell>
                          )}
                          {visibleColumns.phone && (
                            <TableCell>{partner.phone || '-'}</TableCell>
                          )}
                          {visibleColumns.email && (
                            <TableCell>{partner.email || '-'}</TableCell>
                          )}
                          {visibleColumns.taxId && (
                            <TableCell>{partner.tax_id || '-'}</TableCell>
                          )}
                          {visibleColumns.euVatNumber && (
                            <TableCell>{partner.eu_vat_number || '-'}</TableCell>
                          )}
                          {visibleColumns.currency && (
                            <TableCell>{partner.default_currency || '-'}</TableCell>
                          )}
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(partner)}
                              disabled={!canEdit}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
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
      </div>
    </LicenseGuard>
  );
};

export default Partners;