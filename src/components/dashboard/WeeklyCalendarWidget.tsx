import { useCompany } from '@/contexts/CompanyContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { format, startOfWeek, endOfWeek, addDays, isSameDay, parseISO } from 'date-fns';
import { hu, enUS } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface CalendarItem {
  id: string;
  title: string;
  type: 'task' | 'event';
  date: Date;
  status?: string;
  isAllDay?: boolean;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />;
    case 'in_progress':
      return <Clock className="h-3 w-3 text-blue-500 flex-shrink-0" />;
    case 'pending':
      return <AlertCircle className="h-3 w-3 text-orange-500 flex-shrink-0" />;
    default:
      return null;
  }
};

export const WeeklyCalendarWidget = () => {
  const { activeCompany } = useCompany();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === 'hu' ? hu : enUS;

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const { data: items = [] } = useQuery({
    queryKey: ['weekly-calendar-items', activeCompany?.id, weekStart.toISOString()],
    queryFn: async () => {
      if (!activeCompany) return [];

      const startStr = weekStart.toISOString();
      const endStr = weekEnd.toISOString();

      const [tasksRes, eventsRes] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, title, deadline, status, is_all_day')
          .eq('company_id', activeCompany.id)
          .is('deleted_at', null)
          .gte('deadline', startStr)
          .lte('deadline', endStr)
          .neq('status', 'completed'),
        supabase
          .from('events')
          .select('id, title, start_time, is_all_day')
          .eq('company_id', activeCompany.id)
          .is('deleted_at', null)
          .gte('start_time', startStr)
          .lte('start_time', endStr),
      ]);

      const calendarItems: CalendarItem[] = [];

      if (tasksRes.data) {
        tasksRes.data.forEach((task) => {
          if (task.deadline) {
            calendarItems.push({
              id: task.id,
              title: task.title,
              type: 'task',
              date: parseISO(task.deadline),
              status: task.status || 'pending',
              isAllDay: task.is_all_day || false,
            });
          }
        });
      }

      if (eventsRes.data) {
        eventsRes.data.forEach((event) => {
          calendarItems.push({
            id: event.id,
            title: event.title,
            type: 'event',
            date: parseISO(event.start_time),
            isAllDay: event.is_all_day || false,
          });
        });
      }

      return calendarItems;
    },
    enabled: !!activeCompany,
  });

  const getItemsForDay = (day: Date) => {
    return items.filter((item) => isSameDay(item.date, day));
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('dashboard.weeklyOverview')}
          </CardTitle>
          <button
            onClick={() => navigate('/calendar')}
            className="text-sm text-primary hover:underline"
          >
            {t('dashboard.viewCalendar')}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map((day) => {
            const dayItems = getItemsForDay(day);
            const isToday = isSameDay(day, today);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-[100px] p-1.5 rounded-md border",
                  isToday ? "border-primary bg-primary/5" : "border-border"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-1 text-center",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  <div>{format(day, 'EEE', { locale })}</div>
                  <div className={cn(
                    "text-sm",
                    isToday && "font-bold"
                  )}>
                    {format(day, 'd')}
                  </div>
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {dayItems.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "text-[10px] px-1 py-0.5 rounded truncate shadow-sm border border-black/10 dark:border-white/10",
                        item.type === 'task'
                          ? "bg-blue-500 text-white"
                          : "bg-violet-500 text-white"
                      )}
                      title={item.title}
                    >
                      <div className="flex items-center gap-0.5">
                        {item.type === 'task' && getStatusIcon(item.status || 'pending')}
                        <span className="truncate">{item.title}</span>
                      </div>
                    </div>
                  ))}
                  {dayItems.length > 3 && (
                    <div className="text-[10px] text-muted-foreground text-center">
                      +{dayItems.length - 3} {t('dashboard.more')}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
