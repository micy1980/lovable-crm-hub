import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginAttemptsTab } from '@/components/accounts/LoginAttemptsTab';
import { LockedAccountsTab } from '@/components/accounts/LockedAccountsTab';
import { ActiveSessionsTab } from '@/components/accounts/ActiveSessionsTab';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { Navigate } from 'react-router-dom';

const AccountManagement = () => {
  const { data: profile, isLoading } = useUserProfile();
  const isSuper = isSuperAdmin(profile);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <p className="text-muted-foreground">Betöltés...</p>
      </div>
    );
  }

  // Only super admins can access this page
  if (!isSuper) {
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

      <Tabs defaultValue="sessions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sessions">Aktív Sessionök</TabsTrigger>
          <TabsTrigger value="locked">Zárolt Fiókok</TabsTrigger>
          <TabsTrigger value="attempts">Login Kísérletek</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <ActiveSessionsTab />
        </TabsContent>

        <TabsContent value="locked">
          <LockedAccountsTab />
        </TabsContent>

        <TabsContent value="attempts">
          <LoginAttemptsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AccountManagement;
