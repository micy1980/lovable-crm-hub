import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { LicenseGuard } from '@/components/license/LicenseGuard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/contexts/CompanyContext';
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle, CalendarDays } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { hu } from 'date-fns/locale';
import { TaskDialog } from '@/components/projects/TaskDialog';
import { cn } from '@/lib/utils';

type ViewMode = 'day' | 'week' | 'month';

const CalendarPage = () => {
  const { t, i18n } = useTranslation();
  const { activeCompany } = useCompany();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  // Calculate date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return {
          start: startOfDay(currentDate),
          end: endOfDay(currentDate),
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case 'month':
      default:
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
    }
  };

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['calendar-tasks', activeCompany?.id, viewMode, currentDate.toISOString()],
    queryFn: async () => {
      if (!activeCompany?.id) return [];

      const { start, end } = getDateRange();

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          responsible:responsible_user_id(full_name, email),
          creator:created_by(full_name, email),
          project:projects(id, name),
          sales:sales(id, name)
        `)
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'in_progress':
        return <Clock className="h-3 w-3 text-blue-500" />;
      case 'pending':
        return <AlertCircle className="h-3 w-3 text-orange-500" />;
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

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task: any) => 
      task.deadline && isSameDay(new Date(task.deadline), date)
    );
  };

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handlePrevious = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(addDays(currentDate, -1));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
    }
  };

  const handleNext = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(addDays(currentDate, 1));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const getViewTitle = () => {
    const locale = i18n.language === 'hu' ? hu : undefined;
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'yyyy. MMMM d., EEEE', { locale });
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'MMM d', { locale })} - ${format(weekEnd, 'MMM d, yyyy', { locale })}`;
      case 'month':
      default:
        return format(currentDate, 'yyyy. MMMM', { locale });
    }
  };

  const renderWeekView = () => {
    const locale = i18n.language === 'hu' ? hu : undefined;
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const dayTasks = getTasksForDate(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDate && isSameDay(day, selectedDate);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border rounded-lg p-3 min-h-[120px] cursor-pointer hover:bg-accent/50 transition-colors",
                isToday && "border-primary bg-primary/5",
                isSelected && "ring-2 ring-primary"
              )}
              onClick={() => setSelectedDate(day)}
            >
              <div className="font-semibold text-sm mb-2">
                {format(day, 'EEE d', { locale })}
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((task: any) => (
                  <div
                    key={task.id}
                    className="text-xs p-1 rounded bg-primary/10 truncate"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTaskClick(task);
                    }}
                  >
                    {getStatusIcon(task.status)}
                    <span className="ml-1">{task.title}</span>
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{dayTasks.length - 3} további
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const locale = i18n.language === 'hu' ? hu : undefined;
  const filteredTasks = viewMode === 'day' && selectedDate
    ? getTasksForDate(selectedDate)
    : tasks;

  return (
    <LicenseGuard feature="calendar">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('calendar.title')}</h1>
          <p className="text-muted-foreground">
            {t('calendar.description')}
          </p>
        </div>

        {!activeCompany ? (
          <Card>
            <CardContent className="py-12">
              <p className="text-center text-muted-foreground">
                {t('common.selectCompany')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Calendar Section */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <h2 className="text-xl font-semibold">
                    {getViewTitle()}
                  </h2>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Mode Buttons */}
                    <div className="flex gap-1 border rounded-lg p-1">
                      <Button
                        variant={viewMode === 'day' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('day')}
                      >
                        {t('calendar.day')}
                      </Button>
                      <Button
                        variant={viewMode === 'week' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('week')}
                      >
                        {t('calendar.week')}
                      </Button>
                      <Button
                        variant={viewMode === 'month' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('month')}
                      >
                        {t('calendar.month')}
                      </Button>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePrevious}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleToday}
                      >
                        <CalendarDays className="h-4 w-4 mr-1" />
                        {t('calendar.today')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNext}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Calendar Display */}
                {viewMode === 'month' && (
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    month={currentDate}
                    onMonthChange={setCurrentDate}
                    locale={locale}
                    className="rounded-md border pointer-events-auto"
                    modifiers={{
                      hasTask: (date) => getTasksForDate(date).length > 0,
                    }}
                    modifiersStyles={{
                      hasTask: {
                        fontWeight: 'bold',
                        backgroundColor: 'hsl(var(--primary) / 0.1)',
                      },
                    }}
                  />
                )}
                {viewMode === 'week' && renderWeekView()}
                {viewMode === 'day' && (
                  <div className="border rounded-lg p-6 min-h-[200px]">
                    <h3 className="font-semibold mb-4">
                      {format(currentDate, 'yyyy. MMMM d., EEEE', { locale })}
                    </h3>
                    {isLoading ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t('common.loading')}
                      </div>
                    ) : filteredTasks.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {t('calendar.noTasks')}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredTasks.map((task: any) => (
                          <div
                            key={task.id}
                            className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => handleTaskClick(task)}
                          >
                            <div className="flex items-start gap-2">
                              {getStatusIcon(task.status)}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-sm">{task.title}</h4>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-1 mt-2">
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
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {t('tasks.responsible')}: {task.responsible.full_name || task.responsible.email}
                                  </p>
                                )}
                                {task.deadline && (
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(task.deadline), 'HH:mm', { locale })}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tasks List Section */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">
                  {t('calendar.tasksList')} ({filteredTasks.length})
                </h3>

                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('common.loading')}
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('calendar.noTasks')}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                            {task.description}
                          </p>
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
          </div>
        )}

        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={setTaskDialogOpen}
          task={selectedTask}
        />
      </div>
    </LicenseGuard>
  );
};

export default CalendarPage;
