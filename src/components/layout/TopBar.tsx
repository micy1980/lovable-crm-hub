import { Moon, Sun, LogOut, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { useTranslation } from 'react-i18next';
import { LanguageSelector } from '@/components/LanguageSelector';
import { isSuperAdmin } from '@/lib/roleUtils';
import { CompanyLicenseWarning } from './CompanyLicenseWarning';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useCompanyLicenses } from '@/hooks/useCompanyLicenses';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { useState } from 'react';

export function TopBar() {
  const { user } = useAuth();
  const { activeCompany, companies, setActiveCompany } = useCompany();
  const { data: profile } = useUserProfile();
  const { getLicenseForCompany, getLicenseStatus } = useCompanyLicenses();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);

  const license = activeCompany ? getLicenseForCompany(activeCompany.id) : null;
  const licenseStatus = license ? getLicenseStatus(license) : null;

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: t('auth.error'),
        description: error.message,
        variant: 'destructive',
      });
    } else {
      navigate('/auth');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center gap-4 px-4">
        <SidebarTrigger />

        <div className="flex-1" />

        {/* Global Search */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchOpen(true)}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          <span className="hidden md:inline">Keresés</span>
        </Button>

        {/* Company Selector */}
        {companies.length > 0 && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <span>{activeCompany?.name || t('topbar.selectCompany')}</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('topbar.selectCompany')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {companies.map((company: any) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => setActiveCompany(company)}
                    className={activeCompany?.id === company.id ? 'bg-accent' : ''}
                  >
                    {company.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {activeCompany && license && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <CompanyLicenseWarning companyId={activeCompany.id} />
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="space-y-1 text-xs">
                      <p className="font-medium">
                        {t('license.validUntil')}: {format(new Date(license.valid_until), 'yyyy-MM-dd')}
                      </p>
                      <p>
                        {t('license.maxUsers')}: {license.max_users}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Language Selector */}
        <LanguageSelector />

        {/* Notifications */}
        <NotificationCenter />

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2">
              <div className="flex flex-col items-end text-sm">
                <span className="font-medium">{profile?.full_name || user?.email}</span>
                <span className="text-xs text-muted-foreground capitalize">
                  {profile?.role?.replace('_', ' ')}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t('topbar.profile')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {t('topbar.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
