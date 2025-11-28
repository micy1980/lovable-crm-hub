import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePartners } from '@/hooks/usePartners';
import { PartnerDialog } from '@/components/partners/PartnerDialog';
import { LicenseGuard } from '@/components/license/LicenseGuard';

const Partners = () => {
  const { t } = useTranslation();
  const { partners, isLoading, createPartner } = usePartners();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleCreate = (data: any) => {
    createPartner.mutate(data, {
      onSuccess: () => setIsCreateOpen(false),
    });
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
        <Button onClick={() => setIsCreateOpen(true)}>
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
                  <TableHead>{t('partners.email')}</TableHead>
                  <TableHead>{t('partners.phone')}</TableHead>
                  <TableHead>{t('partners.taxId')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((partner: any) => (
                  <TableRow key={partner.id}>
                    <TableCell className="font-medium">{partner.name}</TableCell>
                    <TableCell>{partner.email || '-'}</TableCell>
                    <TableCell>{partner.phone || '-'}</TableCell>
                    <TableCell>{partner.tax_id || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <PartnerDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createPartner.isPending}
      />
      </div>
    </LicenseGuard>
  );
};

export default Partners;
