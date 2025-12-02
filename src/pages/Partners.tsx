import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePartners } from '@/hooks/usePartners';
import { PartnerDialog } from '@/components/partners/PartnerDialog';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

const Partners = () => {
  const { t } = useTranslation();
  const { partners, isLoading, createPartner, updatePartner } = usePartners();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<any>(null);
  const { canEdit, checkReadOnly } = useReadOnlyMode();

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
            <CardTitle>{t('partners.list')}</CardTitle>
            <CardDescription>
              {t('partners.listDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">{t('common.loading')}</div>
            ) : partners.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('partners.empty')}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('partners.name')}</TableHead>
                    <TableHead>{t('partners.headquarters')}</TableHead>
                    <TableHead>{t('partners.email')}</TableHead>
                    <TableHead>{t('partners.phone')}</TableHead>
                    <TableHead>{t('partners.taxId')}</TableHead>
                    <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {partners.map((partner: any) => {
                    const headquartersAddress = partner.partner_addresses?.find(
                      (a: any) => a.address_type === 'headquarters'
                    );
                    return (
                      <TableRow key={partner.id}>
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
                        <TableCell className="max-w-[250px] truncate">
                          {formatAddress(headquartersAddress)}
                        </TableCell>
                        <TableCell>{partner.email || '-'}</TableCell>
                        <TableCell>{partner.phone || '-'}</TableCell>
                        <TableCell>{partner.tax_id || '-'}</TableCell>
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
