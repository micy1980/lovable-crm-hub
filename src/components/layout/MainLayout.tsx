import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { useUserProfile } from '@/hooks/useUserProfile';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, loading } = useAuth();
  const { settings } = useSystemSettings();
  const { data: profile } = useUserProfile();
  const navigate = useNavigate();
  
  // Get auto-logout timeout from settings (default to 300 seconds = 5 minutes)
  const timeoutSeconds = settings?.auto_logout_timeout 
    ? parseInt(settings.auto_logout_timeout) 
    : 300;
  
  // Enable inactivity logout
  useInactivityLogout(timeoutSeconds);

  // Check if user must change password
  useEffect(() => {
    if (user && profile?.must_change_password) {
      navigate('/change-password', { replace: true });
    }
  }, [user, profile, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto bg-background bg-grid-lg p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
