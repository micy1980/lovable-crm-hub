import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, TrendingUp, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LicenseStatusWidget } from '@/components/dashboard/LicenseStatusWidget';
import { TasksWidget } from '@/components/dashboard/TasksWidget';
import { ProjectsChart } from '@/components/dashboard/ProjectsChart';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget';
import { WeeklyCalendarWidget } from '@/components/dashboard/WeeklyCalendarWidget';

const Dashboard = () => {
  const { activeCompany } = useCompany();
  const { t } = useTranslation();

  const { data: projectStats } = useQuery({
    queryKey: ['project-stats', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { total: 0, byStatus: {} };

      const { data, error } = await supabase
        .from('projects')
        .select('status')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null);

      if (error) throw error;

      const byStatus = data.reduce((acc: any, project) => {
        acc[project.status || 'unknown'] = (acc[project.status || 'unknown'] || 0) + 1;
        return acc;
      }, {});

      return { total: data.length, byStatus };
    },
    enabled: !!activeCompany,
  });

  const { data: salesStats } = useQuery({
    queryKey: ['sales-stats', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return { total: 0, byStatus: {} };

      const { data, error } = await supabase
        .from('sales')
        .select('status')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null);

      if (error) throw error;

      const byStatus = data.reduce((acc: any, sale) => {
        acc[sale.status || 'unknown'] = (acc[sale.status || 'unknown'] || 0) + 1;
        return acc;
      }, {});

      return { total: data.length, byStatus };
    },
    enabled: !!activeCompany,
  });

  const { data: partnersCount } = useQuery({
    queryKey: ['partners-count', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return 0;

      const { count, error } = await supabase
        .from('partners')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!activeCompany,
  });

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{t('dashboard.noCompanySelected')}</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
        <p className="text-muted-foreground">
          {t('dashboard.welcome', { companyName: activeCompany.name })}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalProjects')}</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.differentStatuses', { count: Object.keys(projectStats?.byStatus || {}).length })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.salesOpportunities')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.activePipeline')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.totalPartners')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partnersCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('dashboard.partnersDescription')}
            </p>
          </CardContent>
        </Card>

        <LicenseStatusWidget />
      </div>

      <WeeklyCalendarWidget />

      <TasksWidget />
      
      <div className="grid gap-4 md:grid-cols-4">
        {projectStats?.byStatus && Object.keys(projectStats.byStatus).length > 0 && (
          <ProjectsChart data={projectStats.byStatus} />
        )}
        
        {salesStats?.byStatus && Object.keys(salesStats.byStatus).length > 0 && (
          <SalesChart data={salesStats.byStatus} />
        )}
      </div>
      
      <RecentActivityWidget />
    </div>
  );
};

export default Dashboard;
