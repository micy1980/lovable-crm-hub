import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginAttemptsTab } from '@/components/accounts/LoginAttemptsTab';
import { LockedAccountsTab } from '@/components/accounts/LockedAccountsTab';
import { ActiveSessionsTab } from '@/components/accounts/ActiveSessionsTab';
import { UserList } from '@/components/users/UserList';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin, isAdminOrAbove } from '@/lib/roleUtils';
import { Navigate } from 'react-router-dom';

const AccountManagement = () => {
  const { data: profile, isLoading } = useUserProfile();
  const isSuper = isSuperAdmin(profile);
  const isAdmin = isAdminOrAbove(profile);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  // Only admins and super admins can access this page
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fiókok Kezelése</h1>
        <p className="text-muted-foreground">
          Felhasználói fiókok, sessionök és bejelentkezések kezelése
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Felhasználók</TabsTrigger>
          {isSuper && <TabsTrigger value="sessions">Aktív Sessionök</TabsTrigger>}
          {isSuper && <TabsTrigger value="locked">Zárolt Fiókok</TabsTrigger>}
          {isSuper && <TabsTrigger value="attempts">Login Kísérletek</TabsTrigger>}
        </TabsList>

        <TabsContent value="users">
          <UserList />
        </TabsContent>

        {isSuper && (
          <>
            <TabsContent value="sessions">
              <ActiveSessionsTab />
            </TabsContent>

            <TabsContent value="locked">
              <LockedAccountsTab />
            </TabsContent>

            <TabsContent value="attempts">
              <LoginAttemptsTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default AccountManagement;
