import {
  LayoutDashboard,
  Users,
  FolderKanban,
  TrendingUp,
  FileText,
  Calendar,
  Settings,
  Building2,
  ScrollText,
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';

export function AppSidebar() {
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const { hasFeatureAccess } = useFeatureAccess();
  
  const allMenuItems = [
    { title: t('nav.dashboard'), url: '/', icon: LayoutDashboard, feature: null },
    { title: t('nav.partners'), url: '/partners', icon: Users, feature: 'partners' },
    { title: t('nav.projects'), url: '/projects', icon: FolderKanban, feature: 'projects' },
    { title: t('nav.sales'), url: '/sales', icon: TrendingUp, feature: 'sales' },
    { title: t('nav.documents'), url: '/documents', icon: FileText, feature: 'documents' },
    { title: t('nav.calendar'), url: '/calendar', icon: Calendar, feature: 'calendar' },
    { title: t('nav.settings'), url: '/settings', icon: Settings, feature: null },
  ];

  // Only show Logs to super_admin
  if (isSuperAdmin(profile)) {
    allMenuItems.splice(6, 0, { title: t('nav.logs'), url: '/logs', icon: ScrollText, feature: 'logs' });
  }

  // Filter menu items based on license features
  const menuItems = allMenuItems.filter(item => 
    item.feature === null || hasFeatureAccess(item.feature)
  );
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-md">
            <Building2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-sidebar-foreground">{t('app.name')}</h2>
            <p className="text-xs text-sidebar-foreground/60">Multi-Company</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
