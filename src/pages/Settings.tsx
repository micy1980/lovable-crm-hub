import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompanyList } from '@/components/companies/CompanyList';
import { UserList } from '@/components/users/UserList';
import { MasterDataManager } from '@/components/masterdata/MasterDataManager';
import { useTranslation } from 'react-i18next';
import { isSuperAdmin as checkSuperAdmin, isAdminOrAbove } from '@/lib/roleUtils';
import { Badge } from '@/components/ui/badge';

const Settings = () => {
  const { data: profile, isLoading } = useUserProfile();
  const { t } = useTranslation();

  const isSuperAdmin = checkSuperAdmin(profile);
  const isAdmin = isAdminOrAbove(profile);

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
          {isAdmin && <TabsTrigger value="users">{t('settings.users')}</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="companies">{t('settings.companies')}</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="masterdata">{t('settings.masterdata')}</TabsTrigger>}
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
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <UserList />
          </TabsContent>
        )}

        {isSuperAdmin && (
          <>
            <TabsContent value="companies">
              <CompanyList />
            </TabsContent>

            <TabsContent value="masterdata">
              <MasterDataManager />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
