import { CompanyList } from '@/components/companies/CompanyList';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { useTranslation } from 'react-i18next';
import { Navigate } from 'react-router-dom';

const Companies = () => {
  const { data: profile, isLoading } = useUserProfile();
  const { t } = useTranslation();
  const isSuper = isSuperAdmin(profile);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  if (!isSuper) {
    return <Navigate to="/settings" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.companies')}</h1>
        <p className="text-muted-foreground">
          {t('companies.description')}
        </p>
      </div>

      <CompanyList />
    </div>
  );
};

export default Companies;
