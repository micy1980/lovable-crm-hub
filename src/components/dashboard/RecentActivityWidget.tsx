import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { hu } from 'date-fns/locale';
import { FileText, FolderKanban, DollarSign, CheckCircle } from 'lucide-react';

export const RecentActivityWidget = () => {
  const { activeCompany } = useCompany();

  const { data: recentActivities } = useQuery({
    queryKey: ['recent-activities', activeCompany?.id],
    queryFn: async () => {
      if (!activeCompany) return [];

      const activities: any[] = [];

      // Get recent projects
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, created_at')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (projects) {
        projects.forEach(p => {
          activities.push({
            type: 'project',
            icon: <FolderKanban className="h-4 w-4" />,
            title: p.name,
            subtitle: 'Új projekt létrehozva',
            time: p.created_at,
          });
        });
      }

      // Get recent sales
      const { data: sales } = await supabase
        .from('sales')
        .select('id, name, created_at')
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(3);

      if (sales) {
        sales.forEach(s => {
          activities.push({
            type: 'sales',
            icon: <DollarSign className="h-4 w-4" />,
            title: s.name,
            subtitle: 'Új értékesítési lehetőség',
            time: s.created_at,
          });
        });
      }

      // Get recent completed tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, title, updated_at')
        .eq('company_id', activeCompany.id)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(3);

      if (tasks) {
        tasks.forEach(t => {
          activities.push({
            type: 'task',
            icon: <CheckCircle className="h-4 w-4" />,
            title: t.title,
            subtitle: 'Feladat befejezve',
            time: t.updated_at,
          });
        });
      }

      // Sort by time and limit to 5
      return activities
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 5);
    },
    enabled: !!activeCompany,
  });

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Legutóbbi aktivitások</CardTitle>
        <CardDescription>Az elmúlt napok eseményei</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities?.map((activity, index) => (
            <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
              <div className="mt-1 text-muted-foreground">{activity.icon}</div>
              <div className="flex-1">
                <p className="font-medium">{activity.title}</p>
                <p className="text-sm text-muted-foreground">{activity.subtitle}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {formatDistanceToNow(new Date(activity.time), { addSuffix: true, locale: hu })}
              </Badge>
            </div>
          ))}
          {(!recentActivities || recentActivities.length === 0) && (
            <p className="text-center text-muted-foreground py-4">
              Nincs megjeleníthető aktivitás
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
