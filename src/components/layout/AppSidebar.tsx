import {
  LayoutDashboard,
  Users,
  FolderKanban,
  TrendingUp,
  FileText,
  FileSignature,
  Calendar,
  Settings,
  Building2,
  ScrollText,
  ChevronDown,
  UserCog,
  ListTodo,
  FolderOpen,
  BarChart3,
  FileStack,
  LayoutGrid,
  GanttChartSquare,
  Clock,
  Zap,
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTranslation } from 'react-i18next';
import { useUserProfile } from '@/hooks/useUserProfile';
import { isSuperAdmin } from '@/lib/roleUtils';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { useLocation } from 'react-router-dom';
import { useAppLogo } from '@/hooks/useAppLogo';

export function AppSidebar() {
  const { t } = useTranslation();
  const { data: profile } = useUserProfile();
  const { hasFeatureAccess } = useFeatureAccess();
  const location = useLocation();
  const isSuper = isSuperAdmin(profile);
  const { logoUrl } = useAppLogo();
  
  const mainMenuItems = [
    { title: t('nav.dashboard'), url: '/', icon: LayoutDashboard, feature: null },
    { title: t('nav.partners'), url: '/partners', icon: Users, feature: 'partners' },
    { title: t('nav.projects'), url: '/projects', icon: FolderKanban, feature: 'projects' },
    { title: 'Kanban tábla', url: '/kanban', icon: LayoutGrid, feature: 'projects' },
    { title: 'Gantt diagram', url: '/gantt', icon: GanttChartSquare, feature: 'projects' },
    { title: 'Időkövetés', url: '/time-tracking', icon: Clock, feature: 'projects' },
    { title: t('nav.sales'), url: '/sales', icon: TrendingUp, feature: 'sales' },
    { title: t('nav.calendar'), url: '/calendar', icon: Calendar, feature: 'calendar' },
    { title: t('nav.myItems'), url: '/my-items', icon: ListTodo, feature: 'my_items' },
    { title: 'Riportok', url: '/reports', icon: BarChart3, feature: null },
    { title: 'Automatizáció', url: '/automation', icon: Zap, feature: null },
  ];

  // Add Audit for super_admin
  if (isSuper) {
    mainMenuItems.push({ title: t('nav.logs'), url: '/logs', icon: ScrollText, feature: 'audit' });
  }

  // Filter menu items based on license features
  const menuItems = mainMenuItems.filter(item => 
    item.feature === null || hasFeatureAccess(item.feature)
  );

  // Check if we're in the settings or account management area
  const isSettingsActive = location.pathname === '/settings' || location.pathname === '/account-management' || location.pathname === '/companies';
  
  // Check if we're in the document storage area
  const isDocumentStorageActive = location.pathname === '/documents' || location.pathname === '/contracts' || location.pathname.startsWith('/contracts/') || location.pathname === '/templates';
  
  // Check if documents feature is available
  const hasDocumentsAccess = hasFeatureAccess('documents');

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded-md object-contain" />
          ) : (
            <div className="bg-primary p-2 rounded-md">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
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

              {/* Dokumentumtár (Document Storage) with collapsible submenu */}
              {hasDocumentsAccess && (
                <Collapsible defaultOpen={isDocumentStorageActive}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="w-full justify-between">
                        <div className="flex items-center gap-3">
                          <FolderOpen className="h-4 w-4" />
                          <span>{t('nav.documentStorage')}</span>
                        </div>
                        <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to="/contracts"
                              className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent"
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                            >
                              <FileSignature className="h-4 w-4" />
                              <span>{t('nav.contracts')}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to="/documents"
                              end
                              className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent"
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                            >
                              <FileText className="h-4 w-4" />
                              <span>{t('nav.documents')}</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to="/templates"
                              end
                              className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent"
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                            >
                              <FileStack className="h-4 w-4" />
                              <span>Sablonok</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )}

              {/* Settings with collapsible submenu for Super Admin */}
              <Collapsible defaultOpen={isSettingsActive}>
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="w-full justify-between">
                      <div className="flex items-center gap-3">
                        <Settings className="h-4 w-4" />
                        <span>{t('nav.settings')}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <NavLink
                            to="/settings"
                            end
                            className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent"
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                          >
                            <Settings className="h-4 w-4" />
                            <span>Általános</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                      {isSuper && (
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <NavLink
                              to="/companies"
                              end
                              className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent"
                              activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                            >
                              <Building2 className="h-4 w-4" />
                              <span>Vállalatok</span>
                            </NavLink>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )}
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton asChild>
                          <NavLink
                            to="/account-management"
                            end
                            className="flex items-center gap-3 rounded-md px-3 py-2 transition-colors hover:bg-sidebar-accent"
                            activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                          >
                            <UserCog className="h-4 w-4" />
                            <span>Fiókok Kezelése</span>
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
