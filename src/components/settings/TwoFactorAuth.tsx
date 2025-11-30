import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { use2FA } from '@/hooks/use2FA';
import { useTranslation } from 'react-i18next';
import { Shield, Download, Copy, AlertTriangle, QrCode as QrCodeIcon } from 'lucide-react';
import QRCode from 'qrcode';
import { toast } from 'sonner';

export const TwoFactorAuth = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const {
    loading,
    generateSecret,
    enable2FA,
    disable2FA,
    verify2FAToken,
    generateRecoveryCodes,
    get2FAStatus,
  } = use2FA();

  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [hasRecoveryCodes, setHasRecoveryCodes] = useState(false);
  const [setupMode, setSetupMode] = useState(false);
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);

  useEffect(() => {
    loadStatus();
  }, [user]);

  const loadStatus = async () => {
    if (!user) return;
    
    const status = await get2FAStatus(user.id);
    setIs2FAEnabled(status.two_factor_enabled);
    setHasRecoveryCodes(status.has_recovery_codes);
  };

  const handleSetup2FA = async () => {
    if (!user) return;

    const newSecret = await generateSecret();
    if (!newSecret) return;

    setSecret(newSecret);
    
    // Generate QR code
    const otpauth = `otpauth://totp/${encodeURIComponent('MiniCRM')}:${encodeURIComponent(user.email)}?secret=${newSecret}&issuer=${encodeURIComponent('MiniCRM')}`;
    
    try {
      const url = await QRCode.toDataURL(otpauth);
      setQrCodeUrl(url);
      setSetupMode(true);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast.error(t('2fa.errorGeneratingSecret'));
    }
  };

  const handleVerifyAndEnable = async () => {
    if (!user || !verificationCode || !secret) return;

    // Verify the code
    const isValid = await verify2FAToken(user.email, verificationCode, false);
    
    if (!isValid) {
      toast.error(t('2fa.invalidCode'));
      return;
    }

    // Enable 2FA
    const success = await enable2FA(user.id, secret);
    if (success) {
      setIs2FAEnabled(true);
      setSetupMode(false);
      setVerificationCode('');
      
      // Generate recovery codes
      await handleGenerateRecoveryCodes();
    }
  };

  const handleDisable2FA = async () => {
    if (!user) return;

    const confirmed = window.confirm(t('2fa.adminDisableConfirm'));
    if (!confirmed) return;

    const success = await disable2FA(user.id);
    if (success) {
      setIs2FAEnabled(false);
      setSetupMode(false);
      setSecret('');
      setQrCodeUrl('');
      setVerificationCode('');
      setRecoveryCodes([]);
      setHasRecoveryCodes(false);
    }
  };

  const handleGenerateRecoveryCodes = async () => {
    const codes = await generateRecoveryCodes();
    if (codes) {
      setRecoveryCodes(codes);
      setHasRecoveryCodes(true);
      toast.success(t('2fa.recoveryCodesGenerated'));
    }
  };

  const handleDownloadRecoveryCodes = () => {
    const text = `MiniCRM Recovery Codes\n\nThese codes can be used once each to log in if you lose access to your authenticator app.\n\n${recoveryCodes.join('\n')}\n\nGenerated: ${new Date().toLocaleString()}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'minicrm-recovery-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    toast.success(t('2fa.recoveryCodesCopied'));
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>{t('2fa.title')}</CardTitle>
          </div>
          <Badge variant={is2FAEnabled ? 'default' : 'secondary'}>
            {is2FAEnabled ? t('2fa.enabled') : t('2fa.disabled')}
          </Badge>
        </div>
        <CardDescription>{t('2fa.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!setupMode && !is2FAEnabled && (
          <Button onClick={handleSetup2FA} disabled={loading}>
            <Shield className="mr-2 h-4 w-4" />
            {t('2fa.enable')}
          </Button>
        )}

        {setupMode && !is2FAEnabled && (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('2fa.setupDescription')}
              </AlertDescription>
            </Alert>

            {qrCodeUrl && (
              <div className="flex flex-col items-center gap-4 p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <QrCodeIcon className="h-4 w-4" />
                  {t('2fa.qrCode')}
                </div>
                <img src={qrCodeUrl} alt="2FA QR Code" className="w-64 h-64" />
              </div>
            )}

            <div className="space-y-2">
              <Label>{t('2fa.secretKey')} ({t('2fa.manualEntry')})</Label>
              <div className="flex gap-2">
                <Input value={secret} readOnly className="font-mono" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(secret);
                    toast.success('Secret copied!');
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="verification-code">{t('2fa.enterCode')}</Label>
              <Input
                id="verification-code"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl tracking-widest"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleVerifyAndEnable}
                disabled={loading || verificationCode.length !== 6}
              >
                {loading ? t('2fa.verifying') : t('2fa.verifyCode')}
              </Button>
              <Button variant="outline" onClick={() => setSetupMode(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}

        {is2FAEnabled && (
          <div className="space-y-4">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                {t('2fa.enabled')} - {t('2fa.description')}
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('2fa.recoveryCodes')}</h4>
              {hasRecoveryCodes && !recoveryCodes.length && (
                <p className="text-sm text-muted-foreground">
                  Recovery codes are already generated. Generate new ones to see them again.
                </p>
              )}
              
              {recoveryCodes.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{t('2fa.warning')}:</strong> {t('2fa.recoveryCodesWarning')}
                  </AlertDescription>
                </Alert>
              )}

              {recoveryCodes.length > 0 && (
                <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                  {recoveryCodes.map((code, index) => (
                    <div key={index} className="p-2 bg-background rounded border">
                      {code}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleGenerateRecoveryCodes}
                  disabled={loading}
                >
                  {t('2fa.generateRecoveryCodes')}
                </Button>
                
                {recoveryCodes.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleDownloadRecoveryCodes}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      {t('2fa.downloadRecoveryCodes')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCopyRecoveryCodes}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {t('2fa.copyRecoveryCodes')}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <Button variant="destructive" onClick={handleDisable2FA} disabled={loading}>
              {t('2fa.disable')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};