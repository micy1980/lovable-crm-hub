import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  CalendarDays,
  CheckSquare,
  Clock,
  Filter,
  FolderOpen,
  Briefcase,
  User,
  Plus,
  Pencil,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useMyItems } from '@/hooks/useEvents';
import { useCompany } from '@/contexts/CompanyContext';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TaskDialog } from '@/components/projects/TaskDialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

type FilterType = 'all' | 'personal' | 'project';

// Component for managing user's personal tasks and events

const MyItems = () => {
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const { data, isLoading } = useMyItems();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterType>('all');
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: 'task' | 'event'; id: string } | null>(null);

  const filteredTasks = (data?.tasks || []).filter((task: any) => {
    if (filter === 'personal') return !task.project_id && !task.sales_id;
    if (filter === 'project') return task.project_id || task.sales_id;
    return true;
  });

  const filteredEvents = (data?.events || []).filter((event: any) => {
    if (filter === 'personal') return !event.project_id && !event.sales_id;
    if (filter === 'project') return event.project_id || event.sales_id;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'secondary',
      in_progress: 'default',
      completed: 'outline',
      cancelled: 'destructive',
    };
    return variants[status] || 'secondary';
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleEditEvent = (event: any) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  const handleDeleteClick = (type: 'task' | 'event', id: string) => {
    setItemToDelete({ type, id });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      const table = itemToDelete.type === 'task' ? 'tasks' : 'events';
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', itemToDelete.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['my-items'] });
      toast({ title: t('common.success'), description: t('common.deleted') });
    } catch (error: any) {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const getItemTypeLabel = (item: any) => {
    if (item.project_id) return { icon: FolderOpen, label: item.project?.name || t('myItems.project'), color: 'text-blue-500' };
    if (item.sales_id) return { icon: Briefcase, label: item.sales?.name || t('myItems.sales'), color: 'text-green-500' };
    return { icon: User, label: t('myItems.personal'), color: 'text-orange-500' };
  };

  if (!activeCompany) {
    return (
      <LicenseGuard feature="calendar">
        <div className="container mx-auto p-6">
          <p className="text-muted-foreground">{t('common.selectCompany')}</p>
        </div>
      </LicenseGuard>
    );
  }

  return (
    <LicenseGuard feature="calendar">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('myItems.title')}</h1>
            <p className="text-muted-foreground">{t('myItems.description')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <SelectTrigger className="w-40">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('myItems.filterAll')}</SelectItem>
                <SelectItem value="personal">{t('myItems.filterPersonal')}</SelectItem>
                <SelectItem value="project">{t('myItems.filterProject')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="tasks" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              {t('myItems.tasks')} ({filteredTasks.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              {t('myItems.events')} ({filteredEvents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setSelectedTask(null); setTaskDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                {t('myItems.newTask')}
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('myItems.noTasks')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task: any) => {
                  const typeInfo = getItemTypeLabel(task);
                  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
                  
                  return (
                    <Card key={task.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{task.title}</h3>
                            <Badge variant={getStatusBadge(task.status)}>
                              {t(`tasks.status.${task.status}`)}
                            </Badge>
                            {isOverdue && (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className={`flex items-center gap-1 ${typeInfo.color}`}>
                              <typeInfo.icon className="h-3 w-3" />
                              {typeInfo.label}
                            </span>
                            {task.deadline && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(task.deadline), 'yyyy.MM.dd HH:mm', { locale: hu })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick('task', task.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="events" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => { setSelectedEvent(null); setEventDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                {t('myItems.newEvent')}
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">{t('myItems.noEvents')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {filteredEvents.map((event: any) => {
                  const typeInfo = getItemTypeLabel(event);
                  
                  return (
                    <Card key={event.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="flex items-center justify-between p-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{event.title}</h3>
                            {event.is_all_day && (
                              <Badge variant="outline">{t('events.allDay')}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className={`flex items-center gap-1 ${typeInfo.color}`}>
                              <typeInfo.icon className="h-3 w-3" />
                              {typeInfo.label}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(event.start_time), event.is_all_day ? 'yyyy.MM.dd' : 'yyyy.MM.dd HH:mm', { locale: hu })}
                              {event.end_time && (
                                <> - {format(new Date(event.end_time), event.is_all_day ? 'yyyy.MM.dd' : 'HH:mm', { locale: hu })}</>
                              )}
                            </span>
                            {event.location && (
                              <span className="truncate max-w-[200px]">{event.location}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEditEvent(event)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick('event', event.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          task={selectedTask}
        />

        {/* EventDialog temporarily removed */}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.confirmDelete')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('common.deleteWarning')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                {t('common.delete')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </LicenseGuard>
  );
};

export default MyItems;
