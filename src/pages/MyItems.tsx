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
  Loader2,
} from 'lucide-react';
import { useMyItems } from '@/hooks/useEvents';
import { useCompany } from '@/contexts/CompanyContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TaskDialog } from '@/components/projects/TaskDialog';
import { EventDialog } from '@/components/events/EventDialog';
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

// Color map matching calendar DraggableItem
const colorMap: Record<string, { bg: string; textOnBg: string }> = {
  red: { bg: 'bg-red-500', textOnBg: 'text-white' },
  blue: { bg: 'bg-blue-500', textOnBg: 'text-white' },
  green: { bg: 'bg-green-500', textOnBg: 'text-white' },
  yellow: { bg: 'bg-yellow-500', textOnBg: 'text-black' },
  purple: { bg: 'bg-purple-500', textOnBg: 'text-white' },
  pink: { bg: 'bg-pink-500', textOnBg: 'text-white' },
  indigo: { bg: 'bg-indigo-500', textOnBg: 'text-white' },
  orange: { bg: 'bg-orange-500', textOnBg: 'text-black' },
  teal: { bg: 'bg-teal-500', textOnBg: 'text-white' },
  cyan: { bg: 'bg-cyan-500', textOnBg: 'text-black' },
};

type FilterType = 'all' | 'personal' | 'project';

export default function MyItems() {
  const { t } = useTranslation();
  const { activeCompany } = useCompany();
  const { data, isLoading } = useMyItems();
  const { data: userProfile } = useUserProfile();
  const queryClient = useQueryClient();

  const personalTaskColor = userProfile?.personal_task_color || null;
  const personalEventColor = userProfile?.personal_event_color || null;

  const getItemColor = (item: any, type: 'task' | 'event') => {
    // Project/sales items use project color
    if (item.project_id && item.project) {
      const projectColor = type === 'task' ? item.project.task_color : item.project.event_color;
      if (projectColor && colorMap[projectColor]) {
        return colorMap[projectColor];
      }
    }
    // Personal items use personal color
    if (!item.project_id && !item.sales_id) {
      const personalColor = type === 'task' ? personalTaskColor : personalEventColor;
      if (personalColor && colorMap[personalColor]) {
        return colorMap[personalColor];
      }
    }
    return null;
  };

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
      let error;
      if (itemToDelete.type === 'task') {
        const result = await supabase.rpc('soft_delete_task', { _task_id: itemToDelete.id });
        error = result.error;
      } else {
        const result = await supabase.rpc('soft_delete_event', { _event_id: itemToDelete.id });
        error = result.error;
      }

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
      <LicenseGuard feature="my_items">
        <div className="container mx-auto p-6">
          <p className="text-muted-foreground">{t('common.selectCompany')}</p>
        </div>
      </LicenseGuard>
    );
  }

  return (
    <LicenseGuard feature="my_items">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('myItems.title')}</h1>
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

          <TabsContent value="tasks">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('myItems.tasks')}</CardTitle>
                  <CardDescription>{t('myItems.tasksDescription')}</CardDescription>
                </div>
                <Button onClick={() => { setSelectedTask(null); setTaskDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('myItems.newTask')}
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('myItems.noTasks')}</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('tasks.title')}</TableHead>
                          <TableHead>{t('tasks.statusLabel')}</TableHead>
                          <TableHead>{t('myItems.type')}</TableHead>
                          <TableHead>{t('tasks.deadline')}</TableHead>
                          <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTasks.map((task: any) => {
                          const typeInfo = getItemTypeLabel(task);
                          const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'completed';
                          const taskColor = getItemColor(task, 'task');
                          
                          return (
                            <TableRow 
                              key={task.id} 
                              className={taskColor ? `${taskColor.bg} ${taskColor.textOnBg}` : ''}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{task.title}</span>
                                  {isOverdue && (
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={getStatusBadge(task.status)}>
                                  {t(`tasks.status.${task.status}`)}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className={`flex items-center gap-1 ${typeInfo.color}`}>
                                  <typeInfo.icon className="h-4 w-4" />
                                  {typeInfo.label}
                                </span>
                              </TableCell>
                              <TableCell>
                                {task.deadline ? (
                                  <span className="flex items-center gap-1 text-sm">
                                    <Clock className="h-3 w-3" />
                                    {format(new Date(task.deadline), 'yyyy.MM.dd HH:mm', { locale: hu })}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
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
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{t('myItems.events')}</CardTitle>
                  <CardDescription>{t('myItems.eventsDescription')}</CardDescription>
                </div>
                <Button onClick={() => { setSelectedEvent(null); setEventDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('myItems.newEvent')}
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t('myItems.noEvents')}</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('events.title')}</TableHead>
                          <TableHead>{t('myItems.type')}</TableHead>
                          <TableHead>{t('events.startTime')}</TableHead>
                          <TableHead>{t('events.location')}</TableHead>
                          <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEvents.map((event: any) => {
                          const typeInfo = getItemTypeLabel(event);
                          const eventColor = getItemColor(event, 'event');
                          
                          return (
                            <TableRow 
                              key={event.id}
                              className={eventColor ? `${eventColor.bg} ${eventColor.textOnBg}` : ''}
                            >
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{event.title}</span>
                                  {event.is_all_day && (
                                    <Badge variant="outline">{t('events.allDay')}</Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className={`flex items-center gap-1 ${typeInfo.color}`}>
                                  <typeInfo.icon className="h-4 w-4" />
                                  {typeInfo.label}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="flex items-center gap-1 text-sm">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(event.start_time), event.is_all_day ? 'yyyy.MM.dd' : 'yyyy.MM.dd HH:mm', { locale: hu })}
                                  {event.end_time && (
                                    <> - {format(new Date(event.end_time), event.is_all_day ? 'yyyy.MM.dd' : 'HH:mm', { locale: hu })}</>
                                  )}
                                </span>
                              </TableCell>
                              <TableCell>
                                {event.location ? (
                                  <span className="text-sm truncate max-w-[200px] block">{event.location}</span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell>
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
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          task={selectedTask}
        />

        <EventDialog
          open={eventDialogOpen}
          onOpenChange={setEventDialogOpen}
          event={selectedEvent}
        />

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
}
