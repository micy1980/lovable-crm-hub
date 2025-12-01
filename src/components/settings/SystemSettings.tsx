import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const SystemSettings = () => {
  const { settings, isLoading, updateSetting } = useSystemSettings();
  const [timeoutMinutes, setTimeoutMinutes] = useState<string>('5');
  const [lockAttempts, setLockAttempts] = useState<string>('5');
  const [autoUnlockMinutes, setAutoUnlockMinutes] = useState<string>('30');
  const [failedAttemptsWindow, setFailedAttemptsWindow] = useState<string>('5');
  const [trialDays, setTrialDays] = useState<string>('14');
  const [passwordExpiryDays, setPasswordExpiryDays] = useState<string>('90');
  const [twoFactorSessionDuration, setTwoFactorSessionDuration] = useState<string>('720');
  const [twoFactorMaxAttempts, setTwoFactorMaxAttempts] = useState<string>('10');
  const [twoFactorWindowMinutes, setTwoFactorWindowMinutes] = useState<string>('10');
  const [twoFactorLockMinutes, setTwoFactorLockMinutes] = useState<string>('10');
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
      if (settings.account_lock_failed_attempts_window_minutes) {
        setFailedAttemptsWindow(settings.account_lock_failed_attempts_window_minutes);
      }
      if (settings.trial_license_days) {
        setTrialDays(settings.trial_license_days);
      }
      if (settings.password_expiry_days) {
        setPasswordExpiryDays(settings.password_expiry_days);
      }
      if (settings.two_factor_session_duration_minutes) {
        setTwoFactorSessionDuration(settings.two_factor_session_duration_minutes);
      }
      if (settings.two_factor_max_attempts) {
        setTwoFactorMaxAttempts(settings.two_factor_max_attempts);
      }
      if (settings.two_factor_window_minutes) {
        setTwoFactorWindowMinutes(settings.two_factor_window_minutes);
      }
      if (settings.two_factor_lock_minutes) {
        setTwoFactorLockMinutes(settings.two_factor_lock_minutes);
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
      
      // Also adjust existing active locks to the new duration
      supabase.rpc('adjust_active_locks_duration', { _new_minutes: unlockMinutes })
        .then(({ error }) => {
          if (error) {
            console.error('Error adjusting active locks duration:', error);
          } else {
            console.log('Active locks duration adjusted to', unlockMinutes, 'minutes');
          }
        });
    }

    const failedWindowMinutes = parseInt(failedAttemptsWindow);
    if (failedWindowMinutes > 0) {
      updateSetting.mutate({
        key: 'account_lock_failed_attempts_window_minutes',
        value: failedWindowMinutes.toString(),
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

    // 2FA settings
    const sessionDuration = parseInt(twoFactorSessionDuration);
    if (sessionDuration > 0) {
      updateSetting.mutate({
        key: 'two_factor_session_duration_minutes',
        value: sessionDuration.toString(),
      });
    }

    const maxAttempts = parseInt(twoFactorMaxAttempts);
    if (maxAttempts > 0) {
      updateSetting.mutate({
        key: 'two_factor_max_attempts',
        value: maxAttempts.toString(),
      });
    }

    const twoFactorWindow = parseInt(twoFactorWindowMinutes);
    if (twoFactorWindow > 0) {
      updateSetting.mutate({
        key: 'two_factor_window_minutes',
        value: twoFactorWindow.toString(),
      });
    }

    const lockMinutes = parseInt(twoFactorLockMinutes);
    if (lockMinutes > 0) {
      updateSetting.mutate({
        key: 'two_factor_lock_minutes',
        value: lockMinutes.toString(),
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
                <Label htmlFor="failed-attempts-window">
                  Sikertelen próbálkozások időablaka
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="failed-attempts-window"
                    type="number"
                    min="1"
                    max="60"
                    value={failedAttemptsWindow}
                    onChange={(e) => setFailedAttemptsWindow(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('settings.minutes')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mennyi időre visszamenőleg számítsa a rendszer a sikertelen bejelentkezési kísérleteket
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

              <div className="space-y-2">
                <Label htmlFor="2fa-session-duration">
                  2FA munkamenet időtartama
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="2fa-session-duration"
                    type="number"
                    min="1"
                    max="10080"
                    value={twoFactorSessionDuration}
                    onChange={(e) => setTwoFactorSessionDuration(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('settings.minutes')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mennyi ideig marad érvényes a 2FA hitelesítés (alapértelmezett: 720 perc = 12 óra)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="2fa-max-attempts">
                  2FA max. próbálkozások száma
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="2fa-max-attempts"
                    type="number"
                    min="1"
                    max="50"
                    value={twoFactorMaxAttempts}
                    onChange={(e) => setTwoFactorMaxAttempts(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('settings.attempts')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hány sikertelen 2FA kísérlet után kerül zárolásra a felhasználó (alapértelmezett: 10)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="2fa-window-minutes">
                  2FA próbálkozások időablaka
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="2fa-window-minutes"
                    type="number"
                    min="1"
                    max="60"
                    value={twoFactorWindowMinutes}
                    onChange={(e) => setTwoFactorWindowMinutes(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('settings.minutes')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mennyi időre visszamenőleg számítsa a rendszer a sikertelen 2FA kísérleteket (alapértelmezett: 10 perc)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="2fa-lock-minutes">
                  2FA zárolás időtartama
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="2fa-lock-minutes"
                    type="number"
                    min="1"
                    max="1440"
                    value={twoFactorLockMinutes}
                    onChange={(e) => setTwoFactorLockMinutes(e.target.value)}
                    className="w-32"
                  />
                  <span className="text-sm text-muted-foreground">
                    {t('settings.minutes')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Mennyi ideig legyen zárolva a 2FA sikertelen kísérletek után (alapértelmezett: 10 perc)
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
