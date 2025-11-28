import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { LicenseStatusBanner } from '@/components/license/LicenseStatusBanner';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, loading } = useAuth();
  const { settings } = useSystemSettings();
  
  // Get auto-logout timeout from settings (default to 300 seconds = 5 minutes)
  const timeoutSeconds = settings?.auto_logout_timeout 
    ? parseInt(settings.auto_logout_timeout) 
    : 300;
  
  // Enable inactivity logout
  useInactivityLogout(timeoutSeconds);

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
          <LicenseStatusBanner />
          <main className="flex-1 overflow-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
