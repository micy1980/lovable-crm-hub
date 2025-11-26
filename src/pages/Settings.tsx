import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Settings = () => {
  const { data: profile } = useUserProfile();

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and system settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">Users</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="companies">Companies</TabsTrigger>}
          {isSuperAdmin && <TabsTrigger value="masterdata">Master Data</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Full Name</p>
                  <p className="text-sm text-muted-foreground">{profile?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Role</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {profile?.role?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage users and their permissions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  User management interface coming soon.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isSuperAdmin && (
          <>
            <TabsContent value="companies">
              <Card>
                <CardHeader>
                  <CardTitle>Company Management</CardTitle>
                  <CardDescription>
                    Create and manage companies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Company management interface coming soon.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="masterdata">
              <Card>
                <CardHeader>
                  <CardTitle>Master Data</CardTitle>
                  <CardDescription>
                    Manage system-wide master data lists
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Master data management interface coming soon.
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default Settings;
