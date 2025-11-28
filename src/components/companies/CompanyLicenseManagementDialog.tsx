import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Key, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { LicenseActivationDialog } from './LicenseActivationDialog';
import { formatLicenseKey } from '@/lib/license';
import { useCompanyLicenses } from '@/hooks/useCompanyLicenses';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';

const ALL_FEATURES = [
  { value: 'partners', labelEn: 'Partners', labelHu: 'Partnerek' },
  { value: 'projects', labelEn: 'Projects', labelHu: 'Projektek' },
  { value: 'sales', labelEn: 'Sales', labelHu: 'Értékesítés' },
  { value: 'documents', labelEn: 'Documents', labelHu: 'Dokumentumok' },
  { value: 'calendar', labelEn: 'Calendar', labelHu: 'Naptár' },
  { value: 'logs', labelEn: 'Logs', labelHu: 'Naplók' },
];

interface CompanyLicenseManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  companyName: string;
}

export function CompanyLicenseManagementDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
}: CompanyLicenseManagementDialogProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { getLicenseForCompany, getLicenseStatus, getUsedSeats } = useCompanyLicenses();
  const [copied, setCopied] = useState(false);
  const [showLicenseDialog, setShowLicenseDialog] = useState(false);
  const [usedSeats, setUsedSeats] = useState<number>(0);
  
  const license = getLicenseForCompany(companyId);
  const status = getLicenseStatus(license);

  const enabledFeatures = ALL_FEATURES.filter(f => 
    Array.isArray(license?.features) && license.features.includes(f.value)
  );
  const disabledFeatures = ALL_FEATURES.filter(f => 
    !Array.isArray(license?.features) || !license.features.includes(f.value)
  );

  const getFeatureLabel = (feature: typeof ALL_FEATURES[0]) => {
    return i18n.language === 'hu' ? feature.labelHu : feature.labelEn;
  };

  useEffect(() => {
    const fetchSeats = async () => {
      try {
        const seats = await getUsedSeats(companyId);
        setUsedSeats(seats);
      } catch (error) {
        console.error('Error fetching seats:', error);
      }
    };
    if (open) {
      fetchSeats();
    }
  }, [companyId, open, license]);

  const copyLicenseKey = () => {
    if (license?.license_key) {
      navigator.clipboard.writeText(license.license_key);
      setCopied(true);
      toast({
        title: 'Licensz kulcs másolva',
        description: 'A licensz kulcs a vágólapra került.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleLicenseSuccess = () => {
    onOpenChange(false);
    window.location.reload();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Licensz kezelés - {companyName}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-4">
              <Label>Státusz:</Label>
              <Badge variant={status.status === 'active' ? 'default' : 'secondary'} className={status.color}>
                {status.label}
              </Badge>
            </div>

            {/* License Key */}
            <div className="space-y-2">
              <Label>Licenszkulcs</Label>
              {license?.license_key ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={formatLicenseKey(license.license_key)}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={copyLicenseKey}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Nincs aktív licensz kulcs.
                </p>
              )}
            </div>

            {/* User Seats */}
            <div className="space-y-2">
              <Label>Felhasználók</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={license ? `${usedSeats} / ${license.max_users} felhasználó` : 'Nincs licensz'}
                  readOnly
                  className={usedSeats > (license?.max_users || 0) ? 'border-destructive' : ''}
                />
                {license && usedSeats > license.max_users && (
                  <span className="text-destructive text-sm font-medium">⚠️ Túllépve!</span>
                )}
              </div>
            </div>

            {/* Validity Period */}
            {license && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Érvényes-től</Label>
                  <Input
                    value={format(new Date(license.valid_from), 'yyyy-MM-dd')}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Érvényes-ig</Label>
                  <Input
                    value={format(new Date(license.valid_until), 'yyyy-MM-dd')}
                    readOnly
                    disabled
                    className="bg-muted"
                  />
                </div>
              </div>
            )}

            {/* Features */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-green-600 dark:text-green-500 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('license.availableModules')}
                </Label>
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {enabledFeatures.length > 0 ? (
                    enabledFeatures.map((feature) => (
                      <Badge key={feature.value} variant="outline" className="bg-green-50 dark:bg-green-950 border-green-300 dark:border-green-700 text-green-700 dark:text-green-300">
                        {getFeatureLabel(feature)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      {t('license.noModulesAvailable')}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-red-600 dark:text-red-500 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  {t('license.unavailableModules')}
                </Label>
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {disabledFeatures.length > 0 ? (
                    disabledFeatures.map((feature) => (
                      <Badge key={feature.value} variant="outline" className="bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-700 text-red-700 dark:text-red-300">
                        {getFeatureLabel(feature)}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      {t('license.allModulesAvailable')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Activate License Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="button"
                variant="default"
                onClick={() => setShowLicenseDialog(true)}
                className="gap-2"
              >
                <Key className="h-4 w-4" />
                Új licenszkulcs aktiválása
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LicenseActivationDialog
        open={showLicenseDialog}
        onOpenChange={setShowLicenseDialog}
        companyId={companyId}
        onSuccess={handleLicenseSuccess}
      />
    </>
  );
}
