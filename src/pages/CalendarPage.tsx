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
import { ChevronLeft, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { hu } from 'date-fns/locale';
import { TaskDialog } from '@/components/projects/TaskDialog';

const CalendarPage = () => {
  const { t, i18n } = useTranslation();
  const { activeCompany } = useCompany();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['calendar-tasks', activeCompany?.id, currentMonth],
    queryFn: async () => {
      if (!activeCompany?.id) return [];

      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

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

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  const locale = i18n.language === 'hu' ? hu : undefined;

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
          <div className="grid gap-6 md:grid-cols-[1fr,400px]">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">
                    {format(currentMonth, 'MMMM yyyy', { locale })}
                  </h2>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(new Date())}
                    >
                      {t('calendar.today')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  locale={locale}
                  className="rounded-md border"
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
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">
                  {selectedDate 
                    ? format(selectedDate, 'MMMM d, yyyy', { locale })
                    : t('calendar.selectDate')}
                </h3>

                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('common.loading')}
                  </div>
                ) : selectedDateTasks.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {t('calendar.noTasks')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDateTasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-start gap-2">
                          {getStatusIcon(task.status)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm truncate">{task.title}</h4>
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
                          </div>
                        </div>
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
