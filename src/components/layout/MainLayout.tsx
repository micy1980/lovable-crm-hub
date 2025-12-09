import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { use2FAVerification } from '@/hooks/use2FAVerification';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, loading } = useAuth();
  const { settings } = useSystemSettings();
  const { data: profile } = useUserProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const { is2FAEnabled, is2FAVerified, isLoading: is2FALoading, needsVerification } = use2FAVerification();
  
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

  // Redirect to 2FA verification if needed (but not if already on auth page)
  useEffect(() => {
    if (!is2FALoading && user && needsVerification && location.pathname !== '/auth') {
      // Store the intended destination to redirect after 2FA
      sessionStorage.setItem('2fa_redirect', location.pathname);
      navigate('/auth', { replace: true, state: { requires2FA: true } });
    }
  }, [is2FALoading, user, needsVerification, navigate, location.pathname]);

  if (loading || is2FALoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If 2FA verification is required, don't render the main content
  if (needsVerification) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse text-lg text-muted-foreground">2FA ellenőrzés szükséges...</div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
