import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useApiKeyStatus } from '@/hooks/useApiKeyStatus';
import { toast } from 'sonner';
import { Loader2, Key } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export const EmailSettings = () => {
  const { settings, isLoading, updateSetting } = useSystemSettings();
  const { data: apiKeyStatus, isLoading: isLoadingApiKey, refetch: refetchApiKey } = useApiKeyStatus();
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingApiKey, setIsUpdatingApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');

  const emailSettings = {
    fromEmail: settings?.['email_from_address'] || 'onboarding@resend.dev',
    fromName: settings?.['email_from_name'] || 'Mini CRM',
    notifyAccountLock: settings?.['email_notify_account_lock'] === 'true',
    notifyTaskDeadline: settings?.['email_notify_task_deadline'] === 'true',
    notifyTaskCreated: settings?.['email_notify_task_created'] === 'true',
    notifyTaskStatusChange: settings?.['email_notify_task_status_change'] === 'true',
  };

  const [formData, setFormData] = useState(emailSettings);

  // Update formData when settings change
  useEffect(() => {
    setFormData(emailSettings);
  }, [settings]);

  const handleUpdateApiKey = async () => {
    if (!newApiKey || newApiKey.trim().length === 0) {
      toast.error('Adj meg egy érvényes API kulcsot');
      return;
    }
    
    setIsUpdatingApiKey(true);
    try {
      await updateSetting.mutateAsync({ 
        key: 'resend_api_key', 
        value: newApiKey 
      });
      toast.success('API kulcs sikeresen frissítve');
      setNewApiKey('');
      // Refetch API key status
      refetchApiKey();
    } catch (error) {
      console.error('Error updating API key:', error);
      toast.error('Hiba történt az API kulcs frissítése során');
    } finally {
      setIsUpdatingApiKey(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await Promise.all([
        updateSetting.mutateAsync({ key: 'email_from_address', value: formData.fromEmail }),
        updateSetting.mutateAsync({ key: 'email_from_name', value: formData.fromName }),
        updateSetting.mutateAsync({ key: 'email_notify_account_lock', value: formData.notifyAccountLock.toString() }),
        updateSetting.mutateAsync({ key: 'email_notify_task_deadline', value: formData.notifyTaskDeadline.toString() }),
        updateSetting.mutateAsync({ key: 'email_notify_task_created', value: formData.notifyTaskCreated.toString() }),
        updateSetting.mutateAsync({ key: 'email_notify_task_status_change', value: formData.notifyTaskStatusChange.toString() }),
      ]);
      toast.success('Email beállítások sikeresen mentve');
    } catch (error) {
      toast.error('Hiba történt a mentés során');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || isLoadingApiKey) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Email beállítások</CardTitle>
          <CardDescription>Email értesítések és API konfigurálása</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const apiKeyConfigured = apiKeyStatus?.isConfigured || false;
  const apiKeyValue = apiKeyStatus?.apiKey || '';
  const apiKeySource = apiKeyStatus?.source || 'none';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email beállítások</CardTitle>
        <CardDescription>Email értesítések és API konfigurálása</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* API Configuration */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Email szolgáltatás (Resend)</h3>
          <div className="space-y-3">
            <div>
              <Label>API Kulcs</Label>
              <div className="mt-2 p-3 rounded-lg border bg-muted/50">
                {apiKeyConfigured ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">✓ API kulcs beállítva</p>
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-muted-foreground break-all">{apiKeyValue}</p>
                      <p className="text-xs text-muted-foreground">
                        Forrás: {apiKeySource === 'secret' ? 'Supabase Secret (RESEND_API_KEY)' : 'Adatbázis (system_settings)'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-orange-600 dark:text-orange-400">⚠ API kulcs nincs beállítva</p>
                    <p className="text-xs text-muted-foreground">Az email értesítések nem fognak működni API kulcs nélkül</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                <strong>Lépések:</strong>
              </p>
              <ol className="list-decimal list-inside space-y-0.5 ml-2">
                <li>Regisztráció: <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com</a></li>
                <li>API kulcs létrehozása: <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com/api-keys</a></li>
                <li>Domain validálás: <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com/domains</a></li>
                <li>API kulcs beállítása az alábbi gombbal</li>
              </ol>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="mt-2">
                  <Key className="mr-2 h-4 w-4" />
                  {apiKeyConfigured ? 'API kulcs frissítése' : 'API kulcs beállítása'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resend API kulcs {apiKeyConfigured ? 'frissítése' : 'beállítása'}</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>Add meg {apiKeyConfigured ? 'az új' : 'a'} Resend API kulcsot. Ez biztonságosan lesz tárolva a rendszerben.</p>
                    {apiKeyConfigured && (
                      <div className="p-2 rounded bg-muted">
                        <p className="text-xs text-muted-foreground">Jelenlegi: {apiKeyValue.substring(0, 20)}...</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="apiKey">{apiKeyConfigured ? 'Új' : ''} API kulcs</Label>
                      <Input
                        id="apiKey"
                        type="password"
                        value={newApiKey}
                        onChange={(e) => setNewApiKey(e.target.value)}
                        placeholder="re_..."
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Mégse</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUpdateApiKey} disabled={isUpdatingApiKey}>
                    {isUpdatingApiKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {apiKeyConfigured ? 'Frissítés' : 'Mentés'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* From Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Feladó beállítások</h3>
          <div className="space-y-2">
            <Label htmlFor="fromEmail">Feladó email címe</Label>
            <Input
              id="fromEmail"
              type="email"
              value={formData.fromEmail}
              onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
              placeholder="onboarding@resend.dev"
            />
            <p className="text-sm text-muted-foreground">
              A domain-t validálni kell a Resend-ben: <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com/domains</a>
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fromName">Feladó neve</Label>
            <Input
              id="fromName"
              value={formData.fromName}
              onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
              placeholder="Mini CRM"
            />
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Értesítési preferenciák</h3>
          <p className="text-sm text-muted-foreground">
            Válaszd ki, milyen eseményekről küldjön a rendszer email értesítést.
          </p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifyAccountLock">Fiók zárolás</Label>
                <p className="text-sm text-muted-foreground">
                  Super adminok értesítése fiók zárolásról
                </p>
              </div>
              <Switch
                id="notifyAccountLock"
                checked={formData.notifyAccountLock}
                onCheckedChange={(checked) => setFormData({ ...formData, notifyAccountLock: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifyTaskDeadline">Feladat határidő</Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés közeli vagy lejárt határidőkről
                </p>
              </div>
              <Switch
                id="notifyTaskDeadline"
                checked={formData.notifyTaskDeadline}
                onCheckedChange={(checked) => setFormData({ ...formData, notifyTaskDeadline: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifyTaskCreated">Új feladat</Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés új feladat létrehozásáról
                </p>
              </div>
              <Switch
                id="notifyTaskCreated"
                checked={formData.notifyTaskCreated}
                onCheckedChange={(checked) => setFormData({ ...formData, notifyTaskCreated: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifyTaskStatusChange">Feladat státusz változás</Label>
                <p className="text-sm text-muted-foreground">
                  Értesítés feladat állapotának változásáról
                </p>
              </div>
              <Switch
                id="notifyTaskStatusChange"
                checked={formData.notifyTaskStatusChange}
                onCheckedChange={(checked) => setFormData({ ...formData, notifyTaskStatusChange: checked })}
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Beállítások mentése
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
