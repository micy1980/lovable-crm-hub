import { useUserProfile } from '@/hooks/useUserProfile';
import { useUserCompanies } from '@/hooks/useUserCompanies';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanyList } from '@/components/companies/CompanyList';
import { MasterDataManager } from '@/components/masterdata/MasterDataManager';
import { SystemSettings } from '@/components/settings/SystemSettings';
import { TwoFactorAuth } from '@/components/settings/TwoFactorAuth';
import { EmailSettings } from '@/components/settings/EmailSettings';
import { LogoSettings } from '@/components/settings/LogoSettings';
import { PersonalColorSettings } from '@/components/settings/PersonalColorSettings';
import { useTranslation } from 'react-i18next';
import { isSuperAdmin as checkSuperAdmin } from '@/lib/roleUtils';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Settings = () => {
  const { data: profile, isLoading } = useUserProfile();
  const { data: userCompanies = [] } = useUserCompanies();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const isSuperAdmin = checkSuperAdmin(profile);

  // Update default company mutation
  const updateDefaultCompany = useMutation({
    mutationFn: async (companyId: string) => {
      if (!profile?.id) throw new Error('No profile');
      
      const { error } = await supabase
        .from('profiles')
        .update({ default_company_id: companyId })
        .eq('id', profile.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(t('settings.defaultCompanyUpdated'));
    },
    onError: () => {
      toast.error(t('settings.error'));
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('settings.title')}</h1>
        <p className="text-muted-foreground">
          {t('settings.description')}
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">{t('settings.profile')}</TabsTrigger>
          {isSuperAdmin && <TabsTrigger value="companies">{t('settings.companies')}</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="masterdata">{t('settings.masterdata')}</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="system">{t('settings.system')}</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="email">Email</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card className="w-full">
            <CardHeader>
              <CardTitle>{t('settings.profileSettings')}</CardTitle>
              <CardDescription>
                {t('settings.profileDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium mb-1">{t('settings.email')}</p>
                    <p className="text-sm text-muted-foreground">{profile?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-1">{t('settings.fullName')}</p>
                    <p className="text-sm text-muted-foreground">{profile?.full_name || '-'}</p>
                  </div>
                </div>

                {userCompanies.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('settings.defaultCompany')}</label>
                    <Select
                      value={profile?.default_company_id || userCompanies[0]?.id || ''}
                      onValueChange={(value) => updateDefaultCompany.mutate(value)}
                    >
                      <SelectTrigger className="w-[480px]">
                        <SelectValue placeholder={t('settings.selectDefaultCompany')} />
                      </SelectTrigger>
                      <SelectContent>
                        {userCompanies.map((company: any) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {t('settings.defaultCompanyDescription')}
                    </p>
                  </div>
                )}
                
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t('settings.permissions')}</h4>
                  <div className="border rounded-lg overflow-hidden inline-block">
                    <div className="grid grid-cols-[120px_120px_120px_120px] gap-4 px-4 py-3 bg-muted/30 border-b border-border">
                      <div className="text-sm font-semibold text-muted-foreground text-center">{t('settings.role')}</div>
                      <div className="text-sm font-semibold text-muted-foreground text-center">{t('settings.isActive')}</div>
                      <div className="text-sm font-semibold text-muted-foreground text-center">{t('settings.canDelete')}</div>
                      <div className="text-sm font-semibold text-muted-foreground text-center">{t('settings.canViewLogs')}</div>
                    </div>
                    <div className="grid grid-cols-[120px_120px_120px_120px] gap-4 px-4 py-3">
                      <div className="flex items-center justify-center">
                        <Badge variant="default" className="capitalize">
                          {profile?.role === 'super_admin' ? 'SA' : profile?.role?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-center">
                        <Badge variant={profile?.is_active ? 'default' : 'secondary'} className="text-xs">
                          {profile?.is_active ? t('common.yes') : t('common.no')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-center">
                        <Badge variant={profile?.can_delete ? 'default' : 'secondary'} className="text-xs">
                          {profile?.can_delete ? t('common.yes') : t('common.no')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-center">
                        <Badge variant={profile?.can_view_logs ? 'default' : 'secondary'} className="text-xs">
                          {profile?.can_view_logs ? t('common.yes') : t('common.no')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Two-Factor Authentication */}
          <TwoFactorAuth />

          {/* Personal Colors */}
          <PersonalColorSettings />
        </TabsContent>

        {isSuperAdmin && (
          <>
            <TabsContent value="companies">
              <CompanyList />
            </TabsContent>

            <TabsContent value="masterdata">
              <MasterDataManager />
            </TabsContent>

            <TabsContent value="system">
              <div className="space-y-6">
                <LogoSettings />
                <SystemSettings />
              </div>
            </TabsContent>

            <TabsContent value="email">
              <EmailSettings />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
