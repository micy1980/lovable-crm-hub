import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, CheckCircle, Clock, AlertCircle, Calendar, CalendarDays } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { TaskDialog } from './TaskDialog';
import { EventDialog } from '@/components/events/EventDialog';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProjectTasksProps {
  projectId?: string;
  salesId?: string;
  canEdit?: boolean;
}

export const ProjectTasks = ({ projectId, salesId, canEdit = true }: ProjectTasksProps) => {
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
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

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: projectId ? ['project-events', projectId] : ['sales-events', salesId],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select(`
          *,
          responsible:responsible_user_id(full_name, email),
          creator:created_by(full_name, email)
        `)
        .is('deleted_at', null)
        .order('start_time', { ascending: true });

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

  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  const handleNewEvent = () => {
    setSelectedEvent(null);
    setEventDialogOpen(true);
  };

  const entityName = projectId ? 'projekthez' : 'értékesítéshez';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Feladatok és események</CardTitle>
          <CardDescription>
            {projectId ? 'Projekthez' : 'Értékesítéshez'} kapcsolódó feladatok és események
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tasks" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Feladatok ({tasks.length})
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Események ({events.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={handleNewTask} disabled={!canEdit}>
                  <Plus className="mr-2 h-4 w-4" />
                  Új feladat
                </Button>
              </div>
              {tasksLoading ? (
                <div className="text-center py-8 text-muted-foreground">Betöltés...</div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Még nincsenek feladatok ehhez a {entityName}
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
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
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
                                Határidő: {format(new Date(task.deadline), 'yyyy-MM-dd HH:mm')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="events" className="mt-4">
              <div className="flex justify-end mb-4">
                <Button size="sm" onClick={handleNewEvent} disabled={!canEdit}>
                  <Plus className="mr-2 h-4 w-4" />
                  Új esemény
                </Button>
              </div>
              {eventsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Betöltés...</div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Még nincsenek események ehhez a {entityName}
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event: any) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => handleEditEvent(event)}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <Calendar className="h-4 w-4 text-primary mt-1" />
                        <div className="flex-1">
                          <h4 className="font-medium">{event.title}</h4>
                          {event.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {event.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {event.is_all_day ? (
                              <Badge variant="outline" className="text-xs">Egész napos</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(event.start_time), 'yyyy-MM-dd HH:mm')}
                                {event.end_time && ` - ${format(new Date(event.end_time), 'HH:mm')}`}
                              </span>
                            )}
                            {event.location && (
                              <span className="text-xs text-muted-foreground">
                                📍 {event.location}
                              </span>
                            )}
                            {event.responsible && (
                              <span className="text-xs text-muted-foreground">
                                Felelős: {event.responsible.full_name || event.responsible.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <TaskDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        projectId={projectId}
        salesId={salesId}
        task={selectedTask}
      />

      <EventDialog
        open={eventDialogOpen}
        onOpenChange={setEventDialogOpen}
        event={selectedEvent}
        defaultProjectId={projectId}
        defaultSalesId={salesId}
      />
    </>
  );
};
