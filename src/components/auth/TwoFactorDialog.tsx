import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { use2FA } from '@/hooks/use2FA';
import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';

interface TwoFactorDialogProps {
  open: boolean;
  email: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorDialog = ({ open, email, onSuccess, onCancel }: TwoFactorDialogProps) => {
  const [code, setCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const { verify2FAToken, loading } = use2FA();
  const { t } = useTranslation();

  const handleVerify = async () => {
    if (!code) return;

    const isValid = await verify2FAToken(email, code, useRecovery);
    
    if (isValid) {
      onSuccess();
    } else {
      setCode('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length >= 6) {
      handleVerify();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <DialogTitle>{t('2fa.codeRequired')}</DialogTitle>
          </div>
          <DialogDescription>
            {t('2fa.codeRequiredDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="2fa-code">
              {useRecovery ? t('2fa.recoveryCodePlaceholder') : t('2fa.enterCode')}
            </Label>
            <Input
              id="2fa-code"
              type="text"
              placeholder={useRecovery ? 'XXXX-XXXX-XXXX-XXXX' : '000000'}
              value={code}
              onChange={(e) => {
                if (useRecovery) {
                  setCode(e.target.value.toUpperCase());
                } else {
                  setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                }
              }}
              onKeyPress={handleKeyPress}
              maxLength={useRecovery ? 19 : 6}
              className={useRecovery ? 'font-mono' : 'text-center text-2xl tracking-widest'}
              autoFocus
            />
          </div>

          <Button
            className="w-full"
            onClick={handleVerify}
            disabled={loading || (!useRecovery && code.length !== 6) || (useRecovery && !code)}
          >
            {loading ? t('2fa.verifying') : t('2fa.verifyAndLogin')}
          </Button>

          <Button
            variant="link"
            className="w-full"
            onClick={() => {
              setUseRecovery(!useRecovery);
              setCode('');
            }}
          >
            {useRecovery ? t('2fa.useAuthenticatorCode') : t('2fa.useRecoveryCode')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};