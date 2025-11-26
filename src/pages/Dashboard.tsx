import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderKanban, TrendingUp, CheckSquare, Users } from 'lucide-react';

const Dashboard = () => {
  const { activeCompany } = useCompany();

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

  const { data: upcomingTasks } = useQuery({
    queryKey: ['upcoming-tasks', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];

      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .lte('deadline', sevenDaysFromNow.toISOString())
        .order('deadline', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany,
  });

  const { data: partnersCount } = useQuery({
    queryKey: ['partners-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('partners')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null);

      if (error) throw error;
      return count || 0;
    },
  });

  if (!activeCompany) {
    return (
      <div className="flex h-full items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Company Selected</CardTitle>
            <CardDescription>
              Please select a company from the top bar or ask an admin to assign you to a company.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to {activeCompany.name}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {Object.keys(projectStats?.byStatus || {}).length} different statuses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sales Opportunities</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{salesStats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active sales pipeline
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTasks?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Due in next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Partners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partnersCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Clients, suppliers, partners
            </p>
          </CardContent>
        </Card>
      </div>

      {upcomingTasks && upcomingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
            <CardDescription>Tasks due in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
