import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCompanyLicenses } from '@/hooks/useCompanyLicenses';
import { useLicenseEnforcement } from '@/hooks/useLicenseEnforcement';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, Calendar, Users, Key } from 'lucide-react';
import { format } from 'date-fns';
import { formatLicenseKey } from '@/lib/license';

interface DetailedLicenseInfoProps {
  companyId: string;
}

export const DetailedLicenseInfo = ({ companyId }: DetailedLicenseInfoProps) => {
  const { t } = useTranslation();
  const { getLicenseForCompany, getLicenseStatus } = useCompanyLicenses();
  const { features, maxUsers, isActive, validFrom, validUntil } = useLicenseEnforcement();
  
  const license = getLicenseForCompany(companyId);
  const status = getLicenseStatus(license);

  if (!license) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('license.details')}</CardTitle>
          <CardDescription>{t('license.noLicense')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const featureList = [
    { key: 'partners', label: t('nav.partners'), enabled: features.partners },
    { key: 'sales', label: t('nav.sales'), enabled: features.sales },
    { key: 'calendar', label: t('nav.calendar'), enabled: features.calendar },
    { key: 'projects', label: t('nav.projects'), enabled: features.projects },
    { key: 'documents', label: t('nav.documents'), enabled: features.documents },
    { key: 'logs', label: t('nav.logs'), enabled: features.logs },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('license.details')}</CardTitle>
          <Badge variant={status.status === 'active' ? 'default' : 'secondary'} className={status.color}>
            {status.label}
          </Badge>
        </div>
        <CardDescription>{t('license.currentLicenseInfo')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* License Key */}
        <div className="flex items-start gap-3">
          <Key className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">{t('license.licenseKey')}</p>
            <p className="text-xs font-mono text-muted-foreground">{license.license_key ? formatLicenseKey(license.license_key) : t('license.notSet')}</p>
          </div>
        </div>

        {/* Validity Period */}
        <div className="flex items-start gap-3">
          <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">{t('license.validityPeriod')}</p>
            <p className="text-sm text-muted-foreground">
              {validFrom && format(new Date(validFrom), 'yyyy-MM-dd')} – {validUntil && format(new Date(validUntil), 'yyyy-MM-dd')}
            </p>
          </div>
        </div>

        {/* Max Users */}
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">{t('license.maxUsers')}</p>
            <p className="text-sm text-muted-foreground">{maxUsers} {t('license.users')}</p>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('license.enabledFeatures')}</p>
          <div className="grid grid-cols-2 gap-2">
            {featureList.map((feature) => (
              <div key={feature.key} className="flex items-center gap-2 text-sm">
                {feature.enabled ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={feature.enabled ? '' : 'text-muted-foreground'}>
                  {feature.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};