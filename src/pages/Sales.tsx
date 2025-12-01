import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { Link, useNavigate } from 'react-router-dom';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SalesDialog } from '@/components/sales/SalesDialog';
import { ExportMenu } from '@/components/shared/ExportMenu';

const Sales = () => {
  const { activeCompany } = useCompany();
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const { canEdit } = useReadOnlyMode();
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: sales, isLoading } = useQuery({
    queryKey: ['sales', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];

      const { data, error } = await supabase
        .from('sales')
        .select('*, partners(name)')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany,
  });

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
          <ExportMenu
            data={sales || []}
            columns={[
              { header: 'Név', key: 'name' },
              { header: 'Leírás', key: 'description' },
              { header: 'Státusz', key: 'status' },
              { header: 'Várható érték', key: 'expected_value' },
              { header: 'Pénznem', key: 'currency' },
              { header: 'Várható lezárás', key: 'expected_close_date' },
            ]}
            title="Értékesítések"
          />
          <Button onClick={() => setDialogOpen(true)} disabled={!canEdit}>
            <Plus className="mr-2 h-4 w-4" />
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
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Betöltés...
            </div>
          ) : sales && sales.length > 0 ? (
            <div className="space-y-4">
              {sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/sales/${sale.id}`)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{sale.name}</h3>
                    {sale.partners && (
                      <p className="text-sm text-muted-foreground">Partner: {sale.partners.name}</p>
                    )}
                    {sale.expected_value && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Várható érték: {sale.expected_value.toLocaleString()} {sale.currency || 'HUF'}
                      </p>
                    )}
                    {sale.status && (
                      <Badge variant="secondary" className="mt-2">
                        {sale.status === 'lead' && 'Lead'}
                        {sale.status === 'qualified' && 'Minősített'}
                        {sale.status === 'proposal' && 'Ajánlat'}
                        {sale.status === 'negotiation' && 'Tárgyalás'}
                        {sale.status === 'closed_won' && 'Megnyert'}
                        {sale.status === 'closed_lost' && 'Elveszett'}
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/sales/${sale.id}`); }}>
                    Részletek
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nincs értékesítési lehetőség
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      <SalesDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </LicenseGuard>
  );
};

export default Sales;
