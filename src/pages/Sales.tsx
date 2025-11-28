import { useCompany } from '@/contexts/CompanyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { Link } from 'react-router-dom';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useReadOnlyMode } from '@/hooks/useReadOnlyMode';

const Sales = () => {
  const { activeCompany } = useCompany();
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const { canEdit } = useReadOnlyMode();

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
        <Button disabled={!canEdit}>
          <Plus className="mr-2 h-4 w-4" />
          {t('sales.newOpportunity')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('sales.salesPipeline')}</CardTitle>
          <CardDescription>
            {t('sales.pipelineDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {t('sales.pipelineComingSoon')}
          </div>
        </CardContent>
      </Card>
      </div>
    </LicenseGuard>
  );
};

export default Sales;
