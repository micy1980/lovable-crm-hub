import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useLicenseEnforcement } from '@/hooks/useLicenseEnforcement';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { AlertTriangle, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';

interface LicenseGuardProps {
  children: ReactNode;
  feature: string;
  redirectTo?: string;
}

export const LicenseGuard = ({ children, feature, redirectTo = '/' }: LicenseGuardProps) => {
  const { t } = useTranslation();
  const { hasFeatureAccess } = useFeatureAccess();
  const { isExpired, isActive } = useLicenseEnforcement();
  const { data: profile } = useUserProfile();
  
  const hasAccess = hasFeatureAccess(feature);

  // Super admins can always access, but show warnings
  if (isSuperAdmin(profile)) {
    if (!hasAccess || isExpired) {
      return (
        <div className="space-y-4">
          <Card className="border-yellow-500 bg-yellow-500/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-yellow-900 dark:text-yellow-100">
                  {t('license.adminWarning')}
                </CardTitle>
              </div>
              <CardDescription className="text-yellow-800 dark:text-yellow-200">
                {isExpired 
                  ? t('license.expiredAdminMessage')
                  : t('license.featureDisabledAdminMessage', { feature })
                }
              </CardDescription>
            </CardHeader>
          </Card>
          {children}
        </div>
      );
    }
    return <>{children}</>;
  }

  // For non-SA users, strictly enforce
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