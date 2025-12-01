import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const TasksWidget = () => {
  const { activeCompany } = useCompany();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { data: overdueTasks } = useQuery({
    queryKey: ['overdue-tasks', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];

      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(name), sales(name)')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .lt('deadline', now)
        .neq('status', 'completed')
        .order('deadline', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany,
  });

  const { data: upcomingTasks } = useQuery({
    queryKey: ['upcoming-tasks-widget', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];

      const now = new Date();
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { data, error } = await supabase
        .from('tasks')
        .select('*, projects(name), sales(name)')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .gte('deadline', now.toISOString())
        .lte('deadline', sevenDaysFromNow.toISOString())
        .neq('status', 'completed')
        .order('deadline', { ascending: true })
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!activeCompany,
  });

  const handleTaskClick = (task: any) => {
    if (task.project_id) {
      navigate(`/projects/${task.project_id}`);
    } else if (task.sales_id) {
      navigate(`/sales/${task.sales_id}`);
    }
  };

  return (
    <div className="space-y-4">
      {overdueTasks && overdueTasks.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle>Lejárt Feladatok</CardTitle>
            </div>
            <CardDescription>Ezek a feladatok már lejártak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {overdueTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0 cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.projects?.name || task.sales?.name || 'Általános'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="destructive" className="text-xs">
                      Lejárt
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Nincs határidő'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle>Közelgő Feladatok</CardTitle>
          </div>
          <CardDescription>A következő 7 napban esedékes</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingTasks && upcomingTasks.length > 0 ? (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between border-b pb-3 last:border-0 cursor-pointer hover:bg-accent/50 p-2 rounded transition-colors"
                  onClick={() => handleTaskClick(task)}
                >
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {task.projects?.name || task.sales?.name || 'Általános'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-xs">
                      {task.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'Nincs határidő'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nincs közelgő feladat</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
