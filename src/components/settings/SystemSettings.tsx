import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const SystemSettings = () => {
  const { settings, isLoading, updateSetting } = useSystemSettings();
  const [timeoutMinutes, setTimeoutMinutes] = useState<string>('5');
  const { t } = useTranslation();

  useEffect(() => {
    if (settings?.auto_logout_timeout) {
      // Convert seconds to minutes for display
      const minutes = Math.round(parseInt(settings.auto_logout_timeout) / 60);
      setTimeoutMinutes(minutes.toString());
    }
  }, [settings]);

  const handleSave = () => {
    const seconds = parseInt(timeoutMinutes) * 60;
    if (seconds > 0) {
      updateSetting.mutate({
        key: 'auto_logout_timeout',
        value: seconds.toString(),
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
          
          <Button onClick={handleSave} disabled={updateSetting.isPending}>
            {updateSetting.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
