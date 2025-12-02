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
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { GlobalSearch } from '@/components/shared/GlobalSearch';
import { useState } from 'react';

export function TopBar() {
  const { user } = useAuth();
  const { activeCompany, companies, setActiveCompany } = useCompany();
  const { data: profile } = useUserProfile();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();
  const [searchOpen, setSearchOpen] = useState(false);

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

        {/* Company Selector - Left side */}
        {companies.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="min-w-[200px] justify-between gap-2">
                <span className="truncate">{activeCompany?.name || t('topbar.selectCompany')}</span>
                <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[200px]">
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
        )}

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
