import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const SystemSettings = () => {
  const { settings, isLoading, updateSetting } = useSystemSettings();
  const [timeoutMinutes, setTimeoutMinutes] = useState<string>('5');
  const [lockAttempts, setLockAttempts] = useState<string>('5');
  const [autoUnlockMinutes, setAutoUnlockMinutes] = useState<string>('30');
  const [trialDays, setTrialDays] = useState<string>('14');
  const [passwordExpiryDays, setPasswordExpiryDays] = useState<string>('90');
  const { t } = useTranslation();

  useEffect(() => {
    if (settings) {
      if (settings.auto_logout_timeout) {
        const minutes = Math.round(parseInt(settings.auto_logout_timeout) / 60);
        setTimeoutMinutes(minutes.toString());
      }
      if (settings.account_lock_attempts) {
        setLockAttempts(settings.account_lock_attempts);
      }
      if (settings.account_lock_auto_unlock_minutes) {
        setAutoUnlockMinutes(settings.account_lock_auto_unlock_minutes);
      }
      if (settings.trial_license_days) {
        setTrialDays(settings.trial_license_days);
      }
      if (settings.password_expiry_days) {
        setPasswordExpiryDays(settings.password_expiry_days);
      }
    }
  }, [settings]);

  const handleSave = () => {
    const logoutSeconds = parseInt(timeoutMinutes) * 60;
    if (logoutSeconds > 0) {
      updateSetting.mutate({
        key: 'auto_logout_timeout',
        value: logoutSeconds.toString(),
      });
    }

    const attempts = parseInt(lockAttempts);
    if (attempts > 0) {
      updateSetting.mutate({
        key: 'account_lock_attempts',
        value: attempts.toString(),
      });
    }

    const unlockMinutes = parseInt(autoUnlockMinutes);
    if (unlockMinutes > 0) {
      updateSetting.mutate({
        key: 'account_lock_auto_unlock_minutes',
        value: unlockMinutes.toString(),
      });
    }

    const trial = parseInt(trialDays);
    if (trial > 0) {
      updateSetting.mutate({
        key: 'trial_license_days',
        value: trial.toString(),
      });
    }

    const passwordExpiry = parseInt(passwordExpiryDays);
    if (passwordExpiry > 0) {
      updateSetting.mutate({
        key: 'password_expiry_days',
        value: passwordExpiry.toString(),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.systemSettings')}</CardTitle>
        <CardDescription>
          {t('settings.systemSettingsDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Session Management */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('settings.sessionManagement')}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="auto-logout">
                  {t('settings.autoLogoutTimeout')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="auto-logout"
                    type="number"
                    min="1"
                    max="1440"
                    value={timeoutMinutes}
                    onChange={(e) => setTimeoutMinutes(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('settings.minutes')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.autoLogoutDescription')}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Security */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('settings.security')}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lock-attempts">
                  {t('settings.accountLockAttempts')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="lock-attempts"
                    type="number"
                    min="1"
                    max="20"
                    value={lockAttempts}
                    onChange={(e) => setLockAttempts(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('settings.attempts')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.accountLockAttemptsDescription')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auto-unlock">
                  {t('settings.autoUnlockMinutes')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="auto-unlock"
                    type="number"
                    min="1"
                    max="1440"
                    value={autoUnlockMinutes}
                    onChange={(e) => setAutoUnlockMinutes(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('settings.minutes')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.autoUnlockDescription')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-expiry">
                  {t('settings.passwordExpiryDays')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="password-expiry"
                    type="number"
                    min="0"
                    max="365"
                    value={passwordExpiryDays}
                    onChange={(e) => setPasswordExpiryDays(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('settings.days')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.passwordExpiryDescription')}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* License */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('settings.license')}</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="trial-days">
                  {t('settings.trialLicenseDays')}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="trial-days"
                    type="number"
                    min="1"
                    max="365"
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('settings.days')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('settings.trialLicenseDaysDescription')}
                </p>
              </div>
            </div>
          </div>
          
          <Button onClick={handleSave} disabled={updateSetting.isPending}>
            {updateSetting.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
