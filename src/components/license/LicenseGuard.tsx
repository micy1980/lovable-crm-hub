import { ReactNode } from 'react';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useLicenseEnforcement } from '@/hooks/useLicenseEnforcement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface LicenseGuardProps {
  children: ReactNode;
  feature: string;
  redirectTo?: string;
}

export const LicenseGuard = ({ children, feature, redirectTo = '/' }: LicenseGuardProps) => {
  const { t } = useTranslation();
  const { hasFeatureAccess } = useFeatureAccess();
  const { isExpired, isActive } = useLicenseEnforcement();
  
  const hasAccess = hasFeatureAccess(feature);

  // Enforce license restrictions for all users
  if (!hasAccess || isExpired || !isActive) {
    return (
      <div className="flex h-[50vh] items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-destructive" />
              <CardTitle>{t('license.accessDenied')}</CardTitle>
            </div>
            <CardDescription>
              {isExpired 
                ? t('license.expiredMessage')
                : !hasAccess 
                  ? t('license.featureNotAvailable', { feature })
                  : t('license.inactiveMessage')
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to={redirectTo}>
              <Button className="w-full">{t('license.backToDashboard')}</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};