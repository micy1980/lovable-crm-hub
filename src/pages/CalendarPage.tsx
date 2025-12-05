import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle, Plus, ListTodo, Calendar } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, startOfDay, endOfDay } from 'date-fns';
import { hu } from 'date-fns/locale';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { WeekGrid } from '@/components/calendar/WeekGrid';
import { DayGrid } from '@/components/calendar/DayGrid';
import { useUpdateTaskDeadline } from '@/hooks/useUpdateTaskDeadline';
import { TaskDialog } from '@/components/projects/TaskDialog';
import { EventDialog } from '@/components/events/EventDialog';
import { toast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type ViewMode = 'day' | 'week' | 'month';

const CalendarPage = () => {
  const { t, i18n } = useTranslation();
  const { activeCompany } = useCompany();
  const queryClient = useQueryClient();
  const { data: userProfile } = useUserProfile();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [taskViewOpen, setTaskViewOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [eventViewOpen, setEventViewOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>(undefined);
  const [createTime, setCreateTime] = useState<string | undefined>(undefined);
  const [createTypeDialogOpen, setCreateTypeDialogOpen] = useState(false);
  const updateTaskDeadline = useUpdateTaskDeadline();

  const handleTaskMove = (taskId: string, newDeadline: Date) => {
    updateTaskDeadline.mutate({ taskId, newDeadline });
  };

  const updateEventTime = useMutation({
    mutationFn: async ({ eventId, newStartTime }: { eventId: string; newStartTime: Date }) => {
      const { error } = await supabase
        .from('events')
        .update({ start_time: newStartTime.toISOString() })
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({ title: t('common.success'), description: t('events.updated') });
    },
    onError: (error) => {
      toast({ title: t('common.error'), description: error.message, variant: 'destructive' });
    },
  });

  const handleEventMove = (eventId: string, newStartTime: Date) => {
    updateEventTime.mutate({ eventId, newStartTime });
  };

  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
      case 'week':
        return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
      case 'month':
      default:
        return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    }
  };

  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery({
    queryKey: ['calendar-tasks', activeCompany?.id, viewMode, currentDate.toISOString()],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { start, end } = getDateRange();
      const { data, error } = await supabase
        .from('tasks')
        .select(`*, responsible:responsible_user_id(full_name, email), creator:created_by(full_name, email), project:projects(id, name, task_color, event_color), sales:sales(id, name)`)
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .gte('deadline', start.toISOString())
        .lte('deadline', end.toISOString())
        .order('deadline', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany?.id,
  });

  const { data: events = [], isLoading: isLoadingEvents } = useQuery({
    queryKey: ['calendar-events', activeCompany?.id, viewMode, currentDate.toISOString()],
    queryFn: async () => {
      if (!activeCompany?.id) return [];
      const { start, end } = getDateRange();
      const { data, error } = await supabase
        .from('events')
        .select(`*, responsible_user:profiles!events_responsible_user_id_fkey(full_name, email), project:projects(id, name, task_color, event_color), sales:sales(id, name)`)
        .eq('company_id', activeCompany.id)
        .is('deleted_at', null)
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!activeCompany?.id,
  });

  const isLoading = isLoadingTasks || isLoadingEvents;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'in_progress': return <Clock className="h-3 w-3 text-blue-500" />;
      case 'pending': return <AlertCircle className="h-3 w-3 text-orange-500" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = { pending: 'outline', in_progress: 'default', completed: 'secondary' };
    return variants[status] || 'outline';
  };

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setTaskViewOpen(true);
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setEventViewOpen(true);
  };

  const handlePrevious = () => {
    switch (viewMode) {
      case 'day': setCurrentDate(addDays(currentDate, -1)); break;
      case 'week': setCurrentDate(subWeeks(currentDate, 1)); break;
      case 'month': setCurrentDate(subMonths(currentDate, 1)); break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'day': setCurrentDate(addDays(currentDate, 1)); break;
      case 'week': setCurrentDate(addWeeks(currentDate, 1)); break;
      case 'month': setCurrentDate(addMonths(currentDate, 1)); break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const handleCellClick = (date: Date, hour?: number) => {
    const time = hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : '09:00';
    setCreateDate(date);
    setCreateTime(time);
    setCreateTypeDialogOpen(true);
  };

  const handleSelectCreateTask = () => {
    setCreateTypeDialogOpen(false);
    setSelectedTask(null);
    setTaskDialogOpen(true);
  };

  const handleSelectCreateEvent = () => {
    setCreateTypeDialogOpen(false);
    setSelectedEvent(null);
    setEventDialogOpen(true);
  };

  const handleCreateTask = () => {
    setCreateDate(selectedDate || new Date());
    setCreateTime('09:00');
    setSelectedTask(null);
    setTaskDialogOpen(true);
  };

  const handleCreateEvent = () => {
    setCreateDate(selectedDate || new Date());
    setCreateTime('09:00');
    setSelectedEvent(null);
    setEventDialogOpen(true);
  };

  const getViewTitle = () => {
    const locale = i18n.language === 'hu' ? hu : undefined;
    switch (viewMode) {
      case 'day': return format(currentDate, 'yyyy. MMMM d.', { locale });
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'yyyy. MMM d.', { locale })} – ${format(weekEnd, 'd.', { locale })}`;
      case 'month':
      default: return format(currentDate, 'yyyy. MMMM', { locale });
    }
  };

  const locale = i18n.language === 'hu' ? hu : undefined;
  const getTasksForDate = (date: Date) => tasks.filter((task: any) => task.deadline && isSameDay(new Date(task.deadline), date));
  const getEventsForDate = (date: Date) => events.filter((event: any) => event.start_time && isSameDay(new Date(event.start_time), date));
  const filteredTasks = selectedDate ? getTasksForDate(selectedDate) : tasks;
  const filteredEvents = selectedDate ? getEventsForDate(selectedDate) : events;

  return (
    <LicenseGuard feature="calendar">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('calendar.title')}</h1>
          <p className="text-muted-foreground">{t('calendar.description')}</p>
        </div>

        {!activeCompany ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">{t('common.selectCompany')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Header with navigation */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  {t('calendar.today')}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      {t('common.create', 'Létrehozás')}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleCreateTask}>
                      <ListTodo className="h-4 w-4 mr-2" />
                      {t('tasks.create', 'Feladat')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleCreateEvent}>
                      <Calendar className="h-4 w-4 mr-2" />
                      {t('events.create', 'Esemény')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <h2 className="text-2xl font-bold text-center flex-1">{getViewTitle()}</h2>

              <div className="flex gap-1 border rounded-lg p-1">
                <Button variant={viewMode === 'month' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('month')}>
                  {t('calendar.month')}
                </Button>
                <Button variant={viewMode === 'week' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('week')}>
                  {t('calendar.week')}
                </Button>
                <Button variant={viewMode === 'day' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('day')}>
                  {t('calendar.day')}
                </Button>
              </div>
            </div>

            {/* Calendar Display */}
            {viewMode === 'month' && (
              <CalendarGrid
                currentDate={currentDate}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                tasks={tasks}
                events={events}
                onTaskDoubleClick={handleTaskClick}
                onEventDoubleClick={handleEventClick}
                onTaskMove={handleTaskMove}
                onEventMove={handleEventMove}
                onCellDoubleClick={(date) => handleCellClick(date)}
              />
            )}
            {viewMode === 'week' && (
              <WeekGrid
                currentDate={currentDate}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                tasks={tasks}
                events={events}
                onTaskDoubleClick={handleTaskClick}
                onEventDoubleClick={handleEventClick}
                onTaskMove={handleTaskMove}
                onEventMove={handleEventMove}
                onCellDoubleClick={handleCellClick}
              />
            )}
            {viewMode === 'day' && (
              <DayGrid
                currentDate={currentDate}
                selectedDate={selectedDate}
                tasks={tasks}
                events={events}
                onTaskDoubleClick={handleTaskClick}
                onEventDoubleClick={handleEventClick}
                onTaskMove={handleTaskMove}
                onEventMove={handleEventMove}
                onCellDoubleClick={handleCellClick}
              />
            )}

            {/* Items List Section */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Tasks List */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <ListTodo className="h-5 w-5" />
                    {t('calendar.tasksList')} ({filteredTasks.length})
                  </h3>

                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
                  ) : filteredTasks.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">{t('calendar.noTasks')}</div>
                  ) : (
                    <div className="space-y-3">
                      {filteredTasks.map((task: any) => (
                        <div
                          key={task.id}
                          className="border rounded-lg p-4 hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => handleTaskClick(task)}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            {getStatusIcon(task.status)}
                            <h4 className="font-medium text-sm flex-1">{task.title}</h4>
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{task.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge variant={getStatusBadge(task.status)} className="text-xs">
                              {task.status === 'pending' && t('tasks.status.pending')}
                              {task.status === 'in_progress' && t('tasks.status.inProgress')}
                              {task.status === 'completed' && t('tasks.status.completed')}
                            </Badge>
                            {(task.project || task.sales) && (
                              <Badge variant="secondary" className="text-xs">
                                {task.project?.name || task.sales?.name}
                              </Badge>
                            )}
                          </div>
                          {task.responsible && (
                            <p className="text-xs text-muted-foreground">
                              {t('tasks.responsible')}: {task.responsible.full_name || task.responsible.email}
                            </p>
                          )}
                          {task.deadline && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(task.deadline), 'MMM d, HH:mm', { locale })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Events List */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-violet-500" />
                    {t('events.events', 'Események')} ({filteredEvents.length})
                  </h3>

                  {isLoading ? (
                    <div className="text-center py-8 text-muted-foreground">{t('common.loading')}</div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">{t('events.noEvents', 'Nincsenek események')}</div>
                  ) : (
                    <div className="space-y-3">
                      {filteredEvents.map((event: any) => (
                        <div
                          key={event.id}
                          className="border border-violet-200 dark:border-violet-800 rounded-lg p-4 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer"
                          onClick={() => handleEventClick(event)}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-violet-500 flex-shrink-0 mt-0.5" />
                            <h4 className="font-medium text-sm flex-1">{event.title}</h4>
                          </div>
                          {event.description && (
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{event.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge variant="outline" className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700">
                              {event.is_all_day ? t('calendar.allDay', 'Egész nap') : format(new Date(event.start_time), 'HH:mm', { locale })}
                            </Badge>
                            {(event.project || event.sales) && (
                              <Badge variant="secondary" className="text-xs">
                                {event.project?.name || event.sales?.name}
                              </Badge>
                            )}
                          </div>
                          {event.location && (
                            <p className="text-xs text-muted-foreground">
                              📍 {event.location}
                            </p>
                          )}
                          {event.responsible_user && (
                            <p className="text-xs text-muted-foreground">
                              {t('tasks.responsible')}: {event.responsible_user.full_name || event.responsible_user.email}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Task View Dialog */}
        <TaskDialog 
          open={taskViewOpen} 
          onOpenChange={setTaskViewOpen} 
          task={selectedTask}
          projectId={selectedTask?.project_id}
          salesId={selectedTask?.sales_id}
        />

        {/* Task Create Dialog */}
        <TaskDialog 
          open={taskDialogOpen} 
          onOpenChange={setTaskDialogOpen} 
          task={null}
          defaultDate={createDate}
          defaultTime={createTime}
        />

        {/* Event View/Edit Dialog */}
        <EventDialog
          open={eventViewOpen}
          onOpenChange={setEventViewOpen}
          event={selectedEvent}
          defaultDate={selectedEvent ? new Date(selectedEvent.start_time) : undefined}
        />

        {/* Event Create Dialog */}
        <EventDialog
          open={eventDialogOpen}
          onOpenChange={setEventDialogOpen}
          defaultDate={createDate}
          defaultTime={createTime}
        />

        {/* Create type selection dialog */}
        <Dialog open={createTypeDialogOpen} onOpenChange={setCreateTypeDialogOpen}>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>{t('calendar.createNew', 'Mit szeretnél létrehozni?')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 pt-2">
              <Button
                variant="outline"
                className="justify-start h-14"
                onClick={handleSelectCreateTask}
              >
                <ListTodo className="h-5 w-5 mr-3" />
                <div className="text-left">
                  <div className="font-medium">{t('tasks.task', 'Feladat')}</div>
                  <div className="text-xs text-muted-foreground">{t('tasks.taskDescription', 'Határidős tennivaló')}</div>
                </div>
              </Button>
              <Button
                variant="outline"
                className="justify-start h-14"
                onClick={handleSelectCreateEvent}
              >
                <Calendar className="h-5 w-5 mr-3 text-violet-500" />
                <div className="text-left">
                  <div className="font-medium">{t('events.event', 'Esemény')}</div>
                  <div className="text-xs text-muted-foreground">{t('events.eventDescription', 'Találkozó, megbeszélés')}</div>
                </div>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </LicenseGuard>
  );
};

export default CalendarPage;
