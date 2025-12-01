import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { TaskDialog } from './TaskDialog';
import { format } from 'date-fns';

interface ProjectTasksProps {
  projectId?: string;
  salesId?: string;
  canEdit?: boolean;
}

export const ProjectTasks = ({ projectId, salesId, canEdit = true }: ProjectTasksProps) => {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: projectId ? ['project-tasks', projectId] : ['sales-tasks', salesId],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          responsible:responsible_user_id(full_name, email),
          creator:created_by(full_name, email)
        `)
        .is('deleted_at', null)
        .order('deadline', { ascending: true });

      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (salesId) {
        query = query.eq('sales_id', salesId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!(projectId || salesId),
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: 'outline',
      in_progress: 'default',
      completed: 'secondary',
    };
    return variants[status] || 'outline';
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setTaskDialogOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Feladatok</CardTitle>
              <CardDescription>
                {projectId ? 'Projekthez' : 'Értékesítéshez'} kapcsolódó feladatok ({tasks.length} db)
              </CardDescription>
            </div>
            <Button size="sm" onClick={handleNewTask} disabled={!canEdit}>
              <Plus className="mr-2 h-4 w-4" />
              Új feladat
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Betöltés...</div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Még nincsenek feladatok {projectId ? 'ehhez a projekthez' : 'ehhez az értékesítéshez'}
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleEditTask(task)}
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(task.status)}
                    <div className="flex-1">
                      <h4 className="font-medium">{task.title}</h4>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={getStatusBadge(task.status)} className="text-xs">
                          {task.status === 'pending' && 'Függőben'}
                          {task.status === 'in_progress' && 'Folyamatban'}
                          {task.status === 'completed' && 'Befejezett'}
                        </Badge>
                        {task.responsible && (
                          <span className="text-xs text-muted-foreground">
                            Felelős: {task.responsible.full_name || task.responsible.email}
                          </span>
                        )}
                        {task.deadline && (
                          <span className="text-xs text-muted-foreground">
                            Határidő: {format(new Date(task.deadline), 'yyyy-MM-dd')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        projectId={projectId}
        salesId={salesId}
        task={selectedTask}
      />
    </>
  );
};
