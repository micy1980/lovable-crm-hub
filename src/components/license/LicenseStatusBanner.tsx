import { AlertTriangle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useLicenseEnforcement } from '@/hooks/useLicenseEnforcement';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';

export const LicenseStatusBanner = () => {
  const { t } = useTranslation();
  const { isExpired, daysUntilExpiry, isActive } = useLicenseEnforcement();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  // Show banner if license is expired
  if (isExpired || !isActive) {
    return (
      <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="font-medium">
              {t('license.expiredBanner')}
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    );
  }

  // Show warning if license expires soon (within 30 days)
  if (daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
    return (
      <Alert className="rounded-none border-x-0 border-t-0 bg-yellow-500/10 border-yellow-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900 dark:text-yellow-100">
              {t('license.expiringSoon', { days: daysUntilExpiry })}
            </AlertDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </Alert>
    );
  }

  return null;
};